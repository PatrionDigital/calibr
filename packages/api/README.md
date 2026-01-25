# Calibr.xyz API

Backend API services for the Calibr.xyz prediction market portfolio manager.

## Base URL

```
http://localhost:3001
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Health Check

### GET `/health`

Check API and service health status.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "scheduler": true
  },
  "timestamp": "2025-01-22T12:00:00.000Z"
}
```

---

## Markets API

Base path: `/api/markets`

### GET `/api/markets`

List markets with optional filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results (max 100) |
| `offset` | number | 0 | Pagination offset |
| `category` | string | - | Filter by category |
| `search` | string | - | Search in question text |
| `active` | boolean | true | Only active markets |

**Response:**
```json
{
  "success": true,
  "data": {
    "markets": [...],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### GET `/api/markets/:id`

Get a single market by ID with full details including platform markets and recent forecasts.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "question": "Will X happen?",
    "description": "...",
    "bestYesPrice": 0.65,
    "bestNoPrice": 0.35,
    "platformMarkets": [...],
    "forecasts": [...]
  }
}
```

### GET `/api/markets/:id/prices`

Get price history for a market.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max snapshots (max 1000) |
| `platform` | string | - | Filter by platform slug |

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "timestamp": "2025-01-22T12:00:00.000Z",
        "yesPrice": 0.65,
        "noPrice": 0.35,
        "volume": 1000,
        "liquidity": 50000,
        "platform": "limitless"
      }
    ]
  }
}
```

### GET `/api/markets/search`

Search markets by query.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars) |

**Response:**
```json
{
  "success": true,
  "data": {
    "markets": [
      {
        "id": "...",
        "question": "...",
        "slug": "...",
        "category": "POLITICS",
        "bestYesPrice": 0.65,
        "totalVolume": 50000
      }
    ]
  }
}
```

### GET `/api/markets/platforms`

List available platforms with market counts.

**Response:**
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "id": "...",
        "name": "Limitless",
        "slug": "limitless",
        "displayName": "Limitless Exchange",
        "supportsTrades": true,
        "supportsRealTime": true,
        "healthStatus": "HEALTHY",
        "activeMarkets": 150
      }
    ]
  }
}
```

### GET `/api/markets/categories`

List market categories with counts.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "category": "POLITICS", "count": 45 },
      { "category": "SPORTS", "count": 30 }
    ]
  }
}
```

---

## Sync API

Base path: `/api/sync`

### GET `/api/sync/status`

Get current sync scheduler status.

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduler": {
      "isRunning": true,
      "marketSyncRunning": false,
      "priceSyncRunning": false,
      "lastMarketSync": "2025-01-22T12:00:00.000Z",
      "lastPriceSync": "2025-01-22T12:05:00.000Z",
      "marketSyncCount": 15,
      "priceSyncCount": 150,
      "errors": []
    },
    "health": { ... }
  }
}
```

### POST `/api/sync/start`

Start the sync scheduler.

**Response:**
```json
{
  "success": true,
  "message": "Sync scheduler started",
  "data": { ... }
}
```

### POST `/api/sync/stop`

Stop the sync scheduler.

**Response:**
```json
{
  "success": true,
  "message": "Sync scheduler stopped",
  "data": { ... }
}
```

### POST `/api/sync/markets`

Trigger manual market sync (fire and forget).

**Response (202):**
```json
{
  "success": true,
  "message": "Market sync started",
  "data": {
    "status": "running",
    "checkStatusAt": "/api/sync/status"
  }
}
```

### POST `/api/sync/markets/await`

Trigger manual market sync and wait for completion.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "marketsCreated": 5,
    "marketsUpdated": 120
  }
}
```

### POST `/api/sync/prices`

Trigger manual price sync.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "pricesUpdated": 150
  }
}
```

### GET `/api/sync/stats`

Get sync statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMarkets": 200,
    "activeMarkets": 150,
    "lastSync": "2025-01-22T12:00:00.000Z",
    "recentErrors": 0
  }
}
```

### GET `/api/sync/health`

Health check for sync services.

**Response (200/503):**
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "details": {
      "polymarketApi": true,
      "database": true
    }
  }
}
```

### GET `/api/sync/errors`

