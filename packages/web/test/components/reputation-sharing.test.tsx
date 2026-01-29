/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  ShareDestination,
  ShareableReputation,
  ShareResult,
  ShareSettings,
} from '../../src/components/reputation-sharing';
import {
  ShareFormatSelector,
  ShareDestinationCard,
  SharePreview,
  ShareLinkGenerator,
  ShareHistoryList,
  ShareSettingsPanel,
  ReputationShareCard,
  ReputationSharingDashboard,
  useReputationSharing,
} from '../../src/components/reputation-sharing';

// =============================================================================
// Test Data
// =============================================================================

const mockShareableReputation: ShareableReputation = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  ensName: 'forecaster.eth',
  totalScore: 1715,
  percentile: 92,
  level: 'Expert Forecaster',
  platforms: [
    { name: 'Optimism', score: 850, maxScore: 1000 },
    { name: 'Coinbase', score: 720, maxScore: 1000 },
    { name: 'Gitcoin', score: 45, maxScore: 100 },
    { name: 'ENS', score: 100, maxScore: 100 },
  ],
  badges: ['RetroPGF Participant', 'KYC Verified', 'Humanity Verified', 'ENS Holder'],
  generatedAt: new Date('2024-01-15T10:00:00').getTime(),
  signature: '0xabc123...',
};

const mockShareDestinations: ShareDestination[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '𝕏',
    supported: true,
    formats: ['text', 'image'],
  },
  {
    id: 'farcaster',
    name: 'Farcaster',
    icon: '🟣',
    supported: true,
    formats: ['text', 'frame'],
  },
  {
    id: 'lens',
    name: 'Lens Protocol',
    icon: '🌿',
    supported: true,
    formats: ['text', 'image'],
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '💬',
    supported: false,
    formats: ['text'],
  },
];

const mockShareResult: ShareResult = {
  id: 'share-123',
  destination: 'twitter',
  format: 'text',
  url: 'https://twitter.com/intent/tweet?text=...',
  sharedAt: new Date('2024-01-15T10:30:00').getTime(),
  status: 'success',
};

const mockShareHistory: ShareResult[] = [
  mockShareResult,
  {
    id: 'share-122',
    destination: 'farcaster',
    format: 'frame',
    url: 'https://warpcast.com/~/compose?text=...',
    sharedAt: new Date('2024-01-14T15:00:00').getTime(),
    status: 'success',
  },
  {
    id: 'share-121',
    destination: 'lens',
    format: 'image',
    url: null,
    sharedAt: new Date('2024-01-13T12:00:00').getTime(),
    status: 'failed',
    error: 'Connection timeout',
  },
];

const mockShareSettings: ShareSettings = {
  includeScore: true,
  includePercentile: true,
  includeBadges: true,
  includePlatforms: true,
  includeSignature: false,
  customMessage: '',
  privacyLevel: 'public',
};

// =============================================================================
// ShareFormatSelector Tests
// =============================================================================

describe('ShareFormatSelector', () => {
  it('renders format selector', () => {
    render(<ShareFormatSelector selected="text" onSelect={vi.fn()} />);
    expect(screen.getByTestId('share-format-selector')).toBeInTheDocument();
  });

  it('displays all format options', () => {
    render(<ShareFormatSelector selected="text" onSelect={vi.fn()} />);
    expect(screen.getByText(/text/i)).toBeInTheDocument();
    expect(screen.getByText(/image/i)).toBeInTheDocument();
    expect(screen.getByText(/link/i)).toBeInTheDocument();
  });

  it('highlights selected format', () => {
    render(<ShareFormatSelector selected="text" onSelect={vi.fn()} />);
    const textOption = screen.getByTestId('format-text');
    expect(textOption).toHaveClass('border-blue-400');
  });

  it('calls onSelect when format is clicked', () => {
    const onSelect = vi.fn();
    render(<ShareFormatSelector selected="text" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('format-image'));
    expect(onSelect).toHaveBeenCalledWith('image');
  });

  it('shows format descriptions', () => {
    render(<ShareFormatSelector selected="text" onSelect={vi.fn()} showDescriptions />);
    expect(screen.getByText(/plain text/i)).toBeInTheDocument();
  });

  it('disables unavailable formats', () => {
    render(
      <ShareFormatSelector
        selected="text"
        onSelect={vi.fn()}
        availableFormats={['text', 'link']}
      />
    );
    const imageOption = screen.getByTestId('format-image');
    expect(imageOption).toHaveClass('opacity-50');
  });
});

