/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  PrivacyLevel,
  AttestationMode,
  PrivacySettings as PrivacySettingsType,
} from '../../src/components/privacy-settings';
import {
  PrivacyLevelSelector,
  PrivacyLevelOption,
  AttestationModeSelector,
  AttestationModeOption,
  LeaderboardOptOut,
  ForecastPrivacyDefaults,
  DataExportControls,
  PrivacyExplanationTooltip,
  PrivacySectionCard,
  PrivacySettingsSummary,
  PrivacySettingsPanel,
  usePrivacySettings,
} from '../../src/components/privacy-settings';

// =============================================================================
// Test Data
// =============================================================================

const mockSettings: PrivacySettingsType = {
  profileVisibility: 'authenticated',
  leaderboardOptOut: false,
  defaultForecastPrivacy: 'public',
  attestationMode: 'onchain',
  allowDataExport: true,
  allowReputationSharing: true,
};

// =============================================================================
// PrivacyLevelOption Tests
// =============================================================================

describe('PrivacyLevelOption', () => {
  it('renders option', () => {
    render(<PrivacyLevelOption level="public" selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId('privacy-level-option')).toBeInTheDocument();
  });

  it('shows public level', () => {
    render(<PrivacyLevelOption level="public" selected={false} onSelect={() => {}} />);
    const option = screen.getByTestId('privacy-level-option');
    expect(option).toHaveTextContent(/public/i);
  });

  it('shows authenticated level', () => {
    render(<PrivacyLevelOption level="authenticated" selected={false} onSelect={() => {}} />);
    const option = screen.getByTestId('privacy-level-option');
    expect(option).toHaveTextContent(/authenticated|logged in/i);
  });

  it('shows private level', () => {
    render(<PrivacyLevelOption level="private" selected={false} onSelect={() => {}} />);
    const option = screen.getByTestId('privacy-level-option');
    expect(option).toHaveTextContent(/private/i);
  });

  it('highlights when selected', () => {
    render(<PrivacyLevelOption level="public" selected={true} onSelect={() => {}} />);
    const option = screen.getByTestId('privacy-level-option');
    expect(option.className).toMatch(/selected|active|green/i);
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<PrivacyLevelOption level="public" selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('privacy-level-option'));
    expect(onSelect).toHaveBeenCalledWith('public');
  });
});

// =============================================================================
// PrivacyLevelSelector Tests
// =============================================================================

describe('PrivacyLevelSelector', () => {
  it('renders selector', () => {
    render(<PrivacyLevelSelector selected="public" onSelect={() => {}} />);
    expect(screen.getByTestId('privacy-level-selector')).toBeInTheDocument();
  });

  it('shows all three levels', () => {
    render(<PrivacyLevelSelector selected="public" onSelect={() => {}} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Logged In Users')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<PrivacyLevelSelector selected="public" onSelect={() => {}} label="Profile Visibility" />);
    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
  });

  it('calls onSelect when option clicked', () => {
    const onSelect = vi.fn();
    render(<PrivacyLevelSelector selected="public" onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/private/i));
    expect(onSelect).toHaveBeenCalledWith('private');
  });
});

// =============================================================================
// AttestationModeOption Tests
// =============================================================================

describe('AttestationModeOption', () => {
  it('renders option', () => {
    render(<AttestationModeOption mode="onchain" selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId('attestation-mode-option')).toBeInTheDocument();
  });

  it('shows onchain mode', () => {
    render(<AttestationModeOption mode="onchain" selected={false} onSelect={() => {}} />);
    const option = screen.getByTestId('attestation-mode-option');
    expect(option).toHaveTextContent(/on-chain|onchain/i);
  });

  it('shows offchain mode', () => {
    render(<AttestationModeOption mode="offchain" selected={false} onSelect={() => {}} />);
    const option = screen.getByTestId('attestation-mode-option');
    expect(option).toHaveTextContent(/off-chain|offchain/i);
  });

  it('shows private mode', () => {
    render(<AttestationModeOption mode="private" selected={false} onSelect={() => {}} />);
    const option = screen.getByTestId('attestation-mode-option');
    expect(option).toHaveTextContent(/private|merkle/i);
  });

  it('highlights when selected', () => {
    render(<AttestationModeOption mode="onchain" selected={true} onSelect={() => {}} />);
    const option = screen.getByTestId('attestation-mode-option');
    expect(option.className).toMatch(/selected|active|green/i);
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<AttestationModeOption mode="offchain" selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('attestation-mode-option'));
    expect(onSelect).toHaveBeenCalledWith('offchain');
  });
});