Get recent sync errors.

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "timestamp": "2025-01-22T12:00:00.000Z",
        "type": "MARKET_SYNC",
        "message": "Error message"
      }
    ],
    "total": 1
  }
}
```

### PUT `/api/sync/config`

Update scheduler configuration.

**Request Body:**
```json
{
  "marketSyncInterval": 300000,
  "priceSyncInterval": 60000,
  "syncOnStartup": true
}
```

**Constraints:**
- `marketSyncInterval`: minimum 10000ms (10s)
- `priceSyncInterval`: minimum 5000ms (5s)

---

## Portfolio API

Base path: `/api/portfolio`

### GET `/api/portfolio/summary`

Get portfolio summary for a user or wallet.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wallet` | string | * | Wallet address |
| `userId` | string | * | User ID |

*One of `wallet` or `userId` is required.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 1500.50,
    "totalCost": 1200.00,
    "unrealizedPnl": 300.50,
    "unrealizedPnlPct": 25.04,
    "positionCount": 5,
    "positions": [
      {
        "id": "...",
        "platform": "LIMITLESS",
        "platformName": "Limitless Exchange",
        "marketId": "...",
        "marketQuestion": "Will X happen?",
        "marketSlug": "will-x-happen",
        "outcome": "YES",
        "shares": 100,
        "avgCostBasis": 0.50,
        "currentPrice": 0.65,
        "currentValue": 65.00,
        "unrealizedPnl": 15.00,
        "unrealizedPnlPct": 30.00,
        "isResolved": false,
        "resolution": null,
        "updatedAt": "2025-01-22T12:00:00.000Z"
      }
    ],
    "byPlatform": {
      "LIMITLESS": { "value": 1000, "cost": 800, "count": 3 },
      "POLYMARKET": { "value": 500, "cost": 400, "count": 2 }
    },
    "byOutcome": {
      "YES": 1000,
      "NO": 400,
      "OTHER": 100.50
    }
  }
}
```

### GET `/api/portfolio/positions`

List all positions with optional filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `wallet` | string | - | Wallet address |
| `userId` | string | - | User ID |
| `platform` | string | - | Filter by platform |
| `active` | boolean | true | Only active markets |

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [...]
  }
}
```

### POST `/api/portfolio/positions`

Add or update a position (manual entry).

**Request Body:**
```json
{
  "userId": "...",
  "walletAddress": "0x...",
  "platform": "limitless",
  "marketExternalId": "abc123",
  "outcome": "YES",
  "shares": 100,
  "avgCostBasis": 0.50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "position": { ... }
  }
}
```

### DELETE `/api/portfolio/positions/:id`

Delete a position.

**Response:**
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

### GET `/api/portfolio/alerts`

Get resolution alerts for recently resolved markets in user's portfolio.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wallet` | string | * | Wallet address |
| `userId` | string | * | User ID |
| `days` | number | No | Days to look back (default: 7) |

*One of `wallet` or `userId` is required.

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "...",
        "type": "RESOLUTION",
        "marketQuestion": "Will X happen by Y?",
        "marketSlug": "will-x-happen",
        "platform": "LIMITLESS",
        "platformName": "Limitless Exchange",
        "outcome": "YES",
        "resolution": "YES",
        "isWinner": true,
        "shares": 100,
        "avgCostBasis": 0.50,
        "payout": 100,
        "realizedPnl": 50.00,
        "realizedPnlPct": 100.00,
        "resolvedAt": "2025-01-22T12:00:00.000Z"
      }
    ],
    "count": 1,
    "wins": 1,
    "losses": 0,
    "totalRealizedPnl": 50.00
  }
}
```

### POST `/api/portfolio/connect-wallet`

Connect a wallet address to track positions.

**Request Body:**
```json
{
  "address": "0x...",
  "label": "My Wallet"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "...",
      "address": "0x...",
      "label": "My Wallet",
      "userId": "..."
    }
  }
}
```

### GET `/api/portfolio/wallets`

Get connected wallets for a user.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "...",
        "address": "0x...",
        "label": "My Wallet",
        "chainId": 8453,
        "lastSyncAt": "2025-01-22T12:00:00.000Z",
        "syncStatus": "SYNCED"
      }
    ]
  }
}
```

---

## Trading API

Base path: `/api/trading`

### Authentication

Most trading endpoints require authentication via session token.

**Header:**
```
Authorization: Bearer <sessionId>
```

### POST `/api/trading/auth`

Authenticate with a trading platform.

**Request Body:**
```json
{
  "platform": "POLYMARKET",
  "credentials": {
    "apiKey": "...",
    "apiSecret": "...",
    "passphrase": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "POLYMARKET_1234567890_abc123",
    "platform": "POLYMARKET",
    "address": "0x...",
    "authMethod": "api_key",
    "expiresAt": "2025-01-23T12:00:00.000Z"
  }
}
```