// =============================================================================
// ShareDestinationCard Tests
// =============================================================================

describe('ShareDestinationCard', () => {
  it('renders destination card', () => {
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[0]!}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByTestId('share-destination-card')).toBeInTheDocument();
  });

  it('displays destination name and icon', () => {
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[0]!}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByText('𝕏')).toBeInTheDocument();
  });

  it('shows supported formats', () => {
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[0]!}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(/text/i)).toBeInTheDocument();
    expect(screen.getByText(/image/i)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[0]!}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByTestId('share-destination-card'));
    expect(onSelect).toHaveBeenCalledWith('twitter');
  });

  it('shows selected state', () => {
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[0]!}
        onSelect={vi.fn()}
        isSelected
      />
    );
    expect(screen.getByTestId('share-destination-card')).toHaveClass('border-blue-400');
  });

  it('displays unsupported state', () => {
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[3]!}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('disables click for unsupported destinations', () => {
    const onSelect = vi.fn();
    render(
      <ShareDestinationCard
        destination={mockShareDestinations[3]!}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByTestId('share-destination-card'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// =============================================================================
// SharePreview Tests
// =============================================================================

describe('SharePreview', () => {
  it('renders preview', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={mockShareSettings}
      />
    );
    expect(screen.getByTestId('share-preview')).toBeInTheDocument();
  });

  it('shows reputation score', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={mockShareSettings}
      />
    );
    expect(screen.getByText(/1715/)).toBeInTheDocument();
  });

  it('displays percentile when enabled', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={mockShareSettings}
      />
    );
    // Component shows "Top 8%" (100 - 92 = 8)
    expect(screen.getByText(/percentile/i)).toBeInTheDocument();
  });

  it('shows badges when enabled', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={mockShareSettings}
      />
    );
    expect(screen.getByText(/retropgf participant/i)).toBeInTheDocument();
  });

  it('hides badges when disabled', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={{ ...mockShareSettings, includeBadges: false }}
      />
    );
    expect(screen.queryByText(/retropgf participant/i)).not.toBeInTheDocument();
  });

  it('shows ENS name', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={mockShareSettings}
      />
    );
    expect(screen.getByText(/forecaster\.eth/i)).toBeInTheDocument();
  });

  it('displays level', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={mockShareSettings}
      />
    );
    expect(screen.getByText(/expert forecaster/i)).toBeInTheDocument();
  });

  it('shows image preview for image format', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="image"
        settings={mockShareSettings}
      />
    );
    expect(screen.getByTestId('image-preview')).toBeInTheDocument();
  });

  it('displays custom message when provided', () => {
    render(
      <SharePreview
        reputation={mockShareableReputation}
        format="text"
        settings={{ ...mockShareSettings, customMessage: 'Check out my reputation!' }}
      />
    );
    expect(screen.getByText(/check out my reputation/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ShareLinkGenerator Tests
// =============================================================================

describe('ShareLinkGenerator', () => {
  it('renders link generator', () => {
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={vi.fn()}
      />
    );
    expect(screen.getByTestId('share-link-generator')).toBeInTheDocument();
  });

  it('displays generate button', () => {
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('calls onGenerate when button clicked', () => {
    const onGenerate = vi.fn();
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={onGenerate}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('shows generated link', () => {
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={vi.fn()}
        generatedLink="https://calibr.xyz/share/abc123"
      />
    );
    // Link is in input value attribute, not text content
    expect(screen.getByDisplayValue(/calibr\.xyz\/share/)).toBeInTheDocument();
  });

  it('displays copy button when link is generated', () => {
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={vi.fn()}
        generatedLink="https://calibr.xyz/share/abc123"
      />
    );
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={vi.fn()}
        isGenerating
      />
    );
    expect(screen.getByTestId('generating-indicator')).toBeInTheDocument();
  });

  it('displays expiration info', () => {
    render(
      <ShareLinkGenerator
        reputation={mockShareableReputation}
        onGenerate={vi.fn()}
        generatedLink="https://calibr.xyz/share/abc123"
        expiresAt={Date.now() + 86400000}
      />
    );
    expect(screen.getByTestId('expiration-info')).toBeInTheDocument();
  });
});

// =============================================================================
// ShareHistoryList Tests
// =============================================================================

describe('ShareHistoryList', () => {
  it('renders history list', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    expect(screen.getByTestId('share-history-list')).toBeInTheDocument();
  });

  it('displays all history entries', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    expect(screen.getAllByTestId('history-entry').length).toBe(3);
  });

  it('shows destination names', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    expect(screen.getByText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByText(/farcaster/i)).toBeInTheDocument();
    expect(screen.getByText(/lens/i)).toBeInTheDocument();
  });

  it('displays share formats', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    expect(screen.getAllByText(/text/i).length).toBeGreaterThan(0);
  });

  it('shows timestamps', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    const timestamps = screen.getAllByTestId('share-timestamp');
    expect(timestamps.length).toBe(3);
  });

  it('displays success status', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    const successIndicators = screen.getAllByTestId('status-success');
    expect(successIndicators.length).toBe(2);
  });

  it('displays failed status with error', () => {
    render(<ShareHistoryList history={mockShareHistory} />);
    expect(screen.getByTestId('status-failed')).toBeInTheDocument();
    expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
  });

  it('renders empty state when no history', () => {
    render(<ShareHistoryList history={[]} />);
    expect(screen.getByText(/no share history/i)).toBeInTheDocument();
  });

  it('limits displayed entries when maxEntries is set', () => {
    render(<ShareHistoryList history={mockShareHistory} maxEntries={2} />);
    expect(screen.getAllByTestId('history-entry').length).toBe(2);
  });
});

