// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CaliberToken
 * @author Calibr.ly Team
 * @notice $CALIBR token with staking rewards for superforecasters
 * @dev ERC-20 with permit, burning, and staking functionality
 */
contract CaliberToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    // =============================================================================
    // Events
    // =============================================================================

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event SuperforecasterBonusSet(address indexed user, uint256 multiplier);

    // =============================================================================
    // Errors
    // =============================================================================

    error InsufficientStake();
    error StakingCooldown();
    error NoRewardsAvailable();
    error MaxSupplyExceeded();

    // =============================================================================
    // Constants
    // =============================================================================

    /// @notice Maximum supply: 100 million tokens
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    /// @notice Minimum stake amount: 100 tokens
    uint256 public constant MIN_STAKE = 100 * 10 ** 18;

    /// @notice Unstaking cooldown period: 7 days
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;

    // =============================================================================
    // State Variables
    // =============================================================================

    /// @notice Base reward rate per second per token staked (scaled by 1e18)
    uint256 public rewardRate;

    /// @notice Total tokens staked
    uint256 public totalStaked;

    /// @notice User staking info
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 lastClaimAt;
        uint256 pendingRewards;
        uint256 bonusMultiplier; // 100 = 1x, 150 = 1.5x, etc.
    }

    mapping(address => StakeInfo) public stakes;

    /// @notice Addresses authorized to set superforecaster bonuses
    mapping(address => bool) public bonusSetters;

    // =============================================================================
    // Constructor
    // =============================================================================

    constructor(
        address initialOwner,
        uint256 initialSupply
    ) ERC20("Calibr", "CALIBR") ERC20Permit("Calibr") Ownable(initialOwner) {
        if (initialSupply > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(initialOwner, initialSupply);
        bonusSetters[initialOwner] = true;
    }

    // =============================================================================
    // Admin Functions
    // =============================================================================

    /**
     * @notice Mint new tokens (only owner, respects max supply)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }

    /**
     * @notice Set the reward rate
     * @param newRate New reward rate (per second per token, scaled by 1e18)
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /**
     * @notice Set bonus setter authorization
     * @param setter Address to authorize/deauthorize
     * @param authorized Whether the address can set bonuses
     */
    function setBonusSetter(address setter, bool authorized) external onlyOwner {
        bonusSetters[setter] = authorized;
    }

    /**
     * @notice Set superforecaster bonus multiplier
     * @param user User address
     * @param multiplier Bonus multiplier (100 = 1x, 150 = 1.5x, 200 = 2x)
     */
    function setSuperforecasterBonus(
        address user,
        uint256 multiplier
    ) external {
        require(bonusSetters[msg.sender], "Not authorized");

        // Update pending rewards before changing multiplier
        _updatePendingRewards(user);

        stakes[user].bonusMultiplier = multiplier;
        emit SuperforecasterBonusSet(user, multiplier);
    }

    // =============================================================================
    // Staking Functions
    // =============================================================================

    /**
     * @notice Stake tokens
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external {
        if (amount < MIN_STAKE && stakes[msg.sender].amount == 0) {
            revert InsufficientStake();
        }

        // Update pending rewards
        _updatePendingRewards(msg.sender);

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);

        // Update stake
        StakeInfo storage info = stakes[msg.sender];
        info.amount += amount;
        if (info.stakedAt == 0) {
            info.stakedAt = block.timestamp;
            info.bonusMultiplier = 100; // Default 1x multiplier
        }
        info.lastClaimAt = block.timestamp;

        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake tokens
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external {
        StakeInfo storage info = stakes[msg.sender];

        if (info.amount < amount) revert InsufficientStake();
        if (block.timestamp < info.stakedAt + UNSTAKE_COOLDOWN) {
            revert StakingCooldown();
        }

        // Update pending rewards
        _updatePendingRewards(msg.sender);

        // Update stake
        info.amount -= amount;
        totalStaked -= amount;

        // Transfer tokens back
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim staking rewards
     */
    function claimRewards() external {
        _updatePendingRewards(msg.sender);

        StakeInfo storage info = stakes[msg.sender];
        uint256 rewards = info.pendingRewards;

        if (rewards == 0) revert NoRewardsAvailable();
        if (totalSupply() + rewards > MAX_SUPPLY) {
            rewards = MAX_SUPPLY - totalSupply();
        }

        info.pendingRewards = 0;
        info.lastClaimAt = block.timestamp;

        _mint(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /**
     * @notice Get pending rewards for a user
     * @param user User address
     * @return Pending rewards amount
     */
    function pendingRewards(address user) external view returns (uint256) {
        StakeInfo storage info = stakes[user];
        return info.pendingRewards + _calculateRewards(user);
    }

    /**
     * @notice Get stake info for a user
     * @param user User address
     * @return Stake info struct
     */
    function getStakeInfo(address user) external view returns (StakeInfo memory) {
        return stakes[user];
    }

    // =============================================================================
    // Internal Functions
    // =============================================================================

    /**
     * @notice Update pending rewards for a user
     * @param user User address
     */
    function _updatePendingRewards(address user) internal {
        StakeInfo storage info = stakes[user];
        if (info.amount > 0) {
            info.pendingRewards += _calculateRewards(user);
            info.lastClaimAt = block.timestamp;
        }
    }

    /**
     * @notice Calculate rewards since last claim
     * @param user User address
     * @return Calculated rewards
     */
    function _calculateRewards(address user) internal view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.amount == 0 || rewardRate == 0) return 0;

        uint256 duration = block.timestamp - info.lastClaimAt;
        uint256 baseReward = (info.amount * rewardRate * duration) / 1e18;

        // Apply superforecaster bonus
        uint256 multiplier = info.bonusMultiplier > 0 ? info.bonusMultiplier : 100;
        return (baseReward * multiplier) / 100;
    }
}
