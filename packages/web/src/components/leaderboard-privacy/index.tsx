'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface PrivacySetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface LeaderboardPrivacyConfig {
  showOnLeaderboard: boolean;
  showScore: boolean;
  showTier: boolean;
  showForecasts: boolean;
  anonymizeAddress: boolean;
}

// =============================================================================
// PrivacyToggle Component
// =============================================================================

interface PrivacyToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function PrivacyToggle({ label, description, enabled, onChange }: PrivacyToggleProps) {
  return (
    <div data-testid="privacy-toggle" className="flex items-center justify-between py-2 font-mono">
      <div>
        <div className="text-[var(--terminal-green)]">{label}</div>
        {description && (
          <div className="text-[var(--terminal-dim)] text-xs">{description}</div>
        )}
      </div>
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => onChange(!enabled)}
        className="accent-[var(--terminal-green)]"
      />
    </div>
  );
}

// =============================================================================
// PrivacySettingsPanel Component
// =============================================================================

interface PrivacySettingsPanelProps {
  settings: PrivacySetting[];
  onSettingChange: (settingId: string, enabled: boolean) => void;
  onSave?: () => void;
}

export function PrivacySettingsPanel({ settings, onSettingChange, onSave }: PrivacySettingsPanelProps) {
  const isHidden = settings.find((s) => s.id === 'showOnLeaderboard')?.enabled === false;

  return (
    <div data-testid="privacy-settings-panel" className="border border-[var(--terminal-green)] font-mono p-4">
      <h3 className="text-[var(--terminal-green)] font-bold mb-4">Privacy Settings</h3>

      {isHidden && (
        <div className="mb-4 p-2 border border-yellow-500 text-yellow-500 text-xs">
          You are currently hidden from leaderboards
        </div>
      )}

      <div className="space-y-1">
        {settings.map((setting) => (
          <PrivacyToggle
            key={setting.id}
            label={setting.label}
            description={setting.description}
            enabled={setting.enabled}
            onChange={(enabled) => onSettingChange(setting.id, enabled)}
          />
        ))}
      </div>

      {onSave && (
        <button
          aria-label="save"
          onClick={onSave}
          className="mt-4 w-full border border-[var(--terminal-green)] text-[var(--terminal-green)] py-2 text-sm hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
        >
          Save Settings
        </button>
      )}
    </div>
  );
}

// =============================================================================
// PrivateProfileBadge Component
// =============================================================================

interface PrivateProfileBadgeProps {
  compact?: boolean;
}

export function PrivateProfileBadge({ compact = false }: PrivateProfileBadgeProps) {
  return (
    <span
      data-testid="private-profile-badge"
      title="This user has opted out of public leaderboards"
      className={`inline-flex items-center border border-[var(--terminal-dim)] text-[var(--terminal-dim)] font-mono ${compact ? 'compact px-1 text-xs' : 'px-2 py-1 text-xs'}`}
    >
      🔒 Private
    </span>
  );
}

// =============================================================================
// AnonymizedEntry Component
// =============================================================================

interface AnonymizedEntryProps {
  rank: number;
  score: number;
  tier: string;
  showScore?: boolean;
  showTier?: boolean;
}

