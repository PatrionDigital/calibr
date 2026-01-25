/**
 * Kelly Criterion Settings Store
 * Persists user's Kelly configuration across sessions
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type KellyMultiplierPreset = 'FULL' | 'THREE_QUARTER' | 'HALF' | 'QUARTER' | 'CONSERVATIVE';

export interface KellySettings {
  /** Kelly fraction multiplier (0-1) */
  multiplier: number;
  /** Selected preset */
  multiplierPreset: KellyMultiplierPreset;
  /** Default bankroll amount */
  bankroll: number;
  /** Maximum position size as fraction of bankroll (0-1) */
  maxPositionSize: number;
  /** Whether to auto-expand Kelly calculator in market views */
  autoExpandCalculator: boolean;
}

export interface KellyStore extends KellySettings {
  /** Set the Kelly multiplier and update preset */
  setMultiplier: (multiplier: number) => void;
  /** Set multiplier by preset */
  setMultiplierPreset: (preset: KellyMultiplierPreset) => void;
  /** Set default bankroll */
  setBankroll: (amount: number) => void;
  /** Set max position size */
  setMaxPositionSize: (fraction: number) => void;
  /** Set auto-expand preference */
  setAutoExpandCalculator: (expand: boolean) => void;
  /** Reset to defaults */
  resetToDefaults: () => void;
}

export const MULTIPLIER_PRESETS: Record<KellyMultiplierPreset, { value: number; label: string; description: string }> = {
  FULL: { value: 1.0, label: 'Full Kelly', description: 'Maximum growth, high volatility' },
  THREE_QUARTER: { value: 0.75, label: '3/4 Kelly', description: 'Aggressive but safer' },
  HALF: { value: 0.5, label: 'Half Kelly', description: 'Recommended for most users' },
  QUARTER: { value: 0.25, label: '1/4 Kelly', description: 'Conservative approach' },
  CONSERVATIVE: { value: 0.1, label: '1/10 Kelly', description: 'Very conservative' },
};

const DEFAULT_SETTINGS: KellySettings = {
  multiplier: 0.5,
  multiplierPreset: 'HALF',
  bankroll: 1000,
  maxPositionSize: 0.25,
  autoExpandCalculator: false,
};

function getPresetFromMultiplier(multiplier: number): KellyMultiplierPreset {
  if (multiplier >= 1.0) return 'FULL';
  if (multiplier >= 0.75) return 'THREE_QUARTER';
  if (multiplier >= 0.5) return 'HALF';
  if (multiplier >= 0.25) return 'QUARTER';
  return 'CONSERVATIVE';
}

export const useKellyStore = create<KellyStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setMultiplier: (multiplier: number) => {
        const clamped = Math.max(0.01, Math.min(1.0, multiplier));
        set({
          multiplier: clamped,
          multiplierPreset: getPresetFromMultiplier(clamped),
        });
      },

      setMultiplierPreset: (preset: KellyMultiplierPreset) => {
        set({
          multiplierPreset: preset,
          multiplier: MULTIPLIER_PRESETS[preset].value,
        });
      },

      setBankroll: (amount: number) => {
        set({ bankroll: Math.max(0, amount) });
      },

      setMaxPositionSize: (fraction: number) => {
        set({ maxPositionSize: Math.max(0.01, Math.min(1.0, fraction)) });
      },

      setAutoExpandCalculator: (expand: boolean) => {
        set({ autoExpandCalculator: expand });
      },

      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: 'calibr-kelly-settings',
      version: 1,
    }
  )
);
