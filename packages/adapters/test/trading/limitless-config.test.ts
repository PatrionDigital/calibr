/**
 * Limitless Trading Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CTF_CONTRACT,
  GNOSIS_CTF_CONTRACT,
  LIMITLESS_CTF_EXCHANGE,
  BASE_USDC,
  BASE_MAINNET_CONFIG,
  BASE_SEPOLIA_CONFIG,
  LIMITLESS_ORDER_TYPES,
  LimitlessOrderSide,
  LimitlessSignatureType,
  CTF_ABI,
  FPMM_ABI,
  ERC20_ABI,
  type LimitlessTradingConfig,
} from '../../src/trading/limitless/config';

// =============================================================================
// Tests
// =============================================================================

describe('Limitless Trading Configuration', () => {
  // ---------------------------------------------------------------------------
  // Contract Addresses
  // ---------------------------------------------------------------------------

  describe('Contract Addresses', () => {
    it('should have valid CTF contract address', () => {
      expect(CTF_CONTRACT).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid Gnosis CTF contract address', () => {
      expect(GNOSIS_CTF_CONTRACT).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid Limitless CTF Exchange address', () => {
      expect(LIMITLESS_CTF_EXCHANGE).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid Base USDC address', () => {
      expect(BASE_USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have different CTF and Gnosis CTF addresses', () => {
      expect(CTF_CONTRACT).not.toBe(GNOSIS_CTF_CONTRACT);
    });

    it('should have specific Limitless CTF address', () => {
      expect(CTF_CONTRACT).toBe('0xC9c98965297Bc527861c898329Ee280632B76e18');
    });

    it('should have standard Gnosis CTF address', () => {
      expect(GNOSIS_CTF_CONTRACT).toBe('0x4D97DCd97eC945f40cF65F87097ACe5EA0476045');
    });
  });

  // ---------------------------------------------------------------------------
  // Base Mainnet Configuration
  // ---------------------------------------------------------------------------

  describe('BASE_MAINNET_CONFIG', () => {
    it('should have correct chain ID for Base mainnet', () => {
      expect(BASE_MAINNET_CONFIG.chainId).toBe(8453);
    });

    it('should have valid RPC URL', () => {
      expect(BASE_MAINNET_CONFIG.rpcUrl).toMatch(/^https?:\/\//);
    });

    it('should have valid API URL', () => {
      expect(BASE_MAINNET_CONFIG.apiUrl).toBe('https://api.limitless.exchange');
    });

    it('should have valid WebSocket URL', () => {
      expect(BASE_MAINNET_CONFIG.wsUrl).toBe('wss://api.limitless.exchange/ws');
    });

    it('should have correct domain name', () => {
      expect(BASE_MAINNET_CONFIG.domainName).toBe('Limitless CTF Exchange');
    });

    it('should have correct domain version', () => {
      expect(BASE_MAINNET_CONFIG.domainVersion).toBe('1');
    });

    it('should reference CTF contract', () => {
      expect(BASE_MAINNET_CONFIG.ctfContract).toBe(CTF_CONTRACT);
    });

    it('should reference CTF exchange', () => {
      expect(BASE_MAINNET_CONFIG.ctfExchange).toBe(LIMITLESS_CTF_EXCHANGE);
    });

    it('should reference USDC', () => {
      expect(BASE_MAINNET_CONFIG.usdc).toBe(BASE_USDC);
    });
  });

  // ---------------------------------------------------------------------------
  // Base Sepolia Configuration
  // ---------------------------------------------------------------------------

  describe('BASE_SEPOLIA_CONFIG', () => {
    it('should have correct chain ID for Base Sepolia', () => {
      expect(BASE_SEPOLIA_CONFIG.chainId).toBe(84532);
    });

    it('should have valid RPC URL', () => {
      expect(BASE_SEPOLIA_CONFIG.rpcUrl).toMatch(/^https?:\/\//);
      expect(BASE_SEPOLIA_CONFIG.rpcUrl).toContain('sepolia');
    });

    it('should have testnet API URL', () => {
      expect(BASE_SEPOLIA_CONFIG.apiUrl).toContain('testnet');
    });

    it('should have testnet WebSocket URL', () => {
      expect(BASE_SEPOLIA_CONFIG.wsUrl).toContain('testnet');
    });

    it('should have same domain name as mainnet', () => {
      expect(BASE_SEPOLIA_CONFIG.domainName).toBe(BASE_MAINNET_CONFIG.domainName);
    });

    it('should have same domain version as mainnet', () => {
      expect(BASE_SEPOLIA_CONFIG.domainVersion).toBe(BASE_MAINNET_CONFIG.domainVersion);
    });

    it('should have different USDC address than mainnet', () => {
      expect(BASE_SEPOLIA_CONFIG.usdc).not.toBe(BASE_MAINNET_CONFIG.usdc);
    });

    it('should have valid testnet USDC address', () => {
      expect(BASE_SEPOLIA_CONFIG.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  // ---------------------------------------------------------------------------
  // Order Types (EIP-712)
  // ---------------------------------------------------------------------------

  describe('LIMITLESS_ORDER_TYPES', () => {
    it('should have Order type definition', () => {
      expect(LIMITLESS_ORDER_TYPES.Order).toBeDefined();
      expect(Array.isArray(LIMITLESS_ORDER_TYPES.Order)).toBe(true);
    });

    it('should have maker field', () => {
      const makerField = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'maker');
      expect(makerField).toBeDefined();
      expect(makerField?.type).toBe('address');
    });

    it('should have taker field', () => {
      const takerField = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'taker');
      expect(takerField).toBeDefined();
      expect(takerField?.type).toBe('address');
    });

    it('should have tokenId field', () => {
      const tokenIdField = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'tokenId');
      expect(tokenIdField).toBeDefined();
      expect(tokenIdField?.type).toBe('uint256');
    });

    it('should have makerAmount field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'makerAmount');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint256');
    });

    it('should have takerAmount field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'takerAmount');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint256');
    });

    it('should have side field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'side');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint8');
    });

    it('should have expiration field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'expiration');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint256');
    });

    it('should have nonce field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'nonce');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint256');
    });

    it('should have feeRateBps field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'feeRateBps');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint256');
    });

    it('should have signatureType field', () => {
      const field = LIMITLESS_ORDER_TYPES.Order.find((f) => f.name === 'signatureType');
      expect(field).toBeDefined();
      expect(field?.type).toBe('uint8');
    });

    it('should have correct number of fields', () => {
      expect(LIMITLESS_ORDER_TYPES.Order.length).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // Enums
  // ---------------------------------------------------------------------------

  describe('LimitlessOrderSide', () => {
    it('should have BUY as 0', () => {
      expect(LimitlessOrderSide.BUY).toBe(0);
    });

    it('should have SELL as 1', () => {
      expect(LimitlessOrderSide.SELL).toBe(1);
    });
  });

  describe('LimitlessSignatureType', () => {
    it('should have EOA as 0', () => {
      expect(LimitlessSignatureType.EOA).toBe(0);
    });

    it('should have POLY_PROXY as 1', () => {
      expect(LimitlessSignatureType.POLY_PROXY).toBe(1);
    });

    it('should have POLY_GNOSIS_SAFE as 2', () => {
      expect(LimitlessSignatureType.POLY_GNOSIS_SAFE).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // CTF ABI
  // ---------------------------------------------------------------------------

  describe('CTF_ABI', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(CTF_ABI)).toBe(true);
      expect(CTF_ABI.length).toBeGreaterThan(0);
    });

    it('should contain splitPosition function', () => {
      const hasSplitPosition = CTF_ABI.some(
        (item) => typeof item === 'object' && item.name === 'splitPosition'
      );
      expect(hasSplitPosition).toBe(true);
    });

    it('should contain mergePositions function', () => {
      const hasMergePositions = CTF_ABI.some(
        (item) => typeof item === 'object' && item.name === 'mergePositions'
      );
      expect(hasMergePositions).toBe(true);
    });

    it('should contain redeemPositions function', () => {
      const hasRedeemPositions = CTF_ABI.some(
        (item) => typeof item === 'object' && item.name === 'redeemPositions'
      );
      expect(hasRedeemPositions).toBe(true);
    });

    it('should contain balanceOf function', () => {
      const hasBalanceOf = CTF_ABI.some(
        (item) => typeof item === 'object' && item.name === 'balanceOf'
      );
      expect(hasBalanceOf).toBe(true);
    });

    it('should contain setApprovalForAll function', () => {
      const hasSetApprovalForAll = CTF_ABI.some(
        (item) => typeof item === 'object' && item.name === 'setApprovalForAll'
      );
      expect(hasSetApprovalForAll).toBe(true);
    });

    it('should contain PositionSplit event', () => {
      const hasPositionSplit = CTF_ABI.some(
        (item) => typeof item === 'object' && item.name === 'PositionSplit' && item.type === 'event'
      );
      expect(hasPositionSplit).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // FPMM ABI
  // ---------------------------------------------------------------------------

  describe('FPMM_ABI', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(FPMM_ABI)).toBe(true);
      expect(FPMM_ABI.length).toBeGreaterThan(0);
    });

    it('should contain buy function', () => {
      const hasBuy = FPMM_ABI.some(
        (item) => typeof item === 'object' && item.name === 'buy'
      );
      expect(hasBuy).toBe(true);
    });

    it('should contain sell function', () => {
      const hasSell = FPMM_ABI.some(
        (item) => typeof item === 'object' && item.name === 'sell'
      );
      expect(hasSell).toBe(true);
    });

    it('should contain calcBuyAmount function', () => {
      const hasCalcBuyAmount = FPMM_ABI.some(
        (item) => typeof item === 'object' && item.name === 'calcBuyAmount'
      );
      expect(hasCalcBuyAmount).toBe(true);
    });

    it('should contain calcSellAmount function', () => {
      const hasCalcSellAmount = FPMM_ABI.some(
        (item) => typeof item === 'object' && item.name === 'calcSellAmount'
      );
      expect(hasCalcSellAmount).toBe(true);
    });

    it('should contain collateralToken function', () => {
      const hasCollateralToken = FPMM_ABI.some(
        (item) => typeof item === 'object' && item.name === 'collateralToken'
      );
      expect(hasCollateralToken).toBe(true);
    });

    it('should contain fee function', () => {
      const hasFee = FPMM_ABI.some(
        (item) => typeof item === 'object' && item.name === 'fee'
      );
      expect(hasFee).toBe(true);
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

    it('should contain approve function', () => {
      const hasApprove = ERC20_ABI.some(
        (item) => typeof item === 'object' && item.name === 'approve'
      );
      expect(hasApprove).toBe(true);
    });

    it('should contain allowance function', () => {
      const hasAllowance = ERC20_ABI.some(
        (item) => typeof item === 'object' && item.name === 'allowance'
      );
      expect(hasAllowance).toBe(true);
    });

    it('should contain balanceOf function', () => {
      const hasBalanceOf = ERC20_ABI.some(
        (item) => typeof item === 'object' && item.name === 'balanceOf'
      );
      expect(hasBalanceOf).toBe(true);
    });

    it('should contain decimals function', () => {
      const hasDecimals = ERC20_ABI.some(
        (item) => typeof item === 'object' && item.name === 'decimals'
      );
      expect(hasDecimals).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Type Definitions
  // ---------------------------------------------------------------------------

  describe('LimitlessTradingConfig Type', () => {
    it('should allow creation of valid config object', () => {
      const config: LimitlessTradingConfig = {
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        apiUrl: 'https://api.limitless.exchange',
        domainName: 'Limitless CTF Exchange',
        domainVersion: '1',
        ctfContract: '0xC9c98965297Bc527861c898329Ee280632B76e18',
        ctfExchange: '0x05c748E2f4DcDe0ec9Fa8DDc40DE6b867f923fa5',
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      };

      expect(config.chainId).toBe(8453);
      expect(config.rpcUrl).toBeDefined();
      expect(config.apiUrl).toBeDefined();
      expect(config.domainName).toBeDefined();
      expect(config.domainVersion).toBeDefined();
      expect(config.ctfContract).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(config.ctfExchange).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(config.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should allow optional wsUrl', () => {
      const config: LimitlessTradingConfig = {
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        apiUrl: 'https://api.limitless.exchange',
        wsUrl: 'wss://api.limitless.exchange/ws',
        domainName: 'Limitless CTF Exchange',
        domainVersion: '1',
        ctfContract: '0xC9c98965297Bc527861c898329Ee280632B76e18',
        ctfExchange: '0x05c748E2f4DcDe0ec9Fa8DDc40DE6b867f923fa5',
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      };

      expect(config.wsUrl).toBe('wss://api.limitless.exchange/ws');
    });
  });
});