export function AnonymizedEntry({
  rank,
  score,
  tier,
  showScore = true,
  showTier = true,
}: AnonymizedEntryProps) {
  return (
    <div
      data-testid="anonymized-entry"
      className="flex items-center gap-3 p-3 border border-[var(--terminal-green)] border-opacity-20 font-mono"
    >
      <div className="w-10 text-[var(--terminal-green)] font-bold">#{rank}</div>
      <div className="flex-1">
        <div className="text-[var(--terminal-dim)]">Anonymous Forecaster</div>
        {showTier && <span className="text-[var(--terminal-dim)] text-xs">{tier}</span>}
      </div>
      <div className="text-right">
        <div className="text-[var(--terminal-green)] font-bold">
          {showScore ? score : '---'}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LeaderboardPrivacyNotice Component
// =============================================================================

interface LeaderboardPrivacyNoticeProps {
  hiddenCount: number;
  totalCount: number;
}

export function LeaderboardPrivacyNotice({ hiddenCount }: LeaderboardPrivacyNoticeProps) {
  if (hiddenCount === 0) return null;

  return (
    <div
      data-testid="privacy-notice"
      className="p-3 border border-[var(--terminal-dim)] text-[var(--terminal-dim)] text-xs font-mono mb-4"
    >
      {hiddenCount} forecaster{hiddenCount !== 1 ? 's have' : ' has'} opted out of the public leaderboard
    </div>
  );
}

// =============================================================================
// LeaderboardPrivacyPage Component
// =============================================================================

interface LeaderboardPrivacyPageProps {
  settings: PrivacySetting[];
  onSettingChange: (settingId: string, enabled: boolean) => void;
  config: LeaderboardPrivacyConfig;
  loading?: boolean;
  onSave?: () => void;
}

export function LeaderboardPrivacyPage({
  settings,
  onSettingChange,
  config,
  loading = false,
  onSave,
}: LeaderboardPrivacyPageProps) {
  if (loading) {
    return (
      <div data-testid="leaderboard-privacy-page" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading privacy settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="leaderboard-privacy-page" className="max-w-2xl mx-auto p-4 font-mono">
      <h1 className="text-[var(--terminal-green)] text-2xl mb-6">Leaderboard Privacy</h1>

      <div className="mb-6">
        <PrivacySettingsPanel
          settings={settings}
          onSettingChange={onSettingChange}
          onSave={onSave}
        />
      </div>

      <div className="border border-[var(--terminal-green)] p-4">
        <h3 className="text-[var(--terminal-green)] font-bold mb-3">Preview</h3>
        <p className="text-[var(--terminal-dim)] text-xs mb-3">
          This is how your profile will appear on the leaderboard:
        </p>
        {config.showOnLeaderboard ? (
          <AnonymizedEntry
            rank={42}
            score={750}
            tier="EXPERT"
            showScore={config.showScore}
            showTier={config.showTier}
          />
        ) : (
          <div className="text-center py-4 text-[var(--terminal-dim)]">
            Your profile is hidden from public leaderboards
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// useLeaderboardPrivacy Hook
// =============================================================================

const SETTING_LABELS: Record<keyof LeaderboardPrivacyConfig, { label: string; description: string }> = {
  showOnLeaderboard: {
    label: 'Show on Leaderboard',
    description: 'Display your profile on public leaderboards',
  },
  showScore: {
    label: 'Show Score',
    description: 'Display your calibration score publicly',
  },
  showTier: {
    label: 'Show Tier',
    description: 'Display your tier badge publicly',
  },
  showForecasts: {
    label: 'Show Forecasts',
    description: 'Display your forecast count publicly',
  },
  anonymizeAddress: {
    label: 'Anonymize Address',
    description: 'Replace your address with an anonymous identifier',
  },
};

interface UseLeaderboardPrivacyReturn {
  config: LeaderboardPrivacyConfig;
  settings: PrivacySetting[];
  updateSetting: (key: string, value: boolean) => void;
  isVisible: boolean;
  isModified: boolean;
}

export function useLeaderboardPrivacy(
  initialConfig: LeaderboardPrivacyConfig
): UseLeaderboardPrivacyReturn {
  const [config, setConfig] = useState<LeaderboardPrivacyConfig>(initialConfig);
  const [isModified, setIsModified] = useState(false);

  const settings = useMemo<PrivacySetting[]>(() => {
    return (Object.keys(SETTING_LABELS) as (keyof LeaderboardPrivacyConfig)[]).map((key) => ({
      id: key,
      label: SETTING_LABELS[key].label,
      description: SETTING_LABELS[key].description,
      enabled: config[key],
    }));
  }, [config]);

  const updateSetting = useCallback((key: string, value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsModified(true);
  }, []);

  const isVisible = config.showOnLeaderboard;

  return {
    config,
    settings,
    updateSetting,
    isVisible,
    isModified,
  };
}
