# $CALIBR Tokenomics - Development Documentation

**Internal Development Reference**

**Version 4.0 | January 2026**

---

## Overview

This document provides implementation details for the $CALIBR tokenomics system. For user-facing tokenomics information (supply, allocation, utility, fee structure), refer to the **$CALIBR Tokenomics Whitepaper v4.0**.

This document covers:
1. Smart Contract Architecture
2. Hunt.town Integration
3. Mint.club Staking Integration
4. Cross-Chain Bridge Implementation
5. POL Technical Strategy
6. Fee Collection & Distribution
7. Paymaster & Gas Sponsorship
8. Circuit Breaker Implementation
9. Development Phase Integration

---

## 1. Smart Contract Architecture

### 1.1 Contract Overview

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| `CALIBRToken.sol` | ERC-20 token | `transfer`, `permit`, `mint` (initial only) |
| `FeeCollector.sol` | Aggregate fees | `collectFee`, `triggerBuyback`, `distribute` |
| `Buyback.sol` | TWAP execution | `executeBuyback`, `setSlippage`, `emergencyStop` |
| `CommunityFund.sol` | Bonus pool | `trackRollover`, `calculateBonus`, `claimBonus`, `checkCircuitBreaker` |
| `CrossChainExecutor.sol` | Bridge + swap | `executePosition`, `bridgeUSDC`, `callback` |
| `POLManager.sol` | Liquidity mgmt | `depositLP`, `claimFees`, `rebalance` |
| `Governance.sol` | DAO voting | `propose`, `vote`, `execute`, `timelock` |

### 1.2 Deployment Order

1. `CALIBRToken.sol` - Deploy token contract
2. `FeeCollector.sol` - Initialize with token address
3. `CommunityFund.sol` - Initialize with fee collector address
4. `Buyback.sol` - Initialize with token, DEX router addresses
5. `POLManager.sol` - Initialize with LP pool addresses
6. `CrossChainExecutor.sol` - Initialize with bridge addresses
7. `Governance.sol` - Initialize with token, timelock addresses

### 1.3 Access Control

```
Owner (Multisig) ─────► FeeCollector
                  ├──► Buyback
                  ├──► CommunityFund
                  ├──► POLManager
                  └──► CrossChainExecutor

Governance ───────────► Parameter Updates (post-timelock)
```

---

## 2. Hunt.town Integration

### 2.1 Platform Overview

