# Calibr.xyz API Reference

## Base URL

```
Production: https://api.calibr.xyz
Development: http://localhost:3001
```

## Authentication

Currently using header-based user identification:

```
x-user-id: <user-id>
```

## Endpoints

### Health Check

```
GET /health
```

Returns API health status and component checks.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "scheduler": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Markets

### List Markets

```
GET /api/markets
```

Returns aggregated markets from all platforms.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max results (1-100) |
| offset | number | 0 | Pagination offset |
| category | string | - | Filter by category |
| platform | string | - | Filter by platform |
| isActive | boolean | true | Active markets only |

**Response:**
```json
{
  "success": true,
  "data": {
    "markets": [
      {
        "id": "unified-market-id",
        "question": "Will event X happen?",
        "category": "politics",
        "platforms": ["polymarket", "kalshi"],
        "bestYesPrice": 0.65,
        "bestNoPrice": 0.35,
        "totalVolume": 150000,
        "isActive": true,
        "endDate": "2024-12-31T23:59:59.000Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Market Details

```
GET /api/markets/:id
```

Returns detailed market information including platform-specific data.

---

## Forecasts

### List User Forecasts

```
GET /api/forecasts
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Max results (1-100) |
| offset | number | 0 | Pagination offset |
| marketId | string | - | Filter by market |
| includePrivate | boolean | false | Include private forecasts |

**Response:**
```json
{
  "success": true,
  "data": {
    "forecasts": [
      {
        "id": "forecast-id",
        "probability": 0.75,
        "confidence": 0.8,
        "commitMessage": "Based on recent polling data",
        "isPublic": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "unifiedMarket": {
          "id": "market-id",
          "question": "Will candidate X win?",
          "bestYesPrice": 0.60
        },
        "calculated": {
          "edge": 0.15,
          "edgePercentage": 25.0,
          "hasPositiveEdge": true
        }
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### Create Forecast

```
POST /api/forecasts
```

**Request Body:**
```json
{
  "unifiedMarketId": "market-id",
  "probability": 0.75,
  "confidence": 0.8,
  "commitMessage": "Based on recent polling data",
  "isPublic": true,
  "kellyFraction": 0.5,
  "executeRebalance": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| unifiedMarketId | string | Yes | Target market ID |
| probability | number | Yes | Forecast probability (0.01-0.99) |
| confidence | number | No | Confidence level (0-1), default 0.5 |
| commitMessage | string | No | Reasoning (max 1000 chars) |
| isPublic | boolean | No | Public visibility, default true |
| kellyFraction | number | No | Kelly multiplier (0-1), default 0.5 |
| executeRebalance | boolean | No | Auto-rebalance portfolio |

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast": {
      "id": "new-forecast-id",
      "probability": 0.75,
      "confidence": 0.8,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "calculated": {
      "edge": 0.15,
      "edgePercentage": 25.0,
      "hasPositiveEdge": true,
      "recommendedSize": 0.15,
      "isUpdate": false
    }
  }
}
```

### Delete Forecast

```
DELETE /api/forecasts/:id
```

Deletes a forecast. Cannot delete attested forecasts.

---

## EAS Attestations

### Get Attestation Data

```
GET /api/forecasts/:id/attest
```

Returns data needed for client-side EAS attestation.

**Response:**
```json
{
  "success": true,
  "data": {
    "forecastId": "forecast-id",
    "isAttested": false,
    "attestationData": {
      "schema": "CalibrForecast",
      "schemaString": "uint256 probability,string marketId,...",
      "fields": {
        "probability": 7500,
        "marketId": "market-id",
        "platform": "calibr",
        "confidence": 8000,
        "reasoning": "Based on polling",
        "isPublic": true
      }
    }
  }
}
```

### Record Attestation

```
POST /api/forecasts/:id/attest
```

Records an EAS attestation after client-side creation.

**Request Body:**
```json
{
  "attestationUid": "0x...",
  "txHash": "0x...",
  "chainId": 8453,
  "schemaUid": "0x..."
}
```

---

## Portfolio

### Get Portfolio Summary

```
GET /api/portfolio
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 1500.00,
    "totalPnl": 250.00,
    "unrealizedPnl": 75.00,
    "positions": [
      {
        "id": "position-id",
        "platform": "polymarket",
        "marketQuestion": "Will X happen?",
        "outcome": "YES",
        "shares": 100,
        "avgCostBasis": 0.60,
        "currentValue": 75.00,
        "unrealizedPnl": 15.00
      }
    ]
  }
}
```

---

## GDPR Compliance

### Export User Data

```
GET /api/gdpr/export
```

Exports all user data in JSON format (GDPR Article 20).

**Response:**
```json
{
  "success": true,
  "data": {
    "exportedAt": "2024-01-15T10:30:00.000Z",
    "exportVersion": "1.0.0",
    "user": {
      "id": "user-id",
      "displayName": "Username",
      "email": "user@example.com"
    },
    "forecasts": [...],
    "positions": [...],
    "transactions": [...],
    "attestations": [...]
  }
}
```

### Download Export

```
GET /api/gdpr/export/download
```

Downloads export as a JSON file attachment.

### Create Deletion Request

```
POST /api/gdpr/delete-requests
```

Creates a data deletion request (GDPR Article 17).

**Request Body:**
```json
{
  "requestType": "FULL_ACCOUNT",
  "reason": "Optional reason"
}
```

| Request Type | Description |
|--------------|-------------|
| FULL_ACCOUNT | Delete all data and account |
| FORECASTS_ONLY | Delete forecasts, keep account |
| PII_ONLY | Remove personal info, keep forecasts |

**Response:**
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "request-id",
      "requestType": "FULL_ACCOUNT",
      "status": "PENDING"
    },
    "plan": {
      "steps": [
        {"order": 1, "name": "revoke_attestations"},
        {"order": 2, "name": "delete_forecasts"}
      ],
      "estimatedItems": {
        "forecasts": 45,
        "positions": 12,
        "attestations": 8
      }
    },
    "timeEstimate": {
      "minMinutes": 5,
      "maxMinutes": 15,
      "description": "A few minutes"
    }
  }
}
```

### Cancel Deletion Request

```
DELETE /api/gdpr/delete-requests/:id
```

Cancels a pending deletion request.

---

## Leaderboard

### Get Leaderboard

```
GET /api/leaderboard
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max results |
| timeframe | string | all | all, week, month, year |
| tier | string | - | Filter by tier |

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "userId": "user-id",
        "displayName": "TopForecaster",
        "tier": "GRANDMASTER",
        "brierScore": 0.08,
        "totalForecasts": 500,
        "resolvedForecasts": 450,
        "streak": 25
      }
    ],
    "total": 1000
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Optional", "detailed", "errors"]
}
```

**Common Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict - Resource state conflict |
| 500 | Internal Server Error |
