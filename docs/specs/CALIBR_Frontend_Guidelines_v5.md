# Calibr.xyz Frontend Guidelines

## Prediction Market Portfolio Manager & Aggregation Layer

**Version:** 5.0  
**Last Updated:** January 2026  
**Status:** Development Phase  
**Aligned With:** Project Requirements v5.0, Data Schema v5.0, Project Tasks v5.0  
**See Also:** Moodboard v5.0 (for design philosophy and visual inspiration)

---

## Table of Contents

1. [UI/UX Paradigms](#1-uiux-paradigms)
2. [UI Schema: Data Point Mapping](#2-ui-schema-data-point-mapping)
3. [Page Hierarchy & Navigation](#3-page-hierarchy--navigation)
4. [Main Dashboard Layout](#4-main-dashboard-layout)
5. [Component Wireframes](#5-component-wireframes)
6. [Purchase Modal](#6-purchase-modal)
7. [Profile & Leaderboard Dashboard](#7-profile--leaderboard-dashboard)
8. [Technology Stack](#8-technology-stack)
9. [Design System](#9-design-system)
10. [Component Architecture](#10-component-architecture)
11. [Animation & Motion System](#11-animation--motion-system)
12. [Data Visualization](#12-data-visualization)
13. [Performance & Optimization](#13-performance--optimization)
14. [Build Configuration](#14-build-configuration)
15. [Quality Assurance](#15-quality-assurance)

---

## 1. UI/UX Paradigms

### 1.1 Desktop Web Interface (Primary)

The **main poweruser interface** optimized for large screens (1920×1080 and above). This is where the full "Bloomberg Terminal" experience lives.

**Desktop Layout Principles:**

| Principle             | Implementation                                     |
| --------------------- | -------------------------------------------------- |
| Multi-panel layout    | Resizable panels via drag handles                  |
| Persistent navigation | Status bar + keyboard shortcuts always visible     |
| Data density          | Minimal whitespace, compact information display    |
| Real-time updates     | WebSocket-driven with smooth NumberFlow animations |
| Keyboard shortcuts    | Full navigation without mouse required             |

**Minimum Viewport:** 1280×720 (optimized for 1920×1080+)

### 1.2 Responsive Web Interface (Secondary)

A simplified interface for tablet and mobile that maintains the terminal aesthetic but optimizes for touch and reduced screen real estate.

**Breakpoints:**

| Breakpoint   | Width   | Layout                           |
| ------------ | ------- | -------------------------------- |
| `desktop-xl` | ≥1920px | Full multi-panel with 4+ columns |
| `desktop`    | ≥1440px | Multi-panel with 3 columns       |
| `desktop-sm` | ≥1280px | Multi-panel with 2 columns       |
| `tablet`     | ≥768px  | Single panel with tab navigation |
| `mobile`     | <768px  | Stacked single column            |

**Mobile Considerations:**

- Collapse multi-panel to tabbed single-panel
- Preserve monospace fonts and terminal colors
- Touch-friendly tap targets (minimum 44px)
- Swipe gestures for panel navigation

### 1.3 Theming System (Post-MVP)

Calibr.xyz will support three visual themes, each with Light and Dark variants:

| Theme           | Inspiration                          | Dark Mode                            | Light Mode                            |
| --------------- | ------------------------------------ | ------------------------------------ | ------------------------------------- |
| **Terminal**    | Green phosphor CRT, hacker aesthetic | Green-on-black (#00ff00/#000000)     | Dark green-on-cream (#006600/#f0f0e8) |
| **Classic DOS** | Norton Commander, Turbo Pascal       | Cyan/white-on-blue (#00ffff/#0000aa) | Blue-on-light gray (#000080/#e0e0e0)  |
| **BBS**         | Wildcat!, WWIV, PCBoard              | Amber-on-black (#ffb000/#0a0a0a)     | Brown-on-cream (#8b4513/#fff8dc)      |

**Implementation Notes:**

- Theme selection stored in user preferences (localStorage + Supabase sync)
- CSS custom properties enable instant theme switching
- All themes maintain WCAG 2.1 AA contrast ratios
- Light modes take _influence_ from retro aesthetics without slavishly copying CRT limitations
- Default: Terminal Dark (most aligned with brand identity)

### 1.4 Blockchain Transparency Principle

As a Web3 application, Calibr.xyz embraces **radical transparency** by surfacing blockchain data throughout the UI. Every on-chain action should be verifiable by the user.

**Core Rules:**

1. **Display hashes and addresses** wherever blockchain transactions or attestations occur
2. **Link to explorers** — every hash/address is clickable and opens the relevant explorer
3. **Copy functionality** — include copy icons for easy clipboard access
4. **Truncate with context** — show `0x7a3f...9e2b` format but full value on hover/copy

**Explorer Mappings:**

| Chain/Service          | Explorer    | URL Pattern                                       |
| ---------------------- | ----------- | ------------------------------------------------- |
| Base (transactions)    | Basescan    | `https://basescan.org/tx/{hash}`                  |
| Base (addresses)       | Basescan    | `https://basescan.org/address/{address}`          |
| Polygon (transactions) | Polygonscan | `https://polygonscan.com/tx/{hash}`               |
| Polygon (addresses)    | Polygonscan | `https://polygonscan.com/address/{address}`       |
| EAS Attestations       | EAS Scan    | `https://base.easscan.org/attestation/view/{uid}` |
| EAS Schema             | EAS Scan    | `https://base.easscan.org/schema/view/{schemaId}` |

**Where to Display Blockchain Data:**

| Context              | Data to Show        | Format                                  |
| -------------------- | ------------------- | --------------------------------------- |
| Header (wallet)      | Connected address   | `0x7a3...f9e` + chain badge             |
| Transaction history  | Tx hash             | `0x7a3...f9e` + status + explorer link  |
| Forecast commits     | EAS attestation UID | `EAS: 0x7a3...f9e` + verification badge |
| Cross-chain progress | Step tx hashes      | Per-step hash display                   |
| Profile page         | Wallet address      | Full display + ENS if available         |
| Leaderboard          | User addresses      | Truncated + link to profile             |

**BlockchainLink Component:**

```
┌─────────────────────────────────────────────────────────────────┐
│  BLOCKCHAIN LINK ANATOMY                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔗 0x7a3f...9e2b  [📋]                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│     ↑        ↑         ↑                                        │
│   icon   truncated   copy button                                │
│          (hover shows full)                                     │
│                                                                 │
│  States:                                                        │
│  • DEFAULT:  dim text, subtle link styling                     │
│  • HOVER:    bright text, underline, tooltip with full hash    │
│  • COPIED:   "Copied!" toast, checkmark replaces copy icon     │
│                                                                 │
│  Variants:                                                      │
│  • TX:       🔗 prefix, links to /tx/{hash}                    │
│  • ADDRESS:  👤 prefix, links to /address/{addr}               │
│  • EAS:      📑 prefix (attestation), links to EAS Scan        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Emoji Usage Policy

Emoji are used **sparingly** to accentuate information and signal interactivity. They should not be scattered decoratively.

**Approved Emoji Contexts:**

| Context              | Emoji          | Purpose                           |
| -------------------- | -------------- | --------------------------------- |
| Interactive elements | Various        | Signal clickable/actionable items |
| Blockchain links     | 🔗 👤 📑       | Distinguish link types            |
| Copy to clipboard    | 📋             | Universal copy action             |
| Tier badges          | 🌱 🎯 🔮 🧠 👁️ | Superforecaster progression       |
| Correlation warnings | ⚠️...📈        | Alert prefix + chart link postfix |
| Status indicators    | ◉ ○ ✓ ✗        | Connection/completion states      |

**Superforecaster Tier Badges:**

| Tier        | Emoji | Rationale                                        |
| ----------- | ----- | ------------------------------------------------ |
| Apprentice  | 🌱    | Seedling — just beginning, learning fundamentals |
| Journeyman  | 🎯    | Target — developing accuracy, hitting marks      |
| Expert      | 🔮    | Crystal ball — proven forecasting ability        |
| Master      | 🧠    | Brain — deep expertise, sophisticated reasoning  |
| Grandmaster | 👁️    | All-seeing eye — ultimate forecaster             |

**Emoji Rules:**

1. Use emoji where **interactions are expected** (buttons, links, badges)
2. Avoid decorative emoji in body text or data displays
3. Any usage outside approved contexts requires explicit justification
4. Prefer ASCII symbols (✓, ✗, •, →) over emoji for status text

### 1.6 Tooltip & Discoverability Guidelines

Power users still need guidance on non-standard UI elements. All custom interactions must have hover tooltips.

**Required Tooltips:**

| Element                | Tooltip Content                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Rotary Knob            | "Drag vertically to adjust • Scroll for fine control • Click to type • Double-click to reset" |
| Tier Badge             | "[Tier Name]: [Requirements summary]"                                                         |
| Blockchain Link        | Full hash/address value                                                                       |
| Copy Icon              | "Copy to clipboard" → "Copied!"                                                               |
| Kelly Fraction Presets | Explanation of each preset (e.g., "Conservative: Lower risk, smaller positions")              |
| Chart Crosshairs       | Current value at cursor position                                                              |

**Tooltip Timing:**

- Show delay: 300ms (prevents flicker on mouse movement)
- Hide delay: 100ms (allows moving to tooltip content if needed)
- Position: Prefer above element, fallback to below/side

---

## 2. UI Schema: Data Point Mapping

This section maps every user-facing data point from the Data Schema to its UI location.

### 2.1 Main Dashboard Data Points

| Data Entity          | Field(s)                                     | UI Location                  | Component                          |
| -------------------- | -------------------------------------------- | ---------------------------- | ---------------------------------- |
| **User**             | `displayName`, `avatarUrl`                   | Header                       | `ProfileBadge`                     |
| **UserCalibration**  | `currentTier`                                | Header (badge)               | `TierBadge`                        |
| **WalletConnection** | `address`, `chainId`                         | Header                       | `WalletDisplay` + `BlockchainLink` |
| **WalletConnection** | Balance (Base $CALIBR)                       | Portfolio Overview           | `BalanceCard`                      |
| **WalletConnection** | Balance (Polygon USDC)                       | Portfolio Overview           | `BalanceCard`                      |
| **UnifiedMarket**    | `question`, `category`, `tags`               | Market Browser               | `MarketTree`                       |
| **UnifiedMarket**    | `bestYesPrice`, `bestNoPrice`                | Active Market                | `PriceDisplay`                     |
| **UnifiedMarket**    | `totalVolume`, `totalLiquidity`              | Active Market                | `VolumeDisplay`                    |
| **PlatformMarket**   | `yesPrice`, `noPrice`, `spread`              | Active Market                | `PriceChart`                       |
| **PlatformMarket**   | `bestBid`, `bestAsk`                         | Active Market > Order Book   | `OrderBookTable`                   |
| **Position**         | `outcome`, `shares`, `currentValue`          | Portfolio Overview           | `PositionSummary`                  |
| **Position**         | `unrealizedPnl`, `unrealizedPnlPct`          | Portfolio Overview           | `PnLDisplay`                       |
| **Position**         | Aggregated by category                       | Exposure by Category         | `ExposureChart`                    |
| **Forecast**         | `probability`, `confidence`, `commitMessage` | Active Market > Commits      | `CommitLog`                        |
| **Forecast**         | `recommendedSize`, `kellyFraction`           | Active Market > Kelly        | `KellyRecommendation`              |
| **Transaction**      | `type`, `shares`, `pricePerShare`, `status`  | Active Market > Transactions | `TransactionTable`                 |
| **Transaction**      | `txHash`                                     | Active Market > Transactions | `BlockchainLink` (tx)              |
| **Alert**            | `type`, `config`, `lastTriggeredAt`          | Status Pane                  | `AlertList`                        |
| **Platform**         | `healthStatus`, `lastHealthCheck`            | Status Pane                  | `PlatformHealth`                   |
| **WalletConnection** | `syncStatus`, `lastSyncAt`                   | Status Pane                  | `SyncStatus`                       |

### 2.2 Blockchain Transparency Data Points

| Data Entity               | Field(s)         | UI Location               | Explorer Link                      |
| ------------------------- | ---------------- | ------------------------- | ---------------------------------- |
| **WalletConnection**      | `address`        | Header, Profile           | Basescan `/address/{addr}`         |
| **Transaction**           | `txHash`         | Transaction History       | Polygonscan `/tx/{hash}`           |
| **CrossChainTransaction** | `swapTxHash`     | Purchase Modal Progress   | Basescan `/tx/{hash}`              |
| **CrossChainTransaction** | `bridgeTxHash`   | Purchase Modal Progress   | Basescan `/tx/{hash}`              |
| **CrossChainTransaction** | `depositTxHash`  | Purchase Modal Progress   | Polygonscan `/tx/{hash}`           |
| **CrossChainTransaction** | `tradeTxHash`    | Purchase Modal Progress   | Polygonscan `/tx/{hash}`           |
| **EASAttestation**        | `uid`            | Forecast Commits, Profile | EAS Scan `/attestation/view/{uid}` |
| **EASAttestation**        | `schemaId`       | Profile (schema info)     | EAS Scan `/schema/view/{schemaId}` |
| **Forecast**              | `attestationUid` | Commit Log entries        | EAS Scan `/attestation/view/{uid}` |

### 2.2 Purchase Modal Data Points

| Data Entity               | Field(s)                          | UI Location    | Component            |
| ------------------------- | --------------------------------- | -------------- | -------------------- |
| **UnifiedMarket**         | `question`, `yesPrice`, `noPrice` | Modal Header   | `MarketSummary`      |
| **Forecast**              | `probability` (input)             | Kelly Controls | `ProbabilityKnob`    |
| **Forecast**              | `confidence` (input)              | Kelly Controls | `ConfidenceKnob`     |
| **Forecast**              | `kellyFraction` (input)           | Kelly Controls | `KellyFractionKnob`  |
| **Forecast**              | `recommendedSize` (calculated)    | Order Summary  | `SizeRecommendation` |
| **CrossChainTransaction** | `swapStatus`                      | Progress Bar   | `StepIndicator`      |
| **CrossChainTransaction** | `bridgeStatus`                    | Progress Bar   | `StepIndicator`      |
| **CrossChainTransaction** | `depositStatus`                   | Progress Bar   | `StepIndicator`      |
| **CrossChainTransaction** | `tradeStatus`                     | Progress Bar   | `StepIndicator`      |
| **CrossChainTransaction** | `totalFees`, `slippage`           | Fee Summary    | `FeeBreakdown`       |

### 2.3 Profile & Leaderboard Data Points

| Data Entity         | Field(s)                                    | UI Location       | Component          |
| ------------------- | ------------------------------------------- | ----------------- | ------------------ |
| **User**            | `displayName`, `avatarUrl`, `publicProfile` | Profile Header    | `ProfileCard`      |
| **UserCalibration** | `avgBrierScore`, `avgTimeWeightedBrier`     | Stats Panel       | `CalibrationStats` |
| **UserCalibration** | `totalForecasts`, `resolvedForecasts`       | Stats Panel       | `ForecastCount`    |
| **UserCalibration** | `calibrationData` (buckets)                 | Calibration Chart | `CalibrationCurve` |
| **UserCalibration** | `globalRank`, `percentile`                  | Leaderboard       | `RankDisplay`      |
| **UserCalibration** | `currentTier`, `tierPromotedAt`             | Profile Header    | `TierBadge`        |
| **EASAttestation**  | `uid`, `schemaName`, `data`                 | Attestations Tab  | `AttestationList`  |
| **ForecastScore**   | `rawBrierScore`, `timeWeightedBrier`        | Score History     | `ScoreTable`       |

---

## 3. Page Hierarchy & Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CALIBR.XYZ PAGE STRUCTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ MAIN DASHBOARD ────────────────────────────────────────────────────┐   │
│  │ • Market Browser (left pane)                                         │   │
│  │ • Active Markets - Tabbed (center pane, PRIMARY FOCUS)              │   │
│  │ • Portfolio Overview + Exposure + Status (right pane, stacked)      │   │
│  │                                                                      │   │
│  │ Drill-Downs (within Active Market tabs):                            │   │
│  │   ├─ Market Overview (default)                                      │   │
│  │   ├─ Price Chart                                                    │   │
│  │   ├─ Forecast Commit History                                        │   │
│  │   ├─ Transaction History (grouped by market)                        │   │
│  │   └─ Order Book                                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ PROFILE & LEADERBOARD DASHBOARD ───────────────────────────────────┐   │
│  │ (Accessed via tier badge click in header)                            │   │
│  │ • User Profile Card                                                  │   │
│  │ • Calibration Stats & Chart                                         │   │
│  │ • Global Leaderboard                                                 │   │
│  │ • EAS Attestation History                                           │   │
│  │ • Tier Progress & Achievements                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ MODALS ────────────────────────────────────────────────────────────┐   │
│  │ • Purchase Modal (with Kelly knobs + cross-chain progress)          │   │
│  │ • New Forecast Modal                                                 │   │
│  │ • Settings Modal                                                     │   │
│  │ • Alert Configuration Modal                                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Keyboard Shortcuts

| Key          | Action                           |
| ------------ | -------------------------------- |
| `M`          | Focus Market Browser             |
| `P`          | Open Portfolio panel             |
| `F`          | Open New Forecast modal          |
| `K`          | Open Kelly Calculator            |
| `L`          | Open Leaderboard                 |
| `S`          | Open Settings                    |
| `?` or `F1`  | Help overlay                     |
| `Esc`        | Close modal / Cancel             |
| `Tab`        | Cycle through Active Market tabs |
| `Ctrl+Enter` | Confirm action in modal          |

---

## 4. Main Dashboard Layout

### 4.1 Desktop Layout (1920×1080+)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CALIBR.XYZ v1.0 │ ◉ Base │ ◉ Polygon │ [🔮 EXPERT] 0x7a3...f9e [📋] │ $12,847 │ [?][⚙] │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│ ┌─ MARKET BROWSER ──────┐ ┌─ ACTIVE MARKETS ─────────────────────────────┐ ┌─ PORTFOLIO ─┐
│ │                        │ │ ▶ BTC>150K ◀ [ETH>5K] [TRUMP_WIN] [+]       │ │             │
│ │ [🔍 Search...]         │ ├──────────────────────────────────────────────┤ │ Total Value │
│ │                        │ │                                              │ │ $12,847.32  │
│ │ ▼ Politics (24)        │ │  Will BTC exceed $150K by Dec 31, 2026?     │ │ +$234 today │
│ │   ├─ US Elections (12) │ │  Source: Polymarket │ Closes: Dec 31, 2026  │ │             │
│ │   ├─ International (8) │ │                                              │ │ Balances:   │
│ │   └─ Policy (4)        │ │  ┌─ PRICE CHART (15m) ──────────────────┐   │ │ Base: 1,240 │
│ │ ▼ Crypto (18)          │ │  │ $0.72 ┤                      ╭──── │   │ │ Poly: $4,200│
│ │   ├─ Bitcoin (6)       │ │  │       │               ╭─────╯      │   │ ├─────────────┤
│ │   ├─ Ethereum (5)      │ │  │ $0.54 ┤       ╭──────╯             │   │ │ EXPOSURE    │
│ │   └─ Altcoins (7)      │ │  │       │ ─────╯                     │   │ │             │
│ │ ▶ Sports (31)          │ │  │ $0.36 ┼───────┬───────┬───────┬─── │   │ │ Politics 62%│
│ │ ▶ Economics (9)        │ │  │       Jan     Mar     May     Jul  │   │ │ ███████░░░░ │
│ │ ▶ Science (6)          │ │  └──────────────────────────────────────┘   │ │ Crypto  24% │
│ │         ↕ scroll       │ │                                              │ │ █████░░░░░░ │
│ │                        │ │  YES: $0.72 (+2.3%)    NO: $0.28 (-1.4%)    │ │ Sports  14% │
│ │                        │ │  Volume: $2.1M         Spread: 0.8%         │ │ ███░░░░░░░░ │
│ │                        │ │                                              │ ├─────────────┤
│ │                        │ │  [Overview] [Chart] [Commits] [Txns] [Book] │ │ STATUS      │
│ │                        │ ├──────────────────────────────────────────────┤ │             │
│ │                        │ │ ┌─ FORECAST COMMIT LOG ────────────────────┐ │ │ ◉ Polymarket│
│ │                        │ │ │ commit 7a3f9e2 (HEAD)                    │ │ │   HEALTHY   │
│ │                        │ │ │ 📑 0x7a3...f9e [📋]                      │ │ │             │
│ │                        │ │ │ Date: 2026-01-15 14:32 UTC               │ │ │ ◉ Sync: OK  │
│ │                        │ │ │                                          │ │ │   2m ago    │
│ │                        │ │ │   BTC>150K: 67% → 72% (+5%)              │ │ ├─────────────┤
│ │                        │ │ │   ETF inflows accelerating...            │ │ │ ⚠️ Correlated│
│ │                        │ │ └──────────────────────────────────────────┘ │ │ positions 📈│
│ │                        │ │                                              │ │             │
│ │                        │ │          [📝 New Forecast] [💰 Buy/Sell]    │ │ │ ⚡ BTC>150K │
│ └────────────────────────┘ └──────────────────────────────────────────────┘ └─────────────┘
│                                                                                           │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ [M]arkets [P]ortfolio [F]orecast [K]elly [L]eaderboard [S]ettings           │ F1=Help    │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Layout Specifications:**

- **Total viewport**: No page-level scrollbars; all content fits in single screen
- **Market Browser**: 20% width, internal scroll for category tree (indicated by `↕ scroll`)
- **Active Markets**: 50% width, tabs for multiple open markets
- **Right Stack**: 30% width (Portfolio 35%, Exposure 30%, Status 35%)
- **Active Tab Style**: `▶ [tab] ◀` arrows indicate selected tab; inactive tabs use `[brackets]`

**Price Chart:**

- Data source: Polymarket SDK historical prices
- Update interval: 15 minutes (cached for efficiency)
- Default timeframe: 6 months
- Interactions: Hover for crosshair with exact price/date tooltip

---

## 5. Component Wireframes

### 5.1 Market Browser (Tree Style with Internal Scroll)

```
┌─ MARKET BROWSER ────────────────────────────────────┐
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔍 Search markets...                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [Platform: Polymarket ▼] [Category: All ▼]          │
│ ════════════════════════════════════════════════════│
│ ▼ Politics (24 markets)                        ─────│▲
│   ├─ US Elections (12)                              ││
│   │   ├─ Will Trump win 2028?      42% │ $2.1M     ││
│   │   ├─ Will Biden run 2028?      12% │ $890K     ││
│   │   ├─ GOP House majority?       67% │ $1.4M     ││
│   │   └─ Dem Senate majority?      54% │ $780K     │█
│   ├─ International (8)                              │█
│   │   ├─ UK snap election 2026?    23% │ $340K     ││
│   │   └─ ...                                        ││
│   └─ Policy (4)                                     ││
│       ├─ Fed rate cut Q1?          78% │ $2.8M     ││
│       └─ ...                                        ││
│                                                      ││
│ ▶ Crypto (18 markets)                               ││
│ ▶ Sports (31 markets)                               ││
│ ▶ Economics (9 markets)                             │▼
│ ════════════════════════════════════════════════════│
│ ★ Watchlist (8)                                     │
└──────────────────────────────────────────────────────┘
```

**Scroll Behavior:**

- Category tree area scrolls independently within the pane
- Search bar and filters remain fixed at top
- Watchlist section optionally fixed at bottom
- Scrollbar styled to match terminal aesthetic (thin, green track)

**Interaction:**

- Click category header to expand/collapse
- Click market to open in Active Markets (new tab)
- Double-click to replace current tab
- Right-click for context menu (Add to watchlist, Set alert)

### 5.2 Active Market Panel (Tabbed)

```
┌─ ACTIVE MARKETS ────────────────────────────────────────────────────────────┐
│ ▶ BTC>150K ◀ [ETH>5K ×] [TRUMP_WIN ×] [+]                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Will BTC exceed $150K by Dec 31, 2026?                             │   │
│  │  Category: Crypto │ Platform: Polymarket │ Closes: Dec 31, 2026     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ PRICE CHART (15m intervals) ───────────────────────────────────────┐   │
│  │ $0.72 ┤                                                    ╭────    │   │
│  │       │                                             ╭─────╯         │   │
│  │ $0.54 ┤                                     ╭──────╯                │   │
│  │       │                             ╭──────╯                        │   │
│  │ $0.36 ┤                     ╭──────╯                                │   │
│  │       │ ───────────────────╯                                        │   │
│  │ $0.18 ┼──────────┬──────────┬──────────┬──────────┬──────────┬───   │   │
│  │       Jan        Feb        Mar        Apr        May        Jun    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  YES: $0.72 (+2.3%)    NO: $0.28 (-1.4%)    Spread: 0.3%    Vol: $2.1M    │
│                                                                             │
│  ▶ Overview ◀ [📈 Chart] [📝 Commits] [💳 Txns] [📊 Order Book]           │
│                                                                             │
│                      [📝 New Forecast]  [💰 Buy/Sell]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tab Styling:**

- Active tab: `▶ Tab Name ◀` (arrows indicate selection)
- Inactive tabs: `[Tab Name ×]` (square brackets, × for close)
- Add tab: `[+]`

**Price Chart Specification:**

- Data source: Polymarket SDK `getMarketPriceHistory()`
- Cache duration: 15 minutes
- Default view: 6 months
- Hover: Crosshair tooltip with exact price and timestamp
- Click+drag: Zoom to selection

### 5.3 Forecast Commit Log Sub-Tab

```
┌─ FORECAST COMMIT LOG ─────────────────────────────────────────────────────────┐
│                                                                               │
│  commit 7a3f9e2 (HEAD -> main)                                                │
│  Author: forecaster.eth                                                       │
│  Date:   2026-01-15 14:32:18 UTC                                              │
│  📑 0x7a3f...9e2b [📋] ← View on EAS Scan                                    │
│                                                                               │
│      BTC>150K: Updated probability 67% → 72%                                  │
│                                                                               │
│      Rationale: ETF inflows accelerating, halving impact delayed             │
│      but still bullish. Revised timeline expectations.                        │
│                                                                               │
│      Kelly recommendation: 21.4% ($2,750)                                     │
│                                                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                               │
│  commit 3b2c8d1                                                               │
│  Author: forecaster.eth                                                       │
│  Date:   2026-01-14 09:15:44 UTC                                              │
│  📑 0x3b2c...8d1f [📋] ← View on EAS Scan                                    │
│                                                                               │
│      BTC>150K: Updated probability 62% → 67%                                  │
│                                                                               │
│      Rationale: Post-halving momentum building. Institutional                │
│      interest increasing based on ETF volume data.                            │
│                                                                               │
│      Kelly recommendation: 18.2% ($2,340)                                     │
│                                                                               │
│  [Load More...]                                                               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Blockchain Elements:**

- 📑 prefix indicates EAS attestation
- Copy icon [📋] for easy clipboard access
- Clickable link opens EAS Scan attestation view
- Hover shows full UID in tooltip

### 5.4 Transaction History Sub-Tab

```
┌─ TRANSACTION HISTORY ─────────────────────────────────────────────────────────┐
│                                                                               │
│  Market: Will BTC exceed $150K by Dec 31, 2026?                               │
│                                                                               │
│ ┌──────┬────────┬─────────┬──────────┬───────────┬─────────┬────────────────┐│
│ │ Date │ Type   │ Outcome │ Shares   │ Price     │ Total   │ Tx Hash        ││
│ ├──────┼────────┼─────────┼──────────┼───────────┼─────────┼────────────────┤│
│ │01-15 │ BUY    │ YES     │ 500      │ $0.42     │ $210.00 │ 0x7a3...9e [📋]││
│ │01-14 │ BUY    │ YES     │ 200      │ $0.38     │ $76.00  │ 0x3b2...8d [📋]││
│ │01-10 │ BUY    │ YES     │ 300      │ $0.35     │ $105.00 │ 0x9c4...2f [📋]││
│ │01-08 │ SELL   │ NO      │ 150      │ $0.62     │ $93.00  │ 0x1d5...7a [📋]││
│ │01-05 │ BUY    │ YES     │ 250      │ $0.32     │ $80.00  │ 0x8e6...3c [📋]││
│ └──────┴────────┴─────────┴──────────┴───────────┴─────────┴────────────────┘│
│                                                                               │
│  Summary:                                                                     │
│  ├─ Total YES shares: 1,250                                                   │
│  ├─ Average cost basis: $0.376                                                │
│  ├─ Current value: $525.00 (1,250 × $0.42)                                   │
│  ├─ Unrealized P&L: +$55.00 (+11.7%)                                         │
│  └─ Realized P&L: +$0.00                                                      │
│                                                                               │
│  [Export CSV]                                                                 │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Blockchain Elements:**

- Tx Hash column with truncated hash display
- Copy icon [📋] for each transaction
- Clickable hash opens Polygonscan transaction view
- Hover shows full tx hash in tooltip

### 5.5 Order Book Sub-Tab

```
┌─ ORDER BOOK ──────────────────────────────────────────────────────────────────┐
│                                                                               │
│  Market: Will BTC exceed $150K by Dec 31, 2026?                               │
│  Spread: $0.003 (0.7%)                                                        │
│                                                                               │
│  ┌─ BIDS (YES) ────────────────────┐  ┌─ ASKS (YES) ───────────────────────┐ │
│  │ Price    │ Size     │ Total     │  │ Price    │ Size     │ Total       │ │
│  ├──────────┼──────────┼───────────┤  ├──────────┼──────────┼─────────────┤ │
│  │ $0.419   │ 2,500    │ $1,048    │  │ $0.422   │ 1,800    │ $760        │ │
│  │ $0.418   │ 5,200    │ $2,174    │  │ $0.423   │ 3,200    │ $1,354      │ │
│  │ $0.417   │ 8,100    │ $3,378    │  │ $0.424   │ 4,500    │ $1,908      │ │
│  │ $0.416   │ 12,400   │ $5,158    │  │ $0.425   │ 6,800    │ $2,890      │ │
│  │ $0.415   │ 18,200   │ $7,553    │  │ $0.426   │ 9,100    │ $3,877      │ │
│  └──────────┴──────────┴───────────┘  └──────────┴──────────┴─────────────┘ │
│                                                                               │
│  ┌─ DEPTH CHART ──────────────────────────────────────────────────────────┐  │
│  │                          │                                              │  │
│  │  ████████████████████████│                                              │  │
│  │  ████████████████████████│███████████████████                          │  │
│  │  ████████████████████████│███████████████████████████                  │  │
│  │  ████████████████████████│███████████████████████████████████          │  │
│  │  ────────────────────────┼──────────────────────────────────────────   │  │
│  │  $0.41                   │ $0.42                           $0.43       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Portfolio Overview Panel

```
┌─ PORTFOLIO OVERVIEW ────────────────────────────────┐
│                                                      │
│  Total Value                                         │
│  ┌────────────────────────────────────────────────┐ │
│  │         $ 1 2 , 8 4 7 . 3 2                    │ │
│  │                                                 │ │
│  │  Today: +$234.56 (+1.86%)  ▲                   │ │
│  │  Week:  +$892.12 (+7.45%)  ▲                   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Today] [Week] [Month]    ← P&L Chart tabs         │
│  ┌────────────────────────────────────────────────┐ │
│  │      ╭─────────╮                               │ │
│  │     ╱          ╲    ╭───────╮                  │ │
│  │    ╱            ╲──╯        ╲___              │ │
│  │ __╱                                            │ │
│  │ Mon  Tue  Wed  Thu  Fri  Sat  Today            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Wallet Balances                                     │
│  ├─ Base (Main):     1,240 $CALIBR (~$2,480)        │
│  ├─ Polygon Safe:    $4,200 USDC                    │
│  └─ In Positions:    $6,167 (14 positions)          │
│                                                      │
│  Open Positions: 14                                  │
│  Correlated Warnings: 2 ⚠                           │
│                                                      │
│  ⚠ Trump+GOP: $1,250 (correlation: 0.8)             │
│  ⚠ BTC+ETH: $800 (correlation: 0.7)                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5.7 Exposure by Category Panel

```
┌─ EXPOSURE BY CATEGORY ──────────────────────────────┐
│                                                      │
│  Politics                         $7,965 (62%)      │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░       │
│                                                      │
│  Crypto                           $3,083 (24%)      │
│  █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│                                                      │
│  Sports                           $1,799 (14%)      │
│  ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  By Platform:                                        │
│  Polymarket                      $12,847 (100%)     │
│  ████████████████████████████████████████████       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5.8 Status Pane

```
┌─ STATUS ────────────────────────────────────────────┐
│                                                      │
│  PLATFORM HEALTH                                     │
│  ├─ ● Polymarket     HEALTHY      (2m ago)          │
│  ├─ ○ Kalshi         DISABLED     (MVP)             │
│  └─ ○ IEM            DISABLED     (MVP)             │
│                                                      │
│  SYNC STATUS                                         │
│  ├─ Positions:       ✓ Synced     (2m ago)          │
│  ├─ Markets:         ✓ Synced     (1m ago)          │
│  └─ Prices:          ◉ Live       (WebSocket)       │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  RECENT ALERTS                                       │
│                                                      │
│  ⚡ 14:32  BTC>150K price crossed 70%               │
│  ⚡ 12:15  ETH>5K hit price target                  │
│  ⚡ 09:41  Position value +10% (TRUMP_WIN)          │
│  📢 08:00  Daily calibration update                  │
│                                                      │
│  [View All Alerts...]                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 6. Purchase Modal

### 6.1 Modal Overview

The Purchase Modal combines:

1. **Market summary** at top
2. **Rotary knobs** for Kelly parameter calibration (center)
3. **Order summary** with calculated recommendation
4. **Cross-chain execution progress** at bottom

### 6.2 Modal Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PURCHASE POSITION                        [×]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ MARKET ─────────────────────────────────────────────────────────────┐  │
│  │  Will BTC exceed $150K by Dec 31, 2026?                              │  │
│  │  Current: YES $0.42 (+2.3%)  │  NO $0.58 (-1.4%)                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ KELLY OPTIMIZER ────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │     YOUR PROBABILITY          CONFIDENCE           KELLY FRACTION    │  │
│  │                                                                       │  │
│  │         ╭───────╮              ╭───────╮              ╭───────╮       │  │
│  │        ╱    │    ╲            ╱    │    ╲            ╱    │    ╲      │  │
│  │       │     │     │          │     │     │          │     │     │     │  │
│  │       │  ───●     │          │  ───●     │          │  ───●     │     │  │
│  │       │     │     │          │     │     │          │     │     │     │  │
│  │        ╲    │    ╱            ╲    │    ╱            ╲    │    ╱      │  │
│  │         ╰───────╯              ╰───────╯              ╰───────╯       │  │
│  │           72%                    75%                    50%           │  │
│  │                                                                       │  │
│  │  Your estimate vs market:  +30% edge                                 │  │
│  │  Recommended position:     21.4% of bankroll                         │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ ORDER SUMMARY ──────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Position:        BUY YES                                            │  │
│  │  Amount:          $2,750.00  (21.4% of $12,847)                      │  │
│  │  Shares:          ~6,548 YES shares @ $0.42                          │  │
│  │                                                                       │  │
│  │  ─────────────────────────────────────────────────────────────────── │  │
│  │                                                                       │  │
│  │  Current Position: 1,250 YES ($525)                                  │  │
│  │  After Purchase:   7,798 YES ($3,275)                                │  │
│  │  Change:           +6,548 YES (+$2,750)                              │  │
│  │                                                                       │  │
│  │  ─────────────────────────────────────────────────────────────────── │  │
│  │                                                                       │  │
│  │  Fees:                                                                │  │
│  │  ├─ Swap fee (0.3%):        ~$8.25                                   │  │
│  │  ├─ Bridge fee (CCTP):      ~$2.00                                   │  │
│  │  ├─ Trading fee (0%):       $0.00                                    │  │
│  │  └─ Total fees:             ~$10.25                                  │  │
│  │                                                                       │  │
│  │  Estimated time: 3-5 minutes                                         │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│            [ Cancel ]                    [ Confirm Purchase → ]             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ TRANSACTION PROGRESS ───────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ○ SWAP          ○ BRIDGE         ○ DEPOSIT        ○ TRADE           │  │
│  │  $CALIBR→USDC    Base→Polygon     USDC→Safe        Buy Position      │  │
│  │                                                                       │  │
│  │  ─────────────────────────────────────────────────────────────────── │  │
│  │                        Waiting for confirmation...                   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Transaction Progress States

**Step 1 - Swapping:**

```
┌─ TRANSACTION PROGRESS ─────────────────────────────────────────────────────┐
│  ◉ SWAP          ○ BRIDGE         ○ DEPOSIT        ○ TRADE                 │
│  $CALIBR→USDC    Base→Polygon     USDC→Safe        Buy Position            │
│  ████░░░░░░░░    ░░░░░░░░░░░░     ░░░░░░░░░░░░     ░░░░░░░░░░░░            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Swapping 1,240 $CALIBR → USDC on Base...                                  │
│  Tx: 0x7a3f...9e2b [📋] ← View on Basescan                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step 2 - Bridging:**

```
┌─ TRANSACTION PROGRESS ─────────────────────────────────────────────────────┐
│  ✓ SWAP          ◉ BRIDGE         ○ DEPOSIT        ○ TRADE                 │
│  $CALIBR→USDC    Base→Polygon     USDC→Safe        Buy Position            │
│  ████████████    ██████░░░░░░     ░░░░░░░░░░░░     ░░░░░░░░░░░░            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Bridging $2,750 USDC from Base to Polygon via CCTP...                     │
│  Waiting for Circle attestation (~2-3 min)                                  │
│  Bridge Tx: 0x3b2c...8d1f [📋] ← View on Basescan                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Completed:**

```
┌─ TRANSACTION PROGRESS ─────────────────────────────────────────────────────┐
│  ✓ SWAP          ✓ BRIDGE         ✓ DEPOSIT        ✓ TRADE                 │
│  $CALIBR→USDC    Base→Polygon     USDC→Safe        Buy Position            │
│  ████████████    ████████████     ████████████     ████████████            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✓ Purchase complete! Acquired 6,548 YES shares.                           │
│  Total time: 3m 42s │ Total fees: $10.12                                   │
│                                                                             │
│  Transaction Hashes:                                                        │
│  ├─ Swap:    0x7a3f...9e2b [📋] (Base)                                     │
│  ├─ Bridge:  0x3b2c...8d1f [📋] (Base)                                     │
│  ├─ Deposit: 0x9c4e...2f7a [📋] (Polygon)                                  │
│  └─ Trade:   0x1d5a...7b3c [📋] (Polygon)                                  │
│                                                                             │
│  [View All on Explorer] [Close]                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Error State:**

```
┌─ TRANSACTION PROGRESS ─────────────────────────────────────────────────────┐
│  ✓ SWAP          ✓ BRIDGE         ✗ DEPOSIT        ○ TRADE                 │
│  $CALIBR→USDC    Base→Polygon     USDC→Safe        Buy Position            │
│  ████████████    ████████████     ████████████     ░░░░░░░░░░░░            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✗ Deposit failed: Insufficient gas on Polygon                             │
│  Your USDC ($2,750) is safe in the bridge.                                 │
│                                                                             │
│  Completed Transactions:                                                    │
│  ├─ Swap:   0x7a3f...9e2b [📋] ✓                                           │
│  └─ Bridge: 0x3b2c...8d1f [📋] ✓                                           │
│                                                                             │
│  [Retry Deposit] [Withdraw to Wallet] [Contact Support]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Rotary Knob Component Design

```
ROTARY KNOB ANATOMY:

         ╭─────────────╮
        ╱       │       ╲         ← Outer ring (track)
       │        │        │
       │     ───●        │        ← Indicator needle
       │        │        │
        ╲       │       ╱         ← Value markers around edge
         ╰─────────────╯
              72%                  ← Current value display

INTERACTION (shown in hover tooltip):
┌─────────────────────────────────────────────────────────────────┐
│  "Drag vertically to adjust • Scroll for fine control          │
│   Click to type • Double-click to reset"                        │
└─────────────────────────────────────────────────────────────────┘

• Click + drag vertically to adjust
• Scroll wheel for fine adjustment (±1%)
• Click on value to type directly
• Double-click to reset to default

VISUAL STATES:
DEFAULT: dim border, muted needle
HOVER: bright border, highlighted track, tooltip appears
ACTIVE: glow effect, value updating in real-time

TOOLTIP CONTENT PER KNOB:
• Probability:   "Your estimated probability for YES outcome"
• Confidence:    "How confident are you in this estimate? (affects Kelly sizing)"
• Kelly Fraction: "What fraction of the Kelly-optimal position to take"

KELLY FRACTION PRESETS:
┌─────────────────────────────────────────────────────────────────┐
│  [○ 25%]  [○ 50%]  [● 75%]  [○ 100%]  [○ Custom]               │
│  Conservative  Standard  Aggressive  Full Kelly                 │
└─────────────────────────────────────────────────────────────────┘

PRESET TOOLTIPS:
• 25% Conservative: "Lower risk, smaller positions. Good for uncertain forecasts."
• 50% Standard:     "Balanced approach. Recommended for most forecasters."
• 75% Aggressive:   "Higher conviction bets. For confident forecasts only."
• 100% Full Kelly:  "Maximum theoretical edge. High volatility, not recommended."
```

---

## 7. Profile & Leaderboard Dashboard

### 7.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CALIBR.XYZ │ PROFILE & LEADERBOARD │ [← Back to Dashboard]         │ 0x7a3...f9e │ [⚙] │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│ ┌─ YOUR PROFILE ────────────────────────────────────────────────────────────────────────┐│
│ │                                                                                        ││
│ │   ┌─────────┐                                                                         ││
│ │   │  ╭───╮  │   forecaster.eth                                                        ││
│ │   │  │ 😎 │  │   [🔮 EXPERT] Superforecaster                                          ││
│ │   │  ╰───╯  │                                                                         ││
│ │   └─────────┘   Wallet: 0x7a3f9e2b...4c8d1f7a [📋] ← View on Basescan                ││
│ │                 Chain: Base │ Member since: January 2025                               ││
│ │                                                                                        ││
│ │   ┌─ CALIBRATION STATS ───────────────────┐  ┌─ TIER PROGRESS ────────────────────┐  ││
│ │   │                                        │  │                                     │  ││
│ │   │  Brier Score:         0.089            │  │  🔮 EXPERT                          │  ││
│ │   │  Time-Weighted:       0.092            │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ││
│ │   │  Total Forecasts:     127              │  │                    ↑               │  ││
│ │   │  Resolved:            89               │  │           42/50 to 🧠 MASTER        │  ││
│ │   │  Win Rate:            68%              │  │                                     │  ││
│ │   │                                        │  │  Requirements:                      │  ││
│ │   │  Global Rank:         #847             │  │  ✓ 100+ forecasts                  │  ││
│ │   │  Percentile:          Top 5%           │  │  ✓ Brier < 0.10                    │  ││
│ │   │                                        │  │  ○ 50+ in single category           │  ││
│ │   └────────────────────────────────────────┘  └─────────────────────────────────────┘  ││
│ └────────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                           │
│ ┌─ CALIBRATION CURVE ─────────────────────────────────────────────────────────────────┐  │
│ │                                                                                      │  │
│ │   100%┤                                                              ○              │  │
│ │       │                                                         ○                   │  │
│ │    80%┤                                                    ○                        │  │
│ │       │                                               ○                             │  │
│ │    60%┤                                          ○                                  │  │
│ │       │                                     ○              ← Perfect calibration    │  │
│ │    40%┤                                ○                                            │  │
│ │       │                           ○                                                 │  │
│ │    20%┤                      ○                                                      │  │
│ │       │                 ○                                                           │  │
│ │     0%┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────                           │  │
│ │        0%  10%  20%  30%  40%  50%  60%  70%  80%  90%  100%                        │  │
│ │                     Predicted Probability                                           │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
│ ┌─ GLOBAL LEADERBOARD ────────────────────────────────────────────────────────────────┐  │
│ │                                                                                      │  │
│ │  [All Time ▼] [All Categories ▼] [Min 10 Forecasts ▼]                               │  │
│ │                                                                                      │  │
│ │ ┌──────┬─────────────────┬─────────┬───────────┬────────┬────────────────────────┐ │  │
│ │ │ Rank │ Username        │ Brier   │ Forecasts │ Tier   │ Wallet                 │ │  │
│ │ ├──────┼─────────────────┼─────────┼───────────┼────────┼────────────────────────┤ │  │
│ │ │  1   │ tetlock_fan     │  0.067  │    312    │ 👁️     │ 0x1a2...3b4 [📋]       │ │  │
│ │ │  2   │ bayes_master    │  0.072  │    289    │ 👁️     │ 0x5c6...7d8 [📋]       │ │  │
│ │ │  3   │ kelly_kelly     │  0.081  │    456    │ 🧠     │ 0x9e0...1f2 [📋]       │ │  │
│ │ │  ... │                 │         │           │        │                        │ │  │
│ │ │ 847  │ forecaster.eth →│  0.089  │    127    │ 🔮     │ 0x7a3...f9e [📋]       │ │  │
│ │ └──────┴─────────────────┴─────────┴───────────┴────────┴────────────────────────┘ │  │
│ │                                                                                      │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
│ ┌─ EAS ATTESTATIONS ──────────────────────────────────────────────────────────────────┐  │
│ │                                                                                      │  │
│ │  Recent Attestations:                                                               │  │
│ │                                                                                      │  │
│ │  ┌─ Forecast ──────────────────────────────────────────────────────────────────┐   │  │
│ │  │ 📑 0x7a3f9e2b...4c8d1f7a [📋] ← View on EAS Scan                            │   │  │
│ │  │ Schema: CalibrForecast (0x1234...5678)                                       │   │  │
│ │  │ Date: 2026-01-15 14:32 UTC                                                   │   │  │
│ │  │ Market: BTC>150K │ Probability: 72% │ Confidence: 75%                       │   │  │
│ │  └──────────────────────────────────────────────────────────────────────────────┘   │  │
│ │                                                                                      │  │
│ │  ┌─ Forecast ──────────────────────────────────────────────────────────────────┐   │  │
│ │  │ 📑 0x3b2c8d1f...9e7a6b5c [📋] ← View on EAS Scan                            │   │  │
│ │  │ Schema: CalibrForecast (0x1234...5678)                                       │   │  │
│ │  │ Date: 2026-01-14 09:15 UTC                                                   │   │  │
│ │  │ Market: BTC>150K │ Probability: 67% │ Confidence: 72%                       │   │  │
│ │  └──────────────────────────────────────────────────────────────────────────────┘   │  │
│ │                                                                                      │  │
│ │  [Load More Attestations...]                                                        │  │
│ │                                                                                      │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Blockchain Elements:**

- Full wallet address in profile header with copy icon and explorer link
- Leaderboard shows truncated wallet addresses for all users
- 📑 prefix for EAS attestation UIDs with copy icons and EAS Scan links
- Schema ID displayed and linked to EAS Scan schema view

### 7.2 Tier Badge Designs

```
TIER BADGES (used in header and leaderboard):

🌱 APPRENTICE         🎯 JOURNEYMAN         🔮 EXPERT
  (Gray text)          (Bronze text)          (Silver text)
  "Just beginning"     "Hitting marks"        "Proven forecaster"

🧠 MASTER             👁️ GRANDMASTER
  (Gold text)          (Cyan text + glow)
  "Deep expertise"     "All-seeing"

HEADER BADGE (clickable, opens Profile dashboard):
┌──────────────────────────────────────────────────────┐
│ [🔮 EXPERT] 0x7a3...f9e [📋]                         │
└──────────────────────────────────────────────────────┘
       ↑
   Click to open Profile & Leaderboard

TIER PROGRESSION RATIONALE:
🌱 Seedling    → Just beginning to grow, learning fundamentals
🎯 Target      → Developing accuracy, hitting marks consistently
🔮 Crystal ball → Proven forecasting ability, seeing ahead
🧠 Brain       → Deep expertise, sophisticated reasoning
👁️ All-seeing  → Ultimate forecaster, sees what others miss

TOOLTIP CONTENT (on hover):
🌱 "Apprentice: Complete 10+ forecasts to advance"
🎯 "Journeyman: Achieve Brier < 0.15 to advance"
🔮 "Expert: Achieve Brier < 0.10 + 100 forecasts to advance"
🧠 "Master: Achieve Brier < 0.08 + category specialization to advance"
👁️ "Grandmaster: Top 1% of all forecasters"
```

---

## 8. Technology Stack

### 8.1 Core Framework

```
Calibr.xyz Frontend Stack
├── Framework: Next.js 14 (App Router)
├── Language: TypeScript (Strict Mode)
├── Styling: Tailwind CSS v4
├── Components: shadcn/ui (Customized for terminal aesthetic)
├── State: Zustand (Lightweight, suitable for trading state)
├── Forms: React Hook Form + Zod validation
└── Deployment: Vercel (aligned with Project Requirements)
```

### 8.2 NPM Dependencies

#### Core Dependencies

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "typescript": "^5.x",

    "tailwindcss": "^4.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",

    "zustand": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",

    "date-fns": "^3.x",
    "ethers": "^6.x",
    "@wagmi/core": "^2.x",
    "viem": "^2.x"
  }
}
```

#### Animation Libraries

```json
{
  "dependencies": {
    "motion": "^11.x",
    "@number-flow/react": "^0.x",
    "animate-ui": "^0.x"
  }
}
```

| Library                             | Purpose                              | Usage                                                |
| ----------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| **motion** (motion.dev)             | Primary animation engine             | Page transitions, panel animations, gesture handling |
| **@number-flow/react** (NumberFlow) | Animated number transitions          | Price updates, P&L changes, probability shifts       |
| **animate-ui**                      | Pre-built animated shadcn components | Buttons, cards, dialogs with motion                  |

#### Charting Libraries

```json
{
  "dependencies": {
    "react-financial-charts": "^2.x",
    "d3": "^7.x",
    "d3-scale": "^4.x",
    "d3-shape": "^3.x"
  }
}
```

| Library                    | Purpose               | Usage                                                                    |
| -------------------------- | --------------------- | ------------------------------------------------------------------------ |
| **react-financial-charts** | Primary charting      | Market price history, sentiment tracking, candlestick/OHLC               |
| **d3**                     | Custom visualizations | Calibration curves, probability distributions, custom ASCII-style charts |

#### EAS & Blockchain Integration

```json
{
  "dependencies": {
    "@ethereum-attestation-service/eas-sdk": "^2.x",
    "@rainbow-me/rainbowkit": "^2.x",
    "@tanstack/react-query": "^5.x"
  }
}
```

### 8.3 shadcn/ui Setup

```bash
# Initialize shadcn with MCP for Claude assistance
pnpm dlx shadcn@latest mcp init --client claude

# Install base components
pnpm dlx shadcn@latest add button card dialog input select tabs toast

# Install animate-ui components (extends shadcn)
pnpm dlx animate-ui@latest add animated-card animated-tabs animated-dialog
```

---

## 9. Design System

### 9.1 Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="terminal"]'],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "IBM Plex Mono",
          "JetBrains Mono",
          "Source Code Pro",
          "monospace",
        ],
      },
      colors: {
        // Terminal Theme (Default)
        terminal: {
          bg: {
            primary: "#000000",
            secondary: "#111111",
            accent: "#1a1a1a",
            hover: "#222222",
          },
          text: {
            primary: "#00ff00",
            secondary: "#00aa00",
            muted: "#008000",
            inverse: "#000000",
          },
          border: {
            primary: "#00ff00",
            secondary: "#008000",
          },
        },
        // Amber CRT Theme
        amber: {
          bg: { primary: "#0a0a0a", secondary: "#1a1000", accent: "#2a1a00" },
          text: { primary: "#ffb000", secondary: "#cc8800", muted: "#996600" },
          border: { primary: "#ffb000", secondary: "#cc8800" },
        },
        // IBM Blue Theme
        ibm: {
          bg: { primary: "#000080", secondary: "#0000aa", accent: "#1010cc" },
          text: { primary: "#ffffff", secondary: "#cccccc", muted: "#999999" },
          border: { primary: "#ffffff", secondary: "#cccccc" },
        },
        // Semantic Colors (Prediction Market)
        prediction: {
          bullish: "#00ff00",
          bearish: "#ff0000",
          neutral: "#888888",
        },
        confidence: {
          high: "#00ff00", // 80%+
          medium: "#ffff00", // 60-79%
          low: "#ffa500", // 40-59%
          vlow: "#ff0000", // <40%
        },
        kelly: {
          optimal: "#00ffff",
          conservative: "#00aa00",
          aggressive: "#ff8800",
          warning: "#ff0000",
        },
        tier: {
          apprentice: "#888888", // Gray - 🌱
          journeyman: "#cd7f32", // Bronze - 🎯
          expert: "#c0c0c0", // Silver - 🔮
          master: "#ffd700", // Gold - 🧠
          grandmaster: "#00ffff", // Cyan - 👁️
        },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }], // 10px
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
      },
      boxShadow: {
        "terminal-glow": "0 0 10px rgba(0, 255, 0, 0.3)",
        "amber-glow": "0 0 10px rgba(255, 176, 0, 0.3)",
        "ibm-glow": "0 0 10px rgba(255, 255, 255, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### 9.2 CSS Variables & Theming

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Terminal Theme (Default) */
    --background: 0 0% 0%;
    --foreground: 120 100% 50%;
    --primary: 120 100% 50%;
    --primary-foreground: 0 0% 0%;
    --border: 120 100% 25%;
    --radius: 0rem; /* Sharp corners for terminal aesthetic */
  }

  [data-theme="amber"] {
    --background: 0 0% 4%;
    --foreground: 40 100% 50%;
    --primary: 40 100% 50%;
  }

  [data-theme="ibm-blue"] {
    --background: 240 100% 25%;
    --foreground: 0 0% 100%;
    --primary: 0 0% 100%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground font-mono;
    font-feature-settings: "liga" off; /* Disable ligatures */
  }
}
```

---

## 10. Component Architecture

### 10.1 Directory Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard layout with panels
│   │   ├── page.tsx              # Main dashboard
│   │   └── profile/
│   │       └── page.tsx          # Profile & Leaderboard
│   ├── layout.tsx                # Root layout
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn base components (customized)
│   ├── terminal/                 # Terminal-specific components
│   │   ├── window-chrome.tsx
│   │   ├── ascii-table.tsx
│   │   ├── status-bar.tsx
│   │   └── command-palette.tsx
│   ├── markets/
│   │   ├── market-browser.tsx
│   │   ├── market-card.tsx
│   │   ├── market-chart.tsx
│   │   └── order-book.tsx
│   ├── portfolio/
│   │   ├── portfolio-summary.tsx
│   │   ├── position-table.tsx
│   │   ├── exposure-chart.tsx
│   │   └── pnl-display.tsx
│   ├── forecast/
│   │   ├── forecast-form.tsx
│   │   ├── commit-log.tsx
│   │   └── calibration-chart.tsx
│   ├── kelly/
│   │   ├── kelly-calculator.tsx
│   │   ├── rotary-knob.tsx
│   │   └── sizing-recommendation.tsx
│   ├── purchase/
│   │   ├── purchase-modal.tsx
│   │   └── step-progress.tsx
│   └── charts/
│       ├── price-chart.tsx
│       └── calibration-curve.tsx
├── hooks/
├── stores/
├── lib/
└── types/
```

### 10.2 Key Component Examples

See the full component implementations in the codebase. Key patterns:

- **WindowChrome**: Terminal window frame with title bar and controls
- **MarketCard**: Real-time price display with NumberFlow animations
- **ASCIITable**: Box-drawing tables with virtual scrolling
- **RotaryKnob**: Draggable dial for Kelly parameter adjustment
- **StepProgress**: 4-step cross-chain transaction indicator
- **BlockchainLink**: Hash/address display with explorer links and copy

### 10.3 BlockchainLink Component

```tsx
// components/blockchain/blockchain-link.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, ExternalLink } from "lucide-react";

type LinkType = "tx" | "address" | "eas" | "schema";
type Chain = "base" | "polygon";

interface BlockchainLinkProps {
  value: string;
  type: LinkType;
  chain?: Chain;
  showIcon?: boolean;
  className?: string;
}

const EXPLORER_URLS = {
  base: {
    tx: "https://basescan.org/tx/",
    address: "https://basescan.org/address/",
  },
  polygon: {
    tx: "https://polygonscan.com/tx/",
    address: "https://polygonscan.com/address/",
  },
  eas: {
    attestation: "https://base.easscan.org/attestation/view/",
    schema: "https://base.easscan.org/schema/view/",
  },
};

function truncateHash(hash: string, start = 6, end = 4): string {
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function BlockchainLink({
  value,
  type,
  chain = "base",
  showIcon = true,
  className,
}: BlockchainLinkProps) {
  const [copied, setCopied] = useState(false);

  const getExplorerUrl = () => {
    if (type === "eas") return EXPLORER_URLS.eas.attestation + value;
    if (type === "schema") return EXPLORER_URLS.eas.schema + value;
    return EXPLORER_URLS[chain][type] + value;
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const icon = {
    tx: "🔗",
    address: "👤",
    eas: "📑",
    schema: "📋",
  }[type];

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono", className)}>
      {showIcon && <span className="text-muted-foreground">{icon}</span>}
      <a
        href={getExplorerUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline hover:text-accent transition-colors"
        title={value}
      >
        {truncateHash(value)}
      </a>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-primary transition-colors p-0.5"
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? (
          <Check className="h-3 w-3 text-accent-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}
```

**Usage Examples:**

```tsx
// Transaction hash (Polygon)
<BlockchainLink value="0x7a3f9e2b..." type="tx" chain="polygon" />

// Wallet address (Base)
<BlockchainLink value="0x7a3f9e2b..." type="address" chain="base" />

// EAS Attestation UID
<BlockchainLink value="0x7a3f9e2b..." type="eas" />

// EAS Schema ID
<BlockchainLink value="0x1234..." type="schema" />
```

---

## 11. Animation & Motion System

### 11.1 Motion.dev Configuration

```typescript
// lib/motion.ts
export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};
```

### 11.2 NumberFlow Configuration

```typescript
// lib/number-flow.ts
export const numberFormats = {
  price: {
    style: "decimal",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  },
  probability: { style: "percent", minimumFractionDigits: 1 },
  currency: { style: "currency", currency: "USD", minimumFractionDigits: 2 },
  compact: { notation: "compact", maximumFractionDigits: 1 },
  brier: {
    style: "decimal",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  },
};
```

### 11.3 Animation Timing

| Transition            | Duration | Easing                        |
| --------------------- | -------- | ----------------------------- |
| Panel open/close      | 200ms    | ease-out                      |
| Tab switch            | 150ms    | ease-in-out                   |
| Modal appear          | 250ms    | spring (stiff: 400, damp: 30) |
| Modal dismiss         | 150ms    | ease-in                       |
| Chart data update     | 300ms    | ease-out                      |
| Step progress advance | 400ms    | ease-out                      |

---

## 12. Data Visualization

### 12.1 Chart Decision Matrix

| Use Case                  | Library                | Component               |
| ------------------------- | ---------------------- | ----------------------- |
| Market price history      | react-financial-charts | `<PriceChart />`        |
| Market sentiment timeline | react-financial-charts | `<SentimentChart />`    |
| Order book depth          | react-financial-charts | `<DepthChart />`        |
| User calibration curve    | d3                     | `<CalibrationCurve />`  |
| Brier score distribution  | d3                     | `<BrierDistribution />` |
| Portfolio allocation      | shadcn (Recharts)      | `<AllocationChart />`   |
| Real-time price ticker    | NumberFlow             | `<NumberFlow />`        |

---

## 13. Performance & Optimization

### 13.1 Performance Targets

| Metric                   | Target  |
| ------------------------ | ------- |
| First Contentful Paint   | < 1.0s  |
| Largest Contentful Paint | < 2.0s  |
| Cumulative Layout Shift  | < 0.1   |
| Time to Interactive      | < 3.0s  |
| Bundle Size (initial)    | < 200KB |
| WebSocket latency        | < 100ms |
| NumberFlow animation     | 60fps   |

### 13.2 Optimization Strategies

- Next.js `optimizePackageImports` for motion/NumberFlow/d3
- Tree-shake unused d3 modules
- Lazy load heavy chart components
- Debounce WebSocket updates (100ms)
- Dynamic imports with loading skeletons

---

## 14. Build Configuration

### 14.1 Project Setup

```bash
# Initialize Next.js project
pnpm create next-app@latest calibr-frontend --typescript --tailwind --eslint --app --src-dir

# Install dependencies
pnpm add zustand react-hook-form zod date-fns ethers @wagmi/core viem
pnpm add @tanstack/react-query @rainbow-me/rainbowkit
pnpm add @ethereum-attestation-service/eas-sdk
pnpm add motion @number-flow/react
pnpm add react-financial-charts d3 @types/d3

# Install shadcn
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest mcp init --client claude
```

### 14.2 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Base Network (EAS)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_EAS_CONTRACT=0x4200000000000000000000000000000000000021

# Polygon Network (Polymarket)
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## 15. Quality Assurance

### 15.1 Testing Strategy

| Test Type         | Tool                     | Coverage                     |
| ----------------- | ------------------------ | ---------------------------- |
| Unit Tests        | Vitest                   | Components, hooks, utilities |
| Integration Tests | Vitest + Testing Library | User workflows               |
| E2E Tests         | Playwright               | Critical paths               |
| Visual Regression | Playwright screenshots   | ASCII rendering              |
| Accessibility     | axe-core                 | WCAG 2.1 AA                  |
| Performance       | Lighthouse CI            | Core Web Vitals              |

### 15.2 Browser Support

| Browser | Version | Priority  |
| ------- | ------- | --------- |
| Chrome  | 90+     | Primary   |
| Firefox | 88+     | Primary   |
| Safari  | 14+     | Primary   |
| Edge    | 90+     | Secondary |

### 15.3 Accessibility Requirements

- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all interactive elements
- Screen reader support (aria labels on all controls)
- High contrast mode support (terminal themes already high contrast)
- Reduced motion support (respect `prefers-reduced-motion`)

---

## Appendix: Component Library Checklist

### Terminal Primitives

- [ ] `WindowChrome` - Panel frame with title and controls
- [ ] `ASCIITable` - Box-drawing tables with sorting
- [ ] `ProgressBar` - Block character progress
- [ ] `StatusBar` - Bottom keyboard shortcut bar

### Blockchain Components

- [ ] `BlockchainLink` - Hash/address with explorer link + copy
- [ ] `WalletDisplay` - Connected wallet with chain badge
- [ ] `TxHashList` - List of transaction hashes with status
- [ ] `AttestationBadge` - EAS verification indicator

### Market Components

- [ ] `MarketTree` - Collapsible category browser (scrollable within pane)
- [ ] `MarketCard` - Individual market display
- [ ] `PriceDisplay` - YES/NO price with NumberFlow
- [ ] `PriceChart` - Historical price over time (Polymarket SDK, 15m cache)
- [ ] `OrderBookTable` - Bid/ask depth display

### Portfolio Components

- [ ] `PortfolioSummary` - Total value and P&L
- [ ] `BalanceCard` - Per-chain balance display
- [ ] `ExposureChart` - Category/platform breakdown
- [ ] `CorrelationWarning` - Correlated exposure alert with 📈 link to details

### Forecast Components

- [ ] `CommitLog` - Git-style forecast history with 📑 EAS links
- [ ] `ForecastForm` - New forecast input

### Kelly Components

- [ ] `RotaryKnob` - Draggable rotary control with hover tooltip
- [ ] `KellyCalculator` - Full calculator panel
- [ ] `SizeRecommendation` - Position sizing display
- [ ] `KellyPresets` - Preset buttons with tooltips (Conservative/Standard/Aggressive/Full)

### Purchase Components

- [ ] `PurchaseModal` - Full purchase flow
- [ ] `StepProgress` - Cross-chain step indicator with tx hashes
- [ ] `FeeBreakdown` - Fee summary display

### Status Components

- [ ] `PlatformHealth` - Platform status indicators
- [ ] `SyncStatus` - Data sync status
- [ ] `AlertList` - Recent alerts display
- [ ] `TierBadge` - Superforecaster tier badge (🌱🎯🔮🧠👁️)
- [ ] `CorrelationLink` - Warning with 📈 chart link

### Chart Components

- [ ] `PriceChart` - Historical price chart (react-financial-charts)
- [ ] `CalibrationCurve` - D3 calibration visualization
- [ ] `ExposureChart` - Category breakdown bars

---

_This document represents the complete frontend guidelines for Calibr.xyz's prediction market aggregation platform._  
_Version 5.0 | January 2026_  
_Aligned with: Project Requirements v5.0, Data Schema v5.0, Project Tasks v5.0_