// =============================================================================
// AttestationModeSelector Tests
// =============================================================================

describe('AttestationModeSelector', () => {
  it('renders selector', () => {
    render(<AttestationModeSelector selected="onchain" onSelect={() => {}} />);
    expect(screen.getByTestId('attestation-mode-selector')).toBeInTheDocument();
  });

  it('shows all three modes', () => {
    render(<AttestationModeSelector selected="onchain" onSelect={() => {}} />);
    expect(screen.getByText(/on-chain|onchain/i)).toBeInTheDocument();
    expect(screen.getByText(/off-chain|offchain/i)).toBeInTheDocument();
    expect(screen.getByText(/private|merkle/i)).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<AttestationModeSelector selected="onchain" onSelect={() => {}} label="Attestation Mode" />);
    expect(screen.getByText('Attestation Mode')).toBeInTheDocument();
  });

  it('calls onSelect when option clicked', () => {
    const onSelect = vi.fn();
    render(<AttestationModeSelector selected="onchain" onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/private|merkle/i));
    expect(onSelect).toHaveBeenCalledWith('private');
  });
});

// =============================================================================
// LeaderboardOptOut Tests
// =============================================================================

describe('LeaderboardOptOut', () => {
  it('renders component', () => {
    render(<LeaderboardOptOut optedOut={false} onToggle={() => {}} />);
    expect(screen.getByTestId('leaderboard-opt-out')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<LeaderboardOptOut optedOut={false} onToggle={() => {}} />);
    expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();
  });

  it('shows unchecked state', () => {
    render(<LeaderboardOptOut optedOut={false} onToggle={() => {}} />);
    const toggle = screen.getByTestId('leaderboard-toggle');
    expect(toggle).not.toBeChecked();
  });

  it('shows checked state when opted out', () => {
    render(<LeaderboardOptOut optedOut={true} onToggle={() => {}} />);
    const toggle = screen.getByTestId('leaderboard-toggle');
    expect(toggle).toBeChecked();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<LeaderboardOptOut optedOut={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByTestId('leaderboard-toggle'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});

// =============================================================================
// ForecastPrivacyDefaults Tests
// =============================================================================

describe('ForecastPrivacyDefaults', () => {
  it('renders component', () => {
    render(<ForecastPrivacyDefaults selected="public" onSelect={() => {}} />);
    expect(screen.getByTestId('forecast-privacy-defaults')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<ForecastPrivacyDefaults selected="public" onSelect={() => {}} />);
    expect(screen.getByText('Default Forecast Privacy')).toBeInTheDocument();
  });

  it('shows privacy level selector', () => {
    render(<ForecastPrivacyDefaults selected="public" onSelect={() => {}} />);
    expect(screen.getByTestId('privacy-level-selector')).toBeInTheDocument();
  });

  it('calls onSelect when changed', () => {
    const onSelect = vi.fn();
    render(<ForecastPrivacyDefaults selected="public" onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/private/i));
    expect(onSelect).toHaveBeenCalledWith('private');
  });
});

// =============================================================================
// DataExportControls Tests
// =============================================================================

describe('DataExportControls', () => {
  it('renders component', () => {
    render(<DataExportControls allowExport={true} allowReputationSharing={true} onExportToggle={() => {}} onReputationToggle={() => {}} />);
    expect(screen.getByTestId('data-export-controls')).toBeInTheDocument();
  });

  it('shows export toggle', () => {
    render(<DataExportControls allowExport={true} allowReputationSharing={true} onExportToggle={() => {}} onReputationToggle={() => {}} />);
    expect(screen.getByTestId('export-toggle')).toBeInTheDocument();
  });

  it('shows reputation toggle', () => {
    render(<DataExportControls allowExport={true} allowReputationSharing={true} onExportToggle={() => {}} onReputationToggle={() => {}} />);
    expect(screen.getByTestId('reputation-toggle')).toBeInTheDocument();
  });

  it('calls onExportToggle when export clicked', () => {
    const onExportToggle = vi.fn();
    render(<DataExportControls allowExport={true} allowReputationSharing={true} onExportToggle={onExportToggle} onReputationToggle={() => {}} />);
    fireEvent.click(screen.getByTestId('export-toggle'));
    expect(onExportToggle).toHaveBeenCalledWith(false);
  });

  it('calls onReputationToggle when reputation clicked', () => {
    const onReputationToggle = vi.fn();
    render(<DataExportControls allowExport={true} allowReputationSharing={true} onExportToggle={() => {}} onReputationToggle={onReputationToggle} />);
    fireEvent.click(screen.getByTestId('reputation-toggle'));
    expect(onReputationToggle).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// PrivacyExplanationTooltip Tests
// =============================================================================

describe('PrivacyExplanationTooltip', () => {
  it('renders tooltip', () => {
    render(<PrivacyExplanationTooltip topic="attestation-mode" />);
    expect(screen.getByTestId('privacy-explanation-tooltip')).toBeInTheDocument();
  });

  it('shows attestation mode explanation', () => {
    render(<PrivacyExplanationTooltip topic="attestation-mode" />);
    const tooltip = screen.getByTestId('privacy-explanation-tooltip');
    expect(tooltip).toHaveTextContent(/attestation|chain|merkle/i);
  });

  it('shows privacy level explanation', () => {
    render(<PrivacyExplanationTooltip topic="privacy-level" />);
    const tooltip = screen.getByTestId('privacy-explanation-tooltip');
    expect(tooltip).toHaveTextContent(/visibility|public|private/i);
  });

  it('shows leaderboard explanation', () => {
    render(<PrivacyExplanationTooltip topic="leaderboard" />);
    const tooltip = screen.getByTestId('privacy-explanation-tooltip');
    expect(tooltip).toHaveTextContent(/leaderboard|ranking|opt/i);
  });
});

// =============================================================================
// PrivacySectionCard Tests
// =============================================================================

describe('PrivacySectionCard', () => {
  it('renders card', () => {
    render(<PrivacySectionCard title="Test Section"><div>Content</div></PrivacySectionCard>);
    expect(screen.getByTestId('privacy-section-card')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<PrivacySectionCard title="Test Section"><div>Content</div></PrivacySectionCard>);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<PrivacySectionCard title="Test Section"><div data-testid="child">Content</div></PrivacySectionCard>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(<PrivacySectionCard title="Test Section" description="This is a description"><div>Content</div></PrivacySectionCard>);
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });
});

// =============================================================================
// PrivacySettingsSummary Tests
// =============================================================================

describe('PrivacySettingsSummary', () => {
  it('renders summary', () => {
    render(<PrivacySettingsSummary settings={mockSettings} />);
    expect(screen.getByTestId('privacy-settings-summary')).toBeInTheDocument();
  });

  it('shows profile visibility', () => {
    render(<PrivacySettingsSummary settings={mockSettings} />);
    const summary = screen.getByTestId('privacy-settings-summary');
    expect(summary).toHaveTextContent(/authenticated/i);
  });

  it('shows attestation mode', () => {
    render(<PrivacySettingsSummary settings={mockSettings} />);
    const summary = screen.getByTestId('privacy-settings-summary');
    expect(summary).toHaveTextContent(/on-chain|onchain/i);
  });

  it('shows leaderboard status', () => {
    render(<PrivacySettingsSummary settings={mockSettings} />);
    const summary = screen.getByTestId('privacy-settings-summary');
    expect(summary).toHaveTextContent(/leaderboard/i);
  });
});

// =============================================================================
// PrivacySettingsPanel Tests
// =============================================================================

describe('PrivacySettingsPanel', () => {
  it('renders panel', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getByTestId('privacy-settings-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getAllByText(/privacy|settings/i).length).toBeGreaterThan(0);
  });

  it('shows profile visibility section', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
  });

  it('shows attestation mode section', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getByText('Attestation Mode')).toBeInTheDocument();
  });

  it('shows leaderboard section', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getByTestId('leaderboard-opt-out')).toBeInTheDocument();
  });

  it('shows data export section', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getByTestId('data-export-controls')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PrivacySettingsPanel settings={null} loading={true} onSettingsChange={() => {}} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('calls onSettingsChange when setting changed', () => {
    const onSettingsChange = vi.fn();
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={onSettingsChange} />);
    fireEvent.click(screen.getByTestId('leaderboard-toggle'));
    expect(onSettingsChange).toHaveBeenCalled();
  });

  it('shows save button', () => {
    render(<PrivacySettingsPanel settings={mockSettings} onSettingsChange={() => {}} />);
    expect(screen.getByTestId('save-settings-button')).toBeInTheDocument();
  });
});

// =============================================================================
// usePrivacySettings Hook Tests
// =============================================================================

describe('usePrivacySettings', () => {
  function TestComponent({ settings }: { settings: PrivacySettingsType | null }) {
    const {
      isPrivate,
      isPublic,
      isOnChain,
      isOffChain,
      isMerklePrivate,
      showOnLeaderboard,
      canExportData,
      canShareReputation,
      privacyScore,
    } = usePrivacySettings(settings);

    return (
      <div>
        <span data-testid="is-private">{isPrivate ? 'yes' : 'no'}</span>
        <span data-testid="is-public">{isPublic ? 'yes' : 'no'}</span>
        <span data-testid="is-onchain">{isOnChain ? 'yes' : 'no'}</span>
        <span data-testid="is-offchain">{isOffChain ? 'yes' : 'no'}</span>
        <span data-testid="is-merkle">{isMerklePrivate ? 'yes' : 'no'}</span>
        <span data-testid="show-leaderboard">{showOnLeaderboard ? 'yes' : 'no'}</span>
        <span data-testid="can-export">{canExportData ? 'yes' : 'no'}</span>
        <span data-testid="can-share">{canShareReputation ? 'yes' : 'no'}</span>
        <span data-testid="privacy-score">{privacyScore}</span>
      </div>
    );
  }

  it('detects private profile', () => {
    const privateSettings = { ...mockSettings, profileVisibility: 'private' as PrivacyLevel };
    render(<TestComponent settings={privateSettings} />);
    expect(screen.getByTestId('is-private')).toHaveTextContent('yes');
  });

  it('detects public profile', () => {
    const publicSettings = { ...mockSettings, profileVisibility: 'public' as PrivacyLevel };
    render(<TestComponent settings={publicSettings} />);
    expect(screen.getByTestId('is-public')).toHaveTextContent('yes');
  });

  it('detects onchain mode', () => {
    render(<TestComponent settings={mockSettings} />);
    expect(screen.getByTestId('is-onchain')).toHaveTextContent('yes');
  });

  it('detects offchain mode', () => {
    const offchainSettings = { ...mockSettings, attestationMode: 'offchain' as AttestationMode };
    render(<TestComponent settings={offchainSettings} />);
    expect(screen.getByTestId('is-offchain')).toHaveTextContent('yes');
  });

  it('detects merkle private mode', () => {
    const merkleSettings = { ...mockSettings, attestationMode: 'private' as AttestationMode };
    render(<TestComponent settings={merkleSettings} />);
    expect(screen.getByTestId('is-merkle')).toHaveTextContent('yes');
  });

  it('detects leaderboard visibility', () => {
    render(<TestComponent settings={mockSettings} />);
    expect(screen.getByTestId('show-leaderboard')).toHaveTextContent('yes');
  });

  it('detects export permission', () => {
    render(<TestComponent settings={mockSettings} />);
    expect(screen.getByTestId('can-export')).toHaveTextContent('yes');
  });

  it('detects sharing permission', () => {
    render(<TestComponent settings={mockSettings} />);
    expect(screen.getByTestId('can-share')).toHaveTextContent('yes');
  });

  it('calculates privacy score', () => {
    render(<TestComponent settings={mockSettings} />);
    const score = parseInt(screen.getByTestId('privacy-score').textContent!);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles null settings', () => {
    render(<TestComponent settings={null} />);
    expect(screen.getByTestId('is-public')).toHaveTextContent('no');
    expect(screen.getByTestId('privacy-score')).toHaveTextContent('0');
  });
});
