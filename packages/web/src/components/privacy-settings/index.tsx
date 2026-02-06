'use client';

import { useMemo, type ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type PrivacyLevel = 'public' | 'authenticated' | 'private';
export type AttestationMode = 'onchain' | 'offchain' | 'private';

export interface PrivacySettings {
  profileVisibility: PrivacyLevel;
  leaderboardOptOut: boolean;
  defaultForecastPrivacy: PrivacyLevel;
  attestationMode: AttestationMode;
  allowDataExport: boolean;
  allowReputationSharing: boolean;
}

// =============================================================================
// PrivacyLevelOption Component
// =============================================================================

interface PrivacyLevelOptionProps {
  level: PrivacyLevel;
  selected: boolean;
  onSelect: (level: PrivacyLevel) => void;
}

const PRIVACY_LEVEL_CONFIG: Record<PrivacyLevel, { label: string; description: string }> = {
  public: { label: 'Public', description: 'Visible to everyone' },
  authenticated: { label: 'Logged In Users', description: 'Only authenticated users can view' },
  private: { label: 'Private', description: 'Only you can see this' },
};

export function PrivacyLevelOption({ level, selected, onSelect }: PrivacyLevelOptionProps) {
  const config = PRIVACY_LEVEL_CONFIG[level];

  return (
    <button
      data-testid="privacy-level-option"
      onClick={() => onSelect(level)}
      className={`font-mono text-left p-2 border transition-colors ${
        selected
          ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] selected active'
          : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)] hover:text-[var(--terminal-green)]'
      }`}
    >
      <div className="text-sm font-bold">{config.label}</div>
      <div className="text-xs opacity-75">{config.description}</div>
    </button>
  );
}

// =============================================================================
// PrivacyLevelSelector Component
// =============================================================================

interface PrivacyLevelSelectorProps {
  selected: PrivacyLevel;
  onSelect: (level: PrivacyLevel) => void;
  label?: string;
}

export function PrivacyLevelSelector({ selected, onSelect, label }: PrivacyLevelSelectorProps) {
  return (
    <div data-testid="privacy-level-selector" className="font-mono space-y-2">
      {label && <div className="text-[var(--terminal-green)] text-sm font-bold">{label}</div>}
      <div className="grid grid-cols-3 gap-2">
        <PrivacyLevelOption level="public" selected={selected === 'public'} onSelect={onSelect} />
        <PrivacyLevelOption level="authenticated" selected={selected === 'authenticated'} onSelect={onSelect} />
        <PrivacyLevelOption level="private" selected={selected === 'private'} onSelect={onSelect} />
      </div>
    </div>
  );
}

// =============================================================================
// AttestationModeOption Component
// =============================================================================

interface AttestationModeOptionProps {
  mode: AttestationMode;
  selected: boolean;
  onSelect: (mode: AttestationMode) => void;
}

const ATTESTATION_MODE_CONFIG: Record<AttestationMode, { label: string; description: string }> = {
  onchain: { label: 'On-Chain', description: 'Fully transparent on blockchain' },
  offchain: { label: 'Off-Chain', description: 'Stored on IPFS/backend' },
  private: { label: 'Private (Merkle)', description: 'Selective disclosure with proofs' },
};

export function AttestationModeOption({ mode, selected, onSelect }: AttestationModeOptionProps) {
  const config = ATTESTATION_MODE_CONFIG[mode];

  return (
    <button
      data-testid="attestation-mode-option"
      onClick={() => onSelect(mode)}
      className={`font-mono text-left p-2 border transition-colors ${
        selected
          ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] selected active'
          : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)] hover:text-[var(--terminal-green)]'
      }`}
    >
      <div className="text-sm font-bold">{config.label}</div>
      <div className="text-xs opacity-75">{config.description}</div>
    </button>
  );
}

// =============================================================================
// AttestationModeSelector Component
// =============================================================================

interface AttestationModeSelectorProps {
  selected: AttestationMode;
  onSelect: (mode: AttestationMode) => void;
  label?: string;
}

export function AttestationModeSelector({ selected, onSelect, label }: AttestationModeSelectorProps) {
  return (
    <div data-testid="attestation-mode-selector" className="font-mono space-y-2">
      {label && <div className="text-[var(--terminal-green)] text-sm font-bold">{label}</div>}
      <div className="grid grid-cols-3 gap-2">
        <AttestationModeOption mode="onchain" selected={selected === 'onchain'} onSelect={onSelect} />
        <AttestationModeOption mode="offchain" selected={selected === 'offchain'} onSelect={onSelect} />
        <AttestationModeOption mode="private" selected={selected === 'private'} onSelect={onSelect} />
      </div>
    </div>
  );
}

// =============================================================================
// LeaderboardOptOut Component
// =============================================================================

interface LeaderboardOptOutProps {
  optedOut: boolean;
  onToggle: (optedOut: boolean) => void;
}

export function LeaderboardOptOut({ optedOut, onToggle }: LeaderboardOptOutProps) {
  return (
    <div data-testid="leaderboard-opt-out" className="font-mono flex items-center justify-between p-3 border border-[var(--terminal-dim)]">
      <div>
        <div className="text-[var(--terminal-green)] text-sm font-bold">Hide from Leaderboard</div>
        <div className="text-[var(--terminal-dim)] text-xs">Your profile won't appear in public rankings</div>
      </div>
      <input
        type="checkbox"
        data-testid="leaderboard-toggle"
        checked={optedOut}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-5 h-5 accent-[var(--terminal-green)]"
      />
    </div>
  );
}

// =============================================================================
// ForecastPrivacyDefaults Component
// =============================================================================

interface ForecastPrivacyDefaultsProps {
  selected: PrivacyLevel;
  onSelect: (level: PrivacyLevel) => void;
}

export function ForecastPrivacyDefaults({ selected, onSelect }: ForecastPrivacyDefaultsProps) {
  return (
    <div data-testid="forecast-privacy-defaults" className="font-mono space-y-2">
      <div className="text-[var(--terminal-green)] text-sm font-bold">Default Forecast Privacy</div>
      <div className="text-[var(--terminal-dim)] text-xs mb-2">
        New forecasts will use this privacy setting by default
      </div>
      <PrivacyLevelSelector selected={selected} onSelect={onSelect} />
    </div>
  );
}

// =============================================================================
// DataExportControls Component
// =============================================================================

interface DataExportControlsProps {
  allowExport: boolean;
  allowReputationSharing: boolean;
  onExportToggle: (allowed: boolean) => void;
  onReputationToggle: (allowed: boolean) => void;
}

export function DataExportControls({
  allowExport,
  allowReputationSharing,
  onExportToggle,
  onReputationToggle,
}: DataExportControlsProps) {
  return (
    <div data-testid="data-export-controls" className="font-mono space-y-3">
      <div className="flex items-center justify-between p-3 border border-[var(--terminal-dim)]">
        <div>
          <div className="text-[var(--terminal-green)] text-sm font-bold">Allow Data Export</div>
          <div className="text-[var(--terminal-dim)] text-xs">Enable GDPR data export requests</div>
        </div>
        <input
          type="checkbox"
          data-testid="export-toggle"
          checked={allowExport}
          onChange={(e) => onExportToggle(e.target.checked)}
          className="w-5 h-5 accent-[var(--terminal-green)]"
        />
      </div>
      <div className="flex items-center justify-between p-3 border border-[var(--terminal-dim)]">
        <div>
          <div className="text-[var(--terminal-green)] text-sm font-bold">Allow Reputation Sharing</div>
          <div className="text-[var(--terminal-dim)] text-xs">Share your reputation with other platforms</div>
        </div>
        <input
          type="checkbox"
          data-testid="reputation-toggle"
          checked={allowReputationSharing}
          onChange={(e) => onReputationToggle(e.target.checked)}
          className="w-5 h-5 accent-[var(--terminal-green)]"
        />
      </div>
    </div>
  );
}

// =============================================================================
// PrivacyExplanationTooltip Component
// =============================================================================

interface PrivacyExplanationTooltipProps {
  topic: 'attestation-mode' | 'privacy-level' | 'leaderboard';
}

const EXPLANATIONS: Record<string, string> = {
  'attestation-mode': 'Choose how your attestations are stored. On-chain is fully transparent, off-chain stores data on IPFS, and private mode uses Merkle trees for selective disclosure.',
  'privacy-level': 'Control visibility of your profile. Public shows to everyone, authenticated requires login, and private hides from all users.',
  'leaderboard': 'Opt out of public leaderboards and rankings. Your performance data will still be tracked privately.',
};

export function PrivacyExplanationTooltip({ topic }: PrivacyExplanationTooltipProps) {
  return (
    <div
      data-testid="privacy-explanation-tooltip"
      className="font-mono text-xs text-[var(--terminal-dim)] p-2 border border-[var(--terminal-dim)] bg-black"
    >
      {EXPLANATIONS[topic]}
    </div>
  );
}

// =============================================================================
// PrivacySectionCard Component
// =============================================================================

interface PrivacySectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function PrivacySectionCard({ title, description, children }: PrivacySectionCardProps) {
  return (
    <div data-testid="privacy-section-card" className="font-mono border border-[var(--terminal-dim)] p-4 space-y-3">
      <div>
        <div className="text-[var(--terminal-green)] text-lg font-bold">{title}</div>
        {description && <div className="text-[var(--terminal-dim)] text-xs mt-1">{description}</div>}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// PrivacySettingsSummary Component
// =============================================================================

interface PrivacySettingsSummaryProps {
  settings: PrivacySettings;
}

export function PrivacySettingsSummary({ settings }: PrivacySettingsSummaryProps) {
  return (
    <div data-testid="privacy-settings-summary" className="font-mono border border-[var(--terminal-green)] p-4">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Current Settings</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-[var(--terminal-dim)]">Profile:</div>
        <div className="text-[var(--terminal-green)] capitalize">{settings.profileVisibility}</div>
        <div className="text-[var(--terminal-dim)]">Attestations:</div>
        <div className="text-[var(--terminal-green)]">{ATTESTATION_MODE_CONFIG[settings.attestationMode].label}</div>
        <div className="text-[var(--terminal-dim)]">Leaderboard:</div>
        <div className="text-[var(--terminal-green)]">{settings.leaderboardOptOut ? 'Hidden' : 'Visible'}</div>
        <div className="text-[var(--terminal-dim)]">Forecast Default:</div>
        <div className="text-[var(--terminal-green)] capitalize">{settings.defaultForecastPrivacy}</div>
      </div>
    </div>
  );
}

// =============================================================================
// PrivacySettingsPanel Component
// =============================================================================

interface PrivacySettingsPanelProps {
  settings: PrivacySettings | null;
  loading?: boolean;
  onSettingsChange: (settings: PrivacySettings) => void;
  onSave?: () => void;
}

export function PrivacySettingsPanel({
  settings,
  loading = false,
  onSettingsChange,
  onSave,
}: PrivacySettingsPanelProps) {
  if (loading || !settings) {
    return (
      <div data-testid="privacy-settings-panel" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading privacy settings...</div>
        </div>
      </div>
    );
  }

  const updateSetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div data-testid="privacy-settings-panel" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <h2 className="text-[var(--terminal-green)] text-lg font-bold">Privacy Settings</h2>

      <PrivacySettingsSummary settings={settings} />

      <PrivacySectionCard
        title="Profile Visibility"
        description="Control who can see your profile and forecasting history"
      >
        <PrivacyLevelSelector
          selected={settings.profileVisibility}
          onSelect={(level) => updateSetting('profileVisibility', level)}
        />
      </PrivacySectionCard>

      <PrivacySectionCard
        title="Attestation Mode"
        description="Choose how your forecasts are stored and verified"
      >
        <AttestationModeSelector
          selected={settings.attestationMode}
          onSelect={(mode) => updateSetting('attestationMode', mode)}
        />
        <PrivacyExplanationTooltip topic="attestation-mode" />
      </PrivacySectionCard>

      <PrivacySectionCard
        title="Leaderboard & Rankings"
        description="Control your visibility in public leaderboards"
      >
        <LeaderboardOptOut
          optedOut={settings.leaderboardOptOut}
          onToggle={(optedOut) => updateSetting('leaderboardOptOut', optedOut)}
        />
      </PrivacySectionCard>

      <PrivacySectionCard
        title="Default Forecast Privacy"
        description="Set the default privacy for new forecasts"
      >
        <PrivacyLevelSelector
          selected={settings.defaultForecastPrivacy}
          onSelect={(level) => updateSetting('defaultForecastPrivacy', level)}
        />
      </PrivacySectionCard>

      <PrivacySectionCard
        title="Data Controls"
        description="Manage data export and sharing permissions"
      >
        <DataExportControls
          allowExport={settings.allowDataExport}
          allowReputationSharing={settings.allowReputationSharing}
          onExportToggle={(allowed) => updateSetting('allowDataExport', allowed)}
          onReputationToggle={(allowed) => updateSetting('allowReputationSharing', allowed)}
        />
      </PrivacySectionCard>

      <button
        data-testid="save-settings-button"
        onClick={onSave}
        className="w-full py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] font-mono text-sm hover:bg-[var(--terminal-green)] hover:text-black"
      >
        Save Settings
      </button>
    </div>
  );
}

// =============================================================================
// usePrivacySettings Hook
// =============================================================================

interface UsePrivacySettingsReturn {
  isPrivate: boolean;
  isPublic: boolean;
  isOnChain: boolean;
  isOffChain: boolean;
  isMerklePrivate: boolean;
  showOnLeaderboard: boolean;
  canExportData: boolean;
  canShareReputation: boolean;
  privacyScore: number;
}

export function usePrivacySettings(settings: PrivacySettings | null): UsePrivacySettingsReturn {
  const isPrivate = useMemo(
    () => settings?.profileVisibility === 'private',
    [settings]
  );

  const isPublic = useMemo(
    () => settings?.profileVisibility === 'public',
    [settings]
  );

  const isOnChain = useMemo(
    () => settings?.attestationMode === 'onchain',
    [settings]
  );

  const isOffChain = useMemo(
    () => settings?.attestationMode === 'offchain',
    [settings]
  );

  const isMerklePrivate = useMemo(
    () => settings?.attestationMode === 'private',
    [settings]
  );

  const showOnLeaderboard = useMemo(
    () => settings ? !settings.leaderboardOptOut : false,
    [settings]
  );

  const canExportData = useMemo(
    () => settings?.allowDataExport ?? false,
    [settings]
  );

  const canShareReputation = useMemo(
    () => settings?.allowReputationSharing ?? false,
    [settings]
  );

  const privacyScore = useMemo(() => {
    if (!settings) return 0;
    let score = 0;
    // Privacy level scoring
    if (settings.profileVisibility === 'private') score += 40;
    else if (settings.profileVisibility === 'authenticated') score += 20;
    // Attestation mode scoring
    if (settings.attestationMode === 'private') score += 30;
    else if (settings.attestationMode === 'offchain') score += 15;
    // Leaderboard opt-out
    if (settings.leaderboardOptOut) score += 15;
    // Default forecast privacy
    if (settings.defaultForecastPrivacy === 'private') score += 10;
    else if (settings.defaultForecastPrivacy === 'authenticated') score += 5;
    // Data sharing restrictions
    if (!settings.allowReputationSharing) score += 5;
    return Math.min(score, 100);
  }, [settings]);

  return {
    isPrivate,
    isPublic,
    isOnChain,
    isOffChain,
    isMerklePrivate,
    showOnLeaderboard,
    canExportData,
    canShareReputation,
    privacyScore,
  };
}