- **Platform**: Hunt.town Co-op (https://hunt.town)
- **Documentation**: https://docs.hunt.town
- **Mechanism**: Bonding curve fair launch
- **Base Asset**: $HUNT token

### 2.2 Bonding Curve Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Total Allocation | 7,000,000,000 $CALIBR | 70% of supply |
| Curve Type | TBD | Linear/Exponential/Logarithmic |
| Step Intervals | TBD | Price increment points |
| Base Asset | $HUNT | Hunt.town native token |

### 2.3 Integration Tasks

- [ ] Create Hunt.town Co-op project
- [ ] Configure bonding curve parameters
- [ ] Set metadata (name, symbol, description, logo)
- [ ] Configure social links
- [ ] Test curve behavior with small amounts
- [ ] Coordinate launch timing

### 2.4 Hunt.town Fee Structure

Reference Hunt.town docs for:
- Buy/sell fees (in $HUNT)
- Creator fee allocation
- Platform fee allocation

---

## 3. Mint.club Staking Integration

### 3.1 Platform Overview

- **Platform**: Mint.club staking
- **Documentation**: https://docs.mint.club
- **Purpose**: Staking mechanism for governance + bonus multiplier

### 3.2 Staking Mechanics

| Feature | Implementation |
|---------|----------------|
| Staking Contract | Mint.club native staking |
| Governance Read | Query staked balance for voting power |
| Bonus Multiplier | 1.5x for staked users |

### 3.3 Integration Points

```javascript
// Pseudo-code for staking read
async function getUserStakingStatus(userAddress) {
  const stakedBalance = await mintClubStaking.balanceOf(userAddress);
  const isStaker = stakedBalance > 0;
  const bonusMultiplier = isStaker ? 1.5 : 1.0;
  return { stakedBalance, isStaker, bonusMultiplier };
}
```

### 3.4 Governance Integration

- Voting power = staked $CALIBR balance
- Snapshot at proposal creation
- No delegation in v1 (future consideration)

---

## 4. Cross-Chain Bridge Implementation

### 4.1 Architecture Overview

```
User ($CALIBR on Base)
    │
    ▼
┌─────────────────┐
│ CrossChainExecutor │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────────┐
│ Swap  │ │   Bridge  │
│(Aero) │ │  (CCTP)   │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
  USDC      USDC on
 on Base    Polygon
              │
              ▼
       ┌─────────────┐
       │  Polymarket │
       │  Position   │
       └─────────────┘
```

### 4.2 Circle CCTP Integration

| Parameter | Value |
|-----------|-------|
| Bridge | Circle CCTP (Cross-Chain Transfer Protocol) |
| Base → Polygon | Native USDC burn/mint |
| Settlement | <30 seconds (CCTP V2) |
| Slippage | 0% (native transfer) |

**CCTP Contract Addresses (Base):**
- TokenMessenger: `[To be added]`
- MessageTransmitter: `[To be added]`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

**CCTP Contract Addresses (Polygon):**
- TokenMessenger: `[To be added]`
- MessageTransmitter: `[To be added]`
- USDC: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`

### 4.3 Gelato Relay Integration

| Parameter | Value |
|-----------|-------|
| Purpose | Gasless transactions |
| Sponsor | Gelato 1Balance or SyncFee |
| Base Operations | Paymaster sponsored |
| Polygon Operations | Gelato SyncFee (deducted from USDC) |

**Gelato Integration:**
```javascript
// Pseudo-code for Gelato relay
const { GelatoRelay } = require("@gelatonetwork/relay-sdk");

const relay = new GelatoRelay();

// SyncFee relay (fee deducted from transfer)
const relayResponse = await relay.callWithSyncFee({
  chainId: POLYGON_CHAIN_ID,
  target: targetContract,
  data: callData,
  feeToken: USDC_ADDRESS,
  isRelayContext: true,
});
```

### 4.4 Fallback Bridges

| Priority | Bridge | Speed | Fee | Use Case |
|----------|--------|-------|-----|----------|
| 1 | Circle CCTP | ~30s | ~$2 | Primary |
| 2 | Across Protocol | ~3s | ~0.05% | Speed fallback |
| 3 | deBridge | ~2s | ~0.1% | Security fallback |

### 4.5 User Flow Implementation

```
1. User approves $CALIBR spend
2. CrossChainExecutor receives $CALIBR
3. Swap $CALIBR → USDC on Aerodrome
4. Initiate CCTP burn on Base
5. Wait for attestation
6. Complete CCTP mint on Polygon
7. Execute Polymarket trade
8. Return confirmation to user
```

---

## 5. POL Technical Strategy

### 5.1 Aerodrome Strategy

| Component | Details |
|-----------|---------|
| DEX | Aerodrome (Base) |
| Pools | $CALIBR/USDC, $CALIBR/ETH |
| veAERO | Acquire and lock for voting power |
| Lock Duration | 4-year maximum |
| Voting | Weekly gauge votes for $CALIBR pools |

**Aerodrome Addresses (Base):**
- Router: `[To be added]`
- veAERO: `[To be added]`
- Voter: `[To be added]`

### 5.2 veAERO Acquisition Strategy

| Priority | Use | Rationale |
|----------|-----|-----------|
| 1 | $AERO acquisition for veAERO | Long-term voting power |
| 2 | $CALIBR/USDC LP | Primary trading pair |
| 3 | $CALIBR/ETH LP | Secondary pair |
| 4 | Uniswap v4 LP positions | Diversification |
| 5 | Strategic bribes | Only when ROI-positive |

### 5.3 POLManager Functions

```solidity
interface IPOLManager {
    function depositToAerodrome(uint256 calibrAmount, uint256 usdcAmount) external;
    function lockAero(uint256 aeroAmount, uint256 lockDuration) external;
    function vote(address[] memory pools, uint256[] memory weights) external;
    function claimFees() external;
    function claimBribes() external;
    function rebalance() external;
}
```

---

## 6. Fee Collection & Distribution

### 6.1 Fee Flow

```
Winning Position Payout
         │
         ▼
    0.5% Fee Deducted
         │
         ▼
   ┌─────────────────┐
   │  FeeCollector   │
   └────────┬────────┘
            │
    ┌───────┼───────┬────────┐
    ▼       ▼       ▼        ▼
  40%     35%     25%      (Trigger)
Buyback  Community Treasury  Buyback
         Fund               Execution
```

### 6.2 FeeCollector Implementation

```solidity
interface IFeeCollector {
    function collectFee(address user, uint256 winningAmount) external returns (uint256 feeAmount);
    function distribute() external;
    function triggerBuyback() external;
    
    // Events
    event FeeCollected(address indexed user, uint256 amount);
    event FeesDistributed(uint256 buyback, uint256 community, uint256 treasury);
}
```

### 6.3 Buyback Parameters

| Parameter | Value |
|-----------|-------|
| Trigger Threshold | $10,000 USDC equivalent |
| Execution | 4-hour TWAP |
| Max Slippage | 2% |
| Post-Buyback | Deploy to POL |

### 6.4 Distribution Schedule

- Automatic distribution when threshold reached
- Manual distribution callable by governance
- Emergency pause available via multisig

---

## 7. Paymaster & Gas Sponsorship

### 7.1 Base Paymaster

| Operation | Gas Source |
|-----------|------------|
| Token approval | Base Paymaster (sponsored) |
| $CALIBR → USDC swap | Base Paymaster (sponsored) |
| CCTP burn initiation | Gelato (deducted from USDC) |

**Base Paymaster Configuration:**
- Use Coinbase Smart Wallet Paymaster
- Whitelist CrossChainExecutor contract
- Set daily/per-tx limits

### 7.2 Polygon Gas Buffer

| Operation | Gas Source |
|-----------|------------|
| CCTP mint completion | Gelato (deducted from USDC) |
| USDC → POL swap | Gelato SyncFee |
| Polymarket purchase | POL from buffer swap |

### 7.3 Gas Abstraction Summary

```
Chain      │ Operation              │ Gas Source
───────────┼────────────────────────┼─────────────────────
Base       │ Token approval         │ Base Paymaster (sponsored)
Base       │ $CALIBR → USDC swap    │ Base Paymaster (sponsored)
Base       │ CCTP burn initiation   │ Gelato (deducted from USDC)
Polygon    │ CCTP mint completion   │ Gelato (deducted from USDC)
Polygon    │ USDC → POL swap        │ Gelato SyncFee
Polygon    │ Polymarket purchase    │ POL from buffer swap
```

**Result**: User only interacts with $CALIBR. Zero gas tokens required.

---

## 8. Circuit Breaker Implementation

### 8.1 Community Fund Circuit Breaker

**Trigger Condition:**
```solidity
function isCircuitBreakerActive() public view returns (bool) {
    uint256 currentBalance = communityFundBalance;
    uint256 rollingAveragePayout = get30DayRollingAveragePayout();
    return currentBalance < rollingAveragePayout;
}
```

**Effect When Active:**
| Bonus Type | Normal Max | Circuit Breaker Max |
|------------|------------|---------------------|
| Base Bonus | 0.50% | 0.40% |
| Staker Bonus | 0.75% | 0.60% |

**Recovery:**
- Circuit breaker deactivates when fund balance exceeds rolling average
- No manual override (automatic only)
- Event emitted on state change

### 8.2 Monthly Hard Cap

**Implementation:**
```solidity
mapping(address => mapping(uint256 => uint256)) public monthlyBonusClaimed;
// monthlyBonusClaimed[user][yearMonth] = totalClaimed

uint256 public constant MONTHLY_CAP = 10_000 * 1e6; // $10,000 in USDC decimals

function claimBonus(address user, uint256 bonusAmount) internal {
    uint256 currentMonth = getCurrentYearMonth();
    uint256 claimed = monthlyBonusClaimed[user][currentMonth];
    
    require(claimed + bonusAmount <= MONTHLY_CAP, "Monthly cap exceeded");
    
    monthlyBonusClaimed[user][currentMonth] = claimed + bonusAmount;
    // ... transfer bonus
}
```

### 8.3 Governance Parameters

The following parameters are adjustable via governance:

| Parameter | Default | Min | Max |
|-----------|---------|-----|-----|
| Base Bonus Tiers | [0.1, 0.1, 0.2, 0.35, 0.5] | 0 | 1.0 |
| Staking Multiplier | 1.5 | 1.0 | 2.0 |
| Monthly Hard Cap | $10,000 | $1,000 | $100,000 |
| Circuit Breaker Threshold | 30-day avg | 7-day avg | 90-day avg |

---

## 9. Development Phase Integration

### 9.1 Phase Mapping

| Phase | Tokenomics Components |
|-------|----------------------|
| Phase 0 (EAS Foundation) | - |
| Phase 1 (Core Infrastructure) | Token contract deployment prep |
| Phase 2 (Polymarket Data) | - |
| Phase 3 (Polymarket Trading) | CrossChainExecutor, CCTP integration |
| Phase 4 (Core App Features) | - |
| Phase 5 (Cross-Chain Execution) | Full tokenomics implementation |
| Phase 6 (Leaderboards) | - |
| Phase 7 (Polish & Launch) | Hunt.town launch coordination |

### 9.2 Phase 5 Detailed Tasks

**Smart Contracts:**
- [ ] CALIBRToken.sol - ERC-20 with permit
- [ ] FeeCollector.sol - Fee aggregation and distribution
- [ ] Buyback.sol - TWAP buyback mechanism
- [ ] CommunityFund.sol - Rollover bonus pool with circuit breaker
- [ ] CrossChainExecutor.sol - CCTP + Gelato integration
- [ ] POLManager.sol - Aerodrome/Uniswap LP management

**Integrations:**
- [ ] Circle CCTP SDK integration
- [ ] Gelato Relay SDK integration
- [ ] Aerodrome router integration
- [ ] Base Paymaster configuration

**Testing:**
- [ ] Unit tests for all contracts
- [ ] Integration tests for full flow
- [ ] Testnet deployment (Base Sepolia + Polygon Mumbai)
- [ ] Security audit preparation

### 9.3 Launch Checklist

**Pre-Launch:**
- [ ] All contracts audited
- [ ] Hunt.town Co-op configured
- [ ] Multisig set up
- [ ] Emergency procedures documented
- [ ] Monitoring and alerting configured

**Launch Day:**
- [ ] Deploy contracts to mainnet
- [ ] Initialize Hunt.town bonding curve
- [ ] Verify all contracts on Basescan
- [ ] Announce launch on social channels
- [ ] Monitor for issues

**Post-Launch:**
- [ ] Verify fee collection working
- [ ] Verify rollover bonuses calculating correctly
- [ ] Monitor circuit breaker status
- [ ] Begin POL deployment

---

## Appendix A: Contract Addresses

*To be populated after deployment*

| Contract | Base Address | Notes |
|----------|--------------|-------|
| CALIBRToken | - | ERC-20 |
| FeeCollector | - | |
| Buyback | - | |
| CommunityFund | - | |
| CrossChainExecutor | - | |
| POLManager | - | |
| Governance | - | |

---

## Appendix B: External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| OpenZeppelin Contracts | ^5.0.0 | ERC-20, Access Control |
| Gelato Relay SDK | Latest | Gasless transactions |
| Circle CCTP SDK | Latest | Cross-chain USDC |
| Aerodrome SDK | Latest | DEX integration |

---

## Appendix C: References

- **Whitepaper**: CALIBR_Tokenomics_Whitepaper_v4.md
- **Project Tasks**: project-tasks-v5.md (Phase 5)
- **Data Schema**: data-schema-v5.md
- **Frontend Guidelines**: calibr-frontend-guidelines-v5-updated.md
- **Hunt.town Docs**: https://docs.hunt.town
- **Circle CCTP**: https://developers.circle.com/stablecoins/docs/cctp-getting-started
- **Gelato Relay**: https://docs.gelato.network/web3-services/relay
- **Aerodrome**: https://docs.aerodrome.finance/

---

*$CALIBR Development Documentation v4.0*
*January 2026*
*Internal Use Only*
