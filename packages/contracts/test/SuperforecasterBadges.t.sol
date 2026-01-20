// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {SuperforecasterBadges} from "../src/SuperforecasterBadges.sol";

contract SuperforecasterBadgesTest is Test {
    SuperforecasterBadges public badges;

    address public owner = address(1);
    address public minter = address(2);
    address public user1 = address(3);
    address public user2 = address(4);

    bytes32 public constant EAS_UID_1 = keccak256("attestation_1");
    bytes32 public constant EAS_UID_2 = keccak256("attestation_2");

    function setUp() public {
        badges = new SuperforecasterBadges(owner);

        vm.prank(owner);
        badges.setAuthorizedMinter(minter, true);
    }

    function test_InitialState() public view {
        assertEq(badges.name(), "Calibr Superforecaster Badge");
        assertEq(badges.symbol(), "CALIBR-SF");
        assertTrue(badges.authorizedMinters(owner));
        assertTrue(badges.authorizedMinters(minter));
    }

    function test_TierInfo() public view {
        assertEq(badges.tierNames(SuperforecasterBadges.Tier.APPRENTICE), "Apprentice");
        assertEq(badges.tierNames(SuperforecasterBadges.Tier.JOURNEYMAN), "Journeyman");
        assertEq(badges.tierNames(SuperforecasterBadges.Tier.EXPERT), "Expert");
        assertEq(badges.tierNames(SuperforecasterBadges.Tier.MASTER), "Master");
        assertEq(badges.tierNames(SuperforecasterBadges.Tier.GRANDMASTER), "Grandmaster");

        assertEq(badges.tierColors(SuperforecasterBadges.Tier.APPRENTICE), "#888888");
        assertEq(badges.tierColors(SuperforecasterBadges.Tier.GRANDMASTER), "#00ffff");
    }

    function test_MintBadge() public {
        vm.prank(minter);
        uint256 tokenId = badges.mintBadge(
            user1,
            SuperforecasterBadges.Tier.APPRENTICE,
            2500, // Brier score 0.25
            42,   // Rank
            "GENERAL",
            EAS_UID_1
        );

        assertEq(tokenId, 1);
        assertEq(badges.ownerOf(tokenId), user1);
        assertEq(badges.balanceOf(user1), 1);
        assertEq(badges.userCurrentBadge(user1), tokenId);

        SuperforecasterBadges.Badge memory badge = badges.getBadge(tokenId);
        assertEq(badge.tokenId, 1);
        assertEq(uint256(badge.tier), uint256(SuperforecasterBadges.Tier.APPRENTICE));
        assertEq(badge.score, 2500);
        assertEq(badge.rank, 42);
        assertEq(badge.category, "GENERAL");
        assertEq(badge.easUid, EAS_UID_1);
    }

    function test_MintBadge_Unauthorized() public {
        vm.prank(user1);
        vm.expectRevert(SuperforecasterBadges.Unauthorized.selector);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.APPRENTICE, 2500, 42, "GENERAL", EAS_UID_1);
    }

    function test_MintBadge_InvalidTier() public {
        vm.prank(minter);
        vm.expectRevert(SuperforecasterBadges.InvalidTier.selector);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.NONE, 2500, 42, "GENERAL", EAS_UID_1);
    }

    function test_TierPromotion() public {
        // Mint APPRENTICE badge
        vm.prank(minter);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.APPRENTICE, 2500, 100, "GENERAL", EAS_UID_1);

        // Promote to JOURNEYMAN
        vm.prank(minter);
        uint256 tokenId2 = badges.mintBadge(
            user1,
            SuperforecasterBadges.Tier.JOURNEYMAN,
            2000,
            50,
            "GENERAL",
            EAS_UID_2
        );

        assertEq(tokenId2, 2);
        assertEq(badges.userCurrentBadge(user1), 2);
        assertEq(badges.balanceOf(user1), 2); // User keeps both badges

        // Check badge history
        uint256[] memory history = badges.getUserBadgeHistory(user1);
        assertEq(history.length, 2);
        assertEq(history[0], 1);
        assertEq(history[1], 2);
    }

    function test_TierPromotion_AlreadyHasTier() public {
        // Mint JOURNEYMAN badge
        vm.prank(minter);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.JOURNEYMAN, 2000, 50, "GENERAL", EAS_UID_1);

        // Try to mint APPRENTICE (lower tier) - should fail
        vm.prank(minter);
        vm.expectRevert(SuperforecasterBadges.AlreadyHasTier.selector);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.APPRENTICE, 2500, 100, "GENERAL", EAS_UID_2);

        // Try to mint same tier - should fail
        vm.prank(minter);
        vm.expectRevert(SuperforecasterBadges.AlreadyHasTier.selector);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.JOURNEYMAN, 1900, 45, "GENERAL", EAS_UID_2);
    }

    function test_GetUserTier() public {
        assertEq(uint256(badges.getUserTier(user1)), uint256(SuperforecasterBadges.Tier.NONE));

        vm.prank(minter);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.EXPERT, 1500, 25, "GENERAL", EAS_UID_1);

        assertEq(uint256(badges.getUserTier(user1)), uint256(SuperforecasterBadges.Tier.EXPERT));
    }

    function test_Soulbound_NoTransfer() public {
        vm.prank(minter);
        uint256 tokenId = badges.mintBadge(
            user1,
            SuperforecasterBadges.Tier.APPRENTICE,
            2500,
            42,
            "GENERAL",
            EAS_UID_1
        );

        vm.prank(user1);
        vm.expectRevert(SuperforecasterBadges.SoulboundToken.selector);
        badges.transferFrom(user1, user2, tokenId);

        vm.prank(user1);
        vm.expectRevert(SuperforecasterBadges.SoulboundToken.selector);
        badges.safeTransferFrom(user1, user2, tokenId);
    }

    function test_TokenURI() public {
        vm.prank(minter);
        uint256 tokenId = badges.mintBadge(
            user1,
            SuperforecasterBadges.Tier.MASTER,
            1200, // 0.12 Brier score
            5,
            "POLITICS",
            EAS_UID_1
        );

        string memory uri = badges.tokenURI(tokenId);

        // Check it starts with data:application/json;base64,
        assertTrue(bytes(uri).length > 0);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function test_SupportsInterface() public view {
        // ERC721
        assertTrue(badges.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(badges.supportsInterface(0x5b5e139f));
        // ERC721Enumerable
        assertTrue(badges.supportsInterface(0x780e9d63));
    }

    function test_Enumerable() public {
        vm.startPrank(minter);
        badges.mintBadge(user1, SuperforecasterBadges.Tier.APPRENTICE, 2500, 100, "GENERAL", EAS_UID_1);
        badges.mintBadge(user2, SuperforecasterBadges.Tier.JOURNEYMAN, 2000, 50, "GENERAL", EAS_UID_2);
        vm.stopPrank();

        assertEq(badges.totalSupply(), 2);
        assertEq(badges.tokenByIndex(0), 1);
        assertEq(badges.tokenByIndex(1), 2);
        assertEq(badges.tokenOfOwnerByIndex(user1, 0), 1);
        assertEq(badges.tokenOfOwnerByIndex(user2, 0), 2);
    }

    function test_SetAuthorizedMinter() public {
        address newMinter = address(5);
        assertFalse(badges.authorizedMinters(newMinter));

        vm.prank(owner);
        badges.setAuthorizedMinter(newMinter, true);

        assertTrue(badges.authorizedMinters(newMinter));

        vm.prank(owner);
        badges.setAuthorizedMinter(newMinter, false);

        assertFalse(badges.authorizedMinters(newMinter));
    }

    function test_SetAuthorizedMinter_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        badges.setAuthorizedMinter(user1, true);
    }

    function test_SetBaseURI() public {
        vm.prank(owner);
        badges.setBaseURI("https://api.calibr.ly/metadata/");

        assertEq(badges.baseTokenURI(), "https://api.calibr.ly/metadata/");
    }

    function test_FullTierProgression() public {
        SuperforecasterBadges.Tier[5] memory tiers = [
            SuperforecasterBadges.Tier.APPRENTICE,
            SuperforecasterBadges.Tier.JOURNEYMAN,
            SuperforecasterBadges.Tier.EXPERT,
            SuperforecasterBadges.Tier.MASTER,
            SuperforecasterBadges.Tier.GRANDMASTER
        ];

        uint256[5] memory scores = [uint256(2500), 2000, 1500, 1200, 1000];
        uint256[5] memory ranks = [uint256(100), 50, 25, 10, 1];

        for (uint256 i = 0; i < 5; i++) {
            vm.prank(minter);
            badges.mintBadge(
                user1,
                tiers[i],
                scores[i],
                ranks[i],
                "GENERAL",
                keccak256(abi.encodePacked("attestation_", i))
            );
        }

        assertEq(badges.balanceOf(user1), 5);
        assertEq(uint256(badges.getUserTier(user1)), uint256(SuperforecasterBadges.Tier.GRANDMASTER));

        uint256[] memory history = badges.getUserBadgeHistory(user1);
        assertEq(history.length, 5);
    }

    // Helper function
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
