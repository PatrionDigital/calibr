# $CALIBR Tokenomics Whitepaper

**Prediction Market Aggregator on Base L2**

_Fair Launch via Hunt.town Bonding Curve_

**Version 4.0 | January 2026**

---

## 1. Executive Summary

$CALIBR is the native utility token of Calibr.xyz—a prediction market aggregator platform built on Base L2 for serious forecasters. Designed around the principle of _"Precision forecasting. Proven rewards."_, Calibr.xyz serves as the Bloomberg Terminal for prediction markets, aggregating positions across multiple platforms while rewarding accuracy and continuous engagement.

This document outlines a community-first tokenomics model featuring a fair launch via Hunt.town's bonding curve mechanism, ensuring transparent price discovery and broad token distribution from day one.

### Key Highlights

| Property            | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| Total Supply        | 10,000,000,000 $CALIBR (10 billion, fixed cap)         |
| Inflation           | None                                                   |
| Chain               | Base L2 (Ethereum)                                     |
| Launch Mechanism    | Hunt.town bonding curve fair launch (70% allocation)   |
| Revenue Model       | 0.5% fee on winning positions                          |
| Incentive Alignment | Roll-over bonus system rewarding continuous engagement |
| Staking Benefit     | 1.5x multiplier on roll-over bonuses                   |

The token is backed by $HUNT via the bonding curve mechanism, providing permanent, unruggable liquidity. Full details on this mechanism are provided in Section 6.

---

## 2. Token Overview

| Property     | Value                   |
| ------------ | ----------------------- |
| Token Name   | CALIBR                  |
| Symbol       | $CALIBR                 |
| Chain        | Base L2 (Ethereum)      |
| Standard     | ERC-20                  |
| Total Supply | 10,000,000,000 (10B)    |
| Inflation    | None (fixed cap)        |
| Backing      | $HUNT via bonding curve |

$CALIBR is deployed on Base L2, an Ethereum Layer 2 rollup offering low transaction costs and fast finality while inheriting Ethereum's security guarantees.

The token is backed by $HUNT through Hunt.town's bonding curve mechanism. This backing creates permanent, unruggable liquidity that cannot be removed, ensuring reliable trading depth for $CALIBR. The specifics of this mechanism are detailed in Section 6: Fair Launch Mechanism.

---

## 3. Token Utility

$CALIBR serves as the central flywheel driving platform engagement, providing three core utility functions:

### 3.1 Platform Purchases

$CALIBR is the native currency for acquiring positions on aggregated prediction markets. Users quote and pay for positions directly in $CALIBR; the protocol handles all conversion and execution seamlessly behind the scenes.

### 3.2 Staking for Enhanced Rewards

Token holders can stake $CALIBR to receive a 1.5x multiplier on roll-over bonuses. This transforms the maximum base bonus of 0.5% into 0.75% for stakers, creating meaningful additional value for committed participants.

### 3.3 Governance Participation

Staked tokens grant voting rights on key protocol decisions, including:

- Contribution reward allocations from the Ecosystem Fund
- Fee structure adjustments within defined bounds
- Platform integration priorities
- Treasury deployment decisions

---

## 4. Token Allocation & Distribution

$CALIBR employs a community-first allocation model with 70% of tokens available through fair launch, ensuring broad distribution and transparent price discovery.

### 4.1 Allocation Breakdown

| Category                | Allocation | Tokens             | Vesting                              |
| ----------------------- | ---------- | ------------------ | ------------------------------------ |
| Fair Launch (Hunt.town) | 70%        | 7,000,000,000      | Immediate via bonding curve          |
| Treasury                | 15%        | 1,500,000,000      | 12-month linear vest                 |
| Team                    | 10%        | 1,000,000,000      | 12-month cliff, 48-month linear vest |
| Ecosystem Fund          | 4%         | 400,000,000        | Distributed via grants program       |
| Launch Reserve          | 1%         | 100,000,000        | Initial liquidity & partnerships     |
| **TOTAL**               | **100%**   | **10,000,000,000** | Fixed supply, no inflation           |

