'use client';

import { useState, useMemo } from 'react';
import { useKellyStore, MULTIPLIER_PRESETS } from '@/lib/stores/kelly-store';
import { usePrivacyStore, ATTESTATION_MODE_OPTIONS, type AttestationMode } from '@/lib/stores/privacy-store';
import { Tooltip, InfoIcon } from './tooltip';
import type { UnifiedMarket } from '@/lib/api';

interface ForecastFormProps {
  market: UnifiedMarket;
  existingProbability?: number;
  onSubmit: (data: ForecastFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface ForecastFormData {
  probability: number;
  confidence: number;
  commitMessage: string;
  isPublic: boolean;
  kellyFraction: number;
  executeRebalance: boolean;
  attestationMode: AttestationMode;
}

/**
 * Calculate Kelly-based recommendation
 */
function calculateKelly(
  probability: number,
  marketPrice: number,
  fractionMultiplier: number
): { side: 'YES' | 'NO' | 'NONE'; edge: number; fraction: number } {
  const yesEdge = probability - marketPrice;
  const noPrice = 1 - marketPrice;
  const noEdge = (1 - probability) - noPrice;

  if (yesEdge > noEdge && yesEdge > 0) {
    const rawKelly = yesEdge / (1 - marketPrice);
    return {
      side: 'YES',
      edge: yesEdge,
      fraction: Math.min(rawKelly * fractionMultiplier, 0.25),
    };
  } else if (noEdge > 0) {
    const rawKelly = noEdge / (1 - noPrice);
    return {
      side: 'NO',
      edge: noEdge,
      fraction: Math.min(rawKelly * fractionMultiplier, 0.25),
    };
  }

  return { side: 'NONE', edge: Math.max(yesEdge, noEdge), fraction: 0 };
}

export function ForecastForm({
  market,
  existingProbability,
  onSubmit,
  onCancel,
  isLoading = false,
}: ForecastFormProps) {
  const kellyStore = useKellyStore();
  const privacyStore = usePrivacyStore();

  const [probability, setProbability] = useState<string>(
    existingProbability ? (existingProbability * 100).toString() : ''
  );
  const [confidence, setConfidence] = useState<string>('50');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(privacyStore.defaultForecastPrivacy === 'PUBLIC');
  const [kellyFraction, setKellyFraction] = useState<number>(kellyStore.multiplier);
  const [executeRebalance, setExecuteRebalance] = useState<boolean>(false);
  const [attestationMode, setAttestationMode] = useState<AttestationMode>(privacyStore.defaultAttestationMode);
  const [showAdvancedPrivacy, setShowAdvancedPrivacy] = useState<boolean>(false);

  const marketPrice = useMemo(() => {
    const price = market.bestYesPrice;
    if (!price) return 0.5;
    return price > 1 ? price / 100 : price;
  }, [market.bestYesPrice]);

  const kellyResult = useMemo(() => {
    const prob = parseFloat(probability) / 100;
    if (isNaN(prob) || prob <= 0 || prob >= 1) return null;
    return calculateKelly(prob, marketPrice, kellyFraction);
  }, [probability, marketPrice, kellyFraction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prob = parseFloat(probability) / 100;
    if (isNaN(prob) || prob <= 0 || prob >= 1) return;

    await onSubmit({
      probability: prob,
      confidence: parseFloat(confidence) / 100,
      commitMessage,
      isPublic,
      kellyFraction,
      executeRebalance,
      attestationMode,
    });
  };

  const priceChange = existingProbability
    ? parseFloat(probability) / 100 - existingProbability
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Market Info */}
      <div className="ascii-box p-3 bg-[hsl(var(--accent))]">
        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">MARKET</div>
        <div className="text-sm font-bold">{market.question}</div>
        <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Current price: {(marketPrice * 100).toFixed(1)}%
        </div>
      </div>

      {/* Probability Input */}
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
          YOUR PROBABILITY ESTIMATE (%)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.01"
            max="99.99"
            step="0.01"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            placeholder="Enter 0.01-99.99"
            className="flex-1 bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-lg font-mono focus:border-[hsl(var(--primary))] focus:outline-none"
            required
          />
          <span className="text-lg">%</span>
        </div>
        {priceChange !== null && (
          <div className={`text-xs mt-1 ${priceChange >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}`}>
            {priceChange >= 0 ? '+' : ''}{(priceChange * 100).toFixed(1)}% from previous
          </div>
        )}
      </div>

      {/* Confidence Slider */}
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
          CONFIDENCE ({confidence}%)
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
          className="w-full accent-[hsl(var(--primary))]"
        />
        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Kelly Result Preview */}
      {kellyResult && (
        <div className="ascii-box p-3">
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">KELLY RECOMMENDATION</div>
          {kellyResult.side === 'NONE' ? (
            <div className="text-[hsl(var(--warning))]">
              No edge detected - consider not betting
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">SIDE</div>
                <div className={`text-lg font-bold ${
                  kellyResult.side === 'YES'
                    ? 'text-[hsl(var(--bullish))]'
                    : 'text-[hsl(var(--bearish))]'
                }`}>
                  {kellyResult.side}
                </div>
              </div>
              <div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">EDGE</div>
                <div className="text-lg font-bold text-[hsl(var(--primary))]">
                  +{(kellyResult.edge * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">SIZE</div>
                <div className="text-lg font-bold">
                  {(kellyResult.fraction * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commit Message (git-style) */}
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
          REASONING (COMMIT MESSAGE)
        </label>
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Why do you believe this? What evidence supports your view?"
          className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none min-h-[80px] resize-y"
          maxLength={1000}
        />
        <div className="text-xs text-[hsl(var(--muted-foreground))] text-right">
          {commitMessage.length}/1000
        </div>
      </div>

      {/* Kelly Fraction */}
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
          KELLY FRACTION
        </label>
        <select
          value={kellyFraction}
          onChange={(e) => setKellyFraction(parseFloat(e.target.value))}
          className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none"
        >
          {Object.entries(MULTIPLIER_PRESETS).map(([key, { value, label }]) => (
            <option key={key} value={value}>
              {label} ({(value * 100).toFixed(0)}%)
            </option>
          ))}
        </select>
      </div>

      {/* Privacy Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="accent-[hsl(var(--primary))]"
          />
          <label htmlFor="isPublic" className="text-sm">
            Make this forecast public
          </label>
        </div>

        {/* Advanced Privacy Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedPrivacy(!showAdvancedPrivacy)}
          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
        >
          {showAdvancedPrivacy ? '[-] Hide' : '[+] Show'} advanced privacy options
        </button>

        {/* Attestation Mode Override */}
        {showAdvancedPrivacy && (
          <div className="pl-4 border-l-2 border-[hsl(var(--border))] space-y-2">
            <label className="text-xs text-[hsl(var(--muted-foreground))] block">
              ATTESTATION MODE (override default)
              <Tooltip content={
                <div className="space-y-2">
                  <p>Override the default attestation mode for this forecast only.</p>
                  <ul className="list-disc list-inside text-xs">
                    <li><strong>On-chain:</strong> Full data on Base</li>
                    <li><strong>Off-chain:</strong> Data on IPFS</li>
                    <li><strong>Private:</strong> Only hash stored</li>
                  </ul>
                </div>
              }>
                <InfoIcon />
              </Tooltip>
            </label>
            <div className="space-y-1">
              {(Object.entries(ATTESTATION_MODE_OPTIONS) as [AttestationMode, typeof ATTESTATION_MODE_OPTIONS[AttestationMode]][]).map(
                ([key, { label }]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors text-sm ${
                      attestationMode === key
                        ? 'border-[hsl(var(--info))] bg-[hsl(var(--info)/0.1)]'
                        : 'border-[hsl(var(--border))] hover:border-[hsl(var(--info)/0.5)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="attestationMode"
                      value={key}
                      checked={attestationMode === key}
                      onChange={() => setAttestationMode(key)}
                      className="accent-[hsl(var(--info))]"
                    />
                    <span>{label}</span>
                  </label>
                )
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="executeRebalance"
            checked={executeRebalance}
            onChange={(e) => setExecuteRebalance(e.target.checked)}
            className="accent-[hsl(var(--primary))]"
          />
          <label htmlFor="executeRebalance" className="text-sm">
            Auto-rebalance portfolio based on this forecast
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
        <button
          type="submit"
          disabled={isLoading || !probability}
          className="flex-1 text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'SAVING...' : existingProbability ? 'UPDATE FORECAST' : 'COMMIT FORECAST'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-sm px-4 py-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
          >
            CANCEL
          </button>
        )}
      </div>
    </form>
  );
}
