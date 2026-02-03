/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  PrivacySetting,
  LeaderboardPrivacyConfig,
} from '../../src/components/leaderboard-privacy';
import {
  PrivacyToggle,
  PrivacySettingsPanel,
  PrivateProfileBadge,
  AnonymizedEntry,
  LeaderboardPrivacyNotice,
  LeaderboardPrivacyPage,
  useLeaderboardPrivacy,
} from '../../src/components/leaderboard-privacy';

// =============================================================================
// Test Data
// =============================================================================

const mockPrivacyConfig: LeaderboardPrivacyConfig = {
  showOnLeaderboard: true,
  showScore: true,
  showTier: true,
  showForecasts: false,
  anonymizeAddress: false,
};

const mockPrivacySettings: PrivacySetting[] = [
  {
    id: 'showOnLeaderboard',
    label: 'Show on Leaderboard',
    description: 'Display your profile on public leaderboards',
    enabled: true,
  },
  {
    id: 'showScore',
    label: 'Show Score',
    description: 'Display your calibration score publicly',
    enabled: true,
  },
  {
    id: 'showTier',
    label: 'Show Tier',
    description: 'Display your tier badge publicly',
    enabled: true,
  },
  {
    id: 'showForecasts',
    label: 'Show Forecasts',
    description: 'Display your forecast count publicly',
    enabled: false,
  },
  {
    id: 'anonymizeAddress',
    label: 'Anonymize Address',
    description: 'Replace your address with an anonymous identifier',
    enabled: false,
  },
];

// =============================================================================
// PrivacyToggle Tests
// =============================================================================

