/**
 * PolymarketSafeService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Mocks - Use vi.hoisted to ensure mocks are created before imports
// =============================================================================

const { mockGetBytecode, mockGetOwners, mockGetThreshold, mockIsModuleEnabled } =
  vi.hoisted(() => ({
    mockGetBytecode: vi.fn(),
    mockGetOwners: vi.fn(),
    mockGetThreshold: vi.fn(),
    mockIsModuleEnabled: vi.fn(),
  }));

// Create mock contract with async read functions
const mockContractRead = {
  getOwners: () => mockGetOwners(),
  getThreshold: () => mockGetThreshold(),
  isModuleEnabled: (args: unknown[]) => mockIsModuleEnabled(args),
};

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBytecode: mockGetBytecode,
    })),
    getContract: vi.fn(() => ({
      read: mockContractRead,
    })),
    keccak256: vi.fn(() => '0x' + 'ab'.repeat(32)),
    encodePacked: vi.fn(() => '0x1234'),
    encodeFunctionData: vi.fn(() => '0x5678'),
    http: vi.fn(() => ({})),
  };
});

vi.mock('viem/chains', () => ({
  polygon: { id: 137, name: 'Polygon' },
}));

const mockFetch = vi.fn();

// Import after mocks are set up
import {
  PolymarketSafeService,
  polymarketSafe,
} from '../../src/trading/polymarket/safe';

// =============================================================================
// Test Data
// =============================================================================

const TEST_OWNER_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const TEST_SAFE_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12' as const;

function createMockWalletClient() {
  return {
    getAddresses: vi.fn().mockResolvedValue([TEST_OWNER_ADDRESS]),
    signTypedData: vi.fn(),
    signMessage: vi.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PolymarketSafeService', () => {
  let service: PolymarketSafeService;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    service = new PolymarketSafeService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const svc = new PolymarketSafeService();
      expect(svc).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const svc = new PolymarketSafeService({
        rpcUrl: 'https://custom-polygon.example.com',
        proxyFactoryAddress: '0x1111111111111111111111111111111111111111',
        safeModuleAddress: '0x2222222222222222222222222222222222222222',
      });
      expect(svc).toBeDefined();
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(polymarketSafe).toBeInstanceOf(PolymarketSafeService);
    });
  });

  // ---------------------------------------------------------------------------
  // Get Safe Wallet
  // ---------------------------------------------------------------------------

  describe('getSafeWallet', () => {
    it('should return not deployed when no bytecode', async () => {
      mockGetBytecode.mockResolvedValue('0x');

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result).not.toBeNull();
      expect(result!.isDeployed).toBe(false);
      expect(result!.isActivated).toBe(false);
      expect(result!.owners).toEqual([TEST_OWNER_ADDRESS]);
      expect(result!.threshold).toBe(1);
    });

    it('should return not deployed when bytecode is undefined', async () => {
      mockGetBytecode.mockResolvedValue(undefined);

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result!.isDeployed).toBe(false);
    });

    it('should return deployed Safe details', async () => {
      mockGetBytecode.mockResolvedValue('0x608060405234801...');
      mockGetOwners.mockResolvedValue([TEST_OWNER_ADDRESS]);
      mockGetThreshold.mockResolvedValue(1n);
      mockIsModuleEnabled.mockResolvedValue(true);

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result).not.toBeNull();
      expect(result!.isDeployed).toBe(true);
      expect(result!.isActivated).toBe(true);
      expect(result!.owners).toEqual([TEST_OWNER_ADDRESS]);
      expect(result!.threshold).toBe(1);
    });

    it('should return activated false when module not enabled', async () => {
      mockGetBytecode.mockResolvedValue('0x608060405234801...');
      mockGetOwners.mockResolvedValue([TEST_OWNER_ADDRESS]);
      mockGetThreshold.mockResolvedValue(1n);
      mockIsModuleEnabled.mockResolvedValue(false);

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result!.isDeployed).toBe(true);
      expect(result!.isActivated).toBe(false);
    });

    it('should return multi-sig Safe details', async () => {
      const owners = [
        TEST_OWNER_ADDRESS,
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      ];
      mockGetBytecode.mockResolvedValue('0x608060405234801...');
      mockGetOwners.mockResolvedValue(owners);
      mockGetThreshold.mockResolvedValue(2n);
      mockIsModuleEnabled.mockResolvedValue(true);

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result!.owners).toHaveLength(3);
      expect(result!.threshold).toBe(2);
    });

    it('should return null on error', async () => {
      mockGetBytecode.mockRejectedValue(new Error('RPC error'));

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Calculate Safe Address
  // ---------------------------------------------------------------------------

  describe('calculateSafeAddress', () => {
    it('should calculate deterministic address', async () => {
      const address = await service.calculateSafeAddress(TEST_OWNER_ADDRESS);

      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should return same address for same owner', async () => {
      const address1 = await service.calculateSafeAddress(TEST_OWNER_ADDRESS);
      const address2 = await service.calculateSafeAddress(TEST_OWNER_ADDRESS);

      expect(address1).toBe(address2);
    });

    it('should accept custom salt nonce', async () => {
      const customSalt = '0x' + 'cc'.repeat(32);
      const address = await service.calculateSafeAddress(
        TEST_OWNER_ADDRESS,
        customSalt
      );

      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  // ---------------------------------------------------------------------------
  // Deploy Safe
  // ---------------------------------------------------------------------------

  describe('deploySafe', () => {
    it('should throw when wallet has no address', async () => {
      const walletClient = {
        getAddresses: vi.fn().mockResolvedValue([]),
        signTypedData: vi.fn(),
        signMessage: vi.fn(),
      };

      await expect(service.deploySafe(walletClient as any)).rejects.toThrow(
        'No address available'
      );
    });

    it('should return existing Safe if already deployed', async () => {
      mockGetBytecode.mockResolvedValue('0x608060405234801...');
      mockGetOwners.mockResolvedValue([TEST_OWNER_ADDRESS]);
      mockGetThreshold.mockResolvedValue(1n);
      mockIsModuleEnabled.mockResolvedValue(true);

      const walletClient = createMockWalletClient();
      const result = await service.deploySafe(walletClient as any);

      expect(result.isDeployed).toBe(true);
    });

    it('should return deployment request for new Safe', async () => {
      mockGetBytecode.mockResolvedValue('0x');

      const walletClient = createMockWalletClient();
      const result = await service.deploySafe(walletClient as any);

      expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(result.isDeployed).toBe(false);
      expect(result.isActivated).toBe(false);
      expect(result.owners).toEqual([TEST_OWNER_ADDRESS]);
      expect(result.threshold).toBe(1);
    });

    it('should use custom owners and threshold', async () => {
      mockGetBytecode.mockResolvedValue('0x');

      const walletClient = createMockWalletClient();
      const customOwners = [
        TEST_OWNER_ADDRESS,
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ];
      const result = await service.deploySafe(walletClient as any, customOwners, 2);

      expect(result.owners).toEqual(customOwners);
      expect(result.threshold).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Activate Safe
  // ---------------------------------------------------------------------------

  describe('activateSafe', () => {
    it('should throw when wallet has no address', async () => {
      const walletClient = {
        getAddresses: vi.fn().mockResolvedValue([]),
        signTypedData: vi.fn(),
        signMessage: vi.fn(),
      };

      await expect(
        service.activateSafe(walletClient as any, TEST_SAFE_ADDRESS)
      ).rejects.toThrow('No address available');
    });

    it('should throw when Safe not deployed', async () => {
      mockGetBytecode.mockResolvedValue('0x');

      const walletClient = createMockWalletClient();
      await expect(
        service.activateSafe(walletClient as any, TEST_SAFE_ADDRESS)
      ).rejects.toThrow('Safe is not deployed');
    });

    it('should return true when already activated', async () => {
      mockGetBytecode.mockResolvedValue('0x608060405234801...');
      mockGetOwners.mockResolvedValue([TEST_OWNER_ADDRESS]);
      mockGetThreshold.mockResolvedValue(1n);
      mockIsModuleEnabled.mockResolvedValue(true);

      const walletClient = createMockWalletClient();
      const result = await service.activateSafe(walletClient as any, TEST_SAFE_ADDRESS);

      expect(result).toBe(true);
    });

    it('should prepare activation request', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockGetBytecode.mockResolvedValue('0x608060405234801...');
      mockGetOwners.mockResolvedValue([TEST_OWNER_ADDRESS]);
      mockGetThreshold.mockResolvedValue(1n);
      mockIsModuleEnabled.mockResolvedValue(false);

      const walletClient = createMockWalletClient();
      const result = await service.activateSafe(walletClient as any, TEST_SAFE_ADDRESS);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Safe activation request prepared:',
        expect.objectContaining({
          safe: TEST_SAFE_ADDRESS,
        })
      );

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Is Safe Activated
  // ---------------------------------------------------------------------------

  describe('isSafeActivated', () => {
    it('should return true when module is enabled', async () => {
      mockIsModuleEnabled.mockResolvedValue(true);

      const result = await service.isSafeActivated(TEST_SAFE_ADDRESS);

      expect(result).toBe(true);
    });

    it('should return false when module not enabled', async () => {
      mockIsModuleEnabled.mockResolvedValue(false);

      const result = await service.isSafeActivated(TEST_SAFE_ADDRESS);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockIsModuleEnabled.mockRejectedValue(new Error('Contract call failed'));

      const result = await service.isSafeActivated(TEST_SAFE_ADDRESS);

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Get Safe Transactions
  // ---------------------------------------------------------------------------

  describe('getSafeTransactions', () => {
    it('should return empty array (TODO implementation)', async () => {
      const result = await service.getSafeTransactions(TEST_SAFE_ADDRESS);

      expect(result).toEqual([]);
    });

    it('should accept limit parameter', async () => {
      const result = await service.getSafeTransactions(TEST_SAFE_ADDRESS, 100);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle address with different cases', async () => {
      mockGetBytecode.mockResolvedValue('0x');

      const lowerAddress = TEST_OWNER_ADDRESS.toLowerCase();
      const result = await service.getSafeWallet(lowerAddress);

      expect(result).not.toBeNull();
    });

    it('should handle RPC timeout gracefully', async () => {
      mockGetBytecode.mockRejectedValue(new Error('Request timed out'));

      const result = await service.getSafeWallet(TEST_OWNER_ADDRESS);

      expect(result).toBeNull();
    });
  });
});
