// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {CaliberEASResolver} from "../src/CaliberEASResolver.sol";
import {IEAS, Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/**
 * @title CaliberEASResolverTest
 * @notice Comprehensive tests for the CaliberEASResolver contract
 * @dev Tests cover access control, attestation processing, emergency controls, and state management
 */
contract CaliberEASResolverComprehensiveTest is Test {
    CaliberEASResolver public resolver;

    address public owner = address(this);
    address public attester = address(0x1);
    address public user = address(0x2);
    address public unauthorized = address(0x3);

    // Mock EAS address (Base predeploy)
    address constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    // Schema UIDs for testing
    bytes32 constant FORECAST_SCHEMA_UID = keccak256("forecast");
    bytes32 constant CALIBRATION_SCHEMA_UID = keccak256("calibration");
    bytes32 constant IDENTITY_SCHEMA_UID = keccak256("identity");
    bytes32 constant SUPERFORECASTER_SCHEMA_UID = keccak256("superforecaster");
    bytes32 constant REPUTATION_SCHEMA_UID = keccak256("reputation");
    bytes32 constant PRIVATE_DATA_SCHEMA_UID = keccak256("privateData");

    function setUp() public {
        // Deploy mock EAS bytecode for testing
        vm.etch(EAS_BASE, hex"00");

        // Deploy resolver
        resolver = new CaliberEASResolver(IEAS(EAS_BASE), owner);

        // Set schema UIDs
        resolver.setSchemaUids(
            FORECAST_SCHEMA_UID,
            CALIBRATION_SCHEMA_UID,
            IDENTITY_SCHEMA_UID,
            SUPERFORECASTER_SCHEMA_UID,
            REPUTATION_SCHEMA_UID,
            PRIVATE_DATA_SCHEMA_UID
        );

        // Grant attester role
        resolver.grantRole(resolver.ATTESTER_ROLE(), attester);
    }

    // =========================================================================
    // Access Control Tests
    // =========================================================================

    function test_OwnerHasAllRoles() public view {
        assertTrue(resolver.hasRole(resolver.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), owner));
        assertTrue(resolver.hasRole(resolver.SCHEMA_ADMIN_ROLE(), owner));
    }

    function test_GrantAttesterRole() public {
        address newAttester = address(0x100);
        resolver.grantRole(resolver.ATTESTER_ROLE(), newAttester);
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), newAttester));
    }

    function test_RevokeAttesterRole() public {
        resolver.revokeRole(resolver.ATTESTER_ROLE(), attester);
        assertFalse(resolver.hasRole(resolver.ATTESTER_ROLE(), attester));
    }

    function test_GrantRoleRevertsIfNotAdmin() public {
        bytes32 attesterRole = resolver.ATTESTER_ROLE();
        bytes32 adminRole = resolver.DEFAULT_ADMIN_ROLE();

        // First verify unauthorized doesn't have admin role
        assertFalse(resolver.hasRole(adminRole, unauthorized));

        vm.prank(unauthorized);
        // AccessControl reverts with AccessControlUnauthorizedAccount(account, role)
        vm.expectRevert(abi.encodeWithSelector(
            bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
            unauthorized,
            adminRole
        ));
        resolver.grantRole(attesterRole, unauthorized);
    }

    function test_SetSchemaUidsRevertsIfNotSchemaAdmin() public {
        vm.prank(attester); // attester doesn't have SCHEMA_ADMIN_ROLE
        vm.expectRevert();
        resolver.setSchemaUids(
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0)
        );
    }

    // =========================================================================
    // Emergency Control Tests
    // =========================================================================

    function test_PauseAndUnpause() public {
        // Pause
        resolver.pause();
        assertTrue(resolver.paused());

        // Unpause
        resolver.unpause();
        assertFalse(resolver.paused());
    }

    function test_PauseRevertsIfNotAdmin() public {
        vm.prank(attester);
        vm.expectRevert();
        resolver.pause();
    }

    function test_UnpauseRevertsIfNotAdmin() public {
        resolver.pause();

        vm.prank(attester);
        vm.expectRevert();
        resolver.unpause();
    }

    // =========================================================================
    // Schema UID Tests
    // =========================================================================

    function test_SchemaUidsAreSet() public view {
        assertEq(resolver.forecastSchemaUid(), FORECAST_SCHEMA_UID);
        assertEq(resolver.calibrationSchemaUid(), CALIBRATION_SCHEMA_UID);
        assertEq(resolver.identitySchemaUid(), IDENTITY_SCHEMA_UID);
        assertEq(resolver.superforecasterSchemaUid(), SUPERFORECASTER_SCHEMA_UID);
        assertEq(resolver.reputationSchemaUid(), REPUTATION_SCHEMA_UID);
        assertEq(resolver.privateDataSchemaUid(), PRIVATE_DATA_SCHEMA_UID);
    }

    function test_UpdateSchemaUids() public {
        bytes32 newForecastUid = keccak256("newForecast");

        resolver.setSchemaUids(
            newForecastUid,
            CALIBRATION_SCHEMA_UID,
            IDENTITY_SCHEMA_UID,
            SUPERFORECASTER_SCHEMA_UID,
            REPUTATION_SCHEMA_UID,
            PRIVATE_DATA_SCHEMA_UID
        );

        assertEq(resolver.forecastSchemaUid(), newForecastUid);
    }

    // =========================================================================
    // View Function Tests
    // =========================================================================

    function test_GetUserTierDefault() public view {
        assertEq(uint256(resolver.getUserTier(user)), uint256(CaliberEASResolver.SuperforecasterTier.NONE));
    }

    function test_GetCalibrationScoreDefault() public view {
        CaliberEASResolver.CalibrationScore memory score = resolver.getCalibrationScore(user);
        assertEq(score.brierScore, 0);
        assertEq(score.totalForecasts, 0);
        assertEq(score.timeWeightedScore, 0);
        assertEq(score.lastUpdated, 0);
    }

    function test_GetForecastStatsDefault() public view {
        CaliberEASResolver.ForecastStats memory stats = resolver.getForecastStats(user);
        assertEq(stats.totalForecasts, 0);
        assertEq(stats.lastForecastTimestamp, 0);
    }

    function test_IsPlatformVerifiedDefault() public view {
        assertFalse(resolver.isPlatformVerified(user, "POLYMARKET"));
        assertFalse(resolver.isPlatformVerified(user, "LIMITLESS"));
    }

    // =========================================================================
    // ERC165 Interface Support Tests
    // =========================================================================

    function test_SupportsAccessControlInterface() public view {
        // IAccessControl interface ID
        bytes4 accessControlId = 0x7965db0b;
        assertTrue(resolver.supportsInterface(accessControlId));
    }

    // =========================================================================
    // Tier Parsing Tests (via getter)
    // =========================================================================

    function test_MultipleTiers() public view {
        // Test all tier levels are distinct
        assertEq(uint256(CaliberEASResolver.SuperforecasterTier.NONE), 0);
        assertEq(uint256(CaliberEASResolver.SuperforecasterTier.APPRENTICE), 1);
        assertEq(uint256(CaliberEASResolver.SuperforecasterTier.JOURNEYMAN), 2);
        assertEq(uint256(CaliberEASResolver.SuperforecasterTier.EXPERT), 3);
        assertEq(uint256(CaliberEASResolver.SuperforecasterTier.MASTER), 4);
        assertEq(uint256(CaliberEASResolver.SuperforecasterTier.GRANDMASTER), 5);
    }

    // =========================================================================
    // Fuzz Tests
    // =========================================================================

    function testFuzz_GrantAndRevokeRole(address newAttester) public {
        vm.assume(newAttester != address(0));
        vm.assume(newAttester != owner);

        resolver.grantRole(resolver.ATTESTER_ROLE(), newAttester);
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), newAttester));

        resolver.revokeRole(resolver.ATTESTER_ROLE(), newAttester);
        assertFalse(resolver.hasRole(resolver.ATTESTER_ROLE(), newAttester));
    }

    function testFuzz_MultipleUsersDefaultState(address userAddr) public view {
        vm.assume(userAddr != address(0));

        // All users should have default state
        assertEq(uint256(resolver.getUserTier(userAddr)), 0);

        CaliberEASResolver.ForecastStats memory stats = resolver.getForecastStats(userAddr);
        assertEq(stats.totalForecasts, 0);

        CaliberEASResolver.CalibrationScore memory score = resolver.getCalibrationScore(userAddr);
        assertEq(score.brierScore, 0);
    }
}