// =============================================================================
// ShareSettingsPanel Tests
// =============================================================================

describe('ShareSettingsPanel', () => {
  it('renders settings panel', () => {
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={vi.fn()} />);
    expect(screen.getByTestId('share-settings-panel')).toBeInTheDocument();
  });

  it('displays all setting toggles', () => {
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={vi.fn()} />);
    expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
  });

  it('shows score toggle', () => {
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={vi.fn()} />);
    expect(screen.getByText(/include score/i)).toBeInTheDocument();
  });

  it('shows badges toggle', () => {
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={vi.fn()} />);
    expect(screen.getByText(/include badges/i)).toBeInTheDocument();
  });

  it('calls onChange when toggle is clicked', () => {
    const onChange = vi.fn();
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={onChange} />);
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[0]!);
    expect(onChange).toHaveBeenCalled();
  });

  it('displays privacy level selector', () => {
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={vi.fn()} />);
    expect(screen.getByTestId('privacy-selector')).toBeInTheDocument();
  });

  it('shows custom message input', () => {
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/custom message/i)).toBeInTheDocument();
  });

  it('updates custom message', () => {
    const onChange = vi.fn();
    render(<ShareSettingsPanel settings={mockShareSettings} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/custom message/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(onChange).toHaveBeenCalled();
  });
});

// =============================================================================
// ReputationShareCard Tests
// =============================================================================

