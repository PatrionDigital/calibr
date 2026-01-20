# Calibr.ly API

## Stack
- Hono (lightweight web framework)
- Prisma (PostgreSQL ORM)
- Redis (caching via ioredis)
- Zod (validation)

## Architecture
This package provides the backend API services for Calibr.ly:
- API Gateway with request routing and rate limiting
- Aggregator Service for market syncing and matching
- Portfolio Service for position tracking and P&L
- Execution Service for trade routing
- EAS Attestation Service for on-chain identity

## Database
- Uses Prisma with PostgreSQL (Supabase)
- Schema defined in prisma/schema.prisma
- Run migrations: `pnpm prisma migrate dev`

## Key Endpoints
- `/api/markets` - Market aggregation
- `/api/portfolio` - Position tracking
- `/api/forecasts` - Forecast journaling
- `/api/attestations` - EAS integration

## Environment Variables
See root .env.example for required variables:
- DATABASE_URL
- REDIS_URL
- BASE_RPC_URL

## Development
```bash
pnpm dev      # Start with hot reload
pnpm build    # Build for production
pnpm test     # Run tests
```

## Testing
Uses Vitest for unit and integration tests.