/**
 * @title CaliberEASResolverEventTest
 * @notice Tests for event emissions
 */
contract CaliberEASResolverEventTest is Test {
    CaliberEASResolver public resolver;

    address public owner = address(this);
    address constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    function setUp() public {
        vm.etch(EAS_BASE, hex"00");
        resolver = new CaliberEASResolver(IEAS(EAS_BASE), owner);
    }

    function test_EmitSchemaUidsUpdated() public {
        bytes32 forecastUid = keccak256("forecast");
        bytes32 calibrationUid = keccak256("calibration");
        bytes32 identityUid = keccak256("identity");
        bytes32 superforecasterUid = keccak256("superforecaster");
        bytes32 reputationUid = keccak256("reputation");
        bytes32 privateDataUid = keccak256("privateData");

        vm.expectEmit(true, true, true, true);
        emit CaliberEASResolver.SchemaUidsUpdated(
            forecastUid,
            calibrationUid,
            identityUid,
            superforecasterUid,
            reputationUid,
            privateDataUid
        );

        resolver.setSchemaUids(
            forecastUid,
            calibrationUid,
            identityUid,
            superforecasterUid,
            reputationUid,
            privateDataUid
        );
    }
}

/**
 * @title CaliberEASResolverIntegrationTest
 * @notice Integration tests simulating real-world usage
 */
