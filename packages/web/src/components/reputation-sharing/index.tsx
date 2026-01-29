/**
 * Reputation Sharing Components
 * Task 6.4.8: Create reputation sharing features
 *
 * Export Calibr reputation to other platforms.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ShareFormat = 'text' | 'image' | 'link' | 'frame';
export type PrivacyLevel = 'public' | 'unlisted' | 'private';

export interface ShareDestination {
  id: string;
  name: string;
  icon: string;
  supported: boolean;
  formats: ShareFormat[];
}

export interface ShareableReputation {
  address: string;
  ensName?: string;
  totalScore: number;
  percentile: number;
  level: string;
  platforms: { name: string; score: number; maxScore: number }[];
  badges: string[];
  generatedAt: number;
  signature: string;
}

export interface ShareResult {
  id: string;
  destination: string;
  format: ShareFormat;
  url: string | null;
  sharedAt: number;
  status: 'success' | 'failed' | 'pending';
  error?: string;
}

export interface ShareSettings {
  includeScore: boolean;
  includePercentile: boolean;
  includeBadges: boolean;
  includePlatforms: boolean;
  includeSignature: boolean;
  customMessage: string;
  privacyLevel: PrivacyLevel;
}

// =============================================================================
// Constants
// =============================================================================

const FORMAT_INFO: Record<ShareFormat, { label: string; description: string; icon: string }> = {
  text: { label: 'Text', description: 'Plain text format', icon: '📝' },
  image: { label: 'Image', description: 'Visual card image', icon: '🖼️' },
  link: { label: 'Link', description: 'Shareable URL', icon: '🔗' },
  frame: { label: 'Frame', description: 'Farcaster Frame', icon: '🖼️' },
};

// =============================================================================
// ShareFormatSelector
// =============================================================================

interface ShareFormatSelectorProps {
  selected: ShareFormat;
  onSelect: (format: ShareFormat) => void;
  availableFormats?: ShareFormat[];
  showDescriptions?: boolean;
}

export function ShareFormatSelector({
  selected,
  onSelect,
  availableFormats = ['text', 'image', 'link'],
  showDescriptions,
}: ShareFormatSelectorProps) {
  const allFormats: ShareFormat[] = ['text', 'image', 'link'];

  return (
    <div data-testid="share-format-selector" className="flex gap-2">
      {allFormats.map((format) => {
        const info = FORMAT_INFO[format];
        const isAvailable = availableFormats.includes(format);
        const isSelected = selected === format;

        return (
          <button
            key={format}
            data-testid={`format-${format}`}
            onClick={() => isAvailable && onSelect(format)}
            className={`flex-1 p-3 rounded border transition-all ${
              isSelected
                ? 'border-blue-400 bg-blue-400/10'
                : isAvailable
                ? 'border-zinc-700 hover:border-zinc-600'
                : 'border-zinc-800 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="text-center">
              <span className="text-xl">{info.icon}</span>
              <div className="font-mono text-sm mt-1">{info.label}</div>
              {showDescriptions && (
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {info.description}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// ShareDestinationCard
// =============================================================================

interface ShareDestinationCardProps {
  destination: ShareDestination;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function ShareDestinationCard({
  destination,
  onSelect,
  isSelected,
}: ShareDestinationCardProps) {
  return (
    <div
      data-testid="share-destination-card"
      onClick={() => destination.supported && onSelect(destination.id)}
      className={`ascii-box p-4 transition-all ${
        destination.supported ? 'cursor-pointer hover:border-zinc-600' : 'opacity-60'
      } ${isSelected ? 'border-blue-400' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{destination.icon}</span>
          <span className="font-mono font-bold">{destination.name}</span>
        </div>
        {!destination.supported && (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Coming soon</span>
        )}
      </div>
      <div className="flex gap-1">
        {destination.formats.map((format) => (
          <span
            key={format}
            className="text-xs px-2 py-0.5 bg-zinc-800 rounded font-mono"
          >
            {format}
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SharePreview
// =============================================================================

interface SharePreviewProps {
  reputation: ShareableReputation;
  format: ShareFormat;
  settings: ShareSettings;
}

export function SharePreview({ reputation, format, settings }: SharePreviewProps) {
  const isImageFormat = format === 'image';

  return (
    <div data-testid="share-preview" className="ascii-box p-4 border-blue-400/30 border">
      <h4 className="text-xs font-mono text-[hsl(var(--muted-foreground))] mb-3">Preview</h4>

      {isImageFormat ? (
        <div
          data-testid="image-preview"
          className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-lg"
        >
          <div className="text-center">
            {reputation.ensName && (
              <div className="text-lg font-mono font-bold text-blue-400 mb-2">
                {reputation.ensName}
              </div>
            )}
            <div className="text-4xl font-mono font-bold mb-1">{reputation.totalScore}</div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              {reputation.level}
            </div>
            {settings.includePercentile && (
              <div className="text-sm text-green-400 mt-2">Top {100 - reputation.percentile}%</div>
            )}
            {settings.includeBadges && reputation.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-3">
                {reputation.badges.slice(0, 3).map((badge) => (
                  <span key={badge} className="text-xs px-2 py-0.5 bg-zinc-700 rounded">
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/50 p-4 rounded font-mono text-sm">
          {settings.customMessage && (
            <p className="mb-2">{settings.customMessage}</p>
          )}
          {reputation.ensName && (
            <p className="text-blue-400">{reputation.ensName}</p>
          )}
          {settings.includeScore && (
            <p>Reputation Score: {reputation.totalScore}</p>
          )}
          {settings.includePercentile && (
            <p>Percentile: Top {100 - reputation.percentile}%</p>
          )}
          <p>Level: {reputation.level}</p>
          {settings.includeBadges && reputation.badges.length > 0 && (
            <p>Badges: {reputation.badges.join(', ')}</p>
          )}
          {settings.includePlatforms && (
            <p>Platforms: {reputation.platforms.length} connected</p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ShareLinkGenerator
// =============================================================================

interface ShareLinkGeneratorProps {
  reputation: ShareableReputation;
  onGenerate: () => void;
  generatedLink?: string;
  isGenerating?: boolean;
  expiresAt?: number;
}

export function ShareLinkGenerator({
  onGenerate,
  generatedLink,
  isGenerating,
  expiresAt,
}: ShareLinkGeneratorProps) {
  return (
    <div data-testid="share-link-generator" className="ascii-box p-4">
      <h4 className="text-sm font-mono font-bold mb-3">Shareable Link</h4>

      {!generatedLink ? (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full px-4 py-2 font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30 disabled:opacity-50"
        >
          {isGenerating ? (
            <span data-testid="generating-indicator" className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span> Generating...
            </span>
          ) : (
            '🔗 Generate Link'
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(generatedLink)}
              className="px-3 py-2 font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
            >
              Copy
            </button>
          </div>
          {expiresAt && (
            <p data-testid="expiration-info" className="text-xs text-[hsl(var(--muted-foreground))]">
              Expires: {new Date(expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ShareHistoryList
// =============================================================================

interface ShareHistoryListProps {
  history: ShareResult[];
  maxEntries?: number;
}

export function ShareHistoryList({ history, maxEntries }: ShareHistoryListProps) {
  const displayedHistory = maxEntries ? history.slice(0, maxEntries) : history;

  if (displayedHistory.length === 0) {
    return (
      <div data-testid="share-history-list" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No share history</p>
      </div>
    );
  }

  return (
    <div data-testid="share-history-list" className="space-y-2">
      {displayedHistory.map((entry) => (
        <div key={entry.id} data-testid="history-entry" className="ascii-box p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm capitalize">{entry.destination}</span>
              <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded">{entry.format}</span>
              {entry.status === 'success' ? (
                <span data-testid="status-success" className="text-green-400 text-xs">✓</span>
              ) : (
                <span data-testid="status-failed" className="text-red-400 text-xs">✗</span>
              )}
            </div>
            <span
              data-testid="share-timestamp"
              className="text-xs text-[hsl(var(--muted-foreground))] font-mono"
            >
              {new Date(entry.sharedAt).toLocaleString()}
            </span>
          </div>
          {entry.status === 'failed' && entry.error && (
            <p className="text-xs text-red-400 mt-1">{entry.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// ShareSettingsPanel
// =============================================================================

interface ShareSettingsPanelProps {
  settings: ShareSettings;
  onChange: (settings: Partial<ShareSettings>) => void;
}

export function ShareSettingsPanel({ settings, onChange }: ShareSettingsPanelProps) {
  const toggles = [
    { key: 'includeScore', label: 'Include Score' },
    { key: 'includePercentile', label: 'Include Percentile' },
    { key: 'includeBadges', label: 'Include Badges' },
    { key: 'includePlatforms', label: 'Include Platforms' },
    { key: 'includeSignature', label: 'Include Signature' },
  ] as const;

  return (
    <div data-testid="share-settings-panel" className="ascii-box p-4">
      <h4 className="text-sm font-mono font-bold mb-3">Share Settings</h4>

      <div className="space-y-3">
        {toggles.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm">{label}</span>
            <button
              role="switch"
              aria-checked={settings[key]}
              onClick={() => onChange({ [key]: !settings[key] })}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings[key] ? 'bg-blue-400/30' : 'bg-zinc-700'
              } relative`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  settings[key] ? 'left-5 bg-blue-400' : 'left-0.5 bg-zinc-400'
                }`}
              />
            </button>
          </div>
        ))}

        <div className="pt-3 border-t border-zinc-800">
          <label className="text-sm block mb-2">Privacy Level</label>
          <select
            data-testid="privacy-selector"
            value={settings.privacyLevel}
            onChange={(e) => onChange({ privacyLevel: e.target.value as PrivacyLevel })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="pt-3">
          <label className="text-sm block mb-2">Custom Message</label>
          <textarea
            placeholder="Add a custom message..."
            value={settings.customMessage}
            onChange={(e) => onChange({ customMessage: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm resize-none"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ReputationShareCard
// =============================================================================

interface ReputationShareCardProps {
  reputation: ShareableReputation;
  onShare: () => void;
}

export function ReputationShareCard({ reputation, onShare }: ReputationShareCardProps) {
  return (
    <div data-testid="reputation-share-card" className="ascii-box p-4 border-blue-400/30 border">
      <div className="flex items-start justify-between mb-4">
        <div>
          {reputation.ensName && (
            <div className="text-blue-400 font-mono mb-1">{reputation.ensName}</div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold">{reputation.totalScore}</span>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {reputation.level}
            </span>
          </div>
        </div>
        <button
          onClick={onShare}
          className="px-4 py-2 font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
        >
          ↗ Share
        </button>
      </div>

      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-[hsl(var(--muted-foreground))]">Badges: </span>
          <span className="font-mono">{reputation.badges.length} badges</span>
        </div>
        <div>
          <span className="text-[hsl(var(--muted-foreground))]">Sources: </span>
          <span className="font-mono">{reputation.platforms.length} platforms</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ReputationSharingDashboard
// =============================================================================

interface ReputationSharingDashboardProps {
  reputation: ShareableReputation;
  destinations: ShareDestination[];
  history: ShareResult[];
  settings: ShareSettings;
  onShare: (destination: string, format: ShareFormat) => void;
  onSettingsChange: (settings: Partial<ShareSettings>) => void;
  onGenerateLink: () => void;
  isLoading?: boolean;
  isSharing?: boolean;
  error?: string;
  generatedLink?: string;
  selectedDestination?: string;
  selectedFormat?: ShareFormat;
  onSelectDestination?: (id: string) => void;
  onSelectFormat?: (format: ShareFormat) => void;
}

export function ReputationSharingDashboard({
  reputation,
  destinations,
  history,
  settings,
  onShare,
  onSettingsChange,
  onGenerateLink,
  isLoading,
  error,
  generatedLink,
  selectedDestination,
  selectedFormat = 'text',
  onSelectDestination,
  onSelectFormat,
}: ReputationSharingDashboardProps) {
  const [localDestination, setLocalDestination] = useState<string | undefined>(selectedDestination);
  const [localFormat, setLocalFormat] = useState<ShareFormat>(selectedFormat);

  const handleSelectDestination = (id: string) => {
    setLocalDestination(id);
    onSelectDestination?.(id);
  };

  const handleSelectFormat = (format: ShareFormat) => {
    setLocalFormat(format);
    onSelectFormat?.(format);
  };

  const handleShare = () => {
    if (localDestination) {
      onShare(localDestination, localFormat);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="sharing-dashboard" className="space-y-6">
        <div data-testid="loading-indicator" className="ascii-box p-6 text-center">
          <span className="animate-spin inline-block">⟳</span>
          <span className="ml-2">Loading sharing options...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="sharing-dashboard" className="space-y-6">
        <div className="ascii-box p-6 text-center border-red-400/30 border">
          <span className="text-red-400">⚠</span>
          <span className="ml-2 text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sharing-dashboard" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-blue-400/30 border">
        <h2 className="text-lg font-mono font-bold">Share Reputation</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Export your Calibr reputation to other platforms
        </p>
      </div>

      {/* Destinations */}
      <div>
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          Select Destination
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {destinations.map((dest) => (
            <ShareDestinationCard
              key={dest.id}
              destination={dest}
              onSelect={handleSelectDestination}
              isSelected={localDestination === dest.id}
            />
          ))}
        </div>
      </div>

      {/* Format */}
      <div>
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          Select Format
        </h3>
        <ShareFormatSelector
          selected={localFormat}
          onSelect={handleSelectFormat}
          showDescriptions
        />
      </div>

      {/* Preview & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SharePreview
          reputation={reputation}
          format={localFormat}
          settings={settings}
        />
        <ShareSettingsPanel settings={settings} onChange={onSettingsChange} />
      </div>

      {/* Share Button */}
      {localDestination && (
        <div className="text-center">
          <button
            onClick={handleShare}
            className="px-8 py-3 font-mono bg-blue-400 text-black rounded hover:bg-blue-300 font-bold"
          >
            ↗ Share to {destinations.find((d) => d.id === localDestination)?.name}
          </button>
        </div>
      )}

      {/* Link Generator */}
      <ShareLinkGenerator
        reputation={reputation}
        onGenerate={onGenerateLink}
        generatedLink={generatedLink}
      />

      {/* History */}
      <div>
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          Share History
        </h3>
        <ShareHistoryList history={history} maxEntries={5} />
      </div>
    </div>
  );
}

