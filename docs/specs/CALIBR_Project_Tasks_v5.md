# Calibr.xyz Project Tasks

## Prediction Market Portfolio Manager & Aggregation Layer

**Version:** 5.3
**Last Updated:** February 10, 2026
**Status:** Development Phase
**Major Updates:** EAS Foundation, Privacy & Compliance, Superforecaster Leaderboards, Multi-Platform Trading Adapters, Limitless Trading Integration, GDPR Compliance, Phase 4-6 Core Features (Complete)

---

## Table of Contents

1. [Project Phases Overview](#1-project-phases-overview)
2. [Phase 0: EAS Foundation & Digital Identity](#2-phase-0-eas-foundation--digital-identity)
3. [Phase 1: Core Infrastructure](#3-phase-1-core-infrastructure)
4. [Phase 2: Data Integration](#4-phase-2-data-integration)
5. [Phase 3: Multi-Platform Trading](#5-phase-3-multi-platform-trading)
6. [Phase 4: Core App Features](#6-phase-4-core-app-features)
7. [Phase 5: Cross-Chain Execution](#7-phase-5-cross-chain-execution)
8. [Phase 6: Advanced Features & Superforecaster System](#8-phase-6-advanced-features--superforecaster-system)
9. [Phase 7: Polish & Launch](#9-phase-7-polish--launch)
10. [Phase 8: Mainnet Deployment](#10-phase-8-mainnet-deployment)

---

## 1. Project Phases Overview

### Task Summary

| Phase                          | Focus                                                           | Status      |
| ------------------------------ | --------------------------------------------------------------- | ----------- |
| **Phase 0: EAS Foundation**    | EAS Schemas (testnet), Resolvers, Identity, Privacy Architecture| ✅ Complete |
| Phase 1: Core Infrastructure   | Monorepo, DB, Auth, Core Utils, **Privacy Tables**              | ✅ Complete |
| Phase 2: Data Integration      | Polymarket + Limitless APIs, CLOB (read-only), Sync             | ✅ Complete |
| Phase 3: Multi-Platform Trading| ITradingAdapter, Limitless Trading, Position Import             | ✅ Complete |
| Phase 4: Core App Features     | Markets, Portfolio, Kelly, Forecasting, **Privacy Settings UI** | ✅ Complete |
| Phase 5: Cross-Chain Execution | Limitless Trading, $CALIBR Flow, Bridge, Polymarket via CCTP    | ✅ Complete |
| Phase 6: Advanced Features     | Leaderboards, Reputation, Celebrations                          | ✅ Complete |
| Phase 7: Polish & Launch       | Testing, Docs, Infrastructure, **GDPR Compliance**              | 🔄 Active   |
| **Phase 8: Mainnet Deployment**| EAS Schemas (mainnet), Contracts, Production Launch             | Pending     |

### Phase Diagram

```
+-----------------------------------------------------------------------------+
|                         CALIBR.XYZ DEVELOPMENT PHASES                         |
+-----------------------------------------------------------------------------+
|                                                                             |
|  * PHASE 0: EAS FOUNDATION * (TESTNET)                                      |
|  |-- EAS Schema Registry & Resolvers (Base Sepolia)                         |
|  |-- Cross-platform identity integration                                    |
|  |-- Superforecaster tier system foundation                                 |
|  |-- Privacy architecture design                                            |
|  +-- Off-chain attestation schema                                           |
|                                                                             |
|  PHASE 1: CORE INFRASTRUCTURE                                               |
|  |-- Monorepo setup (Next.js + TypeScript)                                  |
|  |-- PostgreSQL + Prisma schema                                             |
|  |-- UserPrivacySettings & DataDeletionRequest tables                       |
|  |-- EASAttestation tracking table                                          |
|  |-- Foundry smart contract setup                                           |
|  +-- Base network integration                                               |
|                                                                             |
|  PHASE 2: DATA INTEGRATION                                                  |
|  |-- Polymarket: Gamma API + CLOB (read-only)                               |
|  |-- Limitless: REST API integration                                        |
|  +-- Real-time price feeds (multi-platform)                                 |
|                                                                             |
|  PHASE 3: MULTI-PLATFORM TRADING                                            |
|  |-- ITradingAdapter interface (platform-agnostic)                          |
|  |-- Limitless trading adapter (EIP-712 signed orders)                      |
|  |-- Position import from wallet addresses                                  |
|  +-- Order execution & position sync                                        |
|                                                                             |
|  PHASE 4: CORE APP FEATURES                                                 |
|  |-- Markets aggregation & portfolio view                                   |
|  |-- Kelly Criterion optimization                                           |
|  |-- Forecast journaling with EAS attestations                              |
|  |-- Privacy settings UI & attestation mode selection                       |
|  +-- Calibration scoring engine                                             |
|                                                                             |
|  PHASE 5: CROSS-CHAIN EXECUTION                                             |
|  |-- $CALIBR -> USDC -> Polygon flow                                        |
|  |-- CCTP bridge integration                                                |
|  |-- Polymarket trading via Builder Program                                 |
|  +-- Smart contract execution layer                                         |
|                                                                             |
|  * PHASE 6: SUPERFORECASTER SYSTEM *                                        |
|  |-- Leaderboards with cross-platform reputation                            |
|  |-- Superforecaster tier promotions & celebrations                         |
|  |-- Badge system & achievement unlocks                                     |
|  +-- Community recognition features                                         |
|                                                                             |
|  PHASE 7: POLISH & LAUNCH                                                   |
|  |-- Testing, security audits                                               |
|  |-- Documentation & infrastructure                                         |
|  |-- GDPR data export/deletion implementation                               |
|  +-- Testnet launch & beta testing                                          |
|                                                                             |
|  * PHASE 8: MAINNET DEPLOYMENT *                                            |
|  |-- Deploy EAS schemas to Base mainnet                                     |
|  |-- Deploy smart contracts to mainnet                                      |
|  |-- Production infrastructure setup                                        |
|  +-- Public mainnet launch                                                  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 2. Phase 0: EAS Foundation & Digital Identity

**Goal:** Establish the attestation, identity, and privacy infrastructure on testnet that forms the bedrock of the entire platform.

### 0.1 EAS Schema Design & Deployment (Testnet)

| ID    | Task                            | Description                                       | Dependencies | Status |
| ----- | ------------------------------- | ------------------------------------------------- | ------------ | ------ |
| 0.1.1 | Design Forecast Schema          | Define attestation structure for forecasts        | -            | ✅ Done |
| 0.1.2 | Design Calibration Score Schema | Define attestation structure for scoring          | 0.1.1        | ✅ Done |
| 0.1.3 | Design Identity Schema          | Cross-platform identity linking structure         | -            | ✅ Done |
| 0.1.4 | Design Superforecaster Schema   | Badge and tier system structure                   | 0.1.1, 0.1.2 | ✅ Done |
| 0.1.5 | Design Reputation Schema        | Platform reputation aggregation                   | 0.1.3        | ✅ Done |
| 0.1.6 | Design Private Data Schema      | Merkle tree root storage for selective disclosure | 0.1.3        | ✅ Done |
| 0.1.7 | Deploy schemas to Base Sepolia  | Register all schemas via EAS on testnet           | 0.1.1-0.1.6  | ✅ Done |
| 0.1.8 | Create schema documentation     | Document all schemas with examples                | 0.1.7        | ✅ Done |

**Schema Specifications:**

```typescript
// Forecast Schema
"uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic";

// Calibration Score Schema
"uint256 brierScore,uint256 totalForecasts,uint256 timeWeightedScore,uint256 period,string category";

// Cross-Platform Identity Schema
"string platform,string platformUserId,bytes32 proofHash,bool verified,uint256 verifiedAt";

// Superforecaster Badge Schema
"string tier,uint256 score,uint256 period,string category,uint256 rank";

// Platform Reputation Schema
"string platform,uint256 totalVolume,uint256 winRate,uint256 profitLoss,string verificationLevel";

// Private Data Schema (Merkle Root)
"bytes32 merkleRoot,string dataType,uint256 fieldCount,uint256 createdAt";
```

### 0.2 EAS Resolver Contracts (Testnet)

| ID    | Task                               | Description                                     | Dependencies | Status |
| ----- | ---------------------------------- | ----------------------------------------------- | ------------ | ------ |
| 0.2.1 | Create CaliberEASResolver contract | Core resolver with validation logic             | 0.1.1-0.1.6  | ✅ Done |
| 0.2.2 | Implement forecast validation      | Validate probability bounds, market existence   | 0.2.1        | ✅ Done |
| 0.2.3 | Implement identity verification    | Verify cross-platform proofs                    | 0.2.1        | ✅ Done |
| 0.2.4 | Implement calibration calculation  | Onchain Brier score and calibration math        | 0.2.1        | ✅ Done |
| 0.2.5 | Implement superforecaster logic    | Tier calculation and promotion logic            | 0.2.1, 0.2.4 | ✅ Done |
| 0.2.6 | Implement private data resolver    | Merkle root validation for selective disclosure | 0.2.1        | ✅ Done |
| 0.2.7 | Write comprehensive tests          | Unit tests for all resolver functions           | 0.2.1-0.2.6  | ✅ Done |
| 0.2.8 | Deploy resolver to Base Sepolia    | Test deployment and validation                  | 0.2.7        | ✅ Done |

### 0.3 Cross-Platform Identity Integration

Note: Calibr uses EAS exclusively on Base. Cross-platform identity links prediction market accounts (Polymarket, Limitless, etc.) to the user's Base wallet.

| ID    | Task                                   | Description                                   | Dependencies | Status  |
| ----- | -------------------------------------- | --------------------------------------------- | ------------ | ------- |
| 0.3.1 | Define identity linking flow           | How users link Polymarket/Limitless accounts  | 0.1.3        | ✅ Done |
| 0.3.2 | Implement identity attestation         | Create identity attestations on Base          | 0.3.1, 0.4.2 | ✅ Done |
| 0.3.3 | Create identity verification service   | Verify user owns platform accounts            | 0.3.2        | ✅ Done |
| 0.3.4 | Implement platform-specific verifiers  | Polymarket, Limitless account verification    | 0.3.3        | ✅ Done |
| 0.3.5 | Create identity query service          | Query linked identities for a wallet          | 0.3.2        | ✅ Done |
| 0.3.6 | Test identity flows                    | End-to-end identity linking tests             | 0.3.2-0.3.5  | ✅ Done |

### 0.4 EAS SDK Integration

| ID    | Task                            | Description                             | Dependencies | Status  |
| ----- | ------------------------------- | --------------------------------------- | ------------ | ------- |
| 0.4.1 | Install and configure EAS SDK   | Set up EAS client for Base network      | -            | ✅ Done |
| 0.4.2 | Create attestation service      | Service layer for creating attestations | 0.4.1, 0.2.1 | ✅ Done |
| 0.4.3 | Create query service            | Service layer for querying attestations | 0.4.1        | ✅ Done |
| 0.4.4 | Implement batch attestations    | Optimize for multiple attestations      | 0.4.2        | ✅ Done |
| 0.4.5 | Add offline attestation support | Support for off-chain attestations      | 0.4.2        | ✅ Done |
| 0.4.6 | Create EAS utilities package    | Reusable EAS interaction utilities      | 0.4.2, 0.4.3 | ✅ Done |
| 0.4.7 | Write integration tests         | Test EAS SDK integration                | 0.4.1-0.4.6  | ✅ Done |

### 0.5 Privacy Architecture Design

| ID    | Task                                  | Description                              | Dependencies | Status  |
| ----- | ------------------------------------- | ---------------------------------------- | ------------ | ------- |
| 0.5.1 | Design privacy data model             | Define public vs private data boundaries | 0.1.1-0.1.6  | ✅ Done |
| 0.5.2 | Design off-chain storage architecture | IPFS and backend storage strategy        | 0.5.1        | ✅ Done |
| 0.5.3 | Design Merkle tree implementation     | Private data attestation structure       | 0.5.1        | ✅ Done |
| 0.5.4 | Design selective disclosure flow      | User-controlled field revelation         | 0.5.3        | ✅ Done |
| 0.5.5 | Design attestation mode selection     | On-chain, off-chain, private modes       | 0.5.1-0.5.4  | ✅ Done |
| 0.5.6 | Document privacy architecture         | Technical specification document         | 0.5.1-0.5.5  | ✅ Done |

**Deliverables for Phase 0:**

- [x] Complete EAS schema registry deployed on Base
- [x] CaliberEASResolver contract deployed and operational
- [x] Cross-platform identity import system working
- [x] EAS SDK fully integrated with services layer
- [x] Privacy architecture designed and documented
- [x] All attestation infrastructure tested and documented

---

## 3. Phase 1: Core Infrastructure

**Goal:** Set up project infrastructure, database, and smart contracts building on the EAS foundation.

### 1.1 Project Setup (Next.js + TypeScript)

| ID    | Task                            | Description                                    | Dependencies | Status  |
| ----- | ------------------------------- | ---------------------------------------------- | ------------ | ------- |
| 1.1.1 | Initialize Next.js monorepo     | Set up pnpm workspaces, Next.js 14, TypeScript | 0.4.7        | ✅ Done |
| 1.1.2 | Create package structure        | Create core, adapters, api, web packages       | 1.1.1        | ✅ Done |
| 1.1.3 | Configure Foundry workspace     | Set up smart contract development environment  | 1.1.1        | ✅ Done |
| 1.1.4 | Set up Anvil local blockchain   | Local development blockchain with EAS deployed | 1.1.3        | ✅ Done |
| 1.1.5 | Configure CI/CD                 | GitHub Actions for lint, test, build, deploy   | 1.1.1        | ✅ Done |
| 1.1.6 | Set up development environment  | Docker Compose for Postgres, Redis, Anvil      | 1.1.4        | ✅ Done |
| 1.1.7 | Configure environment variables | Create .env templates with EAS addresses       | 1.1.6        | ✅ Done |

### 1.2 Database Schema (Enhanced for EAS & Privacy)

| ID     | Task                                 | Description                                             | Dependencies | Status  |
| ------ | ------------------------------------ | ------------------------------------------------------- | ------------ | ------- |
| 1.2.1  | Set up PostgreSQL                    | Provision database (local + staging)                    | 1.1.6        | ✅ Done |
| 1.2.2  | Install and configure Prisma         | Initialize Prisma, configure connection                 | 1.2.1        | ✅ Done |
| 1.2.3  | Create core schema                   | Platform, UnifiedMarket, PlatformMarket tables          | 1.2.2        | ✅ Done |
| 1.2.4  | Create user schema                   | User, WalletConnection, EAS attestation refs            | 1.2.2        | ✅ Done |
| 1.2.5  | Create portfolio schema              | Position, PortfolioSnapshot tables                      | 1.2.3        | ✅ Done |
| 1.2.6  | Create forecast schema               | Forecast table with EAS UID references, isPublic flag   | 1.2.3, 0.1.1 | ✅ Done |
| 1.2.7  | Create reputation schema             | Cross-platform reputation aggregation                   | 1.2.4, 0.3.7 | ✅ Done |
| 1.2.8  | Create superforecaster schema        | Leaderboard and tier tracking                           | 1.2.6, 1.2.7 | ✅ Done |
| 1.2.9  | **Create UserPrivacySettings table** | Profile visibility, forecast privacy, attestation prefs | 1.2.4, 0.5.1 | ✅ Done |
| 1.2.10 | **Create DataDeletionRequest table** | GDPR deletion request tracking                          | 1.2.4        | ✅ Done |
| 1.2.11 | **Create EASAttestation table**      | Track all attestations with privacy flags               | 1.2.4, 0.4.2 | ✅ Done |
| 1.2.12 | Create indices and migrations        | Optimize for attestation and privacy queries            | 1.2.3-1.2.11 | ✅ Done |

**Privacy-Related Schema:**

```prisma
model UserPrivacySettings {
  id                        String            @id @default(cuid())
  createdAt                 DateTime          @default(now())
  updatedAt                 DateTime          @updatedAt

  // Profile visibility
  profileVisibility         ProfileVisibility @default(PUBLIC)
  showOnLeaderboard         Boolean           @default(true)
  showWalletAddress         Boolean           @default(false)

  // Forecast privacy
  defaultForecastPrivacy    ForecastPrivacy   @default(PUBLIC)
  shareReasoningPublicly    Boolean           @default(false)

  // Attestation preferences
  useOffchainAttestations   Boolean           @default(false)
  usePrivateDataAttestations Boolean          @default(false)

  // Data controls
  allowReputationExport     Boolean           @default(true)
  allowDataAggregation      Boolean           @default(true)

  userId                    String            @unique
  user                      User              @relation(...)
}

model DataDeletionRequest {
  id                        String            @id @default(cuid())
  createdAt                 DateTime          @default(now())
  userId                    String
  requestType               DeletionType
  status                    DeletionStatus    @default(PENDING)
  processedAt               DateTime?
  completedAt               DateTime?
  attestationsRevoked       Int               @default(0)
  offchainDataDeleted       Boolean           @default(false)
}

model EASAttestation {
  id                        String            @id @default(cuid())
  uid                       String            @unique
  schemaUid                 String
  schemaName                String
  chainId                   Int               @default(8453)
  txHash                    String?
  attester                  String
  recipient                 String
  data                      Json
  revoked                   Boolean           @default(false)
  isOffchain                Boolean           @default(false)
  isPrivate                 Boolean           @default(false)
  merkleRoot                String?
  userId                    String
}
```

### 1.3 Smart Contract Infrastructure

| ID    | Task                                  | Description                         | Dependencies | Status  |
| ----- | ------------------------------------- | ----------------------------------- | ------------ | ------- |
| 1.3.1 | Create CaliberCore contract           | Main business logic contract        | 0.2.9        | ✅ Done |
| 1.3.2 | Create ForecastRegistry contract      | Onchain forecast management         | 1.3.1, 0.2.1 | ✅ Done |
| 1.3.3 | Create PortfolioManager contract      | Cross-platform position tracking    | 1.3.1        | ✅ Done |
| 1.3.4 | Create CaliberToken contract          | $CALIBR token with staking rewards  | 1.3.1        | ✅ Done |
| 1.3.5 | Create SuperforecasterBadges contract | Badge minting and management        | 1.3.2, 0.2.5 | ✅ Done |
| 1.3.6 | Write comprehensive tests             | Foundry tests for all contracts     | 1.3.1-1.3.5  | ✅ Done |
| 1.3.7 | Deploy to Base Sepolia                | Testnet deployment and verification | 1.3.6        | ✅ Done |
| 1.3.8 | Create deployment scripts             | Automated deployment pipeline       | 1.3.7        | ✅ Done |

### 1.4 Core Utilities & Types

| ID    | Task                             | Description                                 | Dependencies | Status  |
| ----- | -------------------------------- | ------------------------------------------- | ------------ | ------- |
| 1.4.1 | Define core TypeScript types     | UnifiedMarket, Position, Forecast types     | 0.1.9        | ✅ Done |
| 1.4.2 | Create Kelly calculator          | Kelly Criterion math utilities              | -            | ✅ Done |
| 1.4.3 | Create Brier score calculator    | Time-weighted Brier scoring                 | -            | ✅ Done |
| 1.4.4 | Create calibration calculator    | Calibration curves and metrics              | 1.4.3        | ✅ Done |
| 1.4.5 | Create EAS interaction utilities | Wrapper functions for attestations          | 0.4.6, 1.4.1 | ✅ Done |
| 1.4.6 | Create superforecaster utilities | Tier calculation and promotion logic        | 1.4.4, 0.3.7 | ✅ Done |
| 1.4.7 | **Create privacy utilities**     | Privacy settings helpers, Merkle tree utils | 0.5.3, 1.4.1 | ✅ Done |
| 1.4.8 | Write unit tests                 | Test all utility functions                  | 1.4.1-1.4.7  | ✅ Done |

### 1.5 Off-Chain Storage Infrastructure

| ID    | Task                                 | Description                                       | Dependencies | Status  |
| ----- | ------------------------------------ | ------------------------------------------------- | ------------ | ------- |
| 1.5.1 | Set up IPFS integration              | Configure IPFS client for decentralized storage   | 1.1.6        | ✅ Done |
| 1.5.2 | Create off-chain attestation service | Store and retrieve off-chain attestations         | 1.5.1, 0.4.5 | ✅ Done |
| 1.5.3 | Implement signature verification     | Verify off-chain attestation signatures           | 1.5.2        | ✅ Done |
| 1.5.4 | Create backend fallback storage      | Calibr-hosted storage for off-chain data          | 1.2.1        | ✅ Done |
| 1.5.5 | Implement storage selection logic    | Route to IPFS or backend based on user preference | 1.5.1-1.5.4  | ✅ Done |
| 1.5.6 | Write storage integration tests      | Test off-chain storage reliability                | 1.5.1-1.5.5  | ✅ Done |

**Deliverables for Phase 1:**

- [x] Next.js monorepo with TypeScript fully configured
- [x] PostgreSQL schema with EAS and privacy tables ready
- [x] Core smart contracts deployed to Base Sepolia
- [x] Foundry development environment operational
- [x] Off-chain storage infrastructure operational
- [x] All core utilities tested and documented

---

## 4. Phase 2: Data Integration

**Goal:** Integrate Polymarket and Limitless market data via REST APIs and CLOB for read-only operations.

### 2.0 Limitless API Integration

| ID    | Task                           | Description                              | Dependencies | Status  |
| ----- | ------------------------------ | ---------------------------------------- | ------------ | ------- |
| 2.0.1 | Create Limitless API client    | REST client with rate limiting & caching | 1.1.2        | ✅ Done |
| 2.0.2 | Create Limitless adapter       | Base adapter class with error handling   | 2.0.1        | ✅ Done |
| 2.0.3 | Implement markets endpoint     | Fetch active markets with pagination     | 2.0.2        | ✅ Done |
| 2.0.4 | Implement market details       | Fetch single market by slug              | 2.0.2        | ✅ Done |
| 2.0.5 | Implement order book fetching  | Get current orderbook state              | 2.0.2        | ✅ Done |
| 2.0.6 | Create response mappers        | Transform API to unified types           | 2.0.2, 1.4.1 | ✅ Done |
| 2.0.7 | Fix CLOB price display         | Correct price interpretation for CLOB    | 2.0.6        | ✅ Done |
| 2.0.8 | Support multi-outcome markets  | Handle GROUP markets with N outcomes     | 2.0.6        | ✅ Done |
| 2.0.9 | Add rate limiting and caching  | Respect API limits with backoff          | 2.0.1        | ✅ Done |

### 2.1 Polymarket Gamma API Integration

### 2.1 Gamma API Integration

| ID    | Task                       | Description                              | Dependencies |
| ----- | -------------------------- | ---------------------------------------- | ------------ |
| 2.1.1 | Create Polymarket adapter  | Base adapter class with error handling   | 1.1.2        |
| 2.1.2 | Implement markets endpoint | Fetch all markets with filtering         | 2.1.1        |
| 2.1.3 | Implement market details   | Fetch single market with outcomes        | 2.1.1        |
| 2.1.4 | Implement events endpoint  | Fetch events (grouped markets)           | 2.1.1        |
| 2.1.5 | Create response mappers    | Transform API responses to unified types | 2.1.1, 1.4.1 |
| 2.1.6 | Implement rate limiting    | Respect API rate limits with backoff     | 2.1.1        |
| 2.1.7 | Add caching layer          | Redis caching for market data            | 2.1.2-2.1.4  |
| 2.1.8 | Write integration tests    | Test against live Gamma API              | 2.1.1-2.1.7  |

### 2.2 CLOB API Integration (Read-Only)

| ID    | Task                            | Description                        | Dependencies |
| ----- | ------------------------------- | ---------------------------------- | ------------ |
| 2.2.1 | Install @polymarket/clob-client | Configure CLOB client package      | 2.1.1        |
| 2.2.2 | Implement orderbook fetching    | Get current orderbook state        | 2.2.1        |
| 2.2.3 | Implement price fetching        | Get current best bid/ask           | 2.2.1        |
| 2.2.4 | Implement trade history         | Fetch recent trades for market     | 2.2.1        |
| 2.2.5 | Create price feed service       | Periodic price updates to database | 2.2.3        |
| 2.2.6 | Write CLOB integration tests    | Test orderbook and price fetching  | 2.2.1-2.2.5  |

### 2.3 Market Synchronization

| ID    | Task                           | Description                          | Dependencies |
| ----- | ------------------------------ | ------------------------------------ | ------------ |
| 2.3.1 | Create sync scheduler          | Background job for market updates    | 2.1.7        |
| 2.3.2 | Implement market discovery     | Detect new markets on Polymarket     | 2.3.1, 2.1.2 |
| 2.3.3 | Implement market updates       | Update existing market data          | 2.3.1, 2.1.3 |
| 2.3.4 | Implement resolution detection | Detect and record market resolutions | 2.3.3        |
| 2.3.5 | Create market matching service | Match Polymarket to unified markets  | 2.3.2, 1.2.3 |
| 2.3.6 | Write sync integration tests   | Test full sync cycle                 | 2.3.1-2.3.5  |

**Deliverables for Phase 2:**

- [x] Limitless API fully integrated with caching and rate limiting
- [x] Limitless CLOB and AMM market data working
- [x] Multi-outcome (GROUP) market support
- [ ] Gamma API fully integrated with caching
- [ ] Polymarket CLOB read-only operations working
- [ ] Market sync running on schedule
- [ ] Market matching operational

---

## 5. Phase 3: Multi-Platform Trading

**Goal:** Implement platform-agnostic trading through ITradingAdapter interface, starting with Limitless (Base) and extensible to Polymarket (Polygon) via Phase 5.

### 3.1 Trading Adapter Interface

| ID    | Task                              | Description                                  | Dependencies | Status |
| ----- | --------------------------------- | -------------------------------------------- | ------------ | ------ |
| 3.1.1 | Define ITradingAdapter interface  | Platform-agnostic trading abstraction        | 2.1.1        | ✅ Done |
| 3.1.2 | Define order types and enums      | OrderType, OrderSide, OrderStatus            | 3.1.1        | ✅ Done |
| 3.1.3 | Define authentication interface   | Platform credentials abstraction             | 3.1.1        | ✅ Done |
| 3.1.4 | Create adapter factory            | getTradingAdapter(platform) function         | 3.1.1        | ✅ Done |
| 3.1.5 | Write adapter interface tests     | Test type contracts                          | 3.1.1-3.1.4  | ✅ Done |

### 3.2 Limitless Trading Adapter (Primary)

| ID    | Task                              | Description                                  | Dependencies | Status  |
| ----- | --------------------------------- | -------------------------------------------- | ------------ | ------- |
| 3.2.1 | Implement EIP-712 order signing   | Sign orders with user's wallet               | 3.1.1        | ✅ Done |
| 3.2.2 | Implement order placement         | Submit signed orders to Limitless CLOB       | 3.2.1        | ✅ Done |
| 3.2.3 | Implement order cancellation      | Cancel pending orders (DELETE method)        | 3.2.1        | ✅ Done |
| 3.2.4 | Implement GTC/FOK order types     | Good-Till-Cancelled and Fill-Or-Kill         | 3.2.2        | ✅ Done |
| 3.2.5 | Implement position fetching       | Get user positions from Limitless            | 3.2.1        | ✅ Done |
| 3.2.6 | Implement API authentication      | Message signing → login → session cookie     | 3.2.1        | ✅ Done |
| 3.2.7 | Implement direct AMM trading      | buyFromAMM/sellToAMM via FPMM contracts      | 3.2.1        | ✅ Done |
| 3.2.8 | Implement direct CTF operations   | splitPosition/mergePositions/redeemPositions | 3.2.1        | ✅ Done |
| 3.2.9 | Write Limitless trading tests     | Test order lifecycle on testnet              | 3.2.1-3.2.8  | ✅ Done |

### 3.3 Position Import & Sync

| ID    | Task                              | Description                                  | Dependencies | Status  |
| ----- | --------------------------------- | -------------------------------------------- | ------------ | ------- |
| 3.3.1 | Implement wallet position scan    | Read ERC-1155 positions from wallet (Base)   | 2.0.1        | ✅ Done |
| 3.3.2 | Implement Limitless position sync | Sync positions from Limitless portfolio API  | 3.2.5        | ✅ Done |
| 3.3.3 | Create position aggregation       | Aggregate positions across platforms         | 3.3.1, 3.3.2 | ✅ Done |
| 3.3.4 | Implement P&L calculation         | Calculate unrealized/realized P&L            | 3.3.3        | ✅ Done |
| 3.3.5 | Create position history tracking  | Track position changes over time             | 3.3.3        | ✅ Done |
| 3.3.6 | Write position sync tests         | Test position import and sync                | 3.3.1-3.3.5  | ✅ Done |

### 3.4 Order Execution Service

| ID    | Task                              | Description                                  | Dependencies | Status |
| ----- | --------------------------------- | -------------------------------------------- | ------------ | ------ |
| 3.4.1 | Create order builder service      | Construct valid order structures             | 3.1.1        | ✅ Done |
| 3.4.2 | Implement execution router        | Route orders to correct platform adapter     | 3.4.1, 3.2.2 | ✅ Done |
| 3.4.3 | Create order status tracking      | Track order status and fills                 | 3.4.2        | ✅ Done |
| 3.4.4 | Implement execution logging       | Log all trade executions                     | 3.4.2        | ✅ Done |
| 3.4.5 | Add trade notifications           | Notify users of order fills                  | 3.4.3        | ✅ Done |
| 3.4.6 | Write execution service tests     | Test full order lifecycle                    | 3.4.1-3.4.5  | ✅ Done |

### 3.5 Polymarket Trading Adapter (Stub - Completed in Phase 5)

| ID    | Task                              | Description                                  | Dependencies | Status |
| ----- | --------------------------------- | -------------------------------------------- | ------------ | ------ |
| 3.5.1 | Create Polymarket adapter stub    | Placeholder for Phase 5 implementation       | 3.1.1        | ✅ Done |
| 3.5.2 | Apply for Builder Program         | Submit application to Polymarket             | -            | 🔄 Next |
| 3.5.3 | Document Polymarket flow          | Document CCTP bridge + trading flow          | 3.5.2        | Pending |

**Deliverables for Phase 3:**

- [x] ITradingAdapter interface fully implemented
- [x] Limitless trading operational (EIP-712 signed orders)
- [x] Limitless API authentication (message signing → session cookie)
- [x] Direct AMM trading via FPMM contracts (buyFromAMM/sellToAMM)
- [x] Direct CTF operations (splitPosition/mergePositions/redeemPositions)
- [x] Position import from wallet addresses working (ERC-1155 scanner)
- [x] Position sync from Limitless portfolio API
- [x] Position aggregation across platforms
- [x] Order execution service with logging

---

## 6. Phase 4: Core App Features

**Goal:** Implement core application features including portfolio management, forecasting, and privacy settings.

### 4.1 Markets & Portfolio View

| ID    | Task                          | Description                              | Dependencies | Status  |
| ----- | ----------------------------- | ---------------------------------------- | ------------ | ------- |
| 4.1.1 | Create markets list component | Display available markets with filtering | 2.0.9        | ✅ Done |
| 4.1.2 | Create market detail view     | Single market with orderbook, TradingPanel | 4.1.1, 2.0.5 | ✅ Done |
| 4.1.3 | Create portfolio dashboard    | Aggregate positions with wallet scan     | 3.3.2        | ✅ Done |
| 4.1.4 | Implement P&L tracking        | Show unrealized/realized P&L             | 4.1.3        | ✅ Done |
| 4.1.5 | Implement resolution alerts   | Show resolved markets with payouts       | 4.1.4        | ✅ Done |
| 4.1.6 | Create platform breakdown     | Positions grouped by platform            | 4.1.3        | ✅ Done |
| 4.1.7 | Create position detail view   | Individual position management           | 4.1.3        | ✅ Done |
| 4.1.8 | Add portfolio analytics       | Charts, allocation breakdown             | 4.1.3-4.1.6  | ✅ Done |

### 4.2 Kelly Criterion Integration

| ID    | Task                            | Description                           | Dependencies | Status  |
| ----- | ------------------------------- | ------------------------------------- | ------------ | ------- |
| 4.2.1 | Create Kelly overlay component  | Show recommended sizes on markets     | 4.1.2, 1.4.2 | ✅ Done |
| 4.2.2 | Implement edge calculation      | Calculate edge from user probability  | 4.2.1        | ✅ Done |
| 4.2.3 | Create Kelly settings panel     | Configure fraction multiplier         | 4.2.1        | ✅ Done |
| 4.2.4 | Implement portfolio-level Kelly | Optimize across multiple positions    | 4.2.2, 4.1.3 | ✅ Done |
| 4.2.5 | Add Kelly explanation tooltips  | Help users understand recommendations | 4.2.1-4.2.4  | ✅ Done |

### 4.3 Forecast Journaling with EAS Integration

| ID    | Task                                | Description                                     | Dependencies | Status  |
| ----- | ----------------------------------- | ----------------------------------------------- | ------------ | ------- |
| 4.3.1 | Create forecast submission UI       | Form for creating forecasts with reasoning      | 4.1.1, 0.4.6 | ✅ Done |
| 4.3.2 | Integrate EAS attestation creation  | Submit forecasts as onchain attestations        | 4.3.1, 0.2.1 | ✅ Done |
| 4.3.3 | Create forecast history view        | Display user's forecasting history              | 4.3.2        | ✅ Done |
| 4.3.4 | Implement forecast updates          | Allow probability updates with new attestations | 4.3.2        | ✅ Done |
| 4.3.5 | Create resolution tracking          | Track market resolutions and score forecasts    | 4.3.3, 1.4.3 | ✅ Done |
| 4.3.6 | Calculate onchain Brier scores      | Update EAS attestations with scores             | 4.3.5, 0.2.4 | ✅ Done |
| 4.3.7 | Implement calibration tracking      | Show calibration metrics over time              | 4.3.6, 1.4.4 | ✅ Done |
| 4.3.8 | Create forecast analytics dashboard | Detailed performance analytics                  | 4.3.7        | ✅ Done |

### 4.4 Privacy Settings UI

| ID    | Task                                     | Description                                   | Dependencies | Status  |
| ----- | ---------------------------------------- | --------------------------------------------- | ------------ | ------- |
| 4.4.1 | Create privacy settings page             | Dedicated page for privacy controls           | 1.2.9        | ✅ Done |
| 4.4.2 | Implement profile visibility controls    | PUBLIC, AUTHENTICATED, PRIVATE options        | 4.4.1        | ✅ Done |
| 4.4.3 | Implement leaderboard opt-out            | Show/hide from public leaderboards            | 4.4.1        | ✅ Done |
| 4.4.4 | Create forecast privacy defaults         | Set default privacy for new forecasts         | 4.4.1, 4.3.1 | ✅ Done |
| 4.4.5 | **Implement attestation mode selection** | On-chain, off-chain, private (Merkle) options | 4.4.1, 0.5.5 | ✅ Done |
| 4.4.6 | Create per-forecast privacy override     | Change privacy on individual forecasts        | 4.4.4, 4.3.1 | ✅ Done |
| 4.4.7 | Implement data export controls           | Allow/disallow reputation export              | 4.4.1        | ✅ Done |
| 4.4.8 | Add privacy explanation tooltips         | Help users understand privacy options         | 4.4.1-4.4.7  | ✅ Done |

### 4.5 Attestation Mode Implementation

| ID    | Task                                   | Description                                  | Dependencies | Status  |
| ----- | -------------------------------------- | -------------------------------------------- | ------------ | ------- |
| 4.5.1 | Implement on-chain attestation flow    | Standard public attestations                 | 4.4.5, 0.4.2 | ✅ Done |
| 4.5.2 | Implement off-chain attestation flow   | IPFS/backend stored attestations             | 4.4.5, 1.5.2 | ✅ Done |
| 4.5.3 | **Implement Merkle tree attestations** | Private data with selective disclosure       | 4.4.5, 0.5.3 | ✅ Done |
| 4.5.4 | Create selective disclosure UI         | Allow users to reveal specific fields        | 4.5.3        | ✅ Done |
| 4.5.5 | Implement proof generation             | Generate Merkle proofs for verification      | 4.5.3        | ✅ Done |
| 4.5.6 | Create attestation verification page   | Verify any attestation (public or disclosed) | 4.5.1-4.5.5  | ✅ Done |
| 4.5.7 | Write attestation mode tests           | Test all three modes end-to-end              | 4.5.1-4.5.6  | ✅ Done |

**Deliverables for Phase 4:**

- [x] Markets list with filtering and search
- [x] Market detail view with trading panel
- [x] Portfolio dashboard with P&L tracking
- [x] Resolution alerts for resolved markets
- [x] On-chain wallet scanning for position import
- [x] Position detail view (73 tests)
- [x] Portfolio analytics (62 tests)
- [x] Kelly Criterion integration operational (107 tests)
- [x] Forecast journaling with EAS working (58 tests)
- [x] Privacy settings UI complete (65 tests)
- [x] All three attestation modes (on-chain, off-chain, private) implemented

---

## 7. Phase 5: Cross-Chain Execution & Trading

**Goal:** Implement trading execution on Limitless (Base) and Polymarket (Polygon via CCTP bridge).

### 5.0 Limitless Trading (Base - Direct)

| ID    | Task                             | Description                              | Dependencies | Status  |
| ----- | -------------------------------- | ---------------------------------------- | ------------ | ------- |
| 5.0.1 | Implement Limitless order signing | EIP-712 typed data signing for orders   | 3.2.1        | ✅ Done |
| 5.0.2 | Create order placement service   | Submit signed orders to Limitless CLOB   | 5.0.1        | ✅ Done |
| 5.0.3 | Implement order cancellation     | Cancel pending orders (DELETE method)    | 5.0.1        | ✅ Done |
| 5.0.4 | Add collateral approval flow     | USDC approval for Limitless contracts    | 5.0.2        | ✅ Done |
| 5.0.5 | Create trade execution UI        | Buy/sell interface for Limitless markets | 5.0.2        | ✅ Done |
| 5.0.6 | Implement position tracking      | Track user positions after trades        | 5.0.2        | ✅ Done |
| 5.0.7 | Add AMM trading UI support       | Direct FPMM trading in TradingPanel      | 5.0.5        | ✅ Done |
| 5.0.8 | Write Limitless trading tests    | Test order lifecycle on Base             | 5.0.1-5.0.7  | ✅ Done |

**Limitless Trading Flow (Base - No Bridge Required):**
```
User Wallet (Base)
       |
       v
  USDC Approval → Limitless Contracts
       |
       v
  EIP-712 Signed Order
       |
       v
  Limitless CLOB → Position
```

### 5.1 Token Swap Infrastructure

| ID    | Task                            | Description                       | Dependencies | Status  |
| ----- | ------------------------------- | --------------------------------- | ------------ | ------- |
| 5.1.1 | Create Aerodrome integration    | Swap $CALIBR to USDC on Base      | 1.3.4        | Pending |
| 5.1.2 | Implement swap estimation       | Calculate expected USDC output    | 5.1.1        | Pending |
| 5.1.3 | Implement slippage protection   | User-configurable slippage limits | 5.1.2        | Pending |
| 5.1.4 | Create swap transaction builder | Build and sign swap transactions  | 5.1.1-5.1.3  | Pending |
| 5.1.5 | Write swap integration tests    | Test swap functionality           | 5.1.1-5.1.4  | Pending |

### 5.2 CCTP Bridge Integration

| ID    | Task                           | Description                     | Dependencies | Status  |
| ----- | ------------------------------ | ------------------------------- | ------------ | ------- |
| 5.2.1 | Integrate Circle CCTP SDK      | Configure for Base to Polygon   | 5.1.4        | ✅ Done |
| 5.2.2 | Implement bridge initiation    | Start USDC transfer to Polygon  | 5.2.1        | ✅ Done |
| 5.2.3 | Implement attestation waiting  | Wait for Circle attestation     | 5.2.2        | ✅ Done |
| 5.2.4 | Implement mint claiming        | Claim USDC on Polygon           | 5.2.3        | ✅ Done |
| 5.2.5 | Create bridge status tracking  | Track bridge progress           | 5.2.2-5.2.4  | ✅ Done |
| 5.2.6 | Implement bridge fee handling  | Add $0.10 fee to $CALIBR amount | 5.2.1        | ✅ Done |
| 5.2.7 | Write bridge integration tests | Test full bridge flow           | 5.2.1-5.2.6  | ✅ Done |

### 5.3 End-to-End Execution

| ID    | Task                             | Description                         | Dependencies | Status  |
| ----- | -------------------------------- | ----------------------------------- | ------------ | ------- |
| 5.3.1 | Create execution router contract | Single-tx swap + bridge initiation  | 5.1.4, 5.2.1 | Pending |
| 5.3.2 | Implement trade intent system    | Store intended trades during bridge | 5.3.1, 3.4.1 | Pending |
| 5.3.3 | Create execution monitor         | Watch for bridge completion         | 5.3.2        | Pending |
| 5.3.4 | Implement auto-execution         | Execute trade when USDC arrives     | 5.3.3, 3.4.2 | Pending |
| 5.3.5 | Create execution status UI       | Show full execution progress        | 5.3.1-5.3.4  | Pending |
| 5.3.6 | Write E2E execution tests        | Test complete flow                  | 5.3.1-5.3.5  | Pending |

**Deliverables for Phase 5:**

- [x] Limitless trading fully operational on Base
- [x] Trade execution UI (TradingPanel component)
- [x] AMM trading with USDC approval flow
- [x] CCTP bridge integration complete (PR #9)
- [x] Bridge panel component with 5-step status display
- [x] Bridge store with localStorage persistence
- [x] Trading panel cross-chain awareness
- [ ] $CALIBR swap to USDC operational (pending token launch)
- [ ] End-to-end Polymarket execution (pending Builder Program)

---

## 8. Phase 6: Advanced Features & Superforecaster System

**Goal:** Implement the comprehensive superforecaster celebration and leaderboard system.

### 6.1 Superforecaster Leaderboard System

| ID    | Task                                         | Description                                   | Dependencies | Status  |
| ----- | -------------------------------------------- | --------------------------------------------- | ------------ | ------- |
| 6.1.1 | Design leaderboard data structure            | Rankings, tiers, scores, achievements         | 4.3.8, 0.3.7 | ✅ Done |
| 6.1.2 | Create composite scoring algorithm           | Combine Calibr + external reputation scores   | 6.1.1, 0.3.7 | ✅ Done |
| 6.1.3 | Implement tier calculation system            | APPRENTICE to GRANDMASTER progression         | 6.1.2, 0.2.5 | ✅ Done |
| 6.1.4 | Create real-time leaderboard API             | Live rankings with filtering/sorting          | 6.1.3        | ✅ Done |
| 6.1.5 | Build leaderboard frontend                   | Beautiful, engaging leaderboard display       | 6.1.4        | ✅ Done |
| 6.1.6 | Add historical leaderboard tracking          | Track rankings over time                      | 6.1.4        | ✅ Done |
| 6.1.7 | Implement leaderboard categories             | Overall, category-specific, platform-specific | 6.1.4        | ✅ Done |
| 6.1.8 | Create leaderboard sharing features          | Social sharing of achievements                | 6.1.5        | ✅ Done |
| 6.1.9 | **Respect privacy settings in leaderboards** | Hide users who opted out                      | 6.1.5, 4.4.3 | ✅ Done |

### 6.2 Superforecaster Badge & Achievement System

| ID    | Task                                | Description                              | Dependencies | Status  |
| ----- | ----------------------------------- | ---------------------------------------- | ------------ | ------- |
| 6.2.1 | Design badge visual system          | SVG badges for each tier and achievement | 6.1.3        | ✅ Done |
| 6.2.2 | Create achievement definitions      | Streak days, accuracy, volume milestones | 6.1.1        | ✅ Done |
| 6.2.3 | Implement badge minting contract    | NFT badges for major achievements        | 1.3.5, 6.2.1 | ✅ Done |
| 6.2.4 | Create achievement tracking system  | Monitor and unlock achievements          | 6.2.2, 6.2.3 | ✅ Done |
| 6.2.5 | Build badge display system          | Show badges on profiles and leaderboard  | 6.2.1, 6.1.5 | ✅ Done |
| 6.2.6 | Implement achievement notifications | Celebrate unlocked achievements          | 6.2.4        | ✅ Done |
| 6.2.7 | Create badge marketplace/sharing    | Allow badge display across platforms     | 6.2.3        | ✅ Done |
| 6.2.8 | Add achievement analytics           | Track achievement unlock rates           | 6.2.4        | ✅ Done |

### 6.3 Superforecaster Celebration & Recognition

| ID    | Task                             | Description                               | Dependencies       | Status  |
| ----- | -------------------------------- | ----------------------------------------- | ------------------ | ------- |
| 6.3.1 | Design celebration animations    | Visual celebrations for tier promotions   | 6.1.3, 6.2.1       | ✅ Done |
| 6.3.2 | Create promotion ceremony system | Special UI for tier promotions            | 6.3.1              | ✅ Done |
| 6.3.3 | Implement streak tracking        | Daily forecasting streaks and bonuses     | 4.3.2              | ✅ Done |
| 6.3.4 | Create hall of fame              | Showcase top performers and their stories | 6.1.5              | ✅ Done |
| 6.3.5 | Add social recognition features  | Shoutouts, highlights, features           | 6.3.4              | ✅ Done |
| 6.3.6 | Implement $CALIBR reward boosts  | Extra rewards for superforecasters        | 6.1.3, 1.3.4       | ✅ Done |
| 6.3.7 | Create community features        | Superforecaster-only channels/perks       | 6.1.3              | ✅ Done |
| 6.3.8 | Add cross-platform attestations  | Share achievements to other EAS platforms | 6.2.3, 0.3.2-0.3.6 | ✅ Done |

### 6.4 Cross-Platform Reputation Integration

| ID    | Task                                      | Description                                 | Dependencies | Status  |
| ----- | ----------------------------------------- | ------------------------------------------- | ------------ | ------- |
| 6.4.1 | Create Optimism Collective integration    | Import RetroFunding reputation              | 0.3.2, 6.1.2 | ✅ Done |
| 6.4.2 | Create Coinbase Verifications integration | Import verification levels                  | 0.3.4, 6.1.2 | ✅ Done |
| 6.4.3 | Create Gitcoin Passport integration       | Import passport scores                      | 0.3.6, 6.1.2 | ✅ Done |
| 6.4.4 | Add ENS integration                       | Display ENS names in leaderboards           | 6.1.5        | ✅ Done |
| 6.4.5 | Create reputation syncing system          | Regular updates from external platforms     | 6.4.1-6.4.3  | ✅ Done |
| 6.4.6 | Build reputation dashboard                | Show all connected platform reputations     | 6.4.1-6.4.4  | ✅ Done |
| 6.4.7 | Add reputation verification               | Verify and validate imported reputation     | 6.4.5        | ✅ Done |
| 6.4.8 | Create reputation sharing features        | Export Calibr reputation to other platforms | 6.4.6, 0.4.2 | ✅ Done |

### 6.5 Advanced Analytics & Insights

| ID    | Task                               | Description                                | Dependencies | Status  |
| ----- | ---------------------------------- | ------------------------------------------ | ------------ | ------- |
| 6.5.1 | Create forecasting insights engine | AI-powered insights on performance         | 4.3.8, 6.1.2 | ✅ Done |
| 6.5.2 | Build comparison tools             | Compare performance vs other forecasters   | 6.1.4        | ✅ Done |
| 6.5.3 | Implement trend analysis           | Identify improving/declining forecasters   | 6.5.1        | ✅ Done |
| 6.5.4 | Create coaching recommendations    | Suggest areas for improvement              | 6.5.1, 6.5.3 | ✅ Done |
| 6.5.5 | Add market expertise tracking      | Identify domain expertise areas            | 4.3.8        | ✅ Done |
| 6.5.6 | Create forecaster profiles         | Rich profiles with stats and achievements  | 6.2.5, 6.4.6 | ✅ Done |
| 6.5.7 | **Implement data export features** | Export forecasting data and insights       | 6.5.1, 4.4.7 | ✅ Done |
| 6.5.8 | Add performance prediction         | Predict future performance based on trends | 6.5.1, 6.5.3 | ✅ Done |

**Deliverables for Phase 6:**

- [x] Complete superforecaster leaderboard with privacy controls
- [x] Badge and achievement system operational
- [x] Celebration and recognition features active
- [x] Comprehensive reputation aggregation from major platforms
- [x] Advanced analytics dashboard with data export

---

## 9. Phase 7: Polish & Launch

**Goal:** Final testing, documentation, security audits, and launch preparation including GDPR compliance.

### 7.1 Testing & Quality Assurance

| ID    | Task                            | Description                         | Dependencies        | Status  |
| ----- | ------------------------------- | ----------------------------------- | ------------------- | ------- |
| 7.1.1 | Create comprehensive test suite | Unit, integration, E2E tests        | All previous phases | ✅ Done |
| 7.1.2 | Perform load testing            | Test system under expected load     | 7.1.1               | Pending |
| 7.1.3 | Conduct security audit          | Smart contract and API security     | 7.1.1               | Pending |
| 7.1.4 | Perform penetration testing     | Test for vulnerabilities            | 7.1.3               | Pending |
| 7.1.5 | Fix identified issues           | Address all audit findings          | 7.1.3, 7.1.4        | Pending |
| 7.1.6 | Final QA pass                   | Complete functionality verification | 7.1.5               | Pending |

### 7.2 GDPR & Compliance Implementation

| ID    | Task                                 | Description                               | Dependencies  | Status  |
| ----- | ------------------------------------ | ----------------------------------------- | ------------- | ------- |
| 7.2.1 | **Implement data export API**        | Export all user data in portable format   | 1.2.10, 6.5.7 | ✅ Done |
| 7.2.2 | **Implement data deletion API**      | Process deletion requests                 | 1.2.10        | ✅ Done |
| 7.2.3 | **Create deletion request queue**    | Background processing for deletions       | 7.2.2         | ✅ Done |
| 7.2.4 | **Implement attestation revocation** | Revoke EAS attestations on deletion       | 7.2.3, 0.4.2  | ✅ Done |
| 7.2.5 | **Implement off-chain data cleanup** | Delete IPFS and backend stored data       | 7.2.3, 1.5.2  | ✅ Done |
| 7.2.6 | Create data deletion confirmation    | Confirm deletion to user                  | 7.2.4, 7.2.5  | ✅ Done |
| 7.2.7 | **Write privacy policy**             | Document data handling practices          | 0.5.6         | Pending |
| 7.2.8 | Create terms of service              | Legal terms for platform use              | 7.2.7         | Pending |
| 7.2.9 | Test GDPR compliance flow            | Verify export and deletion work correctly | 7.2.1-7.2.6   | ✅ Done |

### 7.3 Documentation

| ID    | Task                             | Description                      | Dependencies        | Status  |
| ----- | -------------------------------- | -------------------------------- | ------------------- | ------- |
| 7.3.1 | Create user documentation        | How-to guides for all features   | All previous phases | Pending |
| 7.3.2 | Create API documentation         | Developer API reference          | All previous phases | Pending |
| 7.3.3 | Create smart contract docs       | Contract interaction guides      | 1.3.1-1.3.5         | Pending |
| 7.3.4 | **Create privacy documentation** | Explain privacy options to users | 0.5.6, 4.4.1-4.4.8  | Pending |
| 7.3.5 | Create onboarding flow           | New user tutorial and setup      | 7.3.1               | Pending |
| 7.3.6 | Create FAQ section               | Common questions and answers     | 7.3.1-7.3.4         | Pending |

### 7.4 Infrastructure & Deployment (Staging/Testnet)

| ID    | Task                              | Description                   | Dependencies | Status  |
| ----- | --------------------------------- | ----------------------------- | ------------ | ------- |
| 7.4.1 | Set up staging infrastructure     | Railway, Vercel, database     | 7.1.6        | ✅ Done |
| 7.4.2 | Configure monitoring              | Logging, alerting, metrics    | 7.4.1        | ✅ Done |
| 7.4.3 | Set up CDN and caching            | Performance optimization      | 7.4.1        | Pending |
| 7.4.4 | Configure backup systems          | Database and data backups     | 7.4.1        | Pending |
| 7.4.5 | Create deployment runbook         | Step-by-step deployment guide | 7.4.1-7.4.4  | Pending |

### 7.5 Beta Launch Preparation

| ID    | Task                         | Description                        | Dependencies       | Status  |
| ----- | ---------------------------- | ---------------------------------- | ------------------ | ------- |
| 7.5.1 | Create launch checklist      | Pre-launch verification            | All previous tasks | Pending |
| 7.5.2 | Set up support channels      | Discord, email support             | 7.5.1              | Pending |
| 7.5.3 | Prepare beta program         | Invite-only beta access            | 7.5.1-7.5.2        | Pending |
| 7.5.4 | Execute beta launch          | Deploy to beta users on testnet    | 7.5.3              | Pending |
| 7.5.5 | Collect beta feedback        | Gather user feedback and issues    | 7.5.4              | Pending |
| 7.5.6 | Address beta feedback        | Fix issues from beta testing       | 7.5.5              | Pending |

**Deliverables for Phase 7:**

- [x] All tests passing with good coverage (7,670+ tests)
- [ ] Security audit completed and issues resolved
- [x] GDPR export/deletion fully implemented (287+ tests)
- [ ] Privacy policy and terms of service published
- [ ] Complete documentation published
- [x] Staging infrastructure operational (Railway + Vercel)
- [ ] Successful beta launch on testnet

---

## 10. Phase 8: Mainnet Deployment

**Goal:** Deploy all contracts and schemas to mainnet and execute public production launch.

### 8.1 EAS Mainnet Deployment

| ID    | Task                              | Description                            | Dependencies | Status  |
| ----- | --------------------------------- | -------------------------------------- | ------------ | ------- |
| 8.1.1 | Deploy EAS schemas to Base mainnet| Register all 6 schemas on mainnet      | 0.1.7, 7.5.6 | Pending |
| 8.1.2 | Deploy CaliberEASResolver         | Deploy resolver to mainnet             | 0.2.8, 8.1.1 | Pending |
| 8.1.3 | Verify mainnet deployments        | Verify contracts on Basescan           | 8.1.1, 8.1.2 | Pending |
| 8.1.4 | Update EAS UIDs in config         | Configure production schema UIDs       | 8.1.3        | Pending |

### 8.2 Smart Contract Mainnet Deployment

| ID    | Task                              | Description                            | Dependencies | Status  |
| ----- | --------------------------------- | -------------------------------------- | ------------ | ------- |
| 8.2.1 | Deploy CaliberRegistry            | Deploy registry contract to mainnet    | 1.3.7, 8.1.4 | Pending |
| 8.2.2 | Deploy CaliberToken               | Deploy $CALIBR token to mainnet        | 1.3.4, 8.2.1 | Pending |
| 8.2.3 | Deploy SuperforecasterBadges      | Deploy NFT badge contract              | 1.3.5, 8.2.1 | Pending |
| 8.2.4 | Deploy execution router           | Deploy cross-chain execution contract  | 5.3.1, 8.2.2 | Pending |
| 8.2.5 | Verify all contracts              | Verify on Basescan and Polygonscan     | 8.2.1-8.2.4  | Pending |

### 8.3 Production Infrastructure

| ID    | Task                              | Description                            | Dependencies | Status  |
| ----- | --------------------------------- | -------------------------------------- | ------------ | ------- |
| 8.3.1 | Provision production database     | Set up production PostgreSQL           | 7.4.1        | Pending |
| 8.3.2 | Configure production Redis        | Production caching layer               | 7.4.1        | Pending |
| 8.3.3 | Set up production API             | Deploy API to production               | 8.3.1, 8.3.2 | Pending |
| 8.3.4 | Configure production frontend     | Deploy frontend to production          | 8.3.3        | Pending |
| 8.3.5 | Configure mainnet RPC endpoints   | Set up production RPC providers        | 8.2.5        | Pending |
| 8.3.6 | Enable production monitoring      | Activate alerting for production       | 8.3.3, 8.3.4 | Pending |

### 8.4 Public Launch

| ID    | Task                              | Description                            | Dependencies | Status  |
| ----- | --------------------------------- | -------------------------------------- | ------------ | ------- |
| 8.4.1 | Final security review             | Production security checklist          | 8.2.5, 8.3.6 | Pending |
| 8.4.2 | Migrate beta users                | Migrate data from testnet to mainnet   | 8.4.1        | Pending |
| 8.4.3 | Prepare launch materials          | Announcements, social media            | 8.4.1        | Pending |
| 8.4.4 | Execute soft launch               | Limited public access                  | 8.4.2, 8.4.3 | Pending |
| 8.4.5 | Monitor soft launch               | Watch for issues in production         | 8.4.4        | Pending |
| 8.4.6 | Execute public launch             | Full public launch                     | 8.4.5        | Pending |
| 8.4.7 | Post-launch monitoring            | Extended monitoring period             | 8.4.6        | Pending |

**Deliverables for Phase 8:**

- [ ] All EAS schemas deployed to Base mainnet
- [ ] All smart contracts deployed and verified
- [ ] Production infrastructure operational
- [ ] Successful public mainnet launch
- [ ] Post-launch stability confirmed

---

## Key Integration Points

### EAS Ecosystem Integration

- Optimism Collective: Import RetroFunding participation attestations
- Coinbase Verifications: Import Base wallet verification levels
- Gitcoin Passport: Import passport scores and stamps
- ENS: Display ENS names throughout platform

### Privacy Architecture

```
+-----------------------------------------------------------------------------+
|                          PRIVACY FLOW DIAGRAM                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  User creates forecast                                                      |
|         |                                                                   |
|         v                                                                   |
|  +------------------+                                                       |
|  | Check privacy    |                                                       |
|  | settings         |                                                       |
|  +--------+---------+                                                       |
|           |                                                                 |
|     +-----+-----+-----+                                                     |
|     |           |     |                                                     |
|     v           v     v                                                     |
|  +------+  +-------+ +--------+                                             |
|  |Public|  |Off-   | |Private |                                             |
|  |On-   |  |chain  | |Merkle  |                                             |
|  |chain |  |       | |Tree    |                                             |
|  +--+---+  +---+---+ +---+----+                                             |
|     |          |         |                                                  |
|     v          v         v                                                  |
|  +------+  +-------+ +--------+                                             |
|  | EAS  |  | IPFS/ | | EAS    |                                             |
|  |Base  |  |Backend| | (root) |                                             |
|  +------+  +-------+ +--------+                                             |
|                          |                                                  |
|                          v                                                  |
|                    +----------+                                             |
|                    | Selective|                                             |
|                    | Disclose |                                             |
|                    +----------+                                             |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Onchain Activity Generation

This EAS-first approach with privacy options generates significant onchain activity:

1. **Every public forecast** -> EAS attestation (high frequency)
2. **Private forecasts** -> Merkle root attestation (privacy-preserving)
3. **Identity verifications** -> EAS attestations (initial setup)
4. **Calibration score updates** -> EAS attestations (periodic)
5. **Badge promotions** -> EAS attestations + NFT mints
6. **Reputation imports** -> EAS attestations (periodic sync)
7. **Achievement unlocks** -> EAS attestations (event-driven)
8. **Cross-platform sharing** -> EAS attestations (user-initiated)

---

## Recommended Development Sequence

1. **Phase 0 is critical foundation** - All subsequent phases depend on EAS and privacy infrastructure
2. **Phase 1 builds core database** with privacy tables from day one
3. **Phase 4 privacy settings** should be implemented early to establish patterns
4. **Phase 6 leaderboards** must respect privacy settings from the start
5. **Phase 7 GDPR** ensures compliance before public launch

---

---

## Follow-Up Items

Items deferred or partially completed that should be revisited in future iterations.

### Limitless Integration Notes (Completed Jan 2026)

The following Limitless integration work was completed as off-plan tasks:

| Item | Description | Status | Notes |
| ---- | ----------- | ------ | ----- |
| API Client | REST client with rate limiting & caching | ✅ Done | `api-client.ts` - 100 req/min, 30s cache |
| Market Adapter | Data adapter with unified types | ✅ Done | `adapter.ts` - supports AMM/CLOB/GROUP |
| CLOB Price Fix | Correct price interpretation | ✅ Done | CLOB uses `prices[0]` for YES probability |
| Trading Adapter | EIP-712 signed order placement | ✅ Done | `trading/limitless/adapter.ts` |
| API Authentication | Message signing → login → cookie | ✅ Done | Session valid ~30 days |
| Direct AMM Trading | FPMM buy/sell without API | ✅ Done | `buyFromAMM()`, `sellToAMM()` |
| Direct CTF Operations | Split/merge/redeem positions | ✅ Done | Works for both AMM and CLOB markets |
| Trading Panel UI | Frontend trade execution | ✅ Done | AMM instant fill, CLOB redirects to Limitless |

**Limitless Contract Addresses (Base Mainnet):**
- CTF Contract: `0xC9c98965297Bc527861c898329Ee280632B76e18`
- CTF Exchange: `0x05c748E2f4DcDe0ec9Fa8DDc40DE6b867f923fa5`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

**API Endpoints Used:**
- `POST /auth/login` - Authentication with wallet signature
- `POST /orders` - Submit CLOB orders
- `DELETE /orders/{id}` - Cancel orders
- `GET /portfolio/positions` - Fetch user positions
- `GET /markets/active` - Fetch active markets

### Platform Integrations

| Item | Description | Status | Notes |
| ---- | ----------- | ------ | ----- |
| Predict.fun Full Integration | Blast L2 prediction market | Partial | Adapter created but no REST API available; requires custom indexer to read from smart contracts. Currently skipped. |
| Polymarket Sync | Polygon CLOB integration | Pending | Sync service exists but rate limiting issues need resolution |

### Frontend Improvements

| Item | Description | Status | Notes |
| ---- | ----------- | ------ | ----- |
| Frontend Guidelines Alignment | Update UI to match `frontend-guidelines-v5` spec | Partial | Basic terminal aesthetic implemented; detailed dashboard layout from spec not fully implemented |
| Connection Error Handling | Browser extension interference (MetaMask SES) | Workaround | Added Next.js proxy to avoid CORS; may need further investigation for production |

### Sync Service Enhancements

| Item | Description | Status | Notes |
| ---- | ----------- | ------ | ----- |
| Opinion API Key | Add API key support for higher rate limits | Pending | Currently using public endpoints |
| Manifold Market Limits | Sync more markets from Manifold | Pending | Currently limited to top 500 by volume |

---

_This document represents the complete development roadmap for Calibr.xyz's prediction market aggregation platform with EAS-integrated identity, privacy-preserving attestations, and GDPR compliance._

_Version 5.3 | February 2026_
