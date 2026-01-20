// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {ForecastRegistry} from "../src/ForecastRegistry.sol";
import {
    IEAS,
    AttestationRequest,
    AttestationRequestData,
    DelegatedAttestationRequest,
    MultiAttestationRequest,
    MultiDelegatedAttestationRequest,
    RevocationRequest,
    DelegatedRevocationRequest,
    MultiRevocationRequest,
    MultiDelegatedRevocationRequest
} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";

contract MockEAS is IEAS {
    uint256 private _attestationCounter;
    mapping(bytes32 => bool) public attestations;

    function attest(AttestationRequest calldata) external payable returns (bytes32) {
        _attestationCounter++;
        bytes32 uid = keccak256(abi.encodePacked(_attestationCounter, block.timestamp, msg.sender));
        attestations[uid] = true;
        return uid;
    }

    // Required interface functions
    function version() external pure returns (string memory) { return "1.0.0"; }
    function getSchemaRegistry() external pure returns (ISchemaRegistry) { return ISchemaRegistry(address(0)); }

    // Unused IEAS functions - minimal implementation
    function attestByDelegation(DelegatedAttestationRequest calldata) external payable returns (bytes32) { return bytes32(0); }
    function multiAttest(MultiAttestationRequest[] calldata) external payable returns (bytes32[] memory) { return new bytes32[](0); }
    function multiAttestByDelegation(MultiDelegatedAttestationRequest[] calldata) external payable returns (bytes32[] memory) { return new bytes32[](0); }
    function revoke(RevocationRequest calldata) external payable {}
    function revokeByDelegation(DelegatedRevocationRequest calldata) external payable {}
    function multiRevoke(MultiRevocationRequest[] calldata) external payable {}
    function multiRevokeByDelegation(MultiDelegatedRevocationRequest[] calldata) external payable {}
    function revokeOffchain(bytes32) external returns (uint64) { return 0; }
    function multiRevokeOffchain(bytes32[] calldata) external returns (uint64) { return 0; }
    function timestamp(bytes32) external returns (uint64) { return 0; }
    function multiTimestamp(bytes32[] calldata) external returns (uint64) { return 0; }
    function getAttestation(bytes32) external pure returns (Attestation memory) {
        return Attestation(bytes32(0), bytes32(0), 0, 0, 0, bytes32(0), address(0), address(0), false, "");
    }
    function isAttestationValid(bytes32) external pure returns (bool) { return true; }
    function getTimestamp(bytes32) external pure returns (uint64) { return 0; }
    function getRevokeOffchain(address, bytes32) external pure returns (uint64) { return 0; }
}

