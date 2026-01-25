# Calibr.xyz Frontend

## Stack

- Next.js 14 with App Router
- Tailwind CSS v4 with terminal color scheme
- shadcn/ui (customized for terminal aesthetic)
- Zustand for state management
- motion.dev + NumberFlow for animations

## Design System

- Terminal green (#00ff00) on black (#000000)
- IBM Plex Mono typography exclusively
- ASCII box-drawing characters for borders
- See /mnt/project/calibr-frontend-guidelines-v5-updated.md

## Key Components

- Use NumberFlow for all animated numbers (prices, P&L)
- Use react-financial-charts for market history
- Use d3 for calibration curves

## Animation Guidelines

- Smooth 60fps for NumberFlow
- Debounce WebSocket updates (100ms)
- Use motion.dev for page transitions
