// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/ISchemaResolver.sol";
import {IEAS, Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CaliberEASResolver
 * @author Calibr.ly Team
 * @notice Custom EAS resolver for Calibr.ly attestations on Base network
 * @dev Validates attestations and maintains on-chain state for calibration scores and tiers
 *
 * Security features (OpenZeppelin best practices):
 * - AccessControl: Role-based permission management for attesters and admins
 * - Pausable: Emergency stop mechanism for incident response
 * - ReentrancyGuard: Protection against reentrancy attacks
 *
 * @custom:security-contact security@calibr.ly
 */
contract CaliberEASResolver is SchemaResolver, AccessControl, Pausable, ReentrancyGuard {
    // =============================================================================
    // Constants - Roles
    // =============================================================================

    /// @notice Role for addresses that can create attestations
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    /// @notice Role for addresses that can manage schema UIDs
    bytes32 public constant SCHEMA_ADMIN_ROLE = keccak256("SCHEMA_ADMIN_ROLE");
    // =============================================================================
    // Events
    // =============================================================================

    event SchemaUidsUpdated(
        bytes32 forecastSchemaUid,
        bytes32 calibrationSchemaUid,
        bytes32 identitySchemaUid,
        bytes32 superforecasterSchemaUid,
        bytes32 reputationSchemaUid,
        bytes32 privateDataSchemaUid
    );
    event CalibrationScoreUpdated(
        address indexed user,
        uint256 brierScore,
        uint256 totalForecasts,
        uint256 timestamp
    );
    event TierUpdated(address indexed user, SuperforecasterTier tier, uint256 timestamp);
    event ForecastAttested(
        address indexed user,
        string marketId,
        uint256 probability,
        uint256 timestamp
    );

    // =============================================================================
    // Errors
    // =============================================================================

    error UnauthorizedAttester();
    error InvalidProbability();
    error InvalidConfidence();
    error InvalidSchemaUid();

    // =============================================================================
    // Types
    // =============================================================================

    enum SuperforecasterTier {
        NONE,
        APPRENTICE,
        JOURNEYMAN,
        EXPERT,
        MASTER,
        GRANDMASTER
    }

    struct CalibrationScore {
        uint256 brierScore; // Scaled by 10000 (0.25 = 2500)
        uint256 totalForecasts;
        uint256 timeWeightedScore; // Scaled by 10000
        uint256 lastUpdated;
    }

    struct ForecastStats {
        uint256 totalForecasts;
        uint256 lastForecastTimestamp;
    }

    // =============================================================================
    // State Variables
    // =============================================================================

    /// @notice Schema UIDs (set after deployment via setSchemaUids)
    bytes32 public forecastSchemaUid;
    bytes32 public calibrationSchemaUid;
    bytes32 public identitySchemaUid;
    bytes32 public superforecasterSchemaUid;
    bytes32 public reputationSchemaUid;
    bytes32 public privateDataSchemaUid;

    /// @notice User calibration scores
    mapping(address => CalibrationScore) public calibrationScores;

    /// @notice User superforecaster tiers
    mapping(address => SuperforecasterTier) public userTiers;

    /// @notice User forecast statistics
    mapping(address => ForecastStats) public forecastStats;

    /// @notice Platform identity links (user => platform => verified)
    mapping(address => mapping(string => bool)) public platformIdentities;

    // =============================================================================
    // Constructor
    // =============================================================================

    /**
     * @notice Creates a new CaliberEASResolver
     * @param eas The address of the EAS contract on Base
     * @param initialAdmin The initial admin address (receives all roles)
     */
    constructor(
        IEAS eas,
        address initialAdmin
    ) SchemaResolver(eas) {
        // Grant all roles to the initial admin
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ATTESTER_ROLE, initialAdmin);
        _grantRole(SCHEMA_ADMIN_ROLE, initialAdmin);
    }

    // =============================================================================
    // External Functions - Emergency Controls
    // =============================================================================

    /**
     * @notice Pause the contract (emergency stop)
     * @dev Only callable by addresses with DEFAULT_ADMIN_ROLE
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     * @dev Only callable by addresses with DEFAULT_ADMIN_ROLE
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =============================================================================
    // External Functions - Admin
    // =============================================================================

    /**
     * @notice Set the schema UIDs after deployment
     * @dev These UIDs are obtained after registering schemas on the Schema Registry
     * @dev Only callable by addresses with SCHEMA_ADMIN_ROLE
     */
    function setSchemaUids(
        bytes32 _forecastSchemaUid,
        bytes32 _calibrationSchemaUid,
        bytes32 _identitySchemaUid,
        bytes32 _superforecasterSchemaUid,
        bytes32 _reputationSchemaUid,
        bytes32 _privateDataSchemaUid
    ) external onlyRole(SCHEMA_ADMIN_ROLE) {
        forecastSchemaUid = _forecastSchemaUid;
        calibrationSchemaUid = _calibrationSchemaUid;
        identitySchemaUid = _identitySchemaUid;
        superforecasterSchemaUid = _superforecasterSchemaUid;
        reputationSchemaUid = _reputationSchemaUid;
        privateDataSchemaUid = _privateDataSchemaUid;

        emit SchemaUidsUpdated(
            _forecastSchemaUid,
            _calibrationSchemaUid,
            _identitySchemaUid,
            _superforecasterSchemaUid,
            _reputationSchemaUid,
            _privateDataSchemaUid
        );
    }

    // =============================================================================
    // External Functions - View
    // =============================================================================

    /**
     * @notice Get a user's current calibration score
     * @param user The user address
     * @return The calibration score struct
     */
    function getCalibrationScore(
        address user
    ) external view returns (CalibrationScore memory) {
        return calibrationScores[user];
    }

    /**
     * @notice Get a user's superforecaster tier
     * @param user The user address
     * @return The tier enum value
     */
    function getUserTier(address user) external view returns (SuperforecasterTier) {
        return userTiers[user];
    }

    /**
     * @notice Get a user's forecast statistics
     * @param user The user address
     * @return The forecast stats struct
     */
    function getForecastStats(
        address user
    ) external view returns (ForecastStats memory) {
        return forecastStats[user];
    }

    /**
     * @notice Check if a user has verified a specific platform identity
     * @param user The user address
     * @param platform The platform name (e.g., "POLYMARKET")
     * @return Whether the identity is verified
     */
    function isPlatformVerified(
        address user,
        string calldata platform
    ) external view returns (bool) {
        return platformIdentities[user][platform];
    }

    // =============================================================================
    // Internal Functions - Attestation Handlers
    // =============================================================================

    /**
     * @inheritdoc SchemaResolver
     * @dev Called when a new attestation is created
     * @dev Includes whenNotPaused modifier for emergency stop capability
     */
    function onAttest(
        Attestation calldata attestation,
        uint256 /* value */
    ) internal override whenNotPaused returns (bool) {
        // Verify attester has the ATTESTER_ROLE
        if (!hasRole(ATTESTER_ROLE, attestation.attester)) {
            revert UnauthorizedAttester();
        }

        // Route to appropriate handler based on schema
        bytes32 schema = attestation.schema;

        if (schema == forecastSchemaUid && forecastSchemaUid != bytes32(0)) {
            return _processForecastAttestation(attestation);
        } else if (schema == calibrationSchemaUid && calibrationSchemaUid != bytes32(0)) {
            return _processCalibrationAttestation(attestation);
        } else if (schema == identitySchemaUid && identitySchemaUid != bytes32(0)) {
            return _processIdentityAttestation(attestation);
        } else if (schema == superforecasterSchemaUid && superforecasterSchemaUid != bytes32(0)) {
            return _processSuperforecasterAttestation(attestation);
        } else if (schema == reputationSchemaUid && reputationSchemaUid != bytes32(0)) {
            return _processReputationAttestation(attestation);
        } else if (schema == privateDataSchemaUid && privateDataSchemaUid != bytes32(0)) {
            return _processPrivateDataAttestation(attestation);
        }

        // Unknown schema - still allow if attester is authorized
        return true;
    }

    /**
     * @inheritdoc SchemaResolver
     * @dev Called when an attestation is revoked
     */
    function onRevoke(
        Attestation calldata attestation,
        uint256 /* value */
    ) internal override returns (bool) {
        // Only authorized attesters can revoke
        if (!hasRole(ATTESTER_ROLE, attestation.attester)) {
            revert UnauthorizedAttester();
        }

        // Handle identity revocation
        if (attestation.schema == identitySchemaUid && identitySchemaUid != bytes32(0)) {
            (string memory platform, , , , ) = abi.decode(
                attestation.data,
                (string, string, bytes32, bool, uint256)
            );
            platformIdentities[attestation.recipient][platform] = false;
        }

        return true;
    }

    // =============================================================================
    // Private Functions - Schema Processors
    // =============================================================================

    /**
     * @notice Process a forecast attestation
     * @dev Schema: uint256 probability, string marketId, string platform, uint256 confidence, string reasoning, bool isPublic
     */
    function _processForecastAttestation(
        Attestation calldata attestation
    ) private returns (bool) {
        (
            uint256 probability,
            string memory marketId,
            , // platform
            uint256 confidence,
            , // reasoning
            // isPublic
        ) = abi.decode(
                attestation.data,
                (uint256, string, string, uint256, string, bool)
            );

        // Validate probability (1-99, representing 0.01-0.99)
        if (probability < 1 || probability > 99) {
            revert InvalidProbability();
        }

        // Validate confidence (0-100)
        if (confidence > 100) {
            revert InvalidConfidence();
        }

        // Update forecast stats
        ForecastStats storage stats = forecastStats[attestation.recipient];
        stats.totalForecasts++;
        stats.lastForecastTimestamp = block.timestamp;

        emit ForecastAttested(
            attestation.recipient,
            marketId,
            probability,
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Process a calibration score attestation
     * @dev Schema: uint256 brierScore, uint256 totalForecasts, uint256 timeWeightedScore, uint256 period, string category
     */
    function _processCalibrationAttestation(
        Attestation calldata attestation
    ) private returns (bool) {
        (
            uint256 brierScore,
            uint256 totalForecasts,
            uint256 timeWeightedScore,
            , // period
            // category
        ) = abi.decode(
                attestation.data,
                (uint256, uint256, uint256, uint256, string)
            );

        // Update calibration score
        calibrationScores[attestation.recipient] = CalibrationScore({
            brierScore: brierScore,
            totalForecasts: totalForecasts,
            timeWeightedScore: timeWeightedScore,
            lastUpdated: block.timestamp
        });

        emit CalibrationScoreUpdated(
            attestation.recipient,
            brierScore,
            totalForecasts,
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Process an identity attestation
     * @dev Schema: string platform, string platformUserId, bytes32 proofHash, bool verified, uint256 verifiedAt
     */
    function _processIdentityAttestation(
        Attestation calldata attestation
    ) private returns (bool) {
        (
            string memory platform,
            , // platformUserId
            , // proofHash
            bool verified,
            // verifiedAt
        ) = abi.decode(
                attestation.data,
                (string, string, bytes32, bool, uint256)
            );

        // Update platform identity
        platformIdentities[attestation.recipient][platform] = verified;

        return true;
    }

    /**
     * @notice Process a superforecaster badge attestation
     * @dev Schema: string tier, uint256 score, uint256 period, string category, uint256 rank
     */
    function _processSuperforecasterAttestation(
        Attestation calldata attestation
    ) private returns (bool) {
        (string memory tierStr, , , , ) = abi.decode(
            attestation.data,
            (string, uint256, uint256, string, uint256)
        );

        SuperforecasterTier tier = _parseTier(tierStr);
        userTiers[attestation.recipient] = tier;

        emit TierUpdated(attestation.recipient, tier, block.timestamp);

        return true;
    }

    /**
     * @notice Process a reputation attestation
     * @dev Schema: string platform, uint256 totalVolume, uint256 winRate, uint256 profitLoss, string verificationLevel
     */
    function _processReputationAttestation(
        Attestation calldata /* attestation */
    ) private pure returns (bool) {
        // Reputation attestations are informational only
        // No on-chain state changes needed
        return true;
    }

    /**
     * @notice Process a private data attestation
     * @dev Schema: bytes32 merkleRoot, string dataType, uint256 fieldCount
     */
    function _processPrivateDataAttestation(
        Attestation calldata /* attestation */
    ) private pure returns (bool) {
        // Private data attestations store only merkle root
        // Validation happens off-chain via selective disclosure
        return true;
    }

    // =============================================================================
    // Public Functions - ERC165
    // =============================================================================

    /**
     * @notice Check if the contract supports an interface
     * @dev Required to resolve AccessControl's ERC165 implementation
     * @param interfaceId The interface identifier to check
     * @return True if the interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControl) returns (bool) {
        return
            interfaceId == type(ISchemaResolver).interfaceId ||
            AccessControl.supportsInterface(interfaceId);
    }

    // =============================================================================
    // Private Functions - Helpers
    // =============================================================================

    /**
     * @notice Parse a tier string to enum
     * @param tierStr The tier string (e.g., "MASTER")
     * @return The corresponding enum value
     */
    function _parseTier(
        string memory tierStr
    ) private pure returns (SuperforecasterTier) {
        bytes32 tierHash = keccak256(bytes(tierStr));

        if (tierHash == keccak256("GRANDMASTER")) {
            return SuperforecasterTier.GRANDMASTER;
        }
        if (tierHash == keccak256("MASTER")) {
            return SuperforecasterTier.MASTER;
        }
        if (tierHash == keccak256("EXPERT")) {
            return SuperforecasterTier.EXPERT;
        }
        if (tierHash == keccak256("JOURNEYMAN")) {
            return SuperforecasterTier.JOURNEYMAN;
        }
        if (tierHash == keccak256("APPRENTICE")) {
            return SuperforecasterTier.APPRENTICE;
        }

        return SuperforecasterTier.NONE;
    }
}
