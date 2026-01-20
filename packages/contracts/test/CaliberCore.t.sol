// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {CaliberCore} from "../src/CaliberCore.sol";
import {CaliberEASResolver} from "../src/CaliberEASResolver.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

contract CaliberCoreTest is Test {
    CaliberCore public core;
    CaliberEASResolver public resolver;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    // Mock EAS address (Base predeploy)
    address constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    function setUp() public {
        // Deploy contracts
        core = new CaliberCore(owner);

        // Note: In real tests, we'd mock the EAS contract
        // For now, we test non-EAS functionality
    }

    function test_VersionIsSet() public view {
        assertEq(core.VERSION(), "0.2.0");
    }

    function test_OwnerIsSet() public view {
        assertEq(core.owner(), owner);
    }

    function test_EASAddressIsSet() public view {
        assertEq(address(core.eas()), EAS_BASE);
    }

    function test_SetResolver() public {
        address mockResolver = address(0x123);

        core.setResolver(mockResolver);
        assertEq(core.resolver(), mockResolver);
    }

    function test_SetResolverRevertsIfZeroAddress() public {
        vm.expectRevert(CaliberCore.InvalidResolver.selector);
        core.setResolver(address(0));
    }

    function test_SetResolverRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        core.setResolver(address(0x123));
    }

    function test_SetSchemaUids() public {
        bytes32 forecastUid = keccak256("forecast");
        bytes32 calibrationUid = keccak256("calibration");
        bytes32 identityUid = keccak256("identity");
        bytes32 superforecasterUid = keccak256("superforecaster");

        core.setSchemaUids(
            forecastUid,
            calibrationUid,
            identityUid,
            superforecasterUid
        );

        assertEq(core.forecastSchemaUid(), forecastUid);
        assertEq(core.calibrationSchemaUid(), calibrationUid);
        assertEq(core.identitySchemaUid(), identityUid);
        assertEq(core.superforecasterSchemaUid(), superforecasterUid);
    }

    function test_SetSchemaUidsRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        core.setSchemaUids(
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0)
        );
    }

    function test_GetForecastCount() public view {
        assertEq(core.getForecastCount(user1), 0);
    }
}

contract CaliberEASResolverTest is Test {
    CaliberEASResolver public resolver;

    address public owner = address(this);
    address public attester = address(0x1);
    address public user = address(0x2);

    // Mock EAS address
    address constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    function setUp() public {
        // Deploy mock EAS for testing
        // In production tests, we'd use a proper mock
        vm.etch(EAS_BASE, hex"00"); // Minimal bytecode

        resolver = new CaliberEASResolver(IEAS(EAS_BASE), owner);
    }

    function test_OwnerIsAuthorizedAttester() public view {
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), owner));
    }

    function test_GrantAttesterRole() public {
        resolver.grantRole(resolver.ATTESTER_ROLE(), attester);
        assertTrue(resolver.hasRole(resolver.ATTESTER_ROLE(), attester));

        resolver.revokeRole(resolver.ATTESTER_ROLE(), attester);
        assertFalse(resolver.hasRole(resolver.ATTESTER_ROLE(), attester));
    }

    function test_GrantAttesterRoleRevertsIfNotAdmin() public {
        bytes32 attesterRole = resolver.ATTESTER_ROLE();
        vm.prank(attester);
        vm.expectRevert();
        resolver.grantRole(attesterRole, user);
    }

    function test_SetSchemaUids() public {
        bytes32 forecastUid = keccak256("forecast");
        bytes32 calibrationUid = keccak256("calibration");
        bytes32 identityUid = keccak256("identity");
        bytes32 superforecasterUid = keccak256("superforecaster");
        bytes32 reputationUid = keccak256("reputation");
        bytes32 privateDataUid = keccak256("privateData");

        resolver.setSchemaUids(
            forecastUid,
            calibrationUid,
            identityUid,
            superforecasterUid,
            reputationUid,
            privateDataUid
        );

        assertEq(resolver.forecastSchemaUid(), forecastUid);
        assertEq(resolver.calibrationSchemaUid(), calibrationUid);
        assertEq(resolver.identitySchemaUid(), identityUid);
        assertEq(resolver.superforecasterSchemaUid(), superforecasterUid);
        assertEq(resolver.reputationSchemaUid(), reputationUid);
        assertEq(resolver.privateDataSchemaUid(), privateDataUid);
    }

    function test_GetUserTier() public view {
        // Default tier should be NONE (0)
        assertEq(uint256(resolver.getUserTier(user)), 0);
    }

    function test_GetCalibrationScore() public view {
        CaliberEASResolver.CalibrationScore memory score = resolver.getCalibrationScore(user);
        assertEq(score.brierScore, 0);
        assertEq(score.totalForecasts, 0);
        assertEq(score.lastUpdated, 0);
    }

    function test_GetForecastStats() public view {
        CaliberEASResolver.ForecastStats memory stats = resolver.getForecastStats(user);
        assertEq(stats.totalForecasts, 0);
        assertEq(stats.lastForecastTimestamp, 0);
    }

    function test_IsPlatformVerified() public view {
        assertFalse(resolver.isPlatformVerified(user, "POLYMARKET"));
    }
}
