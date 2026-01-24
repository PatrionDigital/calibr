# Calibr.xyz Adapters

## Purpose
Platform integrations for prediction market data sources.

## Supported Platforms

### Polymarket (Active)
- **Chain**: Polygon (137)
- **Read Access**: Gamma API, CLOB API, WebSocket feeds
- **Write Access**: Builder Program integration (gasless trading)
- **Package**: `@polymarket/clob-client`

### Limitless (Active)
- **Chain**: Base (8453)
- **Read Access**: REST API (`https://api.limitless.exchange/api-v1`)
- **Write Access**: EIP-712 signed orders, CLOB trading
- **Features**: Multi-collateral support (USDC, ETH, BTC, ERC-20)
- **Order Types**: GTC (Good Till Cancelled), FOK (Fill or Kill)

### Opinion / O.LAB (Active)
- **Chain**: BNB Chain (56)
- **Read Access**: REST API (`https://proxy.opinion.trade:8443/openapi`)
- **Auth**: API key in `apikey` header
- **Features**: AI-powered macro event markets (inflation, Fed, elections)
- **Rate Limit**: 15 req/sec

### Predict.fun (Partial)
- **Chain**: Blast L2 (81457)
- **Read Access**: Direct smart contract interaction
- **Contracts**: Uses Polymarket CTF protocol
- **Note**: No public REST API; requires indexer for full functionality

### Manifold (Active)
- **Chain**: None (play money)
- **Read Access**: REST API (`https://api.manifold.markets`)
- **Write Access**: API key authentication
- **Features**: User-created markets, AMM pricing
- **Rate Limit**: 500 req/min

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
├── types.ts           # Shared types (PlatformMarket, etc.)
├── polymarket/        # Polymarket data adapter
├── limitless/         # Limitless data adapter
├── trading/           # Trading adapters (ITradingAdapter)
│   ├── polymarket/    # Polymarket trading
│   └── limitless/     # Limitless trading
├── sync/              # Sync services
├── matching/          # Market matching
├── cache/             # Caching utilities
├── feeds/             # Price feeds
└── resolution/        # Resolution detection
```

## Polymarket Integration
```typescript
import { PolymarketAdapter } from "@calibr/adapters/polymarket";

const adapter = new PolymarketAdapter(config);
const markets = await adapter.getMarkets();
const orderbook = await adapter.getOrderbook(marketId);
```

## Limitless Integration
```typescript
import { LimitlessAdapter } from "@calibr/adapters/limitless";

const adapter = new LimitlessAdapter();
const markets = await adapter.getMarkets({ status: 'ACTIVE' });
const orderbook = await adapter.getOrderBook(marketSlug);
```

## Trading (Platform-Agnostic)
```typescript
import { getTradingAdapter } from "@calibr/adapters/trading";

// Get adapter for any supported platform
const adapter = getTradingAdapter('LIMITLESS');
await adapter.authenticate(credentials);
const order = await adapter.placeOrder({
  marketId: 'market-slug',
  outcome: 'YES',
  side: 'BUY',
  size: 10,
  price: 0.65,
  orderType: 'GTC',
});
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
