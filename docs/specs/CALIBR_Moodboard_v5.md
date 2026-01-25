# Calibr.xyz Moodboard & Design Research

## Prediction Market Portfolio Manager & Aggregation Layer

**Version:** 5.0  
**Last Updated:** January 2026  
**Purpose:** Visual inspiration, design philosophy, and research references  
**See Also:** Frontend Guidelines v5.0 (for actual Calibr.xyz specifications)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Target User Profile](#2-target-user-profile)
3. [Inspiration Sources](#3-inspiration-sources)
4. [Visual References](#4-visual-references)
5. [Color Psychology](#5-color-psychology)
6. [Typography Research](#6-typography-research)
7. [Classic Interface Patterns](#7-classic-interface-patterns)

---

## 1. Design Philosophy

### 1.1 Core Concept: Bloomberg Terminal for Prediction Markets

Calibr.xyz employs a retro-futuristic ASCII/terminal interface aesthetic that signals technical sophistication to hardcore prediction market enthusiasts. This is not a consumer-friendly "easy onboarding" interface—it's a **power user tool** designed for serious forecasters who appreciate information density and keyboard-first workflows.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CALIBR.XYZ DESIGN PRINCIPLES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. INFORMATION DENSITY    → Maximum data per viewport                      │
│  2. KEYBOARD-FIRST         → Power users navigate without mouse             │
│  3. TERMINAL AESTHETIC     → Monospace fonts, box-drawing, green-on-black  │
│  4. REAL-TIME UPDATES      → Smooth animated transitions, no jarring flashes│
│  5. PROFESSIONAL TOOLING   → Kelly Criterion, Brier scores, EAS attestations│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Non-Goals

- Consumer-friendly onboarding flows
- Mobile-first design (desktop is primary)
- Social features (comments, follows)
- Excessive whitespace or minimalism
- Gamification that compromises information density

---

## 2. Target User Profile

From Project Requirements v5.0:

| Attribute         | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| **Primary**       | Existing prediction market participants (Polymarket, Kalshi, Metaculus users) |
| **Secondary**     | Quantitative traders interested in prediction markets                         |
| **Tertiary**      | Researchers and forecasting enthusiasts                                       |
| **NOT targeting** | Crypto newcomers or casual bettors                                            |

### 2.1 User Expectations

Our target users:

- Already understand prediction markets, don't need education
- Value accuracy and calibration over engagement
- Prefer dense information displays over "clean" minimalist UIs
- Are comfortable with keyboard shortcuts
- Appreciate the craftsmanship of vintage terminal interfaces
- Want professional-grade tools (Kelly sizing, Brier scores)

---

## 3. Inspiration Sources

### 3.1 Dashboard Design Inspiration

| Source                         | URL                         | Elements to Borrow                                                 |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------ |
| **Looker Studio Examples**     | lookerstudio.google.com     | Multi-panel layouts, data visualization hierarchy, filter controls |
| **Dribbble: Crypto Dashboard** | dribbble.com/shots/24658169 | Dark theme, card-based layouts, real-time price displays           |
| **Dribbble: Cryptic**          | dribbble.com/shots/25339666 | Glassmorphism effects (subtle), gradient accents, modern data viz  |
| **Dribbble: Cosmobit**         | dribbble.com/shots/26045098 | Market overview cards, portfolio distribution charts               |
| **Dribbble: Crypto Dashboard** | dribbble.com/shots/25759452 | Clean typography, status indicators, transaction lists             |

### 3.2 Terminal/Retro Software Inspiration

| Software               | Era    | Key Elements                                        |
| ---------------------- | ------ | --------------------------------------------------- |
| **Norton Commander**   | DOS    | Dual-pane file management, function key shortcuts   |
| **Turbo Pascal IDE**   | DOS    | Development environment layout, syntax highlighting |
| **Lotus 1-2-3**        | DOS    | Spreadsheet data presentation, formula displays     |
| **dBase IV**           | DOS    | Database query interfaces, form layouts             |
| **Midnight Commander** | Modern | ncurses implementation, modern terminal UI          |

### 3.3 BBS Systems Inspiration

| System           | Key Elements                       |
| ---------------- | ---------------------------------- |
| **Wildcat! BBS** | Menu systems, keyboard navigation  |
| **WWIV**         | Message threading, user management |
| **PCBoard**      | File libraries, download systems   |
| **RBBS-PC**      | Simple but effective layouts       |

### 3.4 Modern Retro Terminal Apps

| Application    | Key Elements                                        |
| -------------- | --------------------------------------------------- |
| **GitHub CLI** | Modern terminal aesthetic with colors               |
| **btop++**     | System monitoring with style, real-time updates     |
| **lazygit**    | Git interface with terminal UI, keyboard-first      |
| **nnn**        | File manager with vintage feel, information density |

### 3.5 Crypto Bridge UI Patterns

For the Purchase Modal's cross-chain transaction flow:

| Pattern                       | Source                                         |
| ----------------------------- | ---------------------------------------------- |
| **4-step progress indicator** | Common in Transporter, MetaMask Bridge         |
| **Real-time status updates**  | "Locking → Confirmation → Wrapping → Transfer" |
| **Error recovery messaging**  | Clear status of assets during failures         |
| **Estimated time display**    | User anxiety reduction during waits            |

Key insights from bridge UI research:

- Break complex flows into clear numbered steps
- Provide contextual information about current stage
- Use visual progress indicators (not just loading spinners)
- Show estimated time to reduce user anxiety
- Offer clear recovery paths when steps fail

---

## 4. Visual References

### 4.1 Classic DOS Application Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Norton Commander v5.5                              F1 Help   F2 View F10 Quit │
├─────────────────────────────────────────────────────────────────────────────┤
│ C:\MARKETS\                                     │ D:\ANALYSIS\               │
│ ┌─Name──────┬─Size──┬─Date──────┬─Time─┐        │ ┌─Name──────┬─Size──────┐   │
│ │..         │<DIR>  │01-09-26   │12:30 │        │ │BRIER.TXT  │     2,341  │   │
│ │POSITIONS  │<DIR>  │01-09-26   │11:45 │        │ │KELLY.DAT  │    15,627  │   │
│ │BTCPRED.DAT│ 45KB  │01-09-26   │10:15 │        │ │SCORES.LOG │   128,934  │   │
│ │CONFIDENCE │<DIR>  │01-08-26   │14:22 │        │ │TRENDS.CSV │    89,456  │   │
│ └───────────┴───────┴───────────┴──────┘        │ └───────────┴───────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

- Box-drawing characters (┌┐└┘├┤)
- Status bars with function key shortcuts
- Dual-pane layouts
- Monospace typography
- File/data organization metaphors

### 4.2 BBS Interface Pattern

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║               🏛️  CASANDRA PREDICTION EXCHANGE v2.6                          ║
║                     "Where Accuracy Meets Opportunity"                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  [M]arket Browser     [P]ortfolio View     [C]alibration Stats               ║
║  [F]unding Rates      [T]rend Analysis    [S]core History                    ║
║  [O]ptions Trading    [N]ews Feed         [?] Help System                    ║
║                                                                               ║
║  ┌─ FEATURED MARKETS ─────────────────────┬─ YOUR POSITIONS ────────────────┐ ║
║  │ 📈 BTC $100K by Q2: 72.3% (+2.1%)     │ AAPL Earnings Beat: 45% ⬆       │ ║
║  │ 🗳️  Midterm Results: 89.7% (-0.8%)    │ Confidence: ████████░░ 82%      │ ║
║  │ 🌡️  Climate Target: 23.4% (+5.2%)     │ Kelly Size: 2.4% of portfolio   │ ║
║  └────────────────────────────────────────┴─────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════════╝
Last Updated: 09-Jan-2026 14:23:07 EST    Users Online: 2,847    CPU: 0.3%
```

**Key Elements:**

- Double-line borders (╔═╗)
- Menu systems with keyboard shortcuts
- Status information in headers/footers
- Dashboard-style information density
- ASCII art elements (minimal, strategic)

### 4.3 Terminal/Shell Pattern

```
superforecaster@calibr:~/markets$ forecast --confidence 0.82 --kelly-factor 0.5
Loading market data... ████████████████████████████████████████ 100%
Analyzing historical performance...

┌─ PREDICTION ANALYSIS ──────────────────────────────────────────────────────┐
│ Market: "Will BTC reach $100K by Q2 2026?"                                │
│ Current Odds: 72.3% YES / 27.7% NO                                        │
│ Your Estimate: 82.0% ± 3.2% (calibration score: 0.87)                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Kelly Criterion Analysis:                                                  │
│ • Optimal position size: 4.8% of portfolio                                │
│ • Conservative (0.5x Kelly): 2.4% recommended                             │
│ • Expected value: +12.3% over 6 months                                    │
│ • Risk of ruin: <0.1%                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│ Brier Score (Last 30 predictions): 0.142 (Top 15% of forecasters)        │
│ Calibration Plot: [████████░░] Well-calibrated                            │
└────────────────────────────────────────────────────────────────────────────┘

superforecaster@calibr:~/markets$ _
```

**Key Elements:**

- Command-line prompts with meaningful usernames
- Progress bars using block characters
- Technical data presentation
- Nested information hierarchy
- Status indicators

---

## 5. Color Psychology

### 5.1 Theme Color Palettes

**Classic Green-on-Black Terminal (Default):**

```
Background: #000000 (true black)
Primary:    #00FF00 (bright green)
Secondary:  #00AA00 (medium green)
Muted:      #008000 (dark green)
Warning:    #FFFF00 (bright yellow)
Error:      #FF0000 (bright red)
```

**Amber CRT Monitor:**

```
Background: #0A0A0A (near black)
Primary:    #FFB000 (amber)
Secondary:  #CC8800 (dark amber)
Highlight:  #FFDD44 (bright amber)
```

**IBM Blue Theme:**

```
Background: #000080 (navy blue)
Primary:    #FFFFFF (white)
Secondary:  #CCCCCC (light gray)
Accent:     #00FFFF (cyan)
Selection:  #FFFF00 (yellow)
```

### 5.2 Semantic Color Meanings

**Confidence Levels:**

- **High (80-95%)**: Bright green `#00FF00` — User should feel confident
- **Medium (60-79%)**: Yellow `#FFFF00` — Caution, moderate certainty
- **Low (40-59%)**: Orange `#FFA500` — Uncertainty, careful consideration needed
- **Very Low (<40%)**: Red `#FF0000` — High uncertainty warning

**Market Movement:**

- **Rising Odds**: Bright cyan `#00FFFF` with ▲ — Positive momentum
- **Falling Odds**: Magenta `#FF00FF` with ▼ — Negative momentum
- **Stable**: White `#FFFFFF` with ─ — No significant change

**Financial P&L:**

- **Profit**: Green `#00AA00` — Positive outcome
- **Loss**: Red `#AA0000` — Negative outcome
- **Pending**: Yellow `#AAAA00` — Awaiting resolution

**Superforecaster Tiers:**

- **Apprentice**: Gray `#888888` — Entry level
- **Journeyman**: Bronze `#CD7F32` — Developing
- **Expert**: Silver `#C0C0C0` — Skilled
- **Master**: Gold `#FFD700` — Advanced
- **Grandmaster**: Cyan with glow `#00FFFF` — Elite

---

## 6. Typography Research

### 6.1 Monospace Font Options

**Recommended (in priority order):**

1. **IBM Plex Mono** — Modern interpretation of IBM typewriter aesthetic
   - Clean, highly legible
   - Excellent for data displays
   - Good international character support

2. **JetBrains Mono** — Modern coding font
   - Optimized for code/data readability
   - Distinct character differentiation (0 vs O, 1 vs l)
   - Excellent at small sizes

3. **Source Code Pro** — Adobe's monospace
   - Clean and neutral
   - Great for dense text
   - Good fallback option

### 6.2 Bitmap/Pixel Fonts (Ultra-Retro Option)

- **VT323** — Authentic VT220 terminal recreation
- **Courier Prime** — Typewriter aesthetic
- **Share Tech Mono** — Futuristic terminal feel

### 6.3 Typography Rules

- **All text is monospace** — No exceptions for terminal authenticity
- **Disable ligatures** — `font-feature-settings: "liga" off`
- **Use tabular numbers** — For aligned numeric data
- **Maintain tight leading** — Dense information display

---

## 7. Classic Interface Patterns

### 7.1 Window Management

```
┌─[WIN]─ Market Analysis ─────────────────────────────────[─][□][×]─┐
│ ┌─ Tabs ──────────────────────────────────────────────────────┐   │
│ │ [Overview*] [Charts] [Order Book] [History] [Settings]      │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ Content Area...                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 7.2 Data Tables

```
┌─ TOP FORECASTERS (Last 30 Days) ────────────────────────────────────┐
│ Rank │ Username      │ Brier Score │ Calibration │ # Predictions   │
├──────┼───────────────┼─────────────┼─────────────┼─────────────────┤
│   1  │ tetlock_fan   │    0.089    │    0.95     │      127        │
│   2  │ bayes_master  │    0.102    │    0.92     │       89        │
│   3  │ kelly_kelly   │    0.118    │    0.89     │      156        │
│   4  │ superf0rcast  │    0.124    │    0.91     │       67        │
└──────┴───────────────┴─────────────┴─────────────┴─────────────────┘
```

### 7.3 Input Forms

```
┌─ NEW PREDICTION ───────────────────────────────────────────────────┐
│                                                                   │
│ Question: [Will SpaceX reach Mars by 2030?___________________]    │
│                                                                   │
│ Your Probability:  [##########████████████] 67%                  │
│ Confidence Level:  [████████░░░░░░░░░░░░░░] 75%                   │
│                                                                   │
│ Kelly Sizing:      [Auto] [Custom: 2.1%]                         │
│ Duration:          [6 months ▼]                                   │
│                                                                   │
│                    [Submit Prediction] [Cancel]                   │
└───────────────────────────────────────────────────────────────────┘
```

### 7.4 Status Indicators

```
System Status: ████████████████████████████████████████ ONLINE
Network: ████████████████████████████████░░░░ 85% (423ms latency)
Oracle:  ██████████████████████████████████████████ ACTIVE
Funding: ████████████████████████████████░░░░░░░░░░ SYNCING

⚡ Real-time data feed active
🏛️ Oracle responding normally
💰 Liquidity pools balanced
📊 Calibration engine running
```

### 7.5 Rotary Knob Controls

For precision parameter adjustment (used in Kelly calculator):

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

INTERACTION:
• Click + drag vertically (or horizontally) to adjust
• Scroll wheel for fine adjustment
• Click on value to type directly
• Double-click to reset to default
```

**Why rotary knobs for financial tools:**

- Save horizontal space compared to sliders
- Provide fine-grained control
- Familiar to audio/music production users
- Communicate "precision instrument" aesthetic

---

## Appendix: Technical Considerations

### A.1 Performance

- Minimize JavaScript animations in favor of CSS
- Use CSS Grid for layout precision
- Leverage CSS custom properties for theme switching
- Implement efficient table virtualization for large datasets

### A.2 Accessibility

- Ensure high contrast ratios (minimum 7:1)
- Support keyboard navigation throughout
- Provide screen reader friendly alternatives to ASCII art
- Allow font size customization

### A.3 Responsive Adaptation

- Maintain terminal-like appearance on all screen sizes
- Stack panels vertically on smaller screens
- Preserve fixed-width font rendering
- Adapt table layouts for touch interfaces

---

_This moodboard establishes the visual direction and design philosophy for Calibr.xyz's distinctive interface._  
_For actual implementation specifications, see Frontend Guidelines v5.0._  
_Version 5.0 | January 2026_
