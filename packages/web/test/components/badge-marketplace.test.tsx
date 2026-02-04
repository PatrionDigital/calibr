/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  ShareableBadge,
  BadgeShareTarget,
} from '../../src/components/badge-marketplace';
import {
  BadgeShareCard,
  BadgeShareModal,
  BadgeEmbedCode,
  PlatformShareButton,
  SharedBadgePreview,
  BadgeMarketplaceGrid,
  BadgeMarketplacePage,
  useBadgeSharing,
} from '../../src/components/badge-marketplace';

// =============================================================================
// Test Data
// =============================================================================

const mockBadges: ShareableBadge[] = [
  {
    id: 'streak-7',
    name: '7 Day Streak',
    description: 'Forecast for 7 consecutive days',
    icon: '🔥',
    category: 'streak',
    tier: 'NOVICE',
    earnedAt: '2025-01-10',
    tokenId: 1,
    contractAddress: '0x1234abcd',
    chainId: 8453,
    imageUrl: 'data:image/svg+xml;base64,abc',
  },
  {
    id: 'accuracy-70',
    name: 'Calibrated',
    description: 'Achieve 70% accuracy over 50 forecasts',
    icon: '🎯',
    category: 'accuracy',
    tier: 'APPRENTICE',
    earnedAt: '2025-01-15',
    tokenId: 2,
    contractAddress: '0x1234abcd',
    chainId: 8453,
    imageUrl: 'data:image/svg+xml;base64,def',
  },
  {
    id: 'tier-expert',
    name: 'Expert Forecaster',
    description: 'Reach Expert tier',
    icon: '⭐',
    category: 'tier',
    tier: 'EXPERT',
    earnedAt: '2025-02-01',
    tokenId: 3,
    contractAddress: '0x1234abcd',
    chainId: 8453,
    imageUrl: 'data:image/svg+xml;base64,ghi',
  },
];

const mockTargets: BadgeShareTarget[] = [
  { id: 'twitter', name: 'Twitter', icon: '𝕏' },
  { id: 'farcaster', name: 'Farcaster', icon: '🟣' },
  { id: 'lens', name: 'Lens', icon: '🌿' },
];

// =============================================================================
// BadgeShareCard Tests
// =============================================================================

