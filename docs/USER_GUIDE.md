# Calibr.xyz User Guide

## Introduction

Calibr.xyz is a prediction market portfolio manager and forecasting platform. Track your forecasts, manage positions across platforms, and build a verifiable track record using EAS attestations.

## Getting Started

### 1. Connect Your Wallet

Connect a Web3 wallet (MetaMask, Coinbase Wallet, etc.) to authenticate. Your wallet address becomes your identity on the platform.

### 2. Explore Markets

Browse aggregated markets from Polymarket, Kalshi, and other platforms. Markets are unified so you can compare prices across platforms.

### 3. Make Your First Forecast

Select a market and record your probability estimate. This creates a timestamped record of your prediction.

## Core Concepts

### Forecasts vs Positions

**Forecasts** are your probability estimates - what you believe will happen.

**Positions** are your actual trades - money at risk in the market.

You can make forecasts without trading, which is useful for:
- Building a track record before risking capital
- Testing your calibration
- Markets you can't access

### Kelly Criterion

The platform calculates optimal position sizes using the Kelly Criterion:

```
f* = (p - market_price) / (1 - market_price)
```

Where:
- `p` = your estimated probability
- `market_price` = current market price

We recommend half-Kelly (50% of optimal) for most users to reduce variance.

### Brier Score

Your forecasting accuracy is measured using the Brier Score:

```
BS = (forecast - outcome)²
```

- **0.00** = Perfect prediction
- **0.25** = Random guessing
- **1.00** = Completely wrong

Lower is better. A Brier score under 0.15 indicates excellent forecasting ability.

## Making Forecasts

### Step 1: Select a Market

Navigate to a market you want to forecast. Review:
- The question being asked
- Resolution criteria
- Current market prices
- End date

### Step 2: Set Your Probability

Enter your probability estimate (1-99%). Consider:
- What is your base rate for this type of event?
- What evidence supports higher/lower estimates?
- How confident are you in your analysis?

### Step 3: Add Reasoning (Optional)

Document your reasoning in the commit message. Good reasoning includes:
- Key evidence you're weighing
- Your mental model
- What would change your mind

This helps you review your forecasts later and improve.

### Step 4: Choose Visibility

- **Public**: Appears on leaderboards, contributes to your public track record
- **Private**: Only you can see it, still contributes to your personal calibration

### Step 5: Attest On-Chain (Optional)

Create an EAS attestation to prove your forecast was made at a specific time. This creates an immutable, verifiable record.

## Updating Forecasts

When new information arrives, update your forecast:

1. Navigate to your existing forecast
2. Click "Update Forecast"
3. Enter your new probability
4. Document what changed

Your forecast history is preserved, showing how your views evolved.

## Superforecaster Tiers

Progress through tiers by demonstrating forecasting skill:

| Tier | Min Forecasts | Max Brier Score | Skill Score |
|------|---------------|-----------------|-------------|
| Apprentice | 10 | 0.35 | -0.40 |
| Journeyman | 50 | 0.25 | 0.00 |
| Adept | 100 | 0.20 | 0.20 |
| Expert | 250 | 0.15 | 0.40 |
| Grandmaster | 500 | 0.10 | 0.60 |

**Skill Score** measures improvement over random guessing (always predicting 50%):
- Positive = better than chance
- Negative = worse than chance

## Calibration

Well-calibrated forecasters have predictions that match reality:
- When you say 70%, events should happen ~70% of the time
- When you say 30%, events should happen ~30% of the time

Review your calibration curve to identify:
- **Overconfidence**: Extreme predictions (>80% or <20%) occur less often than predicted
- **Underconfidence**: Moderate predictions when you should be more decisive

## Portfolio Management

### Viewing Positions

The Portfolio page shows:
- Current positions across all platforms
- Unrealized P&L
- Average cost basis
- Current market value

### Rebalancing

When you update a forecast with positive edge, the platform calculates recommended position changes based on Kelly Criterion.

### Cross-Chain Trading

Bridge USDC between Base and Polygon to trade on Polymarket:
1. Enter amount to bridge
2. Confirm the transaction
3. Wait for attestation (~15 minutes)
4. USDC arrives on destination chain

## Tips for Better Forecasting

### 1. Track Everything

Record forecasts even for markets you can't trade. Volume builds skill.

### 2. Be Specific

Vague forecasts are hard to evaluate. Ensure you understand exactly what the resolution criteria are.

### 3. Update Frequently

Don't anchor on old estimates. New information should change your views.

### 4. Review Resolved Markets

When markets resolve, examine:
- Was your forecast accurate?
- What did you miss?
- How can you improve?

### 5. Diversify Categories

Track record in one domain doesn't guarantee skill in others. Test yourself broadly.

### 6. Use Base Rates

Start with historical frequency of similar events, then adjust based on specific factors.

### 7. Consider Both Sides

Before finalizing a forecast, argue the opposite position. What would someone at the other extreme say?

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New forecast |
| `P` | Go to portfolio |
| `M` | Go to markets |
| `L` | Go to leaderboard |
| `S` | Go to settings |
| `?` | Show help |

## Getting Help

- **Documentation**: `/docs` section
- **GitHub Issues**: Report bugs or request features
- **Discord**: Community discussion

## Glossary

**Attestation**: Cryptographic proof of a statement on the blockchain (EAS).

**Base Rate**: Historical frequency of an event type.

**Brier Score**: Accuracy metric for probabilistic forecasts.

**Calibration**: Alignment between predicted probabilities and actual outcomes.

**Edge**: Difference between your probability and market price.

**Kelly Criterion**: Formula for optimal bet sizing given edge.

**Resolution**: Final outcome of a market (YES, NO, or N/A).

**Skill Score**: Improvement over always predicting 50%.
