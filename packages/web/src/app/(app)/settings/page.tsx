'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  usePrivacyStore,
  PROFILE_VISIBILITY_OPTIONS,
  FORECAST_PRIVACY_OPTIONS,
  ATTESTATION_MODE_OPTIONS,
  type ProfileVisibility,
  type ForecastPrivacy,
  type AttestationMode,
} from '@/lib/stores/privacy-store';
import { useKellyStore, MULTIPLIER_PRESETS, type KellyMultiplierPreset } from '@/lib/stores/kelly-store';
import { Tooltip, InfoIcon } from '@/components/tooltip';

// Privacy tooltips
const PRIVACY_TOOLTIPS = {
  profileVisibility: (
    <div className="space-y-2">
      <strong>Profile Visibility</strong>
      <p>Controls who can see your profile and forecasting history.</p>
      <ul className="list-disc list-inside text-xs">
        <li><strong>Public:</strong> Anyone can view</li>
        <li><strong>Authenticated:</strong> Only logged-in users</li>
        <li><strong>Private:</strong> Only you can view</li>
      </ul>
    </div>
  ),
  forecastPrivacy: (
    <div className="space-y-2">
      <strong>Forecast Privacy</strong>
      <p>Default privacy level for new forecasts. Can be overridden per-forecast.</p>
      <ul className="list-disc list-inside text-xs">
        <li><strong>Full Public:</strong> Probability, reasoning, and timestamps visible</li>
        <li><strong>Probability Only:</strong> Hide reasoning/commit messages</li>
        <li><strong>Private:</strong> Only visible to you</li>
        <li><strong>Merkle Private:</strong> Hash only stored on-chain</li>
      </ul>
    </div>
  ),
  attestationMode: (
    <div className="space-y-2">
      <strong>Attestation Mode</strong>
      <p>How forecasts are recorded on Ethereum Attestation Service (EAS).</p>
      <ul className="list-disc list-inside text-xs">
        <li><strong>On-chain:</strong> Full data stored on Base blockchain</li>
        <li><strong>Off-chain:</strong> Stored on IPFS, referenced on-chain</li>
        <li><strong>Private (Merkle):</strong> Only hash on-chain, reveal fields later</li>
      </ul>
    </div>
  ),
  dataSharing: (
    <div className="space-y-2">
      <strong>Data Sharing</strong>
      <p>Controls how your forecasting data can be used.</p>
      <ul className="list-disc list-inside text-xs">
        <li><strong>Reputation Export:</strong> Allow other platforms to query your track record</li>
        <li><strong>Aggregation:</strong> Include in anonymized platform statistics</li>
      </ul>
    </div>
  ),
};

type SettingsTab = 'privacy' | 'kelly' | 'account';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('privacy');
  const privacy = usePrivacyStore();
  const kelly = useKellyStore();

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'privacy', label: 'PRIVACY' },
    { id: 'kelly', label: 'KELLY' },
    { id: 'account', label: 'ACCOUNT' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-sm"
            >
              &larr; HOME
            </Link>
          </div>
          <h1 className="text-2xl font-bold terminal-glow mb-2">
            SETTINGS
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Configure your privacy, Kelly criterion, and account preferences
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-[hsl(var(--border))] mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              [{tab.label}]
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'privacy' && <PrivacySettings privacy={privacy} />}
          {activeTab === 'kelly' && <KellySettings kelly={kelly} />}
          {activeTab === 'account' && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}

interface PrivacySettingsProps {
  privacy: {
    profileVisibility: ProfileVisibility;
    showOnLeaderboard: boolean;
    showWalletAddress: boolean;
    defaultForecastPrivacy: ForecastPrivacy;
    shareReasoningPublicly: boolean;
    defaultAttestationMode: AttestationMode;
    allowReputationExport: boolean;
    allowDataAggregation: boolean;
    setProfileVisibility: (visibility: ProfileVisibility) => void;
    setShowOnLeaderboard: (show: boolean) => void;
    setShowWalletAddress: (show: boolean) => void;
    setDefaultForecastPrivacy: (privacy: ForecastPrivacy) => void;
    setShareReasoningPublicly: (share: boolean) => void;
    setDefaultAttestationMode: (mode: AttestationMode) => void;
    setAllowReputationExport: (allow: boolean) => void;
    setAllowDataAggregation: (allow: boolean) => void;
    resetToDefaults: () => void;
  };
}

