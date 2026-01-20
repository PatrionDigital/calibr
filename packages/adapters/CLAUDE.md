# Calibr.ly Adapters

## Purpose
Platform integrations for prediction market data sources.

## Supported Platforms

### Polymarket (Primary)
- **Read Access**: Gamma API, CLOB API, WebSocket feeds
- **Write Access**: Builder Program integration (gasless trading)
- **Package**: `@polymarket/clob-client`

### Kalshi (Planned)
- **Read Access**: REST API for markets and prices
- **Write Access**: API key-based trading (KYC required)

### IEM (Planned)
- **Read Access**: HTML scraping (no API)
- **Write Access**: Link-out only

### Metaculus (Planned)
- **Read Access**: REST API for questions and forecasts
- **Write Access**: None (reference data only)

## Structure
```
src/
├── index.ts           # Main exports
├── polymarket/
│   └── index.ts       # Polymarket adapter
├── kalshi/            # (Planned)
├── iem/               # (Planned)
└── metaculus/         # (Planned)
```

## Polymarket Integration
```typescript
import { PolymarketAdapter } from "@calibr/adapters/polymarket";

const adapter = new PolymarketAdapter(config);
const markets = await adapter.getMarkets();
const orderbook = await adapter.getOrderbook(marketId);
```

## Key Responsibilities
- Fetch markets from each platform
- Transform to unified market format
- Handle rate limiting and caching
- Manage authentication per platform

## Development
```bash
pnpm dev      # Watch mode
pnpm build    # Build with tsup
pnpm test     # Run integration tests
```

## Testing
Integration tests should use mocked API responses.
Set `POLYMARKET_API_KEY` for live testing.
