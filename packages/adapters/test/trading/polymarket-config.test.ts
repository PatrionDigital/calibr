/**
 * Polymarket Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  POLYGON_MAINNET_CONFIG,
  POLYGON_TESTNET_CONFIG,
  POLYMARKET_ADDRESSES,
  POLYMARKET_API,
  ORDER_CONSTANTS,
  SIGNATURE_TYPES,
  getPolymarketConfig,
  validateOrderParams,
} from '../../src/trading/polymarket/config';

// =============================================================================
// Tests
// =============================================================================

describe('Polymarket Configuration', () => {
  // ---------------------------------------------------------------------------
  // Network Configurations
  // ---------------------------------------------------------------------------

  describe('POLYGON_MAINNET_CONFIG', () => {
    it('should have correct chain ID', () => {
      expect(POLYGON_MAINNET_CONFIG.chainId).toBe(137);
    });

    it('should have valid RPC URL', () => {
      expect(POLYGON_MAINNET_CONFIG.rpcUrl).toMatch(/^https?:\/\//);
    });

    it('should have valid CLOB URL', () => {
      expect(POLYGON_MAINNET_CONFIG.clobUrl).toBe('https://clob.polymarket.com');
    });

    it('should have valid relayer URL', () => {
      expect(POLYGON_MAINNET_CONFIG.relayerUrl).toBe('https://relayer.polymarket.com');
    });

    it('should have valid exchange address', () => {
      expect(POLYGON_MAINNET_CONFIG.exchangeAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid neg risk exchange address', () => {
      expect(POLYGON_MAINNET_CONFIG.negRiskExchangeAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid neg risk adapter address', () => {
      expect(POLYGON_MAINNET_CONFIG.negRiskAdapterAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid collateral token address', () => {
      expect(POLYGON_MAINNET_CONFIG.collateralToken).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid conditional tokens address', () => {
      expect(POLYGON_MAINNET_CONFIG.conditionalTokensAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('POLYGON_TESTNET_CONFIG', () => {
    it('should have Mumbai chain ID', () => {
      expect(POLYGON_TESTNET_CONFIG.chainId).toBe(80001);
    });

    it('should have staging CLOB URL', () => {
      expect(POLYGON_TESTNET_CONFIG.clobUrl).toContain('staging');
    });

    it('should have staging relayer URL', () => {
      expect(POLYGON_TESTNET_CONFIG.relayerUrl).toContain('staging');
    });
  });

  // ---------------------------------------------------------------------------
  // Polymarket Addresses
  // ---------------------------------------------------------------------------

  describe('POLYMARKET_ADDRESSES', () => {
    it('should have valid proxy factory address', () => {
      expect(POLYMARKET_ADDRESSES.proxyFactory).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid safe module address', () => {
      expect(POLYMARKET_ADDRESSES.safeModule).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid USDC address', () => {
      expect(POLYMARKET_ADDRESSES.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid USDC.e address', () => {
      expect(POLYMARKET_ADDRESSES.usdce).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have different addresses for USDC and USDC.e', () => {
      expect(POLYMARKET_ADDRESSES.usdc).not.toBe(POLYMARKET_ADDRESSES.usdce);
    });
  });

  // ---------------------------------------------------------------------------
  // API Endpoints
  // ---------------------------------------------------------------------------

  describe('POLYMARKET_API', () => {
    it('should have valid gamma API URL', () => {
      expect(POLYMARKET_API.gamma).toBe('https://gamma-api.polymarket.com');
    });

    it('should have valid CLOB API URL', () => {
      expect(POLYMARKET_API.clob).toBe('https://clob.polymarket.com');
    });

    it('should have valid relayer URL', () => {
      expect(POLYMARKET_API.relayer).toBe('https://relayer.polymarket.com');
    });

    it('should have valid strapi URL', () => {
      expect(POLYMARKET_API.strapi).toMatch(/^https?:\/\//);
    });
  });

  // ---------------------------------------------------------------------------
  // Order Constants
  // ---------------------------------------------------------------------------

  describe('ORDER_CONSTANTS', () => {
    it('should have minimum order size', () => {
      expect(ORDER_CONSTANTS.minOrderSize).toBe(1);
    });

    it('should have maximum order size', () => {
      expect(ORDER_CONSTANTS.maxOrderSize).toBe(1_000_000);
    });

    it('should have valid price tick', () => {
      expect(ORDER_CONSTANTS.priceTick).toBe(0.001);
    });

    it('should have minimum price', () => {
      expect(ORDER_CONSTANTS.minPrice).toBe(0.001);
    });

    it('should have maximum price', () => {
      expect(ORDER_CONSTANTS.maxPrice).toBe(0.999);
    });

    it('should have valid default expiration (30 days)', () => {
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      expect(ORDER_CONSTANTS.defaultExpiration).toBe(thirtyDaysInSeconds);
    });

    it('should have zero maker fee rate', () => {
      expect(ORDER_CONSTANTS.makerFeeRate).toBe(0);
    });

    it('should have 2% taker fee rate', () => {
      expect(ORDER_CONSTANTS.takerFeeRate).toBe(0.02);
    });

    it('should have min price less than max price', () => {
      expect(ORDER_CONSTANTS.minPrice).toBeLessThan(ORDER_CONSTANTS.maxPrice);
    });

    it('should have min order size less than max order size', () => {
      expect(ORDER_CONSTANTS.minOrderSize).toBeLessThan(
        ORDER_CONSTANTS.maxOrderSize
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Signature Types
  // ---------------------------------------------------------------------------

  describe('SIGNATURE_TYPES', () => {
    it('should have EOA signature type', () => {
      expect(SIGNATURE_TYPES.EOA).toBe(0);
    });

    it('should have POLY_PROXY signature type', () => {
      expect(SIGNATURE_TYPES.POLY_PROXY).toBe(1);
    });

    it('should have POLY_GNOSIS_SAFE signature type', () => {
      expect(SIGNATURE_TYPES.POLY_GNOSIS_SAFE).toBe(2);
    });

    it('should have unique values for each type', () => {
      const values = Object.values(SIGNATURE_TYPES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  // ---------------------------------------------------------------------------
  // getPolymarketConfig
  // ---------------------------------------------------------------------------

  describe('getPolymarketConfig', () => {
    it('should return mainnet config for chain 137', () => {
      const config = getPolymarketConfig(137);
      expect(config).toBe(POLYGON_MAINNET_CONFIG);
    });

    it('should return testnet config for chain 80001', () => {
      const config = getPolymarketConfig(80001);
      expect(config).toBe(POLYGON_TESTNET_CONFIG);
    });

    it('should throw for unsupported chain ID', () => {
      expect(() => getPolymarketConfig(1)).toThrow('Unsupported chain ID');
    });

    it('should throw for Ethereum mainnet', () => {
      expect(() => getPolymarketConfig(1)).toThrow('Unsupported chain ID for Polymarket: 1');
    });

    it('should throw for Base', () => {
      expect(() => getPolymarketConfig(8453)).toThrow('Unsupported chain ID for Polymarket: 8453');
    });
  });

  // ---------------------------------------------------------------------------
  // validateOrderParams
  // ---------------------------------------------------------------------------

  describe('validateOrderParams', () => {
    describe('Valid Orders', () => {
      it('should accept valid order at minimum size', () => {
        const result = validateOrderParams(1, 0.5);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid order at maximum size', () => {
        const result = validateOrderParams(1_000_000, 0.5);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid order at minimum price', () => {
        const result = validateOrderParams(100, 0.001);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid order at maximum price', () => {
        const result = validateOrderParams(100, 0.999);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept price aligned to tick', () => {
        const result = validateOrderParams(100, 0.123);
        expect(result.valid).toBe(true);
      });

      it('should accept common prices', () => {
        const prices = [0.1, 0.25, 0.5, 0.75, 0.9];
        for (const price of prices) {
          const result = validateOrderParams(100, price);
          expect(result.valid).toBe(true);
        }
      });
    });

    describe('Size Validation', () => {
      it('should reject order below minimum size', () => {
        const result = validateOrderParams(0.5, 0.5);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Order size must be at least'))).toBe(true);
      });

      it('should reject zero size', () => {
        const result = validateOrderParams(0, 0.5);
        expect(result.valid).toBe(false);
      });

      it('should reject order above maximum size', () => {
        const result = validateOrderParams(1_000_001, 0.5);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Order size must be at most'))).toBe(true);
      });

      it('should reject negative size', () => {
        const result = validateOrderParams(-100, 0.5);
        expect(result.valid).toBe(false);
      });
    });

    describe('Price Validation', () => {
      it('should reject price below minimum', () => {
        const result = validateOrderParams(100, 0.0001);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Price must be at least'))).toBe(true);
      });

      it('should reject zero price', () => {
        const result = validateOrderParams(100, 0);
        expect(result.valid).toBe(false);
      });

      it('should reject price above maximum', () => {
        const result = validateOrderParams(100, 1);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Price must be at most'))).toBe(true);
      });

      it('should reject negative price', () => {
        const result = validateOrderParams(100, -0.5);
        expect(result.valid).toBe(false);
      });

      it('should reject price not aligned to tick', () => {
        const result = validateOrderParams(100, 0.1234);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Price must be aligned'))).toBe(true);
      });
    });

    describe('Multiple Errors', () => {
      it('should return all errors for invalid order', () => {
        const result = validateOrderParams(0.5, 1.5);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      it('should include size and price errors', () => {
        const result = validateOrderParams(0, 2);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('size'))).toBe(true);
        expect(result.errors.some((e) => e.includes('Price'))).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very small but valid size', () => {
        const result = validateOrderParams(1.0, 0.5);
        expect(result.valid).toBe(true);
      });

      it('should handle price exactly at tick boundary', () => {
        const result = validateOrderParams(100, 0.500);
        expect(result.valid).toBe(true);
      });

      it('should handle floating point precision', () => {
        // 0.1 + 0.2 = 0.30000000000000004 in JS
        const result = validateOrderParams(100, 0.3);
        expect(result.valid).toBe(true);
      });
    });
  });
});
