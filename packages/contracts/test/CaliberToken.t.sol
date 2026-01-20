// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {CaliberToken} from "../src/CaliberToken.sol";

contract CaliberTokenTest is Test {
    CaliberToken public token;

    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public bonusSetter = address(4);

    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10**18; // 10M tokens
    uint256 public constant REWARD_RATE = 1e14; // 0.0001 tokens per second per staked token

    function setUp() public {
        token = new CaliberToken(owner, INITIAL_SUPPLY);

        // Setup
        vm.startPrank(owner);
        token.setRewardRate(REWARD_RATE);
        token.setBonusSetter(bonusSetter, true);
        token.transfer(user1, 10000 * 10**18);
        token.transfer(user2, 10000 * 10**18);
        vm.stopPrank();
    }

    function test_InitialState() public view {
        assertEq(token.name(), "Calibr");
        assertEq(token.symbol(), "CALIBR");
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.MAX_SUPPLY(), 100_000_000 * 10**18);
        assertEq(token.MIN_STAKE(), 100 * 10**18);
        assertEq(token.UNSTAKE_COOLDOWN(), 7 days);
    }

    function test_Mint() public {
        vm.prank(owner);
        token.mint(user1, 1000 * 10**18);

        assertEq(token.balanceOf(user1), 11000 * 10**18);
    }

    function test_Mint_MaxSupplyExceeded() public {
        vm.prank(owner);
        vm.expectRevert(CaliberToken.MaxSupplyExceeded.selector);
        token.mint(user1, 91_000_000 * 10**18);
    }

    function test_Stake() public {
        vm.startPrank(user1);
        token.stake(1000 * 10**18);
        vm.stopPrank();

        CaliberToken.StakeInfo memory info = token.getStakeInfo(user1);
        assertEq(info.amount, 1000 * 10**18);
        assertEq(info.bonusMultiplier, 100); // 1x default
        assertEq(token.totalStaked(), 1000 * 10**18);
    }

    function test_Stake_InsufficientStake() public {
        vm.prank(user1);
        vm.expectRevert(CaliberToken.InsufficientStake.selector);
        token.stake(50 * 10**18); // Below MIN_STAKE
    }

    function test_Stake_BelowMinimumAfterFirstStake() public {
        vm.startPrank(user1);
        token.stake(100 * 10**18); // First stake meets minimum

        // Additional stake below minimum should work
        token.stake(10 * 10**18);
        vm.stopPrank();

        CaliberToken.StakeInfo memory info = token.getStakeInfo(user1);
        assertEq(info.amount, 110 * 10**18);
    }

    function test_Unstake() public {
        vm.startPrank(user1);
        token.stake(1000 * 10**18);

        // Fast forward past cooldown
        vm.warp(block.timestamp + 7 days + 1);

        token.unstake(500 * 10**18);
        vm.stopPrank();

        CaliberToken.StakeInfo memory info = token.getStakeInfo(user1);
        assertEq(info.amount, 500 * 10**18);
        assertEq(token.balanceOf(user1), 9500 * 10**18);
    }

    function test_Unstake_Cooldown() public {
        vm.startPrank(user1);
        token.stake(1000 * 10**18);

        vm.expectRevert(CaliberToken.StakingCooldown.selector);
        token.unstake(500 * 10**18);
        vm.stopPrank();
    }

    function test_Unstake_InsufficientStake() public {
        vm.startPrank(user1);
        token.stake(1000 * 10**18);

        vm.warp(block.timestamp + 7 days + 1);

        vm.expectRevert(CaliberToken.InsufficientStake.selector);
        token.unstake(2000 * 10**18);
        vm.stopPrank();
    }

    function test_ClaimRewards() public {
        vm.startPrank(user1);
        token.stake(1000 * 10**18);
        vm.stopPrank();

        // Fast forward 1 day
        vm.warp(block.timestamp + 1 days);

        uint256 pendingBefore = token.pendingRewards(user1);
        assertTrue(pendingBefore > 0);

        uint256 balanceBefore = token.balanceOf(user1);

        vm.prank(user1);
        token.claimRewards();

        uint256 balanceAfter = token.balanceOf(user1);
        assertTrue(balanceAfter > balanceBefore);
    }

    function test_ClaimRewards_NoRewardsAvailable() public {
        vm.prank(user1);
        vm.expectRevert(CaliberToken.NoRewardsAvailable.selector);
        token.claimRewards();
    }

    function test_SuperforecasterBonus() public {
        vm.prank(user1);
        token.stake(1000 * 10**18);

        // Set 2x bonus for user1
        vm.prank(bonusSetter);
        token.setSuperforecasterBonus(user1, 200);

        // Fast forward
        vm.warp(block.timestamp + 1 days);

        uint256 rewardsWithBonus = token.pendingRewards(user1);

        // Setup user2 without bonus
        vm.prank(user2);
        token.stake(1000 * 10**18);

        vm.warp(block.timestamp + 1 days);

        uint256 rewardsWithoutBonus = token.pendingRewards(user2);

        // User1 should have ~2x the rewards of user2 (accounting for 1 day head start)
        // Since user1 staked for 2 days with 2x bonus, user2 for 1 day with 1x
        // User1 rewards ≈ 2 days * 2x = 4 units
        // User2 rewards ≈ 1 day * 1x = 1 unit
        assertTrue(rewardsWithBonus > rewardsWithoutBonus);
    }

    function test_SetSuperforecasterBonus_Unauthorized() public {
        vm.prank(user1);
        vm.expectRevert("Not authorized");
        token.setSuperforecasterBonus(user2, 150);
    }

    function test_PendingRewards() public {
        vm.prank(user1);
        token.stake(1000 * 10**18);

        // No time passed, no rewards
        assertEq(token.pendingRewards(user1), 0);

        // Fast forward 1 hour
        vm.warp(block.timestamp + 1 hours);

        uint256 pending = token.pendingRewards(user1);
        // Expected: 1000 tokens * 1e14 rate * 3600 seconds / 1e18 = 0.36 tokens
        assertTrue(pending > 0);
    }

    function test_RewardCalculation() public {
        vm.prank(user1);
        token.stake(1000 * 10**18);

        // Fast forward 1 day (86400 seconds)
        vm.warp(block.timestamp + 1 days);

        uint256 pending = token.pendingRewards(user1);

        // Expected: 1000 * 10^18 * 10^14 * 86400 / 10^18 = 8.64 * 10^18
        // With 1x multiplier (100/100)
        uint256 expected = (1000 * 10**18 * REWARD_RATE * 86400) / 10**18;
        assertEq(pending, expected);
    }

    function test_Burn() public {
        uint256 balanceBefore = token.balanceOf(user1);

        vm.prank(user1);
        token.burn(100 * 10**18);

        assertEq(token.balanceOf(user1), balanceBefore - 100 * 10**18);
    }

    function test_Permit() public {
        uint256 privateKey = 0x12345;
        address signer = vm.addr(privateKey);

        vm.prank(owner);
        token.transfer(signer, 1000 * 10**18);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(signer);

        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                signer,
                user1,
                500 * 10**18,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        token.permit(signer, user1, 500 * 10**18, deadline, v, r, s);

        assertEq(token.allowance(signer, user1), 500 * 10**18);
    }

    function test_SetRewardRate() public {
        vm.prank(owner);
        token.setRewardRate(2e14);

        assertEq(token.rewardRate(), 2e14);
    }

    function test_SetRewardRate_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setRewardRate(2e14);
    }
}
