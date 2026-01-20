# Calibr.ly - Prediction Market Portfolio Manager

## Project Overview

Calibr.ly is a prediction market aggregation platform targeting hardcore forecasting
enthusiasts. It operates as both a portfolio manager and aggregation layer on Base L2
with cross-chain functionality to Polygon for Polymarket integration.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Fastify/Hono on Railway, Supabase (PostgreSQL), Redis
- **Blockchain**: Base L2, EAS (Ethereum Attestation Service), Foundry
- **Trading**: Polymarket CLOB client, Circle CCTP bridge

## Architecture

This is a pnpm monorepo with these packages:

- `/packages/web` - Next.js frontend
- `/packages/api` - Backend services
- `/packages/core` - Shared business logic
- `/packages/contracts` - Foundry smart contracts
- `/packages/adapters` - Platform integrations (Polymarket, etc.)

## Key Design Principles

1. **On-chain first** - Minimal off-chain databases, leverage EAS for identity
2. **Privacy by design** - Support public, off-chain, and Merkle tree attestations
3. **Terminal aesthetic** - DOS/BBS/ASCII visual identity (see Frontend Guidelines)
4. **Scientific rigor** - Brier scoring, calibration curves, Kelly Criterion

## Project Documents

Reference these files in /docs/spec/ for detailed specifications:

- `CALIBR_Project_Requirements_v5.md` - Full requirements
- `CALIBR_Project_Tasks_v5.md` - Development phases and tasks
- `CALIBR_Data_Schema_v5.md` - Database and EAS schemas
- `CALIBR_Frontend_Guidelines_v5.md` - UI/UX specifications
- `CALIBR_Tokenomics_Development_v4.md` - Token implementation

## Code Style

- TypeScript strict mode
- Use Zod for validation
- Prefer composition over inheritance
- Keep components small and focused
- Use IBM Plex Mono for all UI text

## Commands

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `forge test` - Run Foundry tests
- `forge build` - Build contracts

## Specifications

When implementing features, consult these documents:

- Requirements: `docs/specs/CALIBR_Project_Requirements_v5.md`
- Schema: `docs/specs/CALIBR_Data_Schema_v5.md`
- Frontend: `docs/specs/CALIBR_Frontend_Guidelines_v5.md`
- Tasks: `docs/specs/CALIBR_Project_Tasks_v5.md`