### 4.2 Allocation Purpose

**Fair Launch (70%)**: The majority of tokens are made available through Hunt.town's bonding curve, ensuring anyone can participate in price discovery without preferential access.

**Treasury (15%)**: Funds protocol operations, development, audits, and strategic initiatives. Subject to 12-month linear vesting to ensure sustainable runway.

**Team (10%)**: Compensates founders and early contributors. Subject to 12-month cliff followed by 48-month linear vesting, demonstrating long-term commitment.

**Ecosystem Fund (4%)**: Supports community grants for bug bounties, code contributions, educational content, and ecosystem development.

**Launch Reserve (1%)**: Provides initial DEX liquidity and supports strategic partnerships.

---

## 5. Vesting Schedule

Vesting ensures long-term alignment between token holders and protocol success.

| Allocation     | Cliff     | Vesting Period   | TGE Unlock |
| -------------- | --------- | ---------------- | ---------- |
| Fair Launch    | None      | Immediate        | 100%       |
| Treasury       | None      | 12 months linear | 0%         |
| Team           | 12 months | 48 months linear | 0%         |
| Ecosystem Fund | None      | As distributed   | Variable   |
| Launch Reserve | None      | As deployed      | Variable   |

### Key Points

- **Team tokens are fully locked** for a minimum of 12 months before any vesting begins
- **Treasury vests linearly** over 12 months to fund ongoing operations
- **Fair launch tokens are immediately liquid** upon purchase through the bonding curve
- **No insider discounts**: All participants acquire tokens through the same mechanism

---

## 6. Fair Launch Mechanism

$CALIBR launches through Hunt.town's Co-op bonding curve platform, providing a fair and transparent distribution mechanism.

### 6.1 How Bonding Curves Work

A bonding curve is a mathematical function that determines token price based on supply. As more tokens are purchased, the price increases along a predetermined curve. Conversely, selling tokens returns funds from the curve's reserve, decreasing the price.

### 6.2 Fair Launch Advantages

**Transparent Price Discovery**: Token price is mathematically determined by the curve formula, eliminating manipulation and ensuring all participants face the same pricing mechanism.

**Immediate Liquidity**: Tokens are tradeable instantly upon purchase—no waiting for DEX listings or liquidity provision.

**No Presale Dumps**: Without VCs or private investors holding discounted tokens, there are no large unlock events that could destabilize price.

**Unruggable Liquidity**: $HUNT locked in the bonding curve creates permanent, unruggable liquidity secured by smart contract. The protocol has no access to this liquidity, creating a firm price backstop.

### 6.3 User Responsibility

Users should review Hunt.town's documentation for complete details on curve mechanics, fees, and risks before participating. See Section 12 for important disclaimers regarding third-party platforms.

---

## 7. Fee Structure & Revenue Distribution

### 7.1 Primary Revenue Source

Calibr.xyz generates revenue through a 0.5% fee on all winning positions across aggregated prediction markets. This fee is only charged on successful trades, directly aligning protocol revenue with user success.

### 7.2 Fee Split Allocation

| Allocation     | Percentage | Purpose                                   |
| -------------- | ---------- | ----------------------------------------- |
| Token Buyback  | 40%        | Automated TWAP purchases, deployed to POL |
| Community Fund | 35%        | Roll-over bonus pool funding              |
| Treasury       | 25%        | Operations, development, liquidity        |

### 7.3 Buyback Mechanism

The buyback system operates automatically:

- **Trigger**: Activates when the fee collector exceeds a defined threshold
- **Execution**: Time-weighted average price (TWAP) purchases minimize market impact
- **Deployment**: Purchased tokens are deployed to protocol-owned liquidity pools on leading DEXs for deeper, multi-axis liquidity

This creates continuous buy pressure proportional to platform usage, directly linking token value to protocol success.

---

## 8. Roll-Over Bonus System

The Roll-Over Bonus System is Calibr.xyz's signature incentive mechanism, rewarding traders who maintain continuous engagement with the platform.

