# Calibr.xyz Data Schema

## Prediction Market Portfolio Manager & Aggregation Layer

**Version:** 5.0  
**Last Updated:** January 2026  
**Database:** PostgreSQL with Prisma ORM  
**Blockchain:** Base (EAS), Polygon (Polymarket Trading)

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Core Entities](#2-core-entities)
3. [Market Entities](#3-market-entities)
4. [Portfolio Entities](#4-portfolio-entities)
5. [Forecast Entities](#5-forecast-entities)
6. [Execution Entities](#6-execution-entities)
7. [System Entities](#7-system-entities)
8. [EAS Attestation Schemas](#8-eas-attestation-schemas)
9. [Privacy & Personal Data](#9-privacy--personal-data)
10. [Enums](#10-enums)
11. [Indices](#11-indices)
12. [TypeScript Types](#12-typescript-types)

---

## 1. Schema Overview

```
+-----------------------------------------------------------------------------+
|                           SCHEMA RELATIONSHIPS                               |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-------------+         +-----------------+         +--------------+       |
|  |    User     |-------->| WalletConnection|         |   Platform   |       |
|  +------+------+         +-----------------+         +------+-------+       |
|         |                                                    |              |
|         |                +-----------------+                 |              |
|         |                | UnifiedMarket   |<----------------+              |
|         |                +--------+--------+                 |              |
|         |                         |                          |              |
|         |                         | 1:N                      |              |
|         |                         v                          |              |
|         |                +-----------------+                 |              |
|         |                | PlatformMarket  |<----------------+              |
|         |                +--------+--------+                               |
|         |                         |                                         |
|         |         +---------------+---------------+                         |
|         |         |               |               |                         |
|         |         v               v               v                         |
|         |  +-----------+  +-----------+  +------------+                     |
|         |  | PriceSnap |  | OrderBook |  | MarketMatch|                     |
|         |  +-----------+  +-----------+  +------------+                     |
|         |                                                                   |
|         +------------------------------+                                    |
|         |                              |                                    |
|         v                              v                                    |
|  +-------------+              +-------------+                               |
|  |  Position   |              |  Forecast   |                               |
|  +------+------+              +------+------+                               |
|         |                            |                                      |
|         v                            v                                      |
|  +-------------+              +-------------+                               |
|  | Transaction |              |ForecastScore|                               |
|  +-------------+              +-------------+                               |
|                                      |                                      |
|                                      v                                      |
|                              +---------------+                              |
|                              | EAS Attestation|                             |
|                              | (Base Network) |                             |
|                              +---------------+                              |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### EAS Integration Layer

```
+-----------------------------------------------------------------------------+
|                          EAS ATTESTATION FLOW                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|    +----------------+     +------------------+     +------------------+      |
|    | User Forecast  | --> | Calibr Backend   | --> | EAS Contract     |      |
|    | (probability,  |     | (sign & submit)  |     | (Base Network)   |      |
|    |  reasoning)    |     |                  |     |                  |      |
|    +----------------+     +------------------+     +------------------+      |
|                                                            |                |
|                                                            v                |
|    +----------------+     +------------------+     +------------------+      |
|    | External Apps  | <-- | EAS Scan/API     | <-- | Attestation UID  |      |
|    | (reputation    |     | (query & verify) |     | (permanent       |      |
|    |  portability)  |     |                  |     |  onchain record) |      |
|    +----------------+     +------------------+     +------------------+      |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 2. Core Entities

### 2.1 User

Primary user account entity.

```prisma
model User {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Profile
  displayName       String?
  email             String?           @unique
  avatarUrl         String?

  // Settings
  defaultKellyFraction  Float         @default(0.5)  // 0.25 - 1.0
  notifyEmail       Boolean           @default(true)
  notifyWebhook     Boolean           @default(false)
  webhookUrl        String?

  // Privacy settings (see Section 9)
  publicProfile     Boolean           @default(true)
  showOnLeaderboard Boolean           @default(true)
  shareForecasts    Boolean           @default(true)

  // Relations
  walletConnections WalletConnection[]
  apiCredentials    ApiCredential[]
  positions         Position[]
  forecasts         Forecast[]
  alerts            Alert[]
  transactions      Transaction[]
  crossChainTxs     CrossChainTransaction[]
  easAttestations   EASAttestation[]
  privacySettings   UserPrivacySettings?

  @@index([email])
}
```

**Field Descriptions:**

| Field                | Type    | Description                               |
| -------------------- | ------- | ----------------------------------------- |
| id                   | String  | Unique identifier (CUID)                  |
| displayName          | String? | User's display name                       |
| email                | String? | Email for notifications                   |
| defaultKellyFraction | Float   | Default risk tolerance (0.25 = 25% Kelly) |
| publicProfile        | Boolean | Whether profile is publicly visible       |
| showOnLeaderboard    | Boolean | Opt-in for leaderboard rankings           |
| shareForecasts       | Boolean | Allow forecasts to be shared publicly     |

---

### 2.2 WalletConnection

Linked EVM wallets for portfolio tracking and execution.

```prisma
model WalletConnection {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Wallet info
  address           String            @unique
  chainId           Int               @default(8453)  // Base
  label             String?                          // "Main Wallet"

  // Verification
  verifiedAt        DateTime?
  nonce             String?                          // For SIWE

  // Polymarket Safe (on Polygon)
  polymarketSafeAddress    String?                   // Derived Safe address
  polymarketSafeDeployed   Boolean     @default(false)
  polymarketSafeDeployedAt DateTime?

  // CLOB API Credentials (encrypted)
  clobApiKey        String?                          // Encrypted
  clobApiSecret     String?                          // Encrypted
  clobPassphrase    String?                          // Encrypted

  // Sync state
  lastSyncAt        DateTime?
  syncStatus        SyncStatus        @default(PENDING)
  syncError         String?

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  positions         Position[]
  transactions      Transaction[]
  crossChainTxs     CrossChainTransaction[]

  @@unique([userId, address])
  @@index([address])
  @@index([polymarketSafeAddress])
}
```

**Field Descriptions:**

| Field                  | Type      | Description                               |
| ---------------------- | --------- | ----------------------------------------- |
| address                | String    | EVM wallet address (0x...) on Base        |
| chainId                | Int       | Chain ID (8453 = Base)                    |
| polymarketSafeAddress  | String?   | Deterministically derived Safe on Polygon |
| polymarketSafeDeployed | Boolean   | Whether Safe has been deployed            |
| clobApiKey             | String?   | Encrypted Polymarket CLOB API key         |
| lastSyncAt             | DateTime? | Last successful position sync             |

---

### 2.3 ApiCredential

Stored API credentials for non-wallet platforms (e.g., Kalshi).

```prisma
model ApiCredential {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Platform
  platform          Platform

  // Credentials (encrypted at rest)
  encryptedApiKey   String?
  encryptedSecret   String?
  encryptedToken    String?
  tokenExpiresAt    DateTime?

  // Sync state
  lastSyncAt        DateTime?
  syncStatus        SyncStatus        @default(PENDING)
  syncError         String?

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, platform])
}
```

---

## 3. Market Entities

### 3.1 Platform

Supported prediction market platforms.

```prisma
model Platform {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Platform identity
  name              String            @unique
  slug              String            @unique
  displayName       String

  // Configuration
  apiBaseUrl        String?
  wsUrl             String?
  chainId           Int?                              // For blockchain platforms

  // Capabilities
  supportsTrades    Boolean           @default(false)
  supportsRealTime  Boolean           @default(false)
  requiresKyc       Boolean           @default(false)

  // Status
  isActive          Boolean           @default(true)
  healthStatus      HealthStatus      @default(UNKNOWN)
  lastHealthCheck   DateTime?

  // Relations
  platformMarkets   PlatformMarket[]

  @@index([slug])
}
```

### 3.2 UnifiedMarket

Aggregated market view across platforms.

```prisma
model UnifiedMarket {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Market identity
  question          String            @db.Text
  description       String?           @db.Text
  slug              String            @unique

  // Categorization
  category          MarketCategory?
  tags              Json?                             // ["politics", "2024"]

  // Aggregate data
  bestYesPrice      Float?
  bestNoPrice       Float?
  bestYesPlatform   String?
  bestNoPlatform    String?
  totalVolume       Float             @default(0)
  totalLiquidity    Float             @default(0)

  // Spread tracking
  currentSpread     Float?
  spreadHistory     Json?                             // Array of spread snapshots

  // Status
  isActive          Boolean           @default(true)
  resolutionDate    DateTime?
  resolvedAt        DateTime?
  resolution        String?                           // "YES", "NO", "INVALID"

  // Relations
  platformMarkets   PlatformMarket[]
  positions         Position[]
  forecasts         Forecast[]
  marketMatches     MarketMatch[]

  @@index([slug])
  @@index([category])
  @@index([isActive])
}
```

### 3.3 PlatformMarket

Platform-specific market data.

```prisma
model PlatformMarket {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  syncedAt          DateTime          @default(now())

  // Platform reference
  platformId        String
  platform          Platform          @relation(fields: [platformId], references: [id])
  externalId        String                            // Platform's market ID

  // Market data
  question          String            @db.Text
  description       String?           @db.Text
  url               String?

  // Current prices
  yesPrice          Float?
  noPrice           Float?
  lastPrice         Float?

  // Liquidity & volume
  volume            Float             @default(0)
  liquidity         Float             @default(0)

  // Order book snapshot
  bestBid           Float?
  bestAsk           Float?
  spread            Float?

  // Status
  isActive          Boolean           @default(true)
  closesAt          DateTime?
  resolvedAt        DateTime?
  resolution        String?

  // Unified market link
  unifiedMarketId   String?
  unifiedMarket     UnifiedMarket?    @relation(fields: [unifiedMarketId], references: [id])

  // Platform-specific data
  platformData      Json?                             // Varies by platform

  // Relations
  priceSnapshots    PriceSnapshot[]
  positions         Position[]

  @@unique([platformId, externalId])
  @@index([externalId])
  @@index([unifiedMarketId])
}
```

---

## 4. Portfolio Entities

### 4.1 Position

User's position in a specific market.

```prisma
model Position {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Position details
  outcome           String                            // "YES" or "NO"
  shares            Float
  avgCostBasis      Float                            // Average price paid

  // Current valuation
  currentPrice      Float?
  currentValue      Float?
  unrealizedPnl     Float?
  unrealizedPnlPct  Float?

  // Platform tracking
  platformId        String
  platformMarketId  String
  platformMarket    PlatformMarket    @relation(fields: [platformMarketId], references: [id])

  // User & wallet
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  walletConnectionId String?
  walletConnection  WalletConnection? @relation(fields: [walletConnectionId], references: [id])

  // Unified market link
  unifiedMarketId   String?
  unifiedMarket     UnifiedMarket?    @relation(fields: [unifiedMarketId], references: [id])

  // Relations
  transactions      Transaction[]
  crossChainTxs     CrossChainTransaction[]

  @@unique([userId, platformMarketId, outcome])
  @@index([userId])
  @@index([platformMarketId])
}
```

---

## 5. Forecast Entities

### 5.1 Forecast

User's probability forecast for a market (Tetlock-style journaling).

```prisma
model Forecast {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Forecast data
  probability       Float                            // 0.01 - 0.99
  confidence        Float             @default(0.5) // 0-1 confidence level

  // Kelly integration
  kellyFraction     Float             @default(0.5)
  recommendedSize   Float?

  // Reasoning (git-style commits)
  commitMessage     String?           @db.Text       // User's rationale

  // Market context at time of forecast
  marketYesPrice    Float?
  marketNoPrice     Float?

  // Execution
  executeRebalance  Boolean           @default(false)
  executedAt        DateTime?

  // Privacy control
  isPublic          Boolean           @default(true)

  // EAS attestation
  easAttestationUid String?                          // On-chain attestation UID
  easAttestedAt     DateTime?

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  unifiedMarketId   String
  unifiedMarket     UnifiedMarket     @relation(fields: [unifiedMarketId], references: [id])

  transactions      Transaction[]
  crossChainTxs     CrossChainTransaction[]

  // Previous version (for update tracking)
  previousForecastId String?
  previousForecast  Forecast?         @relation("ForecastHistory", fields: [previousForecastId], references: [id])
  nextForecasts     Forecast[]        @relation("ForecastHistory")

  @@index([userId])
  @@index([unifiedMarketId])
  @@index([createdAt])
  @@index([easAttestationUid])
}
```

### 5.2 ForecastScore

Calculated score for a forecast after market resolution.

```prisma
model ForecastScore {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())

  // Score data
  rawBrierScore     Float                            // Simple Brier score
  timeWeightedBrier Float                            // Time-weighted Brier
  logScore          Float?                           // Log score

  // Context
  forecastCount     Int                              // Number of updates
  avgUpdateSize     Float                            // Average probability change
  updateQuality     Float                            // Did updates improve accuracy?

  // Duration
  totalDurationDays Float                            // Days market was open

  // EAS attestation
  easAttestationUid String?                          // Score attestation UID
  easAttestedAt     DateTime?

  // Relations
  userId            String
  unifiedMarketId   String

  @@unique([userId, unifiedMarketId])
  @@index([userId])
  @@index([easAttestationUid])
}
```

### 5.3 UserCalibration

Aggregated calibration data for a user.

```prisma
model UserCalibration {
  id                String            @id @default(cuid())
  updatedAt         DateTime          @updatedAt

  // Aggregated scores
  avgBrierScore     Float?
  avgTimeWeightedBrier Float?
  totalForecasts    Int               @default(0)
  resolvedForecasts Int               @default(0)

  // Calibration buckets (0-10%, 10-20%, ..., 90-100%)
  calibrationData   Json                             // [{bucket, predicted, actual, count}]

  // Rank
  globalRank        Int?
  percentile        Float?

  // Superforecaster tier
  currentTier       SuperforecasterTier @default(APPRENTICE)
  tierPromotedAt    DateTime?
  tierEasUid        String?                          // Tier badge attestation

  // Relations
  userId            String            @unique

  @@index([globalRank])
  @@index([currentTier])
}
```

---

## 6. Execution Entities

### 6.1 Transaction

A trade executed through Calibr.

```prisma
model Transaction {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Transaction type
  type              TransactionType                  // BUY, SELL, MINT, MERGE

  // Order details
  platform          Platform
  platformMarketId  String
  outcome           String
  outcomeIndex      Int
  side              OrderSide                        // BUY, SELL

  // Amounts
  shares            Float                            // Shares bought/sold
  pricePerShare     Float                            // Price per share (0-100)
  totalCost         Float                            // Total cost in collateral
  fees              Float             @default(0)

  // Execution
  status            TransactionStatus @default(PENDING)
  submittedAt       DateTime?
  confirmedAt       DateTime?
  failedAt          DateTime?
  failureReason     String?

  // Blockchain (for on-chain transactions)
  chainId           Int?
  txHash            String?
  blockNumber       Int?
  gasUsed           Float?
  gasCost           Float?

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  walletConnectionId String?
  walletConnection  WalletConnection? @relation(fields: [walletConnectionId], references: [id])

  positionId        String?
  position          Position?         @relation(fields: [positionId], references: [id])

  forecasts         Forecast[]

  @@index([userId])
  @@index([status])
  @@index([txHash])
}
```

### 6.2 CrossChainTransaction

Tracks the multi-step $CALIBR -> USDC -> Polygon -> Position flow.

```prisma
model CrossChainTransaction {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Overall status
  status            CrossChainStatus  @default(PENDING)

  // Input
  calibrAmount      Float                            // $CALIBR input amount
  calibrPrice       Float                            // $CALIBR/USDC rate at time

  // Step 1: Swap ($CALIBR -> USDC on Base)
  swapStatus        StepStatus        @default(PENDING)
  swapTxHash        String?
  swapUsdcReceived  Float?
  swapCompletedAt   DateTime?
  swapError         String?

  // Step 2: Bridge (USDC Base -> Polygon via CCTP)
  bridgeStatus      StepStatus        @default(PENDING)
  bridgeBurnTxHash  String?                          // Base burn tx
  bridgeMessageHash String?                          // CCTP message hash
  bridgeAttestation String?                          // Circle attestation
  bridgeMintTxHash  String?                          // Polygon mint tx
  bridgeUsdcReceived Float?                          // After relay fee
  bridgeCompletedAt DateTime?
  bridgeError       String?

  // Step 3: Deposit (USDC -> Safe on Polygon)
  depositStatus     StepStatus        @default(PENDING)
  depositTxHash     String?
  depositCompletedAt DateTime?
  depositError      String?

  // Step 4: Trade (Buy position via CLOB)
  tradeStatus       StepStatus        @default(PENDING)
  tradeOrderId      String?
  tradeSharesReceived Float?
  tradePricePerShare Float?
  tradeCompletedAt  DateTime?
  tradeError        String?

  // Target position
  marketId          String                           // UnifiedMarket ID
  outcome           String                           // "YES" or "NO"
  targetShares      Float                            // Requested shares

  // Fees
  swapFee           Float             @default(0)
  bridgeFee         Float             @default(0)    // Gelato relay fee
  slippage          Float             @default(0)
  totalFees         Float             @default(0)

  // Timing
  startedAt         DateTime          @default(now())
  completedAt       DateTime?
  totalDurationMs   Int?

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  walletConnectionId String
  walletConnection  WalletConnection  @relation(fields: [walletConnectionId], references: [id])

  forecastId        String?                          // If triggered by forecast
  forecast          Forecast?         @relation(fields: [forecastId], references: [id])

  positionId        String?                          // Resulting position
  position          Position?         @relation(fields: [positionId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([bridgeMessageHash])
}
```

---

## 7. System Entities

### 7.1 Alert

User-configured alerts.

```prisma
model Alert {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Alert type
  type              AlertType

  // Configuration
  config            Json                             // Type-specific config

  // Delivery
  deliveryMethod    DeliveryMethod[]

  // Status
  isActive          Boolean           @default(true)
  lastTriggeredAt   DateTime?
  triggerCount      Int               @default(0)

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  unifiedMarketId   String?

  @@index([userId])
  @@index([type])
}
```

### 7.2 SyncLog

Audit log for platform sync operations.

```prisma
model SyncLog {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())

  // Sync details
  platform          String
  syncType          SyncType                         // MARKETS, POSITIONS, PRICES

  // Results
  status            SyncStatus
  marketsUpdated    Int               @default(0)
  pricesUpdated     Int               @default(0)
  errors            Int               @default(0)

  // Timing
  startedAt         DateTime
  completedAt       DateTime?
  durationMs        Int?

  // Error details
  errorDetails      Json?

  @@index([platform, createdAt])
  @@index([status])
}
```

---

## 8. EAS Attestation Schemas

### 8.1 Base Network Configuration

**CRITICAL: All attestations MUST be committed to Base network contracts.**

```typescript
// Base Mainnet EAS Contract Addresses
export const EAS_BASE_CONFIG = {
  // Network
  chainId: 8453,
  chainName: "Base",
  rpcUrl: "https://mainnet.base.org",

  // EAS Contract Addresses (Base Mainnet)
  EAS_CONTRACT: "0x4200000000000000000000000000000000000021",
  SCHEMA_REGISTRY: "0x4200000000000000000000000000000000000020",

  // Explorer
  easScanUrl: "https://base.easscan.org",

  // Gas settings
  gasMultiplier: 1.2,
  maxFeePerGas: "0.001", // gwei
} as const;

// Base Sepolia (Testnet) - for development
export const EAS_BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  chainName: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",

  EAS_CONTRACT: "0x4200000000000000000000000000000000000021",
  SCHEMA_REGISTRY: "0x4200000000000000000000000000000000000020",

  easScanUrl: "https://base-sepolia.easscan.org",
} as const;
```

### 8.2 Calibr Schema Definitions

**All schema UIDs will be populated after deployment to Base mainnet.**

```typescript
// Forecast Attestation Schema
export const FORECAST_SCHEMA = {
  name: "CalibrForecast",
  description: "Attestation for a user forecast on a prediction market",
  schema:
    "uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic",
  revocable: true,
  resolver: "0x...", // CaliberForecastResolver address
  uid: "", // Populated after deployment
};

// Calibration Score Schema
export const CALIBRATION_SCHEMA = {
  name: "CalibrCalibrationScore",
  description: "Attestation for user calibration scores over a period",
  schema:
    "uint256 brierScore,uint256 totalForecasts,uint256 timeWeightedScore,uint256 period,string category",
  revocable: false, // Scores are permanent
  resolver: "0x...", // CaliberScoreResolver address
  uid: "",
};

// Cross-Platform Identity Schema
export const IDENTITY_SCHEMA = {
  name: "CalibrIdentity",
  description: "Links user identity across prediction platforms",
  schema:
    "string platform,string platformUserId,bytes32 proofHash,bool verified,uint256 verifiedAt",
  revocable: true, // Can be revoked if platform connection removed
  resolver: "0x...", // CaliberIdentityResolver address
  uid: "",
};

// Superforecaster Badge Schema
export const SUPERFORECASTER_SCHEMA = {
  name: "CalibrSuperforecaster",
  description: "Badge attestation for superforecaster tier achievement",
  schema:
    "string tier,uint256 score,uint256 period,string category,uint256 rank",
  revocable: false, // Badges are permanent achievements
  resolver: "0x...", // CaliberBadgeResolver address
  uid: "",
};

// Platform Reputation Schema
export const REPUTATION_SCHEMA = {
  name: "CalibrReputation",
  description: "Aggregated reputation from prediction platforms",
  schema:
    "string platform,uint256 totalVolume,uint256 winRate,uint256 profitLoss,string verificationLevel",
  revocable: true,
  resolver: "0x...", // CaliberReputationResolver address
  uid: "",
};
```

### 8.3 EAS Attestation Database Entity

```prisma
model EASAttestation {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())

  // EAS identifiers
  uid               String            @unique        // Attestation UID from EAS
  schemaUid         String                           // Schema UID
  schemaName        String                           // Human-readable schema name

  // Chain info
  chainId           Int               @default(8453) // Base mainnet
  txHash            String?                          // Transaction hash
  blockNumber       Int?

  // Attestation data
  attester          String                           // Attester address (Calibr backend)
  recipient         String                           // Recipient address (user wallet)
  refUid            String?                          // Referenced attestation UID
  data              Json                             // Decoded attestation data

  // Status
  revoked           Boolean           @default(false)
  revokedAt         DateTime?
  revocationTxHash  String?

  // Privacy flags
  isOffchain        Boolean           @default(false) // Off-chain attestation
  isPrivate         Boolean           @default(false) // Private data attestation
  merkleRoot        String?                          // For private data attestations

  // Relations
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([uid])
  @@index([schemaUid])
  @@index([recipient])
  @@index([userId])
}
```

### 8.4 Smart Contract Resolver

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS, Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/**
 * @title CaliberEASResolver
 * @notice Resolver for Calibr.xyz attestations on Base network
 */
contract CaliberEASResolver is SchemaResolver {
    // Schema UIDs (set after deployment)
    bytes32 public forecastSchemaUid;
    bytes32 public calibrationSchemaUid;
    bytes32 public identitySchemaUid;
    bytes32 public superforecasterSchemaUid;
    bytes32 public reputationSchemaUid;

    // Authorized attesters (Calibr backend addresses)
    mapping(address => bool) public authorizedAttesters;

    // Superforecaster tiers
    mapping(address => SuperforecasterTier) public userTiers;

    // Calibration scores
    mapping(address => CalibrationScore) public calibrationScores;

    enum SuperforecasterTier {
        NONE,
        APPRENTICE,
        JOURNEYMAN,
        EXPERT,
        MASTER,
        GRANDMASTER
    }

    struct CalibrationScore {
        uint256 brierScore;
        uint256 totalForecasts;
        uint256 lastUpdated;
    }

    constructor(IEAS eas) SchemaResolver(eas) {
        authorizedAttesters[msg.sender] = true;
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 /* value */
    ) internal override returns (bool) {
        // Verify attester is authorized
        require(authorizedAttesters[attestation.attester], "Unauthorized attester");

        // Process based on schema
        if (attestation.schema == forecastSchemaUid) {
            return _processForecastAttestation(attestation);
        } else if (attestation.schema == calibrationSchemaUid) {
            return _processCalibrationAttestation(attestation);
        } else if (attestation.schema == superforecasterSchemaUid) {
            return _processSuperforecasterAttestation(attestation);
        }

        return true;
    }

    function onRevoke(
        Attestation calldata /* attestation */,
        uint256 /* value */
    ) internal pure override returns (bool) {
        return true;
    }

    function _processForecastAttestation(
        Attestation calldata /* attestation */
    ) internal pure returns (bool) {
        // Forecast attestations are always valid
        return true;
    }

    function _processCalibrationAttestation(
        Attestation calldata attestation
    ) internal returns (bool) {
        // Decode and update calibration score
        (uint256 brierScore, uint256 totalForecasts, , , ) = abi.decode(
            attestation.data,
            (uint256, uint256, uint256, uint256, string)
        );

        calibrationScores[attestation.recipient] = CalibrationScore({
            brierScore: brierScore,
            totalForecasts: totalForecasts,
            lastUpdated: block.timestamp
        });

        return true;
    }

    function _processSuperforecasterAttestation(
        Attestation calldata attestation
    ) internal returns (bool) {
        // Decode tier from attestation
        (string memory tierStr, , , , ) = abi.decode(
            attestation.data,
            (string, uint256, uint256, string, uint256)
        );

        SuperforecasterTier tier = _parseTier(tierStr);
        userTiers[attestation.recipient] = tier;

        return true;
    }

    function _parseTier(string memory tierStr) internal pure returns (SuperforecasterTier) {
        bytes32 tierHash = keccak256(bytes(tierStr));
        if (tierHash == keccak256("GRANDMASTER")) return SuperforecasterTier.GRANDMASTER;
        if (tierHash == keccak256("MASTER")) return SuperforecasterTier.MASTER;
        if (tierHash == keccak256("EXPERT")) return SuperforecasterTier.EXPERT;
        if (tierHash == keccak256("JOURNEYMAN")) return SuperforecasterTier.JOURNEYMAN;
        if (tierHash == keccak256("APPRENTICE")) return SuperforecasterTier.APPRENTICE;
        return SuperforecasterTier.NONE;
    }

    // Admin functions
    function setAuthorizedAttester(address attester, bool authorized) external {
        require(authorizedAttesters[msg.sender], "Not authorized");
        authorizedAttesters[attester] = authorized;
    }

    function setSchemaUids(
        bytes32 _forecast,
        bytes32 _calibration,
        bytes32 _identity,
        bytes32 _superforecaster,
        bytes32 _reputation
    ) external {
        require(authorizedAttesters[msg.sender], "Not authorized");
        forecastSchemaUid = _forecast;
        calibrationSchemaUid = _calibration;
        identitySchemaUid = _identity;
        superforecasterSchemaUid = _superforecaster;
        reputationSchemaUid = _reputation;
    }
}
```

---

## 9. Privacy & Personal Data

### 9.1 Privacy Design Principles

Based on EAS best practices for privacy-preserving attestations:

```
+-----------------------------------------------------------------------------+
|                          PRIVACY ARCHITECTURE                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  PUBLIC DATA                    PRIVATE DATA                                |
|  (On-chain)                     (Off-chain/Encrypted)                       |
|  +------------------+           +------------------+                        |
|  | - Wallet address |           | - Email address  |                        |
|  | - Forecast prob  |           | - Display name   |                        |
|  | - Market ID      |           | - Full reasoning |                        |
|  | - Brier score    |           | - API credentials|                        |
|  | - Tier badges    |           | - Platform IDs   |                        |
|  +------------------+           +------------------+                        |
|         |                              |                                    |
|         v                              v                                    |
|  +------------------+           +------------------+                        |
|  | EAS Attestation  |           | Merkle Tree Root |                        |
|  | (permanent,      |           | (selective       |                        |
|  |  verifiable)     |           |  disclosure)     |                        |
|  +------------------+           +------------------+                        |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 9.2 Privacy Options for Attestations

**1. On-Chain Public Attestations**

- All data visible on blockchain
- Best for: Badges, tier achievements, aggregated scores
- Pros: Maximum verifiability, composability
- Cons: No privacy

**2. Off-Chain Attestations**

- Data stored off-chain (IPFS, Calibr servers)
- UID timestamped on-chain
- Best for: Detailed forecasts with reasoning
- Pros: Gas-free, private, verifiable via signature
- Cons: Requires trust in storage provider

**3. Private Data Attestations (Merkle Tree)**

- Full data hashed into Merkle tree
- Only root hash stored on-chain
- Selective disclosure of specific fields
- Best for: Identity verification, platform credentials

### 9.3 User Privacy Settings

```prisma
model UserPrivacySettings {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Profile visibility
  profileVisibility ProfileVisibility @default(PUBLIC)
  showOnLeaderboard Boolean           @default(true)
  showWalletAddress Boolean           @default(false) // Show full or truncated

  // Forecast privacy
  defaultForecastPrivacy ForecastPrivacy @default(PUBLIC)
  shareReasoningPublicly Boolean       @default(false)

  // Data retention
  retainForecastHistory Boolean        @default(true)
  deleteDataOnAccountClose Boolean     @default(true)

  // Third-party sharing
  allowReputationExport Boolean        @default(true)
  allowDataAggregation Boolean         @default(true) // Anonymous analytics

  // Attestation preferences
  useOffchainAttestations Boolean      @default(false) // Off-chain by default
  usePrivateDataAttestations Boolean   @default(false) // Merkle tree attestations

  // Relations
  userId            String            @unique
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ProfileVisibility {
  PUBLIC            // Anyone can see
  AUTHENTICATED     // Only logged-in users
  PRIVATE           // Only self
}

enum ForecastPrivacy {
  PUBLIC            // Anyone can see forecast and reasoning
  PROBABILITY_ONLY  // Only probability visible, not reasoning
  PRIVATE           // Only user can see
  MERKLE            // Private data attestation with selective disclosure
}
```

### 9.4 Private Data Attestation Implementation

For sensitive data like identity verification:

```typescript
import {
  MerkleValue,
  PrivateData,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

// Create private data attestation for identity verification
async function createPrivateIdentityAttestation(
  userId: string,
  platformData: {
    platform: string;
    platformUserId: string;
    email?: string;
    verificationLevel: string;
  },
) {
  // Build Merkle tree from identity data
  const values: MerkleValue[] = [
    { type: "string", name: "platform", value: platformData.platform },
    {
      type: "string",
      name: "platformUserId",
      value: platformData.platformUserId,
    },
    { type: "string", name: "email", value: platformData.email || "" },
    {
      type: "string",
      name: "verificationLevel",
      value: platformData.verificationLevel,
    },
    {
      type: "uint256",
      name: "verifiedAt",
      value: Math.floor(Date.now() / 1000),
    },
  ];

  const privateData = new PrivateData(values);
  const fullTree = privateData.getFullTree();

  // Create attestation with only the Merkle root
  // The actual data remains private
  const attestation = await eas.attest({
    schema: PRIVATE_DATA_SCHEMA_UID,
    data: {
      recipient: userWalletAddress,
      data: ethers.utils.defaultAbiCoder.encode(["bytes32"], [fullTree.root]),
    },
  });

  // Store full tree securely for later selective disclosure
  await storePrivateTreeData(userId, fullTree);

  return {
    attestationUid: attestation.uid,
    merkleRoot: fullTree.root,
  };
}

// Selective disclosure - reveal only specific fields
async function generateProofForField(
  userId: string,
  fieldsToReveal: number[], // Indices of fields to reveal
): Promise<MultiProof> {
  const fullTree = await getPrivateTreeData(userId);
  const privateData = PrivateData.fromFullTree(fullTree);

  // Generate proof for selected fields only
  const multiProof = privateData.generateMultiProof(fieldsToReveal);

  return multiProof;
}

// Verify selective disclosure
function verifySelectiveDisclosure(
  merkleRoot: string,
  multiProof: MultiProof,
): boolean {
  return PrivateData.verifyMultiProof(merkleRoot, multiProof);
}
```

### 9.5 Privacy Best Practices

Following EAS documentation recommendations:

1. **Never store personal data directly on-chain**
   - Use hashes or Merkle roots for sensitive information
   - Store full data off-chain with proper encryption

2. **Implement selective disclosure**
   - Allow users to reveal only necessary fields
   - Use Merkle tree proofs for verification

3. **User consent and control**
   - Explicit opt-in for public attestations
   - Easy data deletion/revocation options
   - Clear privacy settings UI

4. **Encryption at rest**
   - All API credentials encrypted with AES-256
   - User-specific encryption keys
   - Secure key management (e.g., AWS KMS)

5. **Off-chain attestation storage**
   - IPFS for decentralized storage
   - Calibr secure storage for sensitive data
   - Backup and redundancy

```typescript
// Privacy-conscious attestation creation
async function createForecastAttestation(
  forecast: Forecast,
  privacySettings: UserPrivacySettings,
) {
  // Determine attestation type based on privacy settings
  if (privacySettings.usePrivateDataAttestations) {
    // Use Merkle tree for private data
    return createPrivateForecastAttestation(forecast);
  } else if (privacySettings.useOffchainAttestations) {
    // Use off-chain attestation
    return createOffchainForecastAttestation(forecast);
  } else if (!forecast.isPublic) {
    // Private forecast - no on-chain attestation
    return null;
  } else {
    // Public on-chain attestation
    return createOnchainForecastAttestation(forecast);
  }
}
```

### 9.6 GDPR & Data Protection Compliance

```prisma
model DataDeletionRequest {
  id                String            @id @default(cuid())
  createdAt         DateTime          @default(now())

  // Request details
  userId            String
  requestType       DeletionType
  reason            String?

  // Status
  status            DeletionStatus    @default(PENDING)
  processedAt       DateTime?
  completedAt       DateTime?

  // Audit
  attestationsRevoked Int             @default(0)
  offchainDataDeleted Boolean         @default(false)

  @@index([userId])
  @@index([status])
}

enum DeletionType {
  FULL_ACCOUNT      // Delete everything
  FORECASTS_ONLY    // Keep account, delete forecasts
  PII_ONLY          // Remove personal identifiable info
}

enum DeletionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

---

## 10. Enums

```prisma
enum Platform {
  POLYMARKET
  KALSHI
  IEM
  METACULUS
  MANIFOLD
}

enum MarketCategory {
  POLITICS
  SPORTS
  CRYPTO
  ECONOMICS
  SCIENCE
  ENTERTAINMENT
  TECHNOLOGY
  OTHER
}

enum SyncStatus {
  PENDING
  IN_PROGRESS
  SUCCESS
  FAILED
}

enum HealthStatus {
  HEALTHY
  DEGRADED
  DOWN
  UNKNOWN
}

enum MatchMethod {
  AUTO
  MANUAL
}

enum MatchStatus {
  PENDING
  CONFIRMED
  REJECTED
}

enum TransactionType {
  BUY
  SELL
  MINT
  MERGE
}

enum OrderSide {
  BUY
  SELL
}

enum TransactionStatus {
  PENDING
  SUBMITTED
  CONFIRMED
  FAILED
  CANCELLED
}

enum CrossChainStatus {
  PENDING           // Not started
  SWAPPING          // Step 1: Swapping $CALIBR -> USDC
  BRIDGING          // Step 2: Bridging USDC to Polygon
  DEPOSITING        // Step 3: Depositing to Safe
  TRADING           // Step 4: Executing trade
  COMPLETED         // All steps successful
  FAILED            // One or more steps failed
  CANCELLED         // User cancelled
}

enum StepStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  SKIPPED
}

enum TradingSessionStatus {
  INITIALIZING      // Session creation started
  DEPLOYING_SAFE    // Safe deployment in progress
  SETTING_APPROVALS // Token approvals in progress
  READY             // Ready to trade
  ACTIVE            // Actively trading
  EXPIRED           // Session timed out
  FAILED            // Error during setup
}

enum ArbitrageComplexity {
  SIMPLE           // Same chain, no KYC
  CROSS_CHAIN      // Different chains
  REQUIRES_KYC     // One platform requires KYC
  COMPLEX          // Multiple barriers
}

enum AlertType {
  SPREAD_ALERT
  PRICE_ALERT
  RESOLUTION_ALERT
  POSITION_ALERT
  TIER_PROMOTION
}

enum DeliveryMethod {
  EMAIL
  WEBHOOK
  PUSH
  IN_APP
}

enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
}

enum SyncType {
  MARKETS
  POSITIONS
  PRICES
}

enum SuperforecasterTier {
  APPRENTICE
  JOURNEYMAN
  EXPERT
  MASTER
  GRANDMASTER
}
```

---

## 11. Indices

### 11.1 Primary Indices

```prisma
// User lookups
@@index([email]) on User
@@index([address]) on WalletConnection
@@index([polymarketSafeAddress]) on WalletConnection

// Market lookups
@@index([slug]) on UnifiedMarket
@@index([category]) on UnifiedMarket
@@index([isActive]) on UnifiedMarket
@@index([unifiedMarketId]) on PlatformMarket
@@index([externalId]) on PlatformMarket

// Position lookups
@@index([userId]) on Position
@@index([platformMarketId]) on Position

// Forecast lookups
@@index([userId]) on Forecast
@@index([unifiedMarketId]) on Forecast
@@index([createdAt]) on Forecast
@@index([easAttestationUid]) on Forecast

// Transaction lookups
@@index([userId]) on Transaction
@@index([status]) on Transaction
@@index([txHash]) on Transaction

// EAS Attestation lookups
@@index([uid]) on EASAttestation
@@index([schemaUid]) on EASAttestation
@@index([recipient]) on EASAttestation
@@index([userId]) on EASAttestation

// Calibration lookups
@@index([globalRank]) on UserCalibration
@@index([currentTier]) on UserCalibration
```

---

## 12. TypeScript Types

### 12.1 EAS Types

```typescript
import {
  EAS,
  SchemaEncoder,
  Attestation,
} from "@ethereum-attestation-service/eas-sdk";

// EAS configuration type
interface EASConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  EAS_CONTRACT: string;
  SCHEMA_REGISTRY: string;
  easScanUrl: string;
}

// Attestation creation request
interface CreateAttestationRequest {
  schemaUid: string;
  recipient: string;
  data: Record<string, unknown>;
  refUid?: string;
  expirationTime?: number;
  revocable?: boolean;
}

// Attestation response
interface AttestationResponse {
  uid: string;
  txHash: string;
  schema: string;
  recipient: string;
  attester: string;
  time: number;
  data: Record<string, unknown>;
}

// Private data attestation
interface PrivateDataAttestation {
  merkleRoot: string;
  fullTree: MerkleTree;
  fieldsRevealed: number[];
}
```

### 12.2 Forecast Types

```typescript
interface ForecastRequest {
  unifiedMarketId: string;
  probability: number; // 0.01 - 0.99
  confidence: number; // 0 - 1
  reasoning?: string;
  kellyFraction?: number;
  executeRebalance?: boolean;
  isPublic?: boolean;
}

interface ForecastResponse {
  id: string;
  probability: number;
  confidence: number;
  recommendedSize?: number;
  marketYesPrice: number;
  easAttestationUid?: string;
  createdAt: string;
}

interface ForecastScoreResponse {
  rawBrierScore: number;
  timeWeightedBrier: number;
  logScore?: number;
  forecastCount: number;
  updateQuality: number;
}
```

### 12.3 Privacy Types

```typescript
interface UserPrivacyPreferences {
  profileVisibility: "PUBLIC" | "AUTHENTICATED" | "PRIVATE";
  showOnLeaderboard: boolean;
  defaultForecastPrivacy: "PUBLIC" | "PROBABILITY_ONLY" | "PRIVATE" | "MERKLE";
  useOffchainAttestations: boolean;
  usePrivateDataAttestations: boolean;
  allowReputationExport: boolean;
}

interface SelectiveDisclosureProof {
  merkleRoot: string;
  revealedFields: {
    name: string;
    value: unknown;
    proof: string[];
  }[];
}
```

---

## Appendix A: Migration from Previous Schema

If migrating from schema version 4.0:

```sql
-- Add privacy settings table
CREATE TABLE "UserPrivacySettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
  "defaultForecastPrivacy" TEXT NOT NULL DEFAULT 'PUBLIC',
  "useOffchainAttestations" BOOLEAN NOT NULL DEFAULT false,
  "usePrivateDataAttestations" BOOLEAN NOT NULL DEFAULT false,
  "allowReputationExport" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT NOT NULL UNIQUE
);

-- Add EAS attestation tracking
CREATE TABLE "EASAttestation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uid" TEXT NOT NULL UNIQUE,
  "schemaUid" TEXT NOT NULL,
  "schemaName" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL DEFAULT 8453,
  "txHash" TEXT,
  "attester" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "refUid" TEXT,
  "data" JSONB NOT NULL,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "revokedAt" TIMESTAMP(3),
  "isOffchain" BOOLEAN NOT NULL DEFAULT false,
  "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  "merkleRoot" TEXT,
  "userId" TEXT NOT NULL
);

-- Add indices
CREATE INDEX "EASAttestation_uid_idx" ON "EASAttestation"("uid");
CREATE INDEX "EASAttestation_schemaUid_idx" ON "EASAttestation"("schemaUid");
CREATE INDEX "EASAttestation_recipient_idx" ON "EASAttestation"("recipient");

-- Add privacy columns to existing tables
ALTER TABLE "User" ADD COLUMN "publicProfile" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN "showOnLeaderboard" BOOLEAN DEFAULT true;
ALTER TABLE "Forecast" ADD COLUMN "isPublic" BOOLEAN DEFAULT true;
ALTER TABLE "Forecast" ADD COLUMN "easAttestationUid" TEXT;
```

---

## Appendix B: Deployment Checklist

### Base Mainnet Deployment

- [ ] Deploy CaliberEASResolver contract to Base mainnet
- [ ] Register all schemas on Base Schema Registry
- [ ] Set schema UIDs in resolver contract
- [ ] Verify resolver contract on Basescan
- [ ] Update EAS_BASE_CONFIG with deployed addresses
- [ ] Test attestation creation and verification
- [ ] Configure backend signing keys
- [ ] Set up monitoring for attestation events

### Privacy Compliance

- [ ] Implement data deletion request handling
- [ ] Configure off-chain attestation storage (IPFS)
- [ ] Set up encryption for private data
- [ ] Create selective disclosure UI
- [ ] Document privacy policy for users
- [ ] Test GDPR data export functionality

---

_This document represents the complete data schema for Calibr.xyz's prediction market aggregation platform with EAS-integrated identity infrastructure and privacy-preserving attestations._  
_Version 5.0 | January 2026_
