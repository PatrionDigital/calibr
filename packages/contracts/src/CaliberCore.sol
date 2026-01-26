// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    IEAS,
    AttestationRequest,
    AttestationRequestData
} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/**
 * @title CaliberCore
 * @author Calibr.xyz Team
 * @notice Main contract for Calibr.xyz prediction market aggregation
 * @dev Integrates with EAS for attestations on Base network
 */
contract CaliberCore is Ownable {
    // =============================================================================
    // Events
    // =============================================================================

    event ForecastRegistered(
        address indexed user,
        bytes32 indexed marketId,
        uint256 probability,
        bytes32 easUid
    );

    event ResolverUpdated(address indexed oldResolver, address indexed newResolver);
    event SchemaUidUpdated(bytes32 indexed schemaType, bytes32 uid);

    // =============================================================================
    // Errors
    // =============================================================================

    error InvalidProbability();
    error InvalidEAS();
    error InvalidResolver();

    // =============================================================================
    // Constants
    // =============================================================================

    /// @notice Contract version
    string public constant VERSION = "0.2.0";

    /// @notice EAS contract address on Base (predeploy)
    address public constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    // =============================================================================
    // State Variables
    // =============================================================================

    /// @notice EAS contract interface
    IEAS public immutable eas;

    /// @notice CaliberEASResolver address
    address public resolver;

    /// @notice Schema UIDs
    bytes32 public forecastSchemaUid;
    bytes32 public calibrationSchemaUid;
    bytes32 public identitySchemaUid;
    bytes32 public superforecasterSchemaUid;

    /// @notice Forecast counter per user
    mapping(address => uint256) public forecastCount;

    // =============================================================================
    // Constructor
    // =============================================================================

    /**
     * @notice Creates a new CaliberCore contract
     * @param initialOwner The initial owner address
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        eas = IEAS(EAS_BASE);
    }

    // =============================================================================
    // External Functions - Admin
    // =============================================================================

    /**
     * @notice Set the resolver address
     * @param _resolver The new resolver address
     */
    function setResolver(address _resolver) external onlyOwner {
        if (_resolver == address(0)) revert InvalidResolver();
        address oldResolver = resolver;
        resolver = _resolver;
        emit ResolverUpdated(oldResolver, _resolver);
    }

    /**
     * @notice Set schema UIDs
     * @param _forecastSchemaUid Forecast schema UID
     * @param _calibrationSchemaUid Calibration schema UID
     * @param _identitySchemaUid Identity schema UID
     * @param _superforecasterSchemaUid Superforecaster schema UID
     */
    function setSchemaUids(
        bytes32 _forecastSchemaUid,
        bytes32 _calibrationSchemaUid,
        bytes32 _identitySchemaUid,
        bytes32 _superforecasterSchemaUid
    ) external onlyOwner {
        forecastSchemaUid = _forecastSchemaUid;
        calibrationSchemaUid = _calibrationSchemaUid;
        identitySchemaUid = _identitySchemaUid;
        superforecasterSchemaUid = _superforecasterSchemaUid;

        emit SchemaUidUpdated(keccak256("FORECAST"), _forecastSchemaUid);
        emit SchemaUidUpdated(keccak256("CALIBRATION"), _calibrationSchemaUid);
        emit SchemaUidUpdated(keccak256("IDENTITY"), _identitySchemaUid);
        emit SchemaUidUpdated(keccak256("SUPERFORECASTER"), _superforecasterSchemaUid);
    }

    // =============================================================================
    // External Functions - Forecasting
    // =============================================================================

    /**
     * @notice Register a forecast and create an EAS attestation
     * @param marketId The market identifier (hashed)
     * @param probability The forecasted probability (1-99, representing 0.01-0.99)
     * @param platform The platform name
     * @param confidence The confidence level (0-100)
     * @param reasoning The reasoning text (can be empty for privacy)
     * @param isPublic Whether the forecast is public
     * @return uid The attestation UID
     */
    function registerForecast(
        bytes32 marketId,
        uint256 probability,
        string calldata platform,
        uint256 confidence,
        string calldata reasoning,
        bool isPublic
    ) external returns (bytes32 uid) {
        // Validate probability
        if (probability < 1 || probability > 99) revert InvalidProbability();

        // Encode attestation data
        bytes memory data = abi.encode(
            probability,
            _bytes32ToString(marketId),
            platform,
            confidence,
            reasoning,
            isPublic
        );

        // Create attestation request
        AttestationRequest memory request = AttestationRequest({
            schema: forecastSchemaUid,
            data: AttestationRequestData({
                recipient: msg.sender,
                expirationTime: 0, // No expiration
                revocable: true,
                refUID: bytes32(0),
                data: data,
                value: 0
            })
        });

        // Submit attestation to EAS
        uid = eas.attest(request);

        // Update state
        forecastCount[msg.sender]++;

        emit ForecastRegistered(msg.sender, marketId, probability, uid);

        return uid;
    }

    // =============================================================================
    // External Functions - View
    // =============================================================================

    /**
     * @notice Get the forecast count for a user
     * @param user The user address
     * @return The number of forecasts
     */
    function getForecastCount(address user) external view returns (uint256) {
        return forecastCount[user];
    }

    // =============================================================================
    // Internal Functions
    // =============================================================================

    /**
     * @notice Convert bytes32 to string
     * @param _bytes32 The bytes32 value
     * @return The string representation
     */
    function _bytes32ToString(
        bytes32 _bytes32
    ) internal pure returns (string memory) {
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