### 8.1 How It Works

When traders take earnings from a winning position and reinvest into a new market within the bonus window, they receive a percentage bonus on their roll-over amount.

### 8.2 Bonus Tier Progression

| Milestone   | Base Bonus  | With Staking (1.5x) | Time Window |
| ----------- | ----------- | ------------------- | ----------- |
| 2nd trade   | 0.10%       | 0.15%               | 4 hours     |
| 3rd trade   | 0.10%       | 0.15%               | 4 hours     |
| 5th trade   | 0.20%       | 0.30%               | 6 hours     |
| 10th trade  | 0.35%       | 0.525%              | 8 hours     |
| 15th+ trade | 0.50% (max) | 0.75% (max)         | 12 hours    |

### 8.3 Bonus Reset

Traders maintain their bonus tier as long as they continue rolling over within the time window. After 12 hours of inactivity, the bonus tier resets to zero.

### 8.4 Sustainability Mechanisms

To ensure long-term system health, the following safeguards are implemented:

**Circuit Breaker**: If the Community Fund balance drops below the 30-day rolling average payout, the maximum bonus automatically reduces to 0.4% (0.6% for stakers) until the fund recovers.

**Monthly Hard Cap**: Individual users are limited to a maximum of $10,000 in roll-over bonuses per calendar month, preventing exploitation of the bonus system.

**Governance Review**: Bonus tier parameters are subject to quarterly governance review to ensure ongoing sustainability.

---

## 9. Staking & Governance

### 9.1 Staking Benefits

Staking $CALIBR provides meaningful benefits to committed participants:

- **1.5x Roll-Over Bonus Multiplier**: Transform the maximum 0.5% bonus into 0.75%
- **Governance Voting Rights**: Participate in protocol decision-making
- **Protocol Alignment**: Direct stake in platform success

### 9.2 Governance Scope

Staked $CALIBR holders can vote on:

- **Contribution Reward Allocations**: How Ecosystem Fund grants are distributed
- **Fee Structure Adjustments**: Changes to fee parameters within defined bounds
- **Platform Integrations**: Approval of new prediction market platforms
- **Treasury Deployment**: Allocation of treasury resources

### 9.3 Governance Process

| Parameter          | Value                                     |
| ------------------ | ----------------------------------------- |
| Proposal Threshold | Minimum staked $CALIBR required to submit |
| Voting Period      | 7 days for standard proposals             |
| Extended Voting    | 14 days for critical changes              |
| Quorum             | 5% of staked supply must participate      |
| Execution Delay    | 48-hour timelock on approved proposals    |

---

## 10. Liquidity Strategy

### 10.1 Protocol-Owned Liquidity (POL)

Calibr.xyz maintains protocol-owned liquidity to ensure deep, reliable trading for $CALIBR. Rather than relying on external liquidity providers who may withdraw during market stress, the protocol controls its own liquidity positions.

### 10.2 Key Principles

**Permanence**: Protocol-owned liquidity cannot be withdrawn by third parties, ensuring consistent trading depth.

**Fee Generation**: POL generates trading fees that flow back to the protocol, creating a sustainable revenue stream.

**Stability Focus**: Long-term ecosystem stability is prioritized over short-term gains.

**Diversification**: Liquidity is deployed across leading Base DEXs to ensure broad access.

---

## 11. Cross-Chain Architecture

### 11.1 User Experience

$CALIBR streamlines the prediction market experience. Users interact entirely in $CALIBR, with the protocol handling all cross-chain complexity behind the scenes.

### 11.2 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER EXPERIENCE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐         ┌──────────┐         ┌──────────────┐   │
│   │  $CALIBR │ ──────► │  Calibr  │ ──────► │  Prediction  │   │
│   │  Wallet  │         │  Platform │         │   Position   │   │
│   └──────────┘         └──────────┘         └──────────────┘   │
│                                                                 │
│   "Pay with $CALIBR"    "One-click"         "Position acquired" │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      BEHIND THE SCENES                          │
│       (Swap → Bridge → Execute — abstracted from user)          │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 Key Features