describe('PrivacyToggle', () => {
  it('renders toggle', () => {
    render(
      <PrivacyToggle
        label="Show on Leaderboard"
        enabled={true}
        onChange={() => {}}
      />
    );
    expect(screen.getByTestId('privacy-toggle')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(
      <PrivacyToggle
        label="Show on Leaderboard"
        enabled={true}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Show on Leaderboard')).toBeInTheDocument();
  });

  it('shows enabled state', () => {
    render(
      <PrivacyToggle
        label="Show on Leaderboard"
        enabled={true}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('shows disabled state', () => {
    render(
      <PrivacyToggle
        label="Show Forecasts"
        enabled={false}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange when toggled', () => {
    const onChange = vi.fn();
    render(
      <PrivacyToggle
        label="Show on Leaderboard"
        enabled={true}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('shows description when provided', () => {
    render(
      <PrivacyToggle
        label="Show on Leaderboard"
        description="Display your profile on public leaderboards"
        enabled={true}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/display your profile/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PrivacySettingsPanel Tests
// =============================================================================

describe('PrivacySettingsPanel', () => {
  it('renders settings panel', () => {
    render(
      <PrivacySettingsPanel
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
      />
    );
    expect(screen.getByTestId('privacy-settings-panel')).toBeInTheDocument();
  });

  it('shows panel title', () => {
    render(
      <PrivacySettingsPanel
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
      />
    );
    expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
  });

  it('shows all settings', () => {
    render(
      <PrivacySettingsPanel
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
      />
    );
    expect(screen.getByText('Show on Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Show Score')).toBeInTheDocument();
    expect(screen.getByText('Show Tier')).toBeInTheDocument();
    expect(screen.getByText('Show Forecasts')).toBeInTheDocument();
    expect(screen.getByText('Anonymize Address')).toBeInTheDocument();
  });

  it('calls onSettingChange when toggle changed', () => {
    const onSettingChange = vi.fn();
    render(
      <PrivacySettingsPanel
        settings={mockPrivacySettings}
        onSettingChange={onSettingChange}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    expect(onSettingChange).toHaveBeenCalledWith('showOnLeaderboard', false);
  });

  it('shows warning when leaderboard visibility is off', () => {
    const hiddenSettings = mockPrivacySettings.map((s) =>
      s.id === 'showOnLeaderboard' ? { ...s, enabled: false } : s
    );
    render(
      <PrivacySettingsPanel
        settings={hiddenSettings}
        onSettingChange={() => {}}
      />
    );
    expect(screen.getByText(/hidden from leaderboards/i)).toBeInTheDocument();
  });

  it('shows save button when onSave provided', () => {
    render(
      <PrivacySettingsPanel
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
        onSave={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave when save clicked', () => {
    const onSave = vi.fn();
    render(
      <PrivacySettingsPanel
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalled();
  });
});

// =============================================================================
// PrivateProfileBadge Tests
// =============================================================================

describe('PrivateProfileBadge', () => {
  it('renders badge', () => {
    render(<PrivateProfileBadge />);
    expect(screen.getByTestId('private-profile-badge')).toBeInTheDocument();
  });

  it('shows private label', () => {
    render(<PrivateProfileBadge />);
    expect(screen.getByText(/private/i)).toBeInTheDocument();
  });

  it('shows tooltip text', () => {
    render(<PrivateProfileBadge />);
    expect(screen.getByTitle(/opted out/i)).toBeInTheDocument();
  });

  it('supports compact mode', () => {
    render(<PrivateProfileBadge compact />);
    expect(screen.getByTestId('private-profile-badge')).toHaveClass('compact');
  });
});

// =============================================================================
// AnonymizedEntry Tests
// =============================================================================

describe('AnonymizedEntry', () => {
  it('renders anonymized entry', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
      />
    );
    expect(screen.getByTestId('anonymized-entry')).toBeInTheDocument();
  });

  it('shows rank', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
      />
    );
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('shows anonymous identifier', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
      />
    );
    expect(screen.getByText(/anonymous/i)).toBeInTheDocument();
  });

  it('shows score when allowed', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
        showScore={true}
      />
    );
    expect(screen.getByText('870')).toBeInTheDocument();
  });

  it('hides score when not allowed', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
        showScore={false}
      />
    );
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('shows tier when allowed', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
        showTier={true}
      />
    );
    expect(screen.getByText('MASTER')).toBeInTheDocument();
  });

  it('hides tier when not allowed', () => {
    render(
      <AnonymizedEntry
        rank={5}
        score={870}
        tier="MASTER"
        showTier={false}
      />
    );
    expect(screen.queryByText('MASTER')).not.toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardPrivacyNotice Tests
// =============================================================================

describe('LeaderboardPrivacyNotice', () => {
  it('renders notice', () => {
    render(<LeaderboardPrivacyNotice hiddenCount={12} totalCount={100} />);
    expect(screen.getByTestId('privacy-notice')).toBeInTheDocument();
  });

  it('shows hidden count', () => {
    render(<LeaderboardPrivacyNotice hiddenCount={12} totalCount={100} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('shows privacy message', () => {
    render(<LeaderboardPrivacyNotice hiddenCount={12} totalCount={100} />);
    expect(screen.getByText(/opted out/i)).toBeInTheDocument();
  });

  it('does not render when no hidden users', () => {
    render(<LeaderboardPrivacyNotice hiddenCount={0} totalCount={100} />);
    expect(screen.queryByTestId('privacy-notice')).not.toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardPrivacyPage Tests
// =============================================================================

describe('LeaderboardPrivacyPage', () => {
  it('renders page', () => {
    render(
      <LeaderboardPrivacyPage
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
        config={mockPrivacyConfig}
      />
    );
    expect(screen.getByTestId('leaderboard-privacy-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(
      <LeaderboardPrivacyPage
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
        config={mockPrivacyConfig}
      />
    );
    expect(screen.getAllByText(/privacy/i).length).toBeGreaterThan(0);
  });

  it('shows settings panel', () => {
    render(
      <LeaderboardPrivacyPage
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
        config={mockPrivacyConfig}
      />
    );
    expect(screen.getByTestId('privacy-settings-panel')).toBeInTheDocument();
  });

  it('shows preview section', () => {
    render(
      <LeaderboardPrivacyPage
        settings={mockPrivacySettings}
        onSettingChange={() => {}}
        config={mockPrivacyConfig}
      />
    );
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <LeaderboardPrivacyPage
        settings={[]}
        onSettingChange={() => {}}
        config={mockPrivacyConfig}
        loading={true}
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// useLeaderboardPrivacy Hook Tests
// =============================================================================

describe('useLeaderboardPrivacy', () => {
  function TestComponent({
    initialConfig,
  }: {
    initialConfig: LeaderboardPrivacyConfig;
  }) {
    const {
      config,
      settings,
      updateSetting,
      isVisible,
      isModified,
    } = useLeaderboardPrivacy(initialConfig);

    return (
      <div>
        <span data-testid="is-visible">{String(isVisible)}</span>
        <span data-testid="is-modified">{String(isModified)}</span>
        <span data-testid="show-score">{String(config.showScore)}</span>
        <span data-testid="settings-count">{settings.length}</span>
        <button onClick={() => updateSetting('showScore', false)}>Hide Score</button>
        <button onClick={() => updateSetting('showOnLeaderboard', false)}>Hide Profile</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with provided config', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    expect(screen.getByTestId('show-score')).toHaveTextContent('true');
  });

  it('reports visibility correctly', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    expect(screen.getByTestId('is-visible')).toHaveTextContent('true');
  });

  it('starts as not modified', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    expect(screen.getByTestId('is-modified')).toHaveTextContent('false');
  });

  it('generates settings from config', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    expect(screen.getByTestId('settings-count')).toHaveTextContent('5');
  });

  it('updates setting value', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    fireEvent.click(screen.getByText('Hide Score'));
    expect(screen.getByTestId('show-score')).toHaveTextContent('false');
  });

  it('marks as modified after change', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    fireEvent.click(screen.getByText('Hide Score'));
    expect(screen.getByTestId('is-modified')).toHaveTextContent('true');
  });

  it('updates visibility when leaderboard toggled off', () => {
    render(<TestComponent initialConfig={mockPrivacyConfig} />);
    fireEvent.click(screen.getByText('Hide Profile'));
    expect(screen.getByTestId('is-visible')).toHaveTextContent('false');
  });
});