contract ForecastRegistryTest is Test {
    ForecastRegistry public registry;
    MockEAS public mockEAS;

    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public resolver = address(4);

    bytes32 public constant MARKET_ID_1 = keccak256("MARKET_1");
    bytes32 public constant MARKET_ID_2 = keccak256("MARKET_2");
    bytes32 public constant SCHEMA_UID = keccak256("FORECAST_SCHEMA");

    function setUp() public {
        mockEAS = new MockEAS();
        registry = new ForecastRegistry(address(mockEAS), owner);

        vm.startPrank(owner);
        registry.setForecastSchemaUid(SCHEMA_UID);
        registry.setAuthorizedResolver(resolver, true);
        vm.stopPrank();
    }

    function test_CreateForecast() public {
        vm.prank(user1);
        (uint256 forecastId, bytes32 easUid) = registry.createForecast(
            MARKET_ID_1,
            70, // 70% probability
            80, // 80% confidence
            "polymarket",
            "Strong historical correlation",
            true
        );

        assertEq(forecastId, 1);
        assertTrue(easUid != bytes32(0));

        // Get forecast using the getter function
        ForecastRegistry.Forecast memory forecast = registry.getForecast(forecastId);
        assertEq(forecast.id, 1);
        assertEq(forecast.user, user1);
        assertEq(forecast.marketId, MARKET_ID_1);
        assertEq(forecast.probability, 70);
        assertEq(forecast.confidence, 80);
        assertFalse(forecast.resolved);
    }

    function test_CreateForecast_InvalidProbability() public {
        vm.prank(user1);
        vm.expectRevert(ForecastRegistry.InvalidProbability.selector);
        registry.createForecast(MARKET_ID_1, 0, 80, "polymarket", "test", true);

        vm.prank(user1);
        vm.expectRevert(ForecastRegistry.InvalidProbability.selector);
        registry.createForecast(MARKET_ID_1, 100, 80, "polymarket", "test", true);
    }

    function test_ResolveMarket() public {
        // Create forecasts
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "bullish", true);

        vm.prank(user2);
        registry.createForecast(MARKET_ID_1, 30, 60, "polymarket", "bearish", true);

        // Resolve market
        vm.prank(resolver);
        registry.resolveMarket(MARKET_ID_1, true); // YES outcome

        // Check market resolved
        (bytes32 id, bool resolved, bool outcome, uint256 resolvedAt) = registry.markets(MARKET_ID_1);
        assertTrue(resolved);
        assertTrue(outcome);
        assertEq(id, MARKET_ID_1);
        assertTrue(resolvedAt > 0);

        // Check forecasts resolved with Brier scores
        ForecastRegistry.Forecast memory f1 = registry.getForecast(1);
        ForecastRegistry.Forecast memory f2 = registry.getForecast(2);

        assertTrue(f1.resolved);
        assertTrue(f2.resolved);

        // User1 predicted 70% YES, outcome was YES (100)
        // Brier = (70 - 100)^2 = 900
        assertEq(f1.brierScore, 900);

        // User2 predicted 30% YES, outcome was YES (100)
        // Brier = (30 - 100)^2 = 4900
        assertEq(f2.brierScore, 4900);
    }

    function test_ResolveMarket_Unauthorized() public {
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test", true);

        vm.prank(user1);
        vm.expectRevert(ForecastRegistry.Unauthorized.selector);
        registry.resolveMarket(MARKET_ID_1, true);
    }

    function test_ResolveMarket_AlreadyResolved() public {
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test", true);

        vm.prank(resolver);
        registry.resolveMarket(MARKET_ID_1, true);

        vm.prank(resolver);
        vm.expectRevert(ForecastRegistry.MarketAlreadyResolved.selector);
        registry.resolveMarket(MARKET_ID_1, false);
    }

    function test_CreateForecast_MarketAlreadyResolved() public {
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test", true);

        vm.prank(resolver);
        registry.resolveMarket(MARKET_ID_1, true);

        vm.prank(user2);
        vm.expectRevert(ForecastRegistry.MarketAlreadyResolved.selector);
        registry.createForecast(MARKET_ID_1, 50, 50, "polymarket", "late", true);
    }

    function test_GetUserAverageBrierScore() public {
        // Create multiple forecasts for user1
        vm.startPrank(user1);
        registry.createForecast(MARKET_ID_1, 80, 80, "polymarket", "test1", true);
        registry.createForecast(MARKET_ID_2, 20, 60, "polymarket", "test2", true);
        vm.stopPrank();

        // Resolve markets
        vm.startPrank(resolver);
        registry.resolveMarket(MARKET_ID_1, true);  // Brier: (80-100)^2 = 400
        registry.resolveMarket(MARKET_ID_2, false); // Brier: (20-0)^2 = 400
        vm.stopPrank();

        // Average = (400 + 400) / 2 = 400
        uint256 avgBrier = registry.getUserAverageBrierScore(user1);
        assertEq(avgBrier, 400);
    }

    function test_GetUserForecastIds() public {
        vm.startPrank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test1", true);
        registry.createForecast(MARKET_ID_2, 60, 70, "polymarket", "test2", true);
        vm.stopPrank();

        uint256[] memory ids = registry.getUserForecastIds(user1);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
    }

    function test_GetMarketForecastIds() public {
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test1", true);

        vm.prank(user2);
        registry.createForecast(MARKET_ID_1, 60, 70, "polymarket", "test2", true);

        uint256[] memory ids = registry.getMarketForecastIds(MARKET_ID_1);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
    }

    function test_GetForecasts() public {
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test1", true);

        vm.prank(user2);
        registry.createForecast(MARKET_ID_2, 60, 70, "polymarket", "test2", true);

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        ForecastRegistry.Forecast[] memory forecasts = registry.getForecasts(ids);
        assertEq(forecasts.length, 2);
        assertEq(forecasts[0].probability, 70);
        assertEq(forecasts[1].probability, 60);
    }

    function test_UserStats() public {
        vm.prank(user1);
        registry.createForecast(MARKET_ID_1, 70, 80, "polymarket", "test", true);

        (uint256 totalForecasts, uint256 resolvedForecasts, uint256 totalBrierScore) = registry.userStats(user1);
        assertEq(totalForecasts, 1);
        assertEq(resolvedForecasts, 0);
        assertEq(totalBrierScore, 0);

        vm.prank(resolver);
        registry.resolveMarket(MARKET_ID_1, true);

        (totalForecasts, resolvedForecasts, totalBrierScore) = registry.userStats(user1);
        assertEq(totalForecasts, 1);
        assertEq(resolvedForecasts, 1);
    }
}
