/**
 * Polymarket Trading Configuration
 * Contract addresses and network settings for Polymarket trading
 */

import type { PolymarketTradingConfig } from '../types';

// Polygon Mainnet configuration
export const POLYGON_MAINNET_CONFIG: PolymarketTradingConfig = {
  chainId: 137,
  rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  clobUrl: 'https://clob.polymarket.com',
  relayerUrl: 'https://relayer.polymarket.com',
  // CTF Exchange (Conditional Token Framework)
  exchangeAddress: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  // Neg Risk Exchange for multi-outcome markets
  negRiskExchangeAddress: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  // Neg Risk Adapter
  negRiskAdapterAddress: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  // USDC on Polygon
  collateralToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  // Conditional Tokens contract
  conditionalTokensAddress: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
};

// Polygon Mumbai Testnet configuration (if available)
export const POLYGON_TESTNET_CONFIG: PolymarketTradingConfig = {
  chainId: 80001,
  rpcUrl: process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
  clobUrl: 'https://clob-staging.polymarket.com',
  relayerUrl: 'https://relayer-staging.polymarket.com',
  // These are placeholder addresses - Polymarket doesn't have public testnet
  exchangeAddress: '0x0000000000000000000000000000000000000000',
  negRiskExchangeAddress: '0x0000000000000000000000000000000000000000',
  negRiskAdapterAddress: '0x0000000000000000000000000000000000000000',
  collateralToken: '0x0000000000000000000000000000000000000000',
  conditionalTokensAddress: '0x0000000000000000000000000000000000000000',
};

// Safe/Proxy related addresses
export const POLYMARKET_ADDRESSES = {
  // Polymarket Proxy Factory
  proxyFactory: '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052',
  // Polymarket Safe Module
  safeModule: '0x97061b4c6E73e5F18Bf52b9a4e9F0b3bD56A0C7e',
  // USDC Token on Polygon
  usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  // USDC.e (bridged) on Polygon
  usdce: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};

// API endpoints
export const POLYMARKET_API = {
  gamma: 'https://gamma-api.polymarket.com',
  clob: 'https://clob.polymarket.com',
  relayer: 'https://relayer.polymarket.com',
  strapi: 'https://strapi-matic.poly.market',
};

// Order types and constants
export const ORDER_CONSTANTS = {
  // Minimum order size in USDC
  minOrderSize: 1,
  // Maximum order size in USDC
  maxOrderSize: 1_000_000,
  // Price tick size (0.001 = 0.1%)
  priceTick: 0.001,
  // Minimum price
  minPrice: 0.001,
  // Maximum price
  maxPrice: 0.999,
  // Default order expiration (30 days in seconds)
  defaultExpiration: 30 * 24 * 60 * 60,
  // Fee rate (typically 0% for makers, varies for takers)
  makerFeeRate: 0,
  takerFeeRate: 0.02, // 2%
};

// Signature type constants
export const SIGNATURE_TYPES = {
  EOA: 0,
  POLY_PROXY: 1,
  POLY_GNOSIS_SAFE: 2,
} as const;

/**
 * Get configuration for a specific chain
 */
export function getPolymarketConfig(chainId: number): PolymarketTradingConfig {
  switch (chainId) {
    case 137:
      return POLYGON_MAINNET_CONFIG;
    case 80001:
      return POLYGON_TESTNET_CONFIG;
    default:
      throw new Error(`Unsupported chain ID for Polymarket: ${chainId}`);
  }
}

/**
 * Validate order parameters
 */
export function validateOrderParams(
  size: number,
  price: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (size < ORDER_CONSTANTS.minOrderSize) {
    errors.push(`Order size must be at least ${ORDER_CONSTANTS.minOrderSize} USDC`);
  }

  if (size > ORDER_CONSTANTS.maxOrderSize) {
    errors.push(`Order size must be at most ${ORDER_CONSTANTS.maxOrderSize} USDC`);
  }

  if (price < ORDER_CONSTANTS.minPrice) {
    errors.push(`Price must be at least ${ORDER_CONSTANTS.minPrice}`);
  }

  if (price > ORDER_CONSTANTS.maxPrice) {
    errors.push(`Price must be at most ${ORDER_CONSTANTS.maxPrice}`);
  }

  // Check price tick alignment
  const ticks = Math.round(price / ORDER_CONSTANTS.priceTick);
  const alignedPrice = ticks * ORDER_CONSTANTS.priceTick;
  if (Math.abs(price - alignedPrice) > 0.0001) {
    errors.push(`Price must be aligned to ${ORDER_CONSTANTS.priceTick} tick size`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