**Single-Token UX**: Users only need to hold $CALIBR to participate in prediction markets across multiple platforms.

**Streamlined Process**: The $CALIBR token eliminates the complexity of managing multiple tokens, chains, and bridges.

**Seamless Integration**: External prediction market positions are acquired through automated cross-chain execution.

### 11.4 Fee Transparency

Certain third-party swap and bridge fees may be charged during the execution process. These fees are transparently displayed to users before confirming any transaction, ensuring full visibility into the total cost of position acquisition.

---

## 12. Risk Factors & Disclaimers

### 12.1 Risk Categories

| Risk Category  | Description                                        | Mitigation                                  |
| -------------- | -------------------------------------------------- | ------------------------------------------- |
| Smart Contract | Potential bugs or vulnerabilities                  | Audits, bug bounty program, timelocks       |
| Market Risk    | Token price volatility                             | Bonding curve floor, buyback support        |
| Bridge Risk    | Cross-chain execution issues                       | Multiple fallback integrations, monitoring  |
| Regulatory     | Prediction market regulations vary by jurisdiction | Aggregation model (not market making)       |
| Competition    | Other aggregators may emerge                       | First-mover advantage, unique reward system |

### 12.2 Third-Party Launchpad Disclaimer

$CALIBR is issued via Hunt.town, a third-party bonding curve platform. Calibr.xyz does not control Hunt.town's infrastructure, smart contracts, or operations. Users should conduct their own research (DYOR) regarding Hunt.town's mechanisms, fees, security practices, and risks before participating in the token launch.

### 12.3 Prediction Market Disclaimer

Prediction market trading may be prohibited or restricted in certain jurisdictions. Users are solely responsible for:

- Understanding and complying with all applicable laws and regulations in their jurisdiction
- Determining the legality of prediction market participation in their location
- Any tax obligations arising from prediction market activities

Calibr.xyz makes no representations regarding the legality of prediction market participation in any jurisdiction. Users who are uncertain about the legal status of prediction markets in their jurisdiction should consult with qualified legal counsel before participating.

### 12.4 General Disclaimer

**This document is for informational purposes only and does not constitute financial, legal, or investment advice.**

Token purchases involve substantial risk, including but not limited to:

- Complete loss of principal
- Extreme price volatility
- Smart contract failures
- Regulatory changes
- Platform discontinuation

Past performance does not guarantee future results. Users participate entirely at their own risk and assume all responsibility for their actions. Calibr.xyz, its founders, team members, affiliates, and associated parties expressly disclaim all liability for any losses, damages, or adverse outcomes incurred in connection with the purchase, sale, or use of $CALIBR tokens or participation in the Calibr.xyz platform.

**By participating in the $CALIBR token launch or using the Calibr.xyz platform, users acknowledge that they have read, understood, and accepted these risks and disclaimers.**

---

## 13. Conclusion

$CALIBR represents a new approach to prediction market tokenomics, combining fair launch principles with innovative engagement mechanics designed for serious forecasters.

### Core Innovations

- **Fair Launch**: 70% of tokens distributed through transparent bonding curve mechanism
- **Roll-Over Bonus System**: Unique incentive structure rewarding continuous, accurate forecasting
- **Streamlined UX**: Single-token experience abstracting cross-chain complexity
- **Sustainable Economics**: Built-in circuit breakers and governance oversight

### Vision

_"Precision forecasting. Proven rewards."_

Calibr.xyz aims to become the definitive platform for sophisticated forecasters—providing professional-grade tools, transparent tokenomics, and meaningful rewards for accuracy.

---

**For more information:**

- Website: [calibr.xyz](https://calibr.xyz)
- Documentation: [docs.calibr.xyz](https://docs.calibr.xyz)
- Hunt.town Launch: [hunt.town](https://hunt.town)

---

_$CALIBR Tokenomics Whitepaper v4.0_
_January 2026_
_© Calibr.xyz_
