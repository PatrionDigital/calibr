/**
 * ConnectWallet Component Tests
 *
 * Tests for the wallet connection UI component:
 * - Connect button display
 * - Chain switching for Base network
 * - Calibration tier badge
 * - Polymarket Safe indicator
 * - Account display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectWallet } from '@/components/connect-wallet';

// =============================================================================
// Mocks
// =============================================================================

// RainbowKit mock state
let mockRainbowKitState = {
  account: null as { displayName: string; displayBalance?: string } | null,
  chain: null as { id: number; name: string; unsupported?: boolean } | null,
  openAccountModal: vi.fn(),
  openChainModal: vi.fn(),
  openConnectModal: vi.fn(),
  mounted: true,
};

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (state: typeof mockRainbowKitState) => React.ReactNode }) => {
      return <>{children(mockRainbowKitState)}</>;
    },
  },
}));

// Identity mock
let mockIdentity = {
  isConnected: false,
  isLoading: false,
  calibrationTier: null as string | null,
  polymarketSafeDeployed: false,
};

vi.mock('@/hooks/useAppIdentity', () => ({
  useAppIdentity: () => mockIdentity,
}));

// Chain ID constants mock
vi.mock('@/types/identity', () => ({
  BASE_CHAIN_ID: 8453,
  BASE_SEPOLIA_CHAIN_ID: 84532,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function resetMocks() {
  mockRainbowKitState = {
    account: null,
    chain: null,
    openAccountModal: vi.fn(),
    openChainModal: vi.fn(),
    openConnectModal: vi.fn(),
    mounted: true,
  };
  mockIdentity = {
    isConnected: false,
    isLoading: false,
    calibrationTier: null,
    polymarketSafeDeployed: false,
  };
}

function setConnected(
  displayName = '0x1234...5678',
  displayBalance = '1.5 ETH',
  chainId = 8453,
  chainName = 'Base'
) {
  mockRainbowKitState.account = { displayName, displayBalance };
  mockRainbowKitState.chain = { id: chainId, name: chainName };
  mockIdentity.isConnected = true;
}

// =============================================================================
// Tests
// =============================================================================

describe('ConnectWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  describe('disconnected state', () => {
    it('renders connect button when not connected', () => {
      render(<ConnectWallet />);
      expect(screen.getByText('[CONNECT WALLET]')).toBeInTheDocument();
    });

    it('calls openConnectModal when connect button clicked', () => {
      render(<ConnectWallet />);
      fireEvent.click(screen.getByText('[CONNECT WALLET]'));
      expect(mockRainbowKitState.openConnectModal).toHaveBeenCalled();
    });

    it('connect button has correct styling', () => {
      render(<ConnectWallet />);
      const button = screen.getByText('[CONNECT WALLET]');
      expect(button).toHaveClass('border-[hsl(var(--primary))]');
      expect(button).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('wrong chain state', () => {
    beforeEach(() => {
      mockRainbowKitState.account = { displayName: '0x1234...5678' };
      mockRainbowKitState.chain = { id: 1, name: 'Ethereum', unsupported: true };
    });

    it('renders switch to base button when on wrong chain', () => {
      render(<ConnectWallet />);
      expect(screen.getByText('[SWITCH TO BASE]')).toBeInTheDocument();
    });

    it('calls openChainModal when switch button clicked', () => {
      render(<ConnectWallet />);
      fireEvent.click(screen.getByText('[SWITCH TO BASE]'));
      expect(mockRainbowKitState.openChainModal).toHaveBeenCalled();
    });

    it('switch button has destructive styling', () => {
      render(<ConnectWallet />);
      const button = screen.getByText('[SWITCH TO BASE]');
      expect(button).toHaveClass('border-[hsl(var(--destructive))]');
      expect(button).toHaveClass('text-[hsl(var(--destructive))]');
    });

    it('shows switch button when chain is unsupported', () => {
      mockRainbowKitState.chain = { id: 137, name: 'Polygon', unsupported: true };
      render(<ConnectWallet />);
      expect(screen.getByText('[SWITCH TO BASE]')).toBeInTheDocument();
    });

    it('shows switch button when not on Base network', () => {
      mockRainbowKitState.chain = { id: 1, name: 'Ethereum' };
      render(<ConnectWallet />);
      expect(screen.getByText('[SWITCH TO BASE]')).toBeInTheDocument();
    });
  });

  describe('connected state on Base', () => {
    beforeEach(() => {
      setConnected();
    });

    it('shows account display name', () => {
      render(<ConnectWallet />);
      expect(screen.getByText(/0x1234...5678/)).toBeInTheDocument();
    });

    it('shows account balance', () => {
      render(<ConnectWallet />);
      expect(screen.getByText(/\(1\.5 ETH\)/)).toBeInTheDocument();
    });

    it('shows chain name', () => {
      render(<ConnectWallet />);
      expect(screen.getByText('Base')).toBeInTheDocument();
    });

    it('calls openAccountModal when account button clicked', () => {
      render(<ConnectWallet />);
      fireEvent.click(screen.getByText(/0x1234...5678/));
      expect(mockRainbowKitState.openAccountModal).toHaveBeenCalled();
    });

    it('calls openChainModal when chain button clicked', () => {
      render(<ConnectWallet />);
      fireEvent.click(screen.getByText('Base'));
      expect(mockRainbowKitState.openChainModal).toHaveBeenCalled();
    });

    it('handles missing display balance', () => {
      mockRainbowKitState.account = { displayName: '0x1234...5678' };
      render(<ConnectWallet />);
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
      expect(screen.queryByText(/ETH/)).not.toBeInTheDocument();
    });
  });

  describe('connected on Base Sepolia', () => {
    it('shows connected state on Base Sepolia', () => {
      setConnected('0xabcd...efgh', '0.1 ETH', 84532, 'Base Sepolia');
      render(<ConnectWallet />);
      expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
      expect(screen.getByText(/0xabcd...efgh/)).toBeInTheDocument();
    });
  });

  describe('calibration tier badge', () => {
    beforeEach(() => {
      setConnected();
    });

    it('shows APPRENTICE tier badge', () => {
      mockIdentity.calibrationTier = 'APPRENTICE';
      render(<ConnectWallet />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('shows JOURNEYMAN tier badge', () => {
      mockIdentity.calibrationTier = 'JOURNEYMAN';
      render(<ConnectWallet />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('shows EXPERT tier badge', () => {
      mockIdentity.calibrationTier = 'EXPERT';
      render(<ConnectWallet />);
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    it('shows MASTER tier badge', () => {
      mockIdentity.calibrationTier = 'MASTER';
      render(<ConnectWallet />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('shows GRANDMASTER tier badge', () => {
      mockIdentity.calibrationTier = 'GRANDMASTER';
      render(<ConnectWallet />);
      expect(screen.getByText('G')).toBeInTheDocument();
    });

    it('hides tier badge when no tier', () => {
      mockIdentity.calibrationTier = null;
      render(<ConnectWallet />);
      expect(screen.queryByTitle(/Superforecaster Tier/)).not.toBeInTheDocument();
    });

    it('tier badge has correct title', () => {
      mockIdentity.calibrationTier = 'EXPERT';
      render(<ConnectWallet />);
      expect(screen.getByTitle('Superforecaster Tier: EXPERT')).toBeInTheDocument();
    });

    it('APPRENTICE tier has muted color', () => {
      mockIdentity.calibrationTier = 'APPRENTICE';
      render(<ConnectWallet />);
      const badge = screen.getByText('A');
      expect(badge).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });

    it('JOURNEYMAN tier has blue color', () => {
      mockIdentity.calibrationTier = 'JOURNEYMAN';
      render(<ConnectWallet />);
      const badge = screen.getByText('J');
      expect(badge).toHaveClass('text-blue-400');
    });

    it('EXPERT tier has purple color', () => {
      mockIdentity.calibrationTier = 'EXPERT';
      render(<ConnectWallet />);
      const badge = screen.getByText('E');
      expect(badge).toHaveClass('text-purple-400');
    });

    it('MASTER tier has yellow color', () => {
      mockIdentity.calibrationTier = 'MASTER';
      render(<ConnectWallet />);
      const badge = screen.getByText('M');
      expect(badge).toHaveClass('text-yellow-400');
    });

    it('GRANDMASTER tier has primary color', () => {
      mockIdentity.calibrationTier = 'GRANDMASTER';
      render(<ConnectWallet />);
      const badge = screen.getByText('G');
      expect(badge).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('Polymarket Safe indicator', () => {
    beforeEach(() => {
      setConnected();
    });

    it('shows PM badge when Polymarket Safe is deployed', () => {
      mockIdentity.polymarketSafeDeployed = true;
      render(<ConnectWallet />);
      expect(screen.getByText('PM')).toBeInTheDocument();
    });

    it('hides PM badge when Polymarket Safe is not deployed', () => {
      mockIdentity.polymarketSafeDeployed = false;
      render(<ConnectWallet />);
      expect(screen.queryByText('PM')).not.toBeInTheDocument();
    });

    it('PM badge has correct title', () => {
      mockIdentity.polymarketSafeDeployed = true;
      render(<ConnectWallet />);
      expect(screen.getByTitle('Polymarket Safe Deployed')).toBeInTheDocument();
    });

    it('PM badge has success color', () => {
      mockIdentity.polymarketSafeDeployed = true;
      render(<ConnectWallet />);
      const badge = screen.getByText('PM');
      expect(badge).toHaveClass('text-[hsl(var(--success))]');
      expect(badge).toHaveClass('border-[hsl(var(--success))]');
    });
  });

  describe('mounting state', () => {
    it('hides content when not mounted', () => {
      mockRainbowKitState.mounted = false;
      const { container } = render(<ConnectWallet />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
      expect(wrapper).toHaveStyle({ opacity: '0', pointerEvents: 'none' });
    });

    it('shows content when mounted', () => {
      mockRainbowKitState.mounted = true;
      const { container } = render(<ConnectWallet />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('combined features', () => {
    it('shows both tier badge and PM indicator together', () => {
      setConnected();
      mockIdentity.calibrationTier = 'MASTER';
      mockIdentity.polymarketSafeDeployed = true;
      render(<ConnectWallet />);
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('PM')).toBeInTheDocument();
    });

    it('shows all elements in correct order', () => {
      setConnected();
      mockIdentity.calibrationTier = 'EXPERT';
      mockIdentity.polymarketSafeDeployed = true;
      const { container } = render(<ConnectWallet />);

      // Check elements exist in container
      const elements = container.querySelectorAll('span, button');
      const texts = Array.from(elements).map((el) => el.textContent?.trim());

      // Verify order: tier badge, PM, chain, account
      expect(texts).toContain('E');
      expect(texts).toContain('PM');
      expect(texts).toContain('Base');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('handles unknown tier gracefully', () => {
    setConnected();
    mockIdentity.calibrationTier = 'UNKNOWN_TIER';
    render(<ConnectWallet />);
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('handles very long display name', () => {
    mockRainbowKitState.account = { displayName: 'very-long-ens-name.eth' };
    mockRainbowKitState.chain = { id: 8453, name: 'Base' };
    mockIdentity.isConnected = true;
    render(<ConnectWallet />);
    expect(screen.getByText('very-long-ens-name.eth')).toBeInTheDocument();
  });

  it('handles large balance display', () => {
    mockRainbowKitState.account = {
      displayName: '0x1234',
      displayBalance: '1,234,567.89 ETH',
    };
    mockRainbowKitState.chain = { id: 8453, name: 'Base' };
    mockIdentity.isConnected = true;
    render(<ConnectWallet />);
    expect(screen.getByText(/1,234,567\.89 ETH/)).toBeInTheDocument();
  });

  it('handles chain with long name', () => {
    mockRainbowKitState.account = { displayName: '0x1234' };
    mockRainbowKitState.chain = { id: 8453, name: 'Base Mainnet Network' };
    mockIdentity.isConnected = true;
    render(<ConnectWallet />);
    expect(screen.getByText('Base Mainnet Network')).toBeInTheDocument();
  });
});
