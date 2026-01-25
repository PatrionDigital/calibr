// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEAS, AttestationRequest, AttestationRequestData} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/**
 * @title ForecastRegistry
 * @author Calibr.xyz Team
 * @notice On-chain forecast management with EAS attestation integration
 * @dev Tracks forecasts, resolutions, and Brier scores
 */
contract ForecastRegistry is Ownable {
    // =============================================================================
    // Events
    // =============================================================================

    event ForecastCreated(
        uint256 indexed forecastId,
        address indexed user,
        bytes32 indexed marketId,
        uint256 probability,
        bytes32 easUid
    );

    event ForecastResolved(
        uint256 indexed forecastId,
        bool outcome,
        uint256 brierScore
    );

    event MarketResolved(bytes32 indexed marketId, bool outcome, uint256 resolvedAt);

    // =============================================================================
    // Errors
    // =============================================================================

    error InvalidProbability();
    error ForecastNotFound();
    error MarketNotResolved();
    error MarketAlreadyResolved();
    error ForecastAlreadyResolved();
    error Unauthorized();

    // =============================================================================
    // Types
    // =============================================================================

    struct Forecast {
        uint256 id;
        address user;
        bytes32 marketId;
        uint256 probability; // 1-99 (representing 0.01-0.99)
        uint256 confidence; // 0-100
        bytes32 easUid;
        uint256 createdAt;
        bool resolved;
        bool outcome;
        uint256 brierScore; // Scaled by 10000
    }

    struct Market {
        bytes32 id;
        bool resolved;
        bool outcome;
        uint256 resolvedAt;
    }

    struct UserStats {
        uint256 totalForecasts;
        uint256 resolvedForecasts;
        uint256 totalBrierScore; // Sum of all Brier scores (scaled by 10000)
    }

    // =============================================================================
    // State Variables
    // =============================================================================

    /// @notice EAS contract on Base
    IEAS public immutable eas;

    /// @notice Forecast schema UID
    bytes32 public forecastSchemaUid;

    /// @notice Forecast counter
    uint256 public forecastCount;

    /// @notice Forecasts by ID
    mapping(uint256 => Forecast) public forecasts;

    /// @notice Markets by ID
    mapping(bytes32 => Market) public markets;

    /// @notice User statistics
    mapping(address => UserStats) public userStats;

    /// @notice User's forecast IDs
    mapping(address => uint256[]) public userForecasts;

    /// @notice Forecasts per market
    mapping(bytes32 => uint256[]) public marketForecasts;

    /// @notice Authorized resolvers (can resolve markets)
    mapping(address => bool) public authorizedResolvers;

    // =============================================================================
    // Constructor
    // =============================================================================

    constructor(
        address _eas,
        address initialOwner
    ) Ownable(initialOwner) {
        eas = IEAS(_eas);
        authorizedResolvers[initialOwner] = true;
    }

    // =============================================================================
    // Modifiers
    // =============================================================================

    modifier onlyResolver() {
        if (!authorizedResolvers[msg.sender]) revert Unauthorized();
        _;
    }

    // =============================================================================
    // Admin Functions
    // =============================================================================

    function setForecastSchemaUid(bytes32 _schemaUid) external onlyOwner {
        forecastSchemaUid = _schemaUid;
    }

    function setAuthorizedResolver(address resolver, bool authorized) external onlyOwner {
        authorizedResolvers[resolver] = authorized;
    }

    // =============================================================================
    // Forecast Functions
    // =============================================================================

    /**
     * @notice Create a new forecast
     * @param marketId The market identifier
     * @param probability Forecasted probability (1-99)
     * @param confidence Confidence level (0-100)
     * @param platform Platform name
     * @param reasoning Reasoning text
     * @param isPublic Whether the forecast is public
     * @return forecastId The new forecast ID
     * @return easUid The EAS attestation UID
     */
    function createForecast(
        bytes32 marketId,
        uint256 probability,
        uint256 confidence,
        string calldata platform,
        string calldata reasoning,
        bool isPublic
    ) external returns (uint256 forecastId, bytes32 easUid) {
        // Validate probability
        if (probability < 1 || probability > 99) revert InvalidProbability();

        // Check market not already resolved
        if (markets[marketId].resolved) revert MarketAlreadyResolved();

        // Create EAS attestation
        bytes memory attestationData = abi.encode(
            probability,
            _bytes32ToString(marketId),
            platform,
            confidence,
            reasoning,
            isPublic
        );

        AttestationRequest memory request = AttestationRequest({
            schema: forecastSchemaUid,
            data: AttestationRequestData({
                recipient: msg.sender,
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: attestationData,
                value: 0
            })
        });

        easUid = eas.attest(request);

        // Create forecast record
        forecastId = ++forecastCount;

        forecasts[forecastId] = Forecast({
            id: forecastId,
            user: msg.sender,
            marketId: marketId,
            probability: probability,
            confidence: confidence,
            easUid: easUid,
            createdAt: block.timestamp,
            resolved: false,
            outcome: false,
            brierScore: 0
        });

        // Update mappings
        userForecasts[msg.sender].push(forecastId);
        marketForecasts[marketId].push(forecastId);
        userStats[msg.sender].totalForecasts++;

        emit ForecastCreated(forecastId, msg.sender, marketId, probability, easUid);

        return (forecastId, easUid);
    }

    /**
     * @notice Resolve a market with outcome
     * @param marketId The market identifier
     * @param outcome The market outcome (true = YES, false = NO)
     */
    function resolveMarket(bytes32 marketId, bool outcome) external onlyResolver {
        if (markets[marketId].resolved) revert MarketAlreadyResolved();

        markets[marketId] = Market({
            id: marketId,
            resolved: true,
            outcome: outcome,
            resolvedAt: block.timestamp
        });

        // Resolve all forecasts for this market
        uint256[] storage forecastIds = marketForecasts[marketId];
        for (uint256 i = 0; i < forecastIds.length; i++) {
            _resolveForecast(forecastIds[i], outcome);
        }

        emit MarketResolved(marketId, outcome, block.timestamp);
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /**
     * @notice Get a user's average Brier score
     * @param user The user address
     * @return Average Brier score (scaled by 10000)
     */
    function getUserAverageBrierScore(address user) external view returns (uint256) {
        UserStats storage stats = userStats[user];
        if (stats.resolvedForecasts == 0) return 0;
        return stats.totalBrierScore / stats.resolvedForecasts;
    }

    /**
     * @notice Get a user's forecast IDs
     * @param user The user address
     * @return Array of forecast IDs
     */
    function getUserForecastIds(address user) external view returns (uint256[] memory) {
        return userForecasts[user];
    }

    /**
     * @notice Get forecast IDs for a market
     * @param marketId The market identifier
     * @return Array of forecast IDs
     */
    function getMarketForecastIds(bytes32 marketId) external view returns (uint256[] memory) {
        return marketForecasts[marketId];
    }

    /**
     * @notice Get a single forecast
     * @param forecastId The forecast ID
     * @return Forecast struct
     */
    function getForecast(uint256 forecastId) external view returns (Forecast memory) {
        return forecasts[forecastId];
    }

    /**
     * @notice Get multiple forecasts
     * @param ids Array of forecast IDs
     * @return Array of forecasts
     */
    function getForecasts(uint256[] calldata ids) external view returns (Forecast[] memory) {
        Forecast[] memory result = new Forecast[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = forecasts[ids[i]];
        }
        return result;
    }

    // =============================================================================
    // Internal Functions
    // =============================================================================

    /**
     * @notice Resolve a single forecast
     * @param forecastId The forecast ID
     * @param outcome The market outcome
     */
    function _resolveForecast(uint256 forecastId, bool outcome) internal {
        Forecast storage forecast = forecasts[forecastId];
        if (forecast.resolved) return;

        forecast.resolved = true;
        forecast.outcome = outcome;

        // Calculate Brier score: (probability - outcome)^2 * 10000
        // probability is 1-99, outcome is 0 or 100
        uint256 outcomeScaled = outcome ? 100 : 0;
        int256 diff = int256(forecast.probability) - int256(outcomeScaled);
        // Square the difference and scale
        forecast.brierScore = uint256((diff * diff) * 10000 / 10000);

        // Update user stats
        userStats[forecast.user].resolvedForecasts++;
        userStats[forecast.user].totalBrierScore += forecast.brierScore;

        emit ForecastResolved(forecastId, outcome, forecast.brierScore);
    }

    /**
     * @notice Convert bytes32 to string
     */
    function _bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
}