function PrivacySettings({ privacy }: PrivacySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">
          [PROFILE VISIBILITY]
          <Tooltip content={PRIVACY_TOOLTIPS.profileVisibility}>
            <InfoIcon />
          </Tooltip>
        </h2>
        <div className="space-y-3">
          {(Object.entries(PROFILE_VISIBILITY_OPTIONS) as [ProfileVisibility, typeof PROFILE_VISIBILITY_OPTIONS[ProfileVisibility]][]).map(
            ([key, { label, description }]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                  privacy.profileVisibility === key
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                }`}
              >
                <input
                  type="radio"
                  name="profileVisibility"
                  value={key}
                  checked={privacy.profileVisibility === key}
                  onChange={() => privacy.setProfileVisibility(key)}
                  className="mt-1 accent-[hsl(var(--primary))]"
                />
                <div>
                  <div className="text-sm font-bold">{label}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{description}</div>
                </div>
              </label>
            )
          )}
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privacy.showOnLeaderboard}
              onChange={(e) => privacy.setShowOnLeaderboard(e.target.checked)}
              className="accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">Show on public leaderboards</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privacy.showWalletAddress}
              onChange={(e) => privacy.setShowWalletAddress(e.target.checked)}
              className="accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">Display wallet address publicly</span>
          </label>
        </div>
      </section>

      {/* Forecast Privacy */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">
          [FORECAST DEFAULTS]
          <Tooltip content={PRIVACY_TOOLTIPS.forecastPrivacy}>
            <InfoIcon />
          </Tooltip>
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-2">
              DEFAULT FORECAST PRIVACY
            </label>
            {(Object.entries(FORECAST_PRIVACY_OPTIONS) as [ForecastPrivacy, typeof FORECAST_PRIVACY_OPTIONS[ForecastPrivacy]][]).map(
              ([key, { label, description }]) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors mb-2 ${
                    privacy.defaultForecastPrivacy === key
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                      : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="forecastPrivacy"
                    value={key}
                    checked={privacy.defaultForecastPrivacy === key}
                    onChange={() => privacy.setDefaultForecastPrivacy(key)}
                    className="mt-1 accent-[hsl(var(--primary))]"
                  />
                  <div>
                    <div className="text-sm font-bold">{label}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{description}</div>
                  </div>
                </label>
              )
            )}
          </div>

          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={privacy.shareReasoningPublicly}
              onChange={(e) => privacy.setShareReasoningPublicly(e.target.checked)}
              className="accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">Share reasoning/commit messages publicly by default</span>
          </label>
        </div>
      </section>

      {/* Attestation Mode */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">
          [ATTESTATION MODE]
          <Tooltip content={PRIVACY_TOOLTIPS.attestationMode}>
            <InfoIcon />
          </Tooltip>
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
          Choose how your forecasts are recorded on the Ethereum Attestation Service (EAS)
        </p>
        <div className="space-y-3">
          {(Object.entries(ATTESTATION_MODE_OPTIONS) as [AttestationMode, typeof ATTESTATION_MODE_OPTIONS[AttestationMode]][]).map(
            ([key, { label, description }]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                  privacy.defaultAttestationMode === key
                    ? 'border-[hsl(var(--info))] bg-[hsl(var(--info)/0.1)]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--info)/0.5)]'
                }`}
              >
                <input
                  type="radio"
                  name="attestationMode"
                  value={key}
                  checked={privacy.defaultAttestationMode === key}
                  onChange={() => privacy.setDefaultAttestationMode(key)}
                  className="mt-1 accent-[hsl(var(--info))]"
                />
                <div>
                  <div className="text-sm font-bold">{label}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{description}</div>
                </div>
              </label>
            )
          )}
        </div>

        {privacy.defaultAttestationMode === 'PRIVATE' && (
          <div className="mt-4 p-3 border border-[hsl(var(--info))] bg-[hsl(var(--info)/0.05)]">
            <div className="text-xs text-[hsl(var(--info))]">
              Merkle attestations store only a hash on-chain. You can selectively reveal
              individual fields later using cryptographic proofs.
            </div>
          </div>
        )}
      </section>

      {/* Data Sharing */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">
          [DATA SHARING]
          <Tooltip content={PRIVACY_TOOLTIPS.dataSharing}>
            <InfoIcon />
          </Tooltip>
        </h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privacy.allowReputationExport}
              onChange={(e) => privacy.setAllowReputationExport(e.target.checked)}
              className="accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">Allow reputation export to other platforms</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privacy.allowDataAggregation}
              onChange={(e) => privacy.setAllowDataAggregation(e.target.checked)}
              className="accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">Include in anonymized aggregate statistics</span>
          </label>
        </div>
      </section>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          onClick={() => privacy.resetToDefaults()}
          className="text-xs px-3 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))] transition-colors"
        >
          RESET TO DEFAULTS
        </button>
      </div>
    </div>
  );
}