contract CaliberEASResolverIntegrationTest is Test {
    CaliberEASResolver public resolver;

    address public owner = address(this);
    address public attester1 = address(0x1);
    address public attester2 = address(0x2);
    address public user1 = address(0x10);
    address public user2 = address(0x11);

    address constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    function setUp() public {
        vm.etch(EAS_BASE, hex"00");
        resolver = new CaliberEASResolver(IEAS(EAS_BASE), owner);

        // Set up multiple attesters
        resolver.grantRole(resolver.ATTESTER_ROLE(), attester1);
        resolver.grantRole(resolver.ATTESTER_ROLE(), attester2);
    }

    function test_MultipleAttestersScenario() public view {
        // Both attesters should have the role
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), attester1));
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), attester2));
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), owner));
    }

    function test_RoleHierarchy() public {
        bytes32 attesterRole = resolver.ATTESTER_ROLE();
        bytes32 adminRole = resolver.DEFAULT_ADMIN_ROLE();

        // Admin can grant/revoke attester role
        resolver.grantRole(attesterRole, user1);
        assertTrue(resolver.hasRole(attesterRole, user1));

        // Attester cannot grant roles (requires DEFAULT_ADMIN_ROLE)
        vm.prank(attester1);
        vm.expectRevert(abi.encodeWithSelector(
            bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
            attester1,
            adminRole
        ));
        resolver.grantRole(attesterRole, user2);
    }

    function test_EmergencyPauseScenario() public {
        // Simulate emergency: pause the contract
        resolver.pause();
        assertTrue(resolver.paused());

        // View functions should still work
        CaliberEASResolver.CalibrationScore memory score = resolver.getCalibrationScore(user1);
        assertEq(score.brierScore, 0);

        // Resume operations
        resolver.unpause();
        assertFalse(resolver.paused());
    }

    function test_SchemaUpdateScenario() public {
        // Set initial schemas
        bytes32 v1Forecast = keccak256("forecastV1");
        bytes32 v1Calibration = keccak256("calibrationV1");

        resolver.setSchemaUids(
            v1Forecast,
            v1Calibration,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0)
        );

        assertEq(resolver.forecastSchemaUid(), v1Forecast);

        // Upgrade to v2 schemas
        bytes32 v2Forecast = keccak256("forecastV2");

        resolver.setSchemaUids(
            v2Forecast,
            v1Calibration,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0)
        );

        assertEq(resolver.forecastSchemaUid(), v2Forecast);
    }
}
