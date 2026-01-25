'use client';

import { useKellyStore, MULTIPLIER_PRESETS, type KellyMultiplierPreset } from '@/lib/stores/kelly-store';

interface KellySettingsPanelProps {
  showBankroll?: boolean;
  compact?: boolean;
}

export function KellySettingsPanel({ showBankroll = true, compact = false }: KellySettingsPanelProps) {
  const {
    multiplier,
    multiplierPreset,
    bankroll,
    maxPositionSize,
    autoExpandCalculator,
    setMultiplierPreset,
    setBankroll,
    setMaxPositionSize,
    setAutoExpandCalculator,
    resetToDefaults,
  } = useKellyStore();

  return (
    <div className="ascii-box p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold">[KELLY SETTINGS]</h2>
        <button
          onClick={resetToDefaults}
          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
        >
          [RESET]
        </button>
      </div>

      <div className="space-y-4">
        {/* Kelly Fraction */}
        <div>
          <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-2">
            KELLY FRACTION
          </label>
          <div className={compact ? 'space-y-1' : 'grid grid-cols-2 gap-2'}>
            {(Object.entries(MULTIPLIER_PRESETS) as [KellyMultiplierPreset, typeof MULTIPLIER_PRESETS[KellyMultiplierPreset]][]).map(
              ([key, { value, label, description }]) => (
                <button
                  key={key}
                  onClick={() => setMultiplierPreset(key)}
                  className={`text-left p-2 border transition-colors ${
                    multiplierPreset === key
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                      : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                  }`}
                >
                  <div className="text-sm font-bold">
                    {label}
                    <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                      ({(value * 100).toFixed(0)}%)
                    </span>
                  </div>
                  {!compact && (
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {description}
                    </div>
                  )}
                </button>
              )
            )}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
            Current: {(multiplier * 100).toFixed(0)}% of optimal Kelly
          </div>
        </div>

        {/* Bankroll */}
        {showBankroll && (
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
              DEFAULT BANKROLL ($)
            </label>
            <input
              type="number"
              min="1"
              step="100"
              value={bankroll}
              onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none font-mono"
            />
          </div>
        )}

        {/* Max Position Size */}
        <div>
          <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
            MAX POSITION SIZE (% OF BANKROLL)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxPositionSize * 100}
              onChange={(e) => setMaxPositionSize(parseFloat(e.target.value) / 100)}
              className="flex-1 accent-[hsl(var(--primary))]"
            />
            <span className="text-sm font-mono w-12 text-right">
              {(maxPositionSize * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Individual positions capped at ${(bankroll * maxPositionSize).toLocaleString()}
          </div>
        </div>

        {/* Auto-expand */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoExpand"
            checked={autoExpandCalculator}
            onChange={(e) => setAutoExpandCalculator(e.target.checked)}
            className="accent-[hsl(var(--primary))]"
          />
          <label htmlFor="autoExpand" className="text-sm">
            Auto-expand calculator in market view
          </label>
        </div>

        {/* Info */}
        <div className="pt-4 border-t border-[hsl(var(--border))]">
          <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
            <p>
              <span className="text-[hsl(var(--info))]">KELLY CRITERION:</span> Optimal position
              sizing that maximizes long-term growth.
            </p>
            <p>
              Half Kelly is recommended as it provides 75% of optimal growth with
              significantly reduced variance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