interface KellySettingsProps {
  kelly: {
    multiplier: number;
    multiplierPreset: KellyMultiplierPreset;
    bankroll: number;
    maxPositionSize: number;
    autoExpandCalculator: boolean;
    setMultiplierPreset: (preset: KellyMultiplierPreset) => void;
    setBankroll: (amount: number) => void;
    setMaxPositionSize: (fraction: number) => void;
    setAutoExpandCalculator: (expand: boolean) => void;
    resetToDefaults: () => void;
  };
}

function KellySettings({ kelly }: KellySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Kelly Fraction */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[KELLY FRACTION]</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
          Choose how aggressively to size positions. Half Kelly is recommended for most users.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.entries(MULTIPLIER_PRESETS) as [KellyMultiplierPreset, typeof MULTIPLIER_PRESETS[KellyMultiplierPreset]][]).map(
            ([key, { value, label, description }]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                  kelly.multiplierPreset === key
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                }`}
              >
                <input
                  type="radio"
                  name="kellyMultiplier"
                  value={key}
                  checked={kelly.multiplierPreset === key}
                  onChange={() => kelly.setMultiplierPreset(key)}
                  className="mt-1 accent-[hsl(var(--primary))]"
                />
                <div>
                  <div className="text-sm font-bold">
                    {label} <span className="text-[hsl(var(--muted-foreground))]">({(value * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{description}</div>
                </div>
              </label>
            )
          )}
        </div>
      </section>

      {/* Bankroll */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[DEFAULT BANKROLL]</h2>
        <div>
          <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
            BANKROLL ($)
          </label>
          <input
            type="number"
            min="1"
            step="100"
            value={kelly.bankroll}
            onChange={(e) => kelly.setBankroll(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none font-mono"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
            This is used to calculate dollar amounts in Kelly recommendations.
          </p>
        </div>
      </section>

      {/* Max Position Size */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[MAX POSITION SIZE]</h2>
        <div>
          <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
            MAXIMUM SINGLE POSITION (% OF BANKROLL)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={kelly.maxPositionSize * 100}
              onChange={(e) => kelly.setMaxPositionSize(parseFloat(e.target.value) / 100)}
              className="flex-1 accent-[hsl(var(--primary))]"
            />
            <span className="text-lg font-mono w-16 text-right">
              {(kelly.maxPositionSize * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
            Individual positions will be capped at ${(kelly.bankroll * kelly.maxPositionSize).toLocaleString()} regardless of Kelly recommendation.
          </p>
        </div>
      </section>

      {/* Auto-expand */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[UI PREFERENCES]</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={kelly.autoExpandCalculator}
            onChange={(e) => kelly.setAutoExpandCalculator(e.target.checked)}
            className="accent-[hsl(var(--primary))]"
          />
          <span className="text-sm">Auto-expand Kelly calculator in market views</span>
        </label>
      </section>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          onClick={() => kelly.resetToDefaults()}
          className="text-xs px-3 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))] transition-colors"
        >
          RESET TO DEFAULTS
        </button>
      </div>
    </div>
  );
}

type DeletionType = 'FULL_ACCOUNT' | 'FORECASTS_ONLY' | 'PII_ONLY';

const DELETION_OPTIONS: Record<DeletionType, { label: string; description: string }> = {
  FULL_ACCOUNT: {
    label: 'Full Account Deletion',
    description: 'Delete all data including forecasts, positions, and attestations',
  },
  FORECASTS_ONLY: {
    label: 'Forecasts Only',
    description: 'Delete forecasts and reset calibration, keep account and positions',
  },
  PII_ONLY: {
    label: 'Remove PII Only',
    description: 'Anonymize personal info, keep forecasting history for statistics',
  },
};

function AccountSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletionType, setDeletionType] = useState<DeletionType>('FULL_ACCOUNT');
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleExportData = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/gdpr/export`, {
        headers: { 'x-user-id': 'demo-user' },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const { data } = await response.json();

      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calibr-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: 'Data exported successfully' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    setIsDeleting(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/gdpr/delete-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          requestType: deletionType,
          reason: deletionReason || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Deletion request failed');
      }

      setShowDeleteDialog(false);
      setStatusMessage({
        type: 'success',
        text: `Deletion request submitted. Est. time: ${result.data.timeEstimate.description}`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit deletion request',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-3 border ${
            statusMessage.type === 'success'
              ? 'border-[hsl(var(--success))] text-[hsl(var(--success))]'
              : 'border-[hsl(var(--error))] text-[hsl(var(--error))]'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Connected Wallets */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[CONNECTED WALLETS]</h2>
        <div className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Connect your wallet to track positions and create on-chain attestations.
        </div>
        <button
          className="w-full text-sm px-4 py-3 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
        >
          CONNECT WALLET
        </button>
      </section>

      {/* Platform Connections */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[PLATFORM CONNECTIONS]</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-[hsl(var(--border))]">
            <div>
              <div className="text-sm font-bold">Polymarket</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Not connected</div>
            </div>
            <button className="text-xs px-3 py-1 border border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors">
              CONNECT
            </button>
          </div>
          <div className="flex items-center justify-between p-3 border border-[hsl(var(--border))]">
            <div>
              <div className="text-sm font-bold">Limitless</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Not connected</div>
            </div>
            <button className="text-xs px-3 py-1 border border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors">
              CONNECT
            </button>
          </div>
        </div>
      </section>

      {/* Data Portability (GDPR) */}
      <section className="ascii-box p-4">
        <h2 className="text-sm font-bold mb-4">[DATA PORTABILITY]</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
          Export all your data in JSON format (GDPR Article 20)
        </p>
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full text-sm px-4 py-2 border border-[hsl(var(--info))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info))] hover:text-white transition-colors disabled:opacity-50"
        >
          {isExporting ? 'EXPORTING...' : 'EXPORT ALL DATA'}
        </button>
      </section>

      {/* Danger Zone */}
      <section className="ascii-box p-4 border-[hsl(var(--error))]">
        <h2 className="text-sm font-bold text-[hsl(var(--error))] mb-4">[DANGER ZONE]</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
          Request data deletion (GDPR Article 17 - Right to Erasure)
        </p>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full text-sm px-4 py-2 border border-[hsl(var(--error))] text-[hsl(var(--error))] hover:bg-[hsl(var(--error))] hover:text-white transition-colors"
        >
          REQUEST DATA DELETION
        </button>
      </section>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="ascii-box p-6 max-w-lg w-full bg-[hsl(var(--background))]">
            <h2 className="text-lg font-bold text-[hsl(var(--error))] mb-4">
              [REQUEST DATA DELETION]
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-2">
                  DELETION TYPE
                </label>
                {(Object.entries(DELETION_OPTIONS) as [DeletionType, typeof DELETION_OPTIONS[DeletionType]][]).map(
                  ([key, { label, description }]) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors mb-2 ${
                        deletionType === key
                          ? 'border-[hsl(var(--error))] bg-[hsl(var(--error)/0.1)]'
                          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--error)/0.5)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deletionType"
                        value={key}
                        checked={deletionType === key}
                        onChange={() => setDeletionType(key)}
                        className="mt-1 accent-[hsl(var(--error))]"
                      />
                      <div>
                        <div className="text-sm font-bold">{label}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">{description}</div>
                      </div>
                    </label>
                  )
                )}
              </div>

              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-2">
                  REASON (OPTIONAL)
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Why are you deleting your data?"
                  className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--error))] focus:outline-none font-mono h-20 resize-none"
                  maxLength={1000}
                />
              </div>

              <div className="p-3 border border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.1)]">
                <div className="text-xs text-[hsl(var(--warning))]">
                  <strong>Warning:</strong> This action cannot be undone. On-chain attestations
                  will be revoked but the revocation records remain on the blockchain.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 text-sm px-4 py-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--foreground))] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteRequest}
                  disabled={isDeleting}
                  className="flex-1 text-sm px-4 py-2 bg-[hsl(var(--error))] text-white hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'SUBMITTING...' : 'CONFIRM DELETION'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