### POST `/api/trading/logout`

End trading session.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/api/trading/status`

Get current trading session status.

**Headers:** Authorization optional

**Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "platform": "POLYMARKET",
    "address": "0x...",
    "isReady": true,
    "sessionAge": 3600000
  }
}
```

### GET `/api/trading/balances`

Get account balances.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "asset": "USDC",
        "available": 1000.00,
        "locked": 50.00
      }
    ]
  }
}
```

### GET `/api/trading/positions`

Get all positions.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [...]
  }
}
```

### GET `/api/trading/positions/:marketId`

Get position for a specific market.

**Headers:** Authorization required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outcome` | `YES` \| `NO` | Specific outcome |

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [...]
  }
}
```

### POST `/api/trading/orders`

Place a new order.

**Headers:** Authorization required

**Request Body:**
```json
{
  "marketId": "...",
  "outcome": "YES",
  "side": "BUY",
  "type": "LIMIT",
  "size": 100,
  "price": 0.50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "...",
      "marketId": "...",
      "status": "OPEN",
      ...
    }
  }
}
```

### GET `/api/trading/orders`

Get open orders.

**Headers:** Authorization required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Filter by market |

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [...]
  }
}
```

### GET `/api/trading/orders/:orderId`

Get a specific order.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "order": { ... }
  }
}
```

### DELETE `/api/trading/orders/:orderId`

Cancel an order.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled"
}
```

### DELETE `/api/trading/orders`

Cancel all orders (optionally for a specific market).

**Headers:** Authorization required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Cancel only for this market |

**Response:**
```json
{
  "success": true,
  "data": {
    "cancelledCount": 5,
    "marketId": "all"
  }
}
```

### GET `/api/trading/trades`

Get trade history.

**Headers:** Authorization required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Filter by market |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [...]
  }
}
```

### GET `/api/trading/price/:marketId`

Get best price for trading.

**Headers:** Authorization required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `outcome` | `YES` \| `NO` | `YES` | Outcome to price |
| `side` | `BUY` \| `SELL` | `BUY` | Order side |

**Response:**
```json
{
  "success": true,
  "data": {
    "marketId": "...",
    "outcome": "YES",
    "side": "BUY",
    "price": 0.65
  }
}
```

### GET `/api/trading/platforms`

List available trading platforms.

**Response:**
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "id": "POLYMARKET",
        "name": "Polymarket",
        "status": "available",
        "features": ["limit_orders", "market_orders", "gasless"],
        "requiresAuth": true,
        "authMethods": ["api_key", "wallet_signature"],
        "chain": "polygon"
      },
      {
        "id": "LIMITLESS",
        "name": "Limitless",
        "status": "available",
        "features": ["limit_orders", "gtc", "fok"],
        "requiresAuth": true,
        "authMethods": ["wallet_signature"],
        "chain": "base"
      }
    ]
  }
}
```

### POST `/api/trading/scan`

Scan a wallet address for positions (no auth required).

**Request Body:**
```json
{
  "address": "0x...",
  "platforms": ["LIMITLESS", "POLYMARKET"],
  "includeResolved": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "positions": [
      {
        "platform": "LIMITLESS",
        "marketId": "...",
        "marketSlug": "...",
        "marketQuestion": "Will X happen?",
        "outcome": "YES",
        "outcomeLabel": "Yes",
        "balance": 100,
        "currentPrice": 0.65,
        "estimatedValue": 65.00,
        "chainId": 8453
      }
    ],
    "totalValue": 1500.00,
    "scanTimestamp": "2025-01-22T12:00:00.000Z"
  }
}
```

### GET `/api/trading/scan/:address`

Quick scan for a wallet address.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `platforms` | string | Comma-separated: `LIMITLESS,POLYMARKET` |
| `includeResolved` | boolean | Include resolved markets |

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "positionCount": 5,
    "totalValue": 1500.00,
    "byPlatform": {
      "LIMITLESS": 3,
      "POLYMARKET": 2
    },
    "positions": [...],
    "scanTimestamp": "2025-01-22T12:00:00.000Z"
  }
}
```

---

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Operation already in progress |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Health check failed |

---

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Database migrations
pnpm prisma migrate dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BASE_RPC_URL=https://mainnet.base.org
POLYGON_RPC_URL=https://polygon-rpc.com
AUTO_START_SYNC=true
PORT=3001
```
