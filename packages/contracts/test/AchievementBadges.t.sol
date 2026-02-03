// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {AchievementBadges} from "../src/AchievementBadges.sol";

contract AchievementBadgesTest is Test {
    AchievementBadges public achievements;

    address public owner = address(1);
    address public minter = address(2);
    address public user1 = address(3);
    address public user2 = address(4);

    bytes32 public constant EAS_UID_1 = keccak256("achievement_attestation_1");
    bytes32 public constant EAS_UID_2 = keccak256("achievement_attestation_2");

    function setUp() public {
        achievements = new AchievementBadges(owner);

        vm.prank(owner);
        achievements.setAuthorizedMinter(minter, true);
    }

    // =========================================================================
    // Initial State
    // =========================================================================

    function test_InitialState() public view {
        assertEq(achievements.name(), "Calibr Achievement Badge");
        assertEq(achievements.symbol(), "CALIBR-ACH");
        assertTrue(achievements.authorizedMinters(owner));
        assertTrue(achievements.authorizedMinters(minter));
    }

    // =========================================================================
    // Achievement Registration
    // =========================================================================

    function test_RegisterAchievement() public {
        vm.prank(owner);
        achievements.registerAchievement(
            "streak-7",
            "7 Day Streak",
            "Forecast for 7 consecutive days",
            AchievementBadges.Category.STREAK,
            7
        );

        AchievementBadges.AchievementDef memory def = achievements.getAchievementDef("streak-7");
        assertEq(def.name, "7 Day Streak");
        assertEq(def.description, "Forecast for 7 consecutive days");
        assertEq(uint256(def.category), uint256(AchievementBadges.Category.STREAK));
        assertEq(def.targetValue, 7);
        assertTrue(def.active);
    }

    function test_RegisterAchievement_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        achievements.registerAchievement(
            "streak-7",
            "7 Day Streak",
            "Forecast for 7 consecutive days",
            AchievementBadges.Category.STREAK,
            7
        );
    }

    function test_RegisterAchievement_DuplicateId() public {
        vm.startPrank(owner);
        achievements.registerAchievement(
            "streak-7", "7 Day Streak", "desc",
            AchievementBadges.Category.STREAK, 7
        );

        vm.expectRevert(AchievementBadges.AchievementAlreadyExists.selector);
        achievements.registerAchievement(
            "streak-7", "Another Name", "desc",
            AchievementBadges.Category.STREAK, 7
        );
        vm.stopPrank();
    }

    function test_DeactivateAchievement() public {
        vm.startPrank(owner);
        achievements.registerAchievement(
            "streak-7", "7 Day Streak", "desc",
            AchievementBadges.Category.STREAK, 7
        );
        achievements.setAchievementActive("streak-7", false);
        vm.stopPrank();

        AchievementBadges.AchievementDef memory def = achievements.getAchievementDef("streak-7");
        assertFalse(def.active);
    }

    // =========================================================================
    // Minting
    // =========================================================================

    function test_MintAchievement() public {
        _registerStreakAchievement();

        vm.prank(minter);
        uint256 tokenId = achievements.mintAchievement(
            user1,
            "streak-7",
            7,
            EAS_UID_1
        );

        assertEq(tokenId, 1);
        assertEq(achievements.ownerOf(tokenId), user1);
        assertEq(achievements.balanceOf(user1), 1);
    }

    function test_MintAchievement_StoresData() public {
        _registerStreakAchievement();

        vm.prank(minter);
        uint256 tokenId = achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);

        AchievementBadges.AchievementToken memory token = achievements.getAchievementToken(tokenId);
        assertEq(token.achievementId, "streak-7");
        assertEq(token.value, 7);
        assertEq(token.easUid, EAS_UID_1);
        assertTrue(token.awardedAt > 0);
    }

    function test_MintAchievement_EmitsEvent() public {
        _registerStreakAchievement();

        vm.prank(minter);
        vm.expectEmit(true, true, false, true);
        emit AchievementBadges.AchievementMinted(user1, 1, "streak-7", 7);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
    }

    function test_MintAchievement_Unauthorized() public {
        _registerStreakAchievement();

        vm.prank(user1);
        vm.expectRevert(AchievementBadges.Unauthorized.selector);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
    }

    function test_MintAchievement_UnregisteredId() public {
        vm.prank(minter);
        vm.expectRevert(AchievementBadges.AchievementNotFound.selector);
        achievements.mintAchievement(user1, "nonexistent", 7, EAS_UID_1);
    }

    function test_MintAchievement_Duplicate() public {
        _registerStreakAchievement();

        vm.startPrank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);

        vm.expectRevert(AchievementBadges.AchievementAlreadyEarned.selector);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_2);
        vm.stopPrank();
    }

    function test_MintAchievement_InactiveAchievement() public {
        _registerStreakAchievement();

        vm.prank(owner);
        achievements.setAchievementActive("streak-7", false);

        vm.prank(minter);
        vm.expectRevert(AchievementBadges.AchievementNotActive.selector);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
    }

    // =========================================================================
    // Multiple Achievements
    // =========================================================================

    function test_MultipleAchievements_SameUser() public {
        _registerStreakAchievement();
        _registerAccuracyAchievement();

        vm.startPrank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
        achievements.mintAchievement(user1, "accuracy-70", 75, EAS_UID_2);
        vm.stopPrank();

        assertEq(achievements.balanceOf(user1), 2);
        assertTrue(achievements.hasAchievement(user1, "streak-7"));
        assertTrue(achievements.hasAchievement(user1, "accuracy-70"));
    }

    function test_MultipleAchievements_DifferentUsers() public {
        _registerStreakAchievement();

        vm.startPrank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
        achievements.mintAchievement(user2, "streak-7", 7, EAS_UID_2);
        vm.stopPrank();

        assertEq(achievements.balanceOf(user1), 1);
        assertEq(achievements.balanceOf(user2), 1);
        assertTrue(achievements.hasAchievement(user1, "streak-7"));
        assertTrue(achievements.hasAchievement(user2, "streak-7"));
    }

    // =========================================================================
    // User Achievements Query
    // =========================================================================

    function test_GetUserAchievements() public {
        _registerStreakAchievement();
        _registerAccuracyAchievement();

        vm.startPrank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
        achievements.mintAchievement(user1, "accuracy-70", 75, EAS_UID_2);
        vm.stopPrank();

        uint256[] memory tokens = achievements.getUserAchievements(user1);
        assertEq(tokens.length, 2);
        assertEq(tokens[0], 1);
        assertEq(tokens[1], 2);
    }

    function test_GetUserAchievementCount() public {
        _registerStreakAchievement();
        _registerAccuracyAchievement();

        assertEq(achievements.getUserAchievementCount(user1), 0);

        vm.startPrank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
        vm.stopPrank();

        assertEq(achievements.getUserAchievementCount(user1), 1);
    }

    function test_HasAchievement() public {
        _registerStreakAchievement();

        assertFalse(achievements.hasAchievement(user1, "streak-7"));

        vm.prank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);

        assertTrue(achievements.hasAchievement(user1, "streak-7"));
    }

    // =========================================================================
    // Soulbound (Non-transferable)
    // =========================================================================

    function test_Soulbound_NoTransfer() public {
        _registerStreakAchievement();

        vm.prank(minter);
        uint256 tokenId = achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);

        vm.prank(user1);
        vm.expectRevert(AchievementBadges.SoulboundToken.selector);
        achievements.transferFrom(user1, user2, tokenId);
    }

    function test_Soulbound_NoSafeTransfer() public {
        _registerStreakAchievement();

        vm.prank(minter);
        uint256 tokenId = achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);

        vm.prank(user1);
        vm.expectRevert(AchievementBadges.SoulboundToken.selector);
        achievements.safeTransferFrom(user1, user2, tokenId);
    }

    // =========================================================================
    // Token URI (On-chain SVG)
    // =========================================================================

    function test_TokenURI() public {
        _registerStreakAchievement();

        vm.prank(minter);
        uint256 tokenId = achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);

        string memory uri = achievements.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    // =========================================================================
    // Enumerable
    // =========================================================================

    function test_Enumerable() public {
        _registerStreakAchievement();
        _registerAccuracyAchievement();

        vm.startPrank(minter);
        achievements.mintAchievement(user1, "streak-7", 7, EAS_UID_1);
        achievements.mintAchievement(user2, "accuracy-70", 75, EAS_UID_2);
        vm.stopPrank();

        assertEq(achievements.totalSupply(), 2);
        assertEq(achievements.tokenByIndex(0), 1);
        assertEq(achievements.tokenByIndex(1), 2);
    }

    // =========================================================================
    // Interface Support
    // =========================================================================

    function test_SupportsInterface() public view {
        // ERC721
        assertTrue(achievements.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(achievements.supportsInterface(0x5b5e139f));
        // ERC721Enumerable
        assertTrue(achievements.supportsInterface(0x780e9d63));
    }

    // =========================================================================
    // Admin
    // =========================================================================

    function test_SetAuthorizedMinter() public {
        address newMinter = address(5);
        assertFalse(achievements.authorizedMinters(newMinter));

        vm.prank(owner);
        achievements.setAuthorizedMinter(newMinter, true);
        assertTrue(achievements.authorizedMinters(newMinter));

        vm.prank(owner);
        achievements.setAuthorizedMinter(newMinter, false);
        assertFalse(achievements.authorizedMinters(newMinter));
    }

    function test_SetAuthorizedMinter_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        achievements.setAuthorizedMinter(user1, true);
    }

    function test_GetRegisteredAchievementCount() public {
        assertEq(achievements.getRegisteredAchievementCount(), 0);

        _registerStreakAchievement();
        assertEq(achievements.getRegisteredAchievementCount(), 1);

        _registerAccuracyAchievement();
        assertEq(achievements.getRegisteredAchievementCount(), 2);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    function _registerStreakAchievement() internal {
        vm.prank(owner);
        achievements.registerAchievement(
            "streak-7",
            "7 Day Streak",
            "Forecast for 7 consecutive days",
            AchievementBadges.Category.STREAK,
            7
        );
    }

    function _registerAccuracyAchievement() internal {
        vm.prank(owner);
        achievements.registerAchievement(
            "accuracy-70",
            "Calibrated",
            "Achieve 70% accuracy over 50 forecasts",
            AchievementBadges.Category.ACCURACY,
            70
        );
    }

    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory prefixBytes = bytes(prefix);
        if (strBytes.length < prefixBytes.length) return false;
        for (uint256 i = 0; i < prefixBytes.length; i++) {
            if (strBytes[i] != prefixBytes[i]) return false;
        }
        return true;
    }
}
