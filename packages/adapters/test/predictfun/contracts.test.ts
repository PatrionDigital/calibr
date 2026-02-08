/**
 * Predict.fun Contract Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PREDICTFUN_CONTRACTS,
  BLAST_CHAIN_ID,
  BLAST_RPC_URL,
  CTF_EXCHANGE_ABI,
  CONDITIONAL_TOKENS_ABI,
  ERC20_ABI,
  type PredictFunMarket,
  type PredictFunOutcome,
  type PredictFunOrder,
} from '../../src/predictfun/contracts';

// =============================================================================
// Tests
// =============================================================================

describe('Predict.fun Contracts Configuration', () => {
  // ---------------------------------------------------------------------------
  // Chain Configuration
  // ---------------------------------------------------------------------------

  describe('Chain Configuration', () => {
    it('should have correct Blast chain ID', () => {
      expect(BLAST_CHAIN_ID).toBe(81457);
    });

    it('should have valid RPC URL', () => {
      expect(BLAST_RPC_URL).toBe('https://rpc.blast.io');
      expect(BLAST_RPC_URL).toMatch(/^https:\/\//);
    });
  });

  // ---------------------------------------------------------------------------
  // Contract Addresses
  // ---------------------------------------------------------------------------

  describe('PREDICTFUN_CONTRACTS', () => {
    it('should have valid conditional tokens address', () => {
      expect(PREDICTFUN_CONTRACTS.conditionalTokens).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid CTF exchange address', () => {
      expect(PREDICTFUN_CONTRACTS.ctfExchange).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid neg risk CTF exchange address', () => {
      expect(PREDICTFUN_CONTRACTS.negRiskCtfExchange).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid neg risk adapter address', () => {
      expect(PREDICTFUN_CONTRACTS.negRiskAdapter).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid UMA CTF adapter address', () => {
      expect(PREDICTFUN_CONTRACTS.umaCtfAdapter).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid UMA CTF adapter neg risk address', () => {
      expect(PREDICTFUN_CONTRACTS.umaCtfAdapterNegRisk).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid USDB address', () => {
      expect(PREDICTFUN_CONTRACTS.usdb).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have unique addresses for each contract', () => {
      const addresses = Object.values(PREDICTFUN_CONTRACTS);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(addresses.length);
    });

    it('should have USDB as the Blast native stablecoin address', () => {
      // Blast USDB is at a specific address
      expect(PREDICTFUN_CONTRACTS.usdb.toLowerCase()).toBe(
        '0x4300000000000000000000000000000000000003'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // CTF Exchange ABI
  // ---------------------------------------------------------------------------

  describe('CTF_EXCHANGE_ABI', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(CTF_EXCHANGE_ABI)).toBe(true);
      expect(CTF_EXCHANGE_ABI.length).toBeGreaterThan(0);
    });

    it('should contain OrderFilled event', () => {
      const hasOrderFilled = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('OrderFilled')
      );
      expect(hasOrderFilled).toBe(true);
    });

    it('should contain OrdersMatched event', () => {
      const hasOrdersMatched = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('OrdersMatched')
      );
      expect(hasOrdersMatched).toBe(true);
    });

    it('should contain TokenRegistered event', () => {
      const hasTokenRegistered = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('TokenRegistered')
      );
      expect(hasTokenRegistered).toBe(true);
    });

    it('should contain getOrderStatus view function', () => {
      const hasGetOrderStatus = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('getOrderStatus')
      );
      expect(hasGetOrderStatus).toBe(true);
    });

    it('should contain registry view function', () => {
      const hasRegistry = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('registry')
      );
      expect(hasRegistry).toBe(true);
    });

    it('should contain getCtf view function', () => {
      const hasGetCtf = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('getCtf')
      );
      expect(hasGetCtf).toBe(true);
    });

    it('should contain getCollateral view function', () => {
      const hasGetCollateral = CTF_EXCHANGE_ABI.some(
        (item) => typeof item === 'string' && item.includes('getCollateral')
      );
      expect(hasGetCollateral).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Conditional Tokens ABI
  // ---------------------------------------------------------------------------

  describe('CONDITIONAL_TOKENS_ABI', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(CONDITIONAL_TOKENS_ABI)).toBe(true);
      expect(CONDITIONAL_TOKENS_ABI.length).toBeGreaterThan(0);
    });

    it('should contain ConditionPreparation event', () => {
      const hasConditionPreparation = CONDITIONAL_TOKENS_ABI.some(
        (item) => typeof item === 'string' && item.includes('ConditionPreparation')
      );
      expect(hasConditionPreparation).toBe(true);
    });

    it('should contain ConditionResolution event', () => {
      const hasConditionResolution = CONDITIONAL_TOKENS_ABI.some(
        (item) => typeof item === 'string' && item.includes('ConditionResolution')
      );
      expect(hasConditionResolution).toBe(true);
    });

    it('should contain PositionSplit event', () => {
      const hasPositionSplit = CONDITIONAL_TOKENS_ABI.some(
        (item) => typeof item === 'string' && item.includes('PositionSplit')
      );
      expect(hasPositionSplit).toBe(true);
    });

    it('should contain getConditionId function', () => {
      const hasGetConditionId = CONDITIONAL_TOKENS_ABI.some(
        (item) => typeof item === 'string' && item.includes('getConditionId')
      );
      expect(hasGetConditionId).toBe(true);
    });

    it('should contain balanceOf function', () => {
      const hasBalanceOf = CONDITIONAL_TOKENS_ABI.some(
        (item) => typeof item === 'string' && item.includes('balanceOf')
      );
      expect(hasBalanceOf).toBe(true);
    });

    it('should contain payoutNumerators function', () => {
      const hasPayoutNumerators = CONDITIONAL_TOKENS_ABI.some(
        (item) => typeof item === 'string' && item.includes('payoutNumerators')
      );
      expect(hasPayoutNumerators).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // ERC20 ABI
  // ---------------------------------------------------------------------------

  describe('ERC20_ABI', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(ERC20_ABI)).toBe(true);
      expect(ERC20_ABI.length).toBeGreaterThan(0);
    });

    it('should contain balanceOf function', () => {
      const hasBalanceOf = ERC20_ABI.some(
        (item) => typeof item === 'string' && item.includes('balanceOf')
      );
      expect(hasBalanceOf).toBe(true);
    });

    it('should contain decimals function', () => {
      const hasDecimals = ERC20_ABI.some(
        (item) => typeof item === 'string' && item.includes('decimals')
      );
      expect(hasDecimals).toBe(true);
    });

    it('should contain symbol function', () => {
      const hasSymbol = ERC20_ABI.some(
        (item) => typeof item === 'string' && item.includes('symbol')
      );
      expect(hasSymbol).toBe(true);
    });

    it('should contain name function', () => {
      const hasName = ERC20_ABI.some(
        (item) => typeof item === 'string' && item.includes('name')
      );
      expect(hasName).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Type Definitions
  // ---------------------------------------------------------------------------

  describe('Type Definitions', () => {
    describe('PredictFunMarket', () => {
      it('should have all required properties', () => {
        const market: PredictFunMarket = {
          conditionId: '0x123',
          questionId: '0x456',
          oracle: '0x789',
          outcomeCount: 2,
          outcomes: [],
          isResolved: false,
        };

        expect(market.conditionId).toBeDefined();
        expect(market.questionId).toBeDefined();
        expect(market.oracle).toBeDefined();
        expect(market.outcomeCount).toBeDefined();
        expect(market.outcomes).toBeDefined();
        expect(market.isResolved).toBeDefined();
      });

      it('should allow optional winningOutcome', () => {
        const market: PredictFunMarket = {
          conditionId: '0x123',
          questionId: '0x456',
          oracle: '0x789',
          outcomeCount: 2,
          outcomes: [],
          isResolved: true,
          winningOutcome: 1,
        };

        expect(market.winningOutcome).toBe(1);
      });
    });

    describe('PredictFunOutcome', () => {
      it('should have all required properties', () => {
        const outcome: PredictFunOutcome = {
          index: 0,
          tokenId: '0xtoken123',
        };

        expect(outcome.index).toBeDefined();
        expect(outcome.tokenId).toBeDefined();
      });

      it('should allow optional properties', () => {
        const outcome: PredictFunOutcome = {
          index: 0,
          tokenId: '0xtoken123',
          complementTokenId: '0xcomplement456',
          price: 0.65,
        };

        expect(outcome.complementTokenId).toBe('0xcomplement456');
        expect(outcome.price).toBe(0.65);
      });
    });

    describe('PredictFunOrder', () => {
      it('should have all required properties', () => {
        const order: PredictFunOrder = {
          orderHash: '0xhash123',
          maker: '0xmaker456',
          makerAssetId: '0xasset1',
          takerAssetId: '0xasset2',
          price: 0.5,
          size: 100,
          side: 'BUY',
        };

        expect(order.orderHash).toBeDefined();
        expect(order.maker).toBeDefined();
        expect(order.makerAssetId).toBeDefined();
        expect(order.takerAssetId).toBeDefined();
        expect(order.price).toBeDefined();
        expect(order.size).toBeDefined();
        expect(order.side).toBeDefined();
      });

      it('should accept BUY side', () => {
        const order: PredictFunOrder = {
          orderHash: '0xhash',
          maker: '0xmaker',
          makerAssetId: '0xasset1',
          takerAssetId: '0xasset2',
          price: 0.5,
          size: 100,
          side: 'BUY',
        };

        expect(order.side).toBe('BUY');
      });

      it('should accept SELL side', () => {
        const order: PredictFunOrder = {
          orderHash: '0xhash',
          maker: '0xmaker',
          makerAssetId: '0xasset1',
          takerAssetId: '0xasset2',
          price: 0.5,
          size: 100,
          side: 'SELL',
        };

        expect(order.side).toBe('SELL');
      });
    });
  });
});