describe('BadgeShareCard', () => {
  it('renders card', () => {
    render(<BadgeShareCard badge={mockBadges[0]!} />);
    expect(screen.getByTestId('badge-share-card')).toBeInTheDocument();
  });

  it('shows badge name', () => {
    render(<BadgeShareCard badge={mockBadges[0]!} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
  });

  it('shows badge icon', () => {
    render(<BadgeShareCard badge={mockBadges[0]!} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('shows token ID', () => {
    render(<BadgeShareCard badge={mockBadges[0]!} />);
    const card = screen.getByTestId('badge-share-card');
    expect(card).toHaveTextContent('#1');
  });

  it('shows chain info', () => {
    render(<BadgeShareCard badge={mockBadges[0]!} />);
    const card = screen.getByTestId('badge-share-card');
    expect(card).toHaveTextContent(/base/i);
  });

  it('calls onShare when share clicked', () => {
    const onShare = vi.fn();
    render(<BadgeShareCard badge={mockBadges[0]!} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('share-button'));
    expect(onShare).toHaveBeenCalledWith('streak-7');
  });

  it('shows earned date', () => {
    render(<BadgeShareCard badge={mockBadges[0]!} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// BadgeShareModal Tests
// =============================================================================

describe('BadgeShareModal', () => {
  it('renders modal', () => {
    render(
      <BadgeShareModal badge={mockBadges[0]!} targets={mockTargets} onClose={() => {}} />
    );
    expect(screen.getByTestId('badge-share-modal')).toBeInTheDocument();
  });

  it('shows badge name', () => {
    render(
      <BadgeShareModal badge={mockBadges[0]!} targets={mockTargets} onClose={() => {}} />
    );
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
  });

  it('shows share targets', () => {
    render(
      <BadgeShareModal badge={mockBadges[0]!} targets={mockTargets} onClose={() => {}} />
    );
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Farcaster')).toBeInTheDocument();
    expect(screen.getByText('Lens')).toBeInTheDocument();
  });

  it('calls onClose when close clicked', () => {
    const onClose = vi.fn();
    render(
      <BadgeShareModal badge={mockBadges[0]!} targets={mockTargets} onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId('close-share-modal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onShare with target when platform clicked', () => {
    const onShare = vi.fn();
    render(
      <BadgeShareModal
        badge={mockBadges[0]!}
        targets={mockTargets}
        onClose={() => {}}
        onShare={onShare}
      />
    );
    fireEvent.click(screen.getByText('Twitter'));
    expect(onShare).toHaveBeenCalledWith('streak-7', 'twitter');
  });

  it('shows embed code section', () => {
    render(
      <BadgeShareModal badge={mockBadges[0]!} targets={mockTargets} onClose={() => {}} />
    );
    expect(screen.getByTestId('embed-code')).toBeInTheDocument();
  });
});

// =============================================================================
// BadgeEmbedCode Tests
// =============================================================================

describe('BadgeEmbedCode', () => {
  it('renders embed code', () => {
    render(<BadgeEmbedCode badge={mockBadges[0]!} />);
    expect(screen.getByTestId('embed-code')).toBeInTheDocument();
  });

  it('shows code snippet', () => {
    render(<BadgeEmbedCode badge={mockBadges[0]!} />);
    const code = screen.getByTestId('embed-code');
    expect(code).toHaveTextContent(/calibr/i);
  });

  it('shows copy button', () => {
    render(<BadgeEmbedCode badge={mockBadges[0]!} />);
    expect(screen.getByTestId('copy-embed')).toBeInTheDocument();
  });

  it('calls onCopy when copy clicked', () => {
    const onCopy = vi.fn();
    render(<BadgeEmbedCode badge={mockBadges[0]!} onCopy={onCopy} />);
    fireEvent.click(screen.getByTestId('copy-embed'));
    expect(onCopy).toHaveBeenCalled();
  });

  it('contains contract address', () => {
    render(<BadgeEmbedCode badge={mockBadges[0]!} />);
    const code = screen.getByTestId('embed-code');
    expect(code).toHaveTextContent('0x1234abcd');
  });
});

// =============================================================================
// PlatformShareButton Tests
// =============================================================================

describe('PlatformShareButton', () => {
  it('renders button', () => {
    render(
      <PlatformShareButton target={mockTargets[0]!} onClick={() => {}} />
    );
    expect(screen.getByTestId('platform-share-button')).toBeInTheDocument();
  });

  it('shows platform name', () => {
    render(
      <PlatformShareButton target={mockTargets[0]!} onClick={() => {}} />
    );
    expect(screen.getByText('Twitter')).toBeInTheDocument();
  });

  it('shows platform icon', () => {
    render(
      <PlatformShareButton target={mockTargets[0]!} onClick={() => {}} />
    );
    expect(screen.getByText('𝕏')).toBeInTheDocument();
  });

  it('calls onClick with target id', () => {
    const onClick = vi.fn();
    render(
      <PlatformShareButton target={mockTargets[0]!} onClick={onClick} />
    );
    fireEvent.click(screen.getByTestId('platform-share-button'));
    expect(onClick).toHaveBeenCalledWith('twitter');
  });
});

// =============================================================================
// SharedBadgePreview Tests
// =============================================================================

describe('SharedBadgePreview', () => {
  it('renders preview', () => {
    render(<SharedBadgePreview badge={mockBadges[0]!} />);
    expect(screen.getByTestId('shared-badge-preview')).toBeInTheDocument();
  });

  it('shows badge name', () => {
    render(<SharedBadgePreview badge={mockBadges[0]!} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
  });

  it('shows badge icon', () => {
    render(<SharedBadgePreview badge={mockBadges[0]!} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('shows calibr branding', () => {
    render(<SharedBadgePreview badge={mockBadges[0]!} />);
    const preview = screen.getByTestId('shared-badge-preview');
    expect(preview).toHaveTextContent(/calibr/i);
  });

  it('shows tier', () => {
    render(<SharedBadgePreview badge={mockBadges[2]!} />);
    expect(screen.getByText('EXPERT')).toBeInTheDocument();
  });
});

// =============================================================================
// BadgeMarketplaceGrid Tests
// =============================================================================

describe('BadgeMarketplaceGrid', () => {
  it('renders grid', () => {
    render(<BadgeMarketplaceGrid badges={mockBadges} />);
    expect(screen.getByTestId('badge-marketplace-grid')).toBeInTheDocument();
  });

  it('shows all badges', () => {
    render(<BadgeMarketplaceGrid badges={mockBadges} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Calibrated')).toBeInTheDocument();
    expect(screen.getByText('Expert Forecaster')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<BadgeMarketplaceGrid badges={[]} />);
    expect(screen.getByText(/no badges/i)).toBeInTheDocument();
  });

  it('calls onShare when share clicked', () => {
    const onShare = vi.fn();
    render(<BadgeMarketplaceGrid badges={mockBadges} onShare={onShare} />);
    const buttons = screen.getAllByTestId('share-button');
    fireEvent.click(buttons[0]!);
    expect(onShare).toHaveBeenCalledWith('streak-7');
  });

  it('shows badge count', () => {
    render(<BadgeMarketplaceGrid badges={mockBadges} />);
    const grid = screen.getByTestId('badge-marketplace-grid');
    expect(grid).toHaveTextContent('3');
  });
});

// =============================================================================
// BadgeMarketplacePage Tests
// =============================================================================

describe('BadgeMarketplacePage', () => {
  it('renders page', () => {
    render(
      <BadgeMarketplacePage badges={mockBadges} targets={mockTargets} />
    );
    expect(screen.getByTestId('badge-marketplace-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(
      <BadgeMarketplacePage badges={mockBadges} targets={mockTargets} />
    );
    expect(screen.getAllByText(/badge/i).length).toBeGreaterThan(0);
  });

  it('shows marketplace grid', () => {
    render(
      <BadgeMarketplacePage badges={mockBadges} targets={mockTargets} />
    );
    expect(screen.getByTestId('badge-marketplace-grid')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <BadgeMarketplacePage badges={[]} targets={[]} loading={true} />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('opens share modal on share click', () => {
    render(
      <BadgeMarketplacePage badges={mockBadges} targets={mockTargets} />
    );
    const buttons = screen.getAllByTestId('share-button');
    fireEvent.click(buttons[0]!);
    expect(screen.getByTestId('badge-share-modal')).toBeInTheDocument();
  });

  it('closes share modal', () => {
    render(
      <BadgeMarketplacePage badges={mockBadges} targets={mockTargets} />
    );
    const buttons = screen.getAllByTestId('share-button');
    fireEvent.click(buttons[0]!);
    expect(screen.getByTestId('badge-share-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close-share-modal'));
    expect(screen.queryByTestId('badge-share-modal')).not.toBeInTheDocument();
  });

  it('shows preview section', () => {
    render(
      <BadgeMarketplacePage badges={mockBadges} targets={mockTargets} />
    );
    expect(screen.getByTestId('shared-badge-preview')).toBeInTheDocument();
  });
});

// =============================================================================
// useBadgeSharing Hook Tests
// =============================================================================

describe('useBadgeSharing', () => {
  function TestComponent({ badges }: { badges: ShareableBadge[] }) {
    const {
      selectedBadge,
      selectBadge,
      clearSelection,
      shareUrl,
      embedCode,
      badgesByCategory,
    } = useBadgeSharing(badges);

    return (
      <div>
        <span data-testid="selected-id">{selectedBadge?.id ?? 'none'}</span>
        <span data-testid="share-url">{shareUrl ?? 'none'}</span>
        <span data-testid="embed-code">{embedCode ?? 'none'}</span>
        <span data-testid="category-count">{Object.keys(badgesByCategory).length}</span>
        <button onClick={() => selectBadge('streak-7')}>Select</button>
        <button onClick={clearSelection}>Clear</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with no selection', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
  });

  it('selects badge', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Select'));
    expect(screen.getByTestId('selected-id')).toHaveTextContent('streak-7');
  });

  it('clears selection', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
  });

  it('generates share URL when selected', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Select'));
    expect(screen.getByTestId('share-url')).not.toHaveTextContent('none');
  });

  it('generates embed code when selected', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Select'));
    expect(screen.getByTestId('embed-code')).not.toHaveTextContent('none');
  });

  it('groups badges by category', () => {
    render(<TestComponent badges={mockBadges} />);
    const count = parseInt(screen.getByTestId('category-count').textContent!);
    expect(count).toBe(3);
  });

  it('handles empty badges', () => {
    render(<TestComponent badges={[]} />);
    expect(screen.getByTestId('category-count')).toHaveTextContent('0');
  });
});
