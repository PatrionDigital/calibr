# Calibr.xyz Core

## Purpose
Shared business logic and utilities used across all Calibr.xyz packages.

## Structure
```
src/
├── types/       # TypeScript type definitions
│   └── index.ts # UnifiedMarket, Position, Forecast, etc.
├── utils/       # Utility functions
│   └── index.ts # Kelly calculator, Brier score, etc.
└── index.ts     # Main exports
```

## Key Types
- `UnifiedMarket` - Aggregated market from multiple platforms
- `Position` - User position across platforms
- `Forecast` - Forecast journal entry with EAS reference
- `CalibrationScore` - User's Brier score and calibration data

## Key Utilities
- `calculateKelly()` - Kelly Criterion position sizing
- `calculateBrierScore()` - Brier score calculation
- `calculateTimeWeightedBrier()` - Time-weighted scoring
- `calculateCalibration()` - Calibration curve generation

## Usage
```typescript
import { UnifiedMarket, Position } from "@calibr/core/types";
import { calculateKelly, calculateBrierScore } from "@calibr/core/utils";
```

## Exports
This package uses subpath exports:
- `@calibr/core` - Main entry
- `@calibr/core/types` - Type definitions
- `@calibr/core/utils` - Utility functions

## Development
```bash
pnpm dev      # Watch mode
pnpm build    # Build with tsup
pnpm test     # Run Vitest tests
```