// =============================================================================
// useReputationSharing Hook
// =============================================================================

export function useReputationSharing(address: string) {
  const [reputation, setReputation] = useState<ShareableReputation | null>(null);
  const [destinations, setDestinations] = useState<ShareDestination[]>([]);
  const [history, setHistory] = useState<ShareResult[]>([]);
  const [settings, setSettings] = useState<ShareSettings>({
    includeScore: true,
    includePercentile: true,
    includeBadges: true,
    includePlatforms: true,
    includeSignature: false,
    customMessage: '',
    privacyLevel: 'public',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>('text');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setReputation({
        address,
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
        generatedAt: Date.now(),
        signature: '0xabc123...',
      });

      setDestinations([
        { id: 'twitter', name: 'Twitter/X', icon: '𝕏', supported: true, formats: ['text', 'image'] },
        { id: 'farcaster', name: 'Farcaster', icon: '🟣', supported: true, formats: ['text', 'frame'] },
        { id: 'lens', name: 'Lens Protocol', icon: '🌿', supported: true, formats: ['text', 'image'] },
        { id: 'discord', name: 'Discord', icon: '💬', supported: false, formats: ['text'] },
      ]);

      setHistory([
        {
          id: 'share-1',
          destination: 'twitter',
          format: 'text',
          url: 'https://twitter.com/intent/tweet?text=...',
          sharedAt: Date.now() - 86400000,
          status: 'success',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const share = useCallback(async () => {
    if (!selectedDestination) return;

    setIsSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result: ShareResult = {
        id: `share-${Date.now()}`,
        destination: selectedDestination,
        format: selectedFormat,
        url: `https://${selectedDestination}.com/share/...`,
        sharedAt: Date.now(),
        status: 'success',
      };

      setHistory((prev) => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setIsSharing(false);
    }
  }, [selectedDestination, selectedFormat]);

  const generateLink = useCallback(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setGeneratedLink(`https://calibr.xyz/share/${address.slice(0, 8)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    }
  }, [address]);

  const updateSettings = useCallback((updates: Partial<ShareSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const selectDestination = useCallback((id: string) => {
    setSelectedDestination(id);
  }, []);

  const selectFormat = useCallback((format: ShareFormat) => {
    setSelectedFormat(format);
  }, []);

  return {
    reputation,
    destinations,
    history,
    settings,
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
  };
}