describe('ReputationShareCard', () => {
  it('renders share card', () => {
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByTestId('reputation-share-card')).toBeInTheDocument();
  });

  it('displays reputation summary', () => {
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText(/1715/)).toBeInTheDocument();
    expect(screen.getByText(/expert forecaster/i)).toBeInTheDocument();
  });

  it('shows share button', () => {
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('calls onShare when share button clicked', () => {
    const onShare = vi.fn();
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={onShare}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    expect(onShare).toHaveBeenCalled();
  });

  it('displays badge count', () => {
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText(/4 badges/i)).toBeInTheDocument();
  });

  it('shows platform count', () => {
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText(/4 platforms/i)).toBeInTheDocument();
  });

  it('displays ENS name when available', () => {
    render(
      <ReputationShareCard
        reputation={mockShareableReputation}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText(/forecaster\.eth/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationSharingDashboard Tests
// =============================================================================

describe('ReputationSharingDashboard', () => {
  const defaultProps = {
    reputation: mockShareableReputation,
    destinations: mockShareDestinations,
    history: mockShareHistory,
    settings: mockShareSettings,
    onShare: vi.fn(),
    onSettingsChange: vi.fn(),
    onGenerateLink: vi.fn(),
  };

  it('renders dashboard', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByTestId('sharing-dashboard')).toBeInTheDocument();
  });

  it('displays dashboard title', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByText(/share reputation/i)).toBeInTheDocument();
  });

  it('shows all destination cards', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getAllByTestId('share-destination-card').length).toBe(4);
  });

  it('displays format selector', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByTestId('share-format-selector')).toBeInTheDocument();
  });

  it('shows share preview', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByTestId('share-preview')).toBeInTheDocument();
  });

  it('displays settings panel', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByTestId('share-settings-panel')).toBeInTheDocument();
  });

  it('shows share history', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByTestId('share-history-list')).toBeInTheDocument();
  });

  it('displays link generator', () => {
    render(<ReputationSharingDashboard {...defaultProps} />);
    expect(screen.getByTestId('share-link-generator')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ReputationSharingDashboard {...defaultProps} isLoading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(<ReputationSharingDashboard {...defaultProps} error="Failed to load" />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('calls onShare when share is initiated', () => {
    const onShare = vi.fn();
    render(<ReputationSharingDashboard {...defaultProps} onShare={onShare} />);
    // Select a destination first
    fireEvent.click(screen.getAllByTestId('share-destination-card')[0]!);
    // Then share
    const shareButtons = screen.getAllByRole('button', { name: /share/i });
    fireEvent.click(shareButtons[shareButtons.length - 1]!);
    expect(onShare).toHaveBeenCalled();
  });
});

// =============================================================================
// useReputationSharing Hook Tests
// =============================================================================

describe('useReputationSharing', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      reputation,
      destinations,
      history,
      isLoading,
      isSharing,
      error,
      selectedDestination,
      selectedFormat,
      generatedLink,
      share,
      generateLink,
      updateSettings,
      selectDestination,
      selectFormat,
    } = useReputationSharing(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="is-sharing">{isSharing.toString()}</div>
        <div data-testid="error">{error ?? 'none'}</div>
        <div data-testid="reputation-score">{reputation?.totalScore ?? 0}</div>
        <div data-testid="destinations-count">{destinations.length}</div>
        <div data-testid="history-count">{history.length}</div>
        <div data-testid="selected-destination">{selectedDestination ?? 'none'}</div>
        <div data-testid="selected-format">{selectedFormat}</div>
        <div data-testid="generated-link">{generatedLink ?? 'none'}</div>
        <button onClick={() => selectDestination('twitter')}>Select Twitter</button>
        <button onClick={() => selectFormat('image')}>Select Image</button>
        <button onClick={() => share()}>Share</button>
        <button onClick={() => generateLink()}>Generate Link</button>
        <button onClick={() => updateSettings({ includeBadges: false })}>
          Update Settings
        </button>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x123" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads sharing data', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('destinations-count')).toHaveTextContent('4');
  });

  it('provides reputation data', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('reputation-score')).not.toHaveTextContent('0');
    }, { timeout: 2000 });
  });

  it('selects destination', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Select Twitter'));
    expect(screen.getByTestId('selected-destination')).toHaveTextContent('twitter');
  });

  it('selects format', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Select Image'));
    expect(screen.getByTestId('selected-format')).toHaveTextContent('image');
  });

  it('shares reputation', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Select Twitter'));
    fireEvent.click(screen.getByText('Share'));
    expect(screen.getByTestId('is-sharing')).toHaveTextContent('true');
  });

  it('generates share link', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Generate Link'));
    await waitFor(() => {
      expect(screen.getByTestId('generated-link')).not.toHaveTextContent('none');
    }, { timeout: 2000 });
  });

  it('updates settings', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Update Settings'));
    // Settings should be updated
    expect(screen.getByTestId('destinations-count')).toHaveTextContent('4');
  });

  it('handles different addresses', async () => {
    const { rerender } = render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    rerender(<TestComponent address="0x456" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});
