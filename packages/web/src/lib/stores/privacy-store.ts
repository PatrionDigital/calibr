/**
 * Privacy Settings Store
 * Manages user privacy preferences with local persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProfileVisibility = 'PUBLIC' | 'AUTHENTICATED' | 'PRIVATE';
export type ForecastPrivacy = 'PUBLIC' | 'PROBABILITY_ONLY' | 'PRIVATE' | 'MERKLE';
export type AttestationMode = 'ON_CHAIN' | 'OFF_CHAIN' | 'PRIVATE';

export interface PrivacySettings {
  // Profile
  profileVisibility: ProfileVisibility;
  showOnLeaderboard: boolean;
  showWalletAddress: boolean;

  // Forecasts
  defaultForecastPrivacy: ForecastPrivacy;
  shareReasoningPublicly: boolean;

  // Attestations
  defaultAttestationMode: AttestationMode;
  useOffchainAttestations: boolean;
  usePrivateDataAttestations: boolean;

  // Data sharing
  allowReputationExport: boolean;
  allowDataAggregation: boolean;
}

export interface PrivacyStore extends PrivacySettings {
  // Profile settings
  setProfileVisibility: (visibility: ProfileVisibility) => void;
  setShowOnLeaderboard: (show: boolean) => void;
  setShowWalletAddress: (show: boolean) => void;

  // Forecast settings
  setDefaultForecastPrivacy: (privacy: ForecastPrivacy) => void;
  setShareReasoningPublicly: (share: boolean) => void;

  // Attestation settings
  setDefaultAttestationMode: (mode: AttestationMode) => void;
  setUseOffchainAttestations: (use: boolean) => void;
  setUsePrivateDataAttestations: (use: boolean) => void;

  // Data sharing settings
  setAllowReputationExport: (allow: boolean) => void;
  setAllowDataAggregation: (allow: boolean) => void;

  // Bulk updates
  updateSettings: (settings: Partial<PrivacySettings>) => void;
  resetToDefaults: () => void;
}

export const PROFILE_VISIBILITY_OPTIONS: Record<ProfileVisibility, { label: string; description: string }> = {
  PUBLIC: { label: 'Public', description: 'Anyone can view your profile and forecasts' },
  AUTHENTICATED: { label: 'Authenticated', description: 'Only logged-in users can view' },
  PRIVATE: { label: 'Private', description: 'Only you can view your data' },
};

export const FORECAST_PRIVACY_OPTIONS: Record<ForecastPrivacy, { label: string; description: string }> = {
  PUBLIC: { label: 'Fully Public', description: 'Probability and reasoning visible to all' },
  PROBABILITY_ONLY: { label: 'Probability Only', description: 'Reasoning kept private' },
  PRIVATE: { label: 'Private', description: 'Only you can see' },
  MERKLE: { label: 'Merkle Private', description: 'Cryptographically private with selective disclosure' },
};

export const ATTESTATION_MODE_OPTIONS: Record<AttestationMode, { label: string; description: string }> = {
  ON_CHAIN: { label: 'On-Chain', description: 'Fully transparent, stored on Base L2' },
  OFF_CHAIN: { label: 'Off-Chain', description: 'Signed but stored off-chain for privacy' },
  PRIVATE: { label: 'Private (Merkle)', description: 'Merkle tree for selective disclosure' },
};

const DEFAULT_SETTINGS: PrivacySettings = {
  profileVisibility: 'PUBLIC',
  showOnLeaderboard: true,
  showWalletAddress: false,
  defaultForecastPrivacy: 'PUBLIC',
  shareReasoningPublicly: false,
  defaultAttestationMode: 'ON_CHAIN',
  useOffchainAttestations: false,
  usePrivateDataAttestations: false,
  allowReputationExport: true,
  allowDataAggregation: true,
};

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setProfileVisibility: (visibility) => set({ profileVisibility: visibility }),
      setShowOnLeaderboard: (show) => set({ showOnLeaderboard: show }),
      setShowWalletAddress: (show) => set({ showWalletAddress: show }),

      setDefaultForecastPrivacy: (privacy) => set({ defaultForecastPrivacy: privacy }),
      setShareReasoningPublicly: (share) => set({ shareReasoningPublicly: share }),

      setDefaultAttestationMode: (mode) => {
        set({
          defaultAttestationMode: mode,
          useOffchainAttestations: mode === 'OFF_CHAIN',
          usePrivateDataAttestations: mode === 'PRIVATE',
        });
      },
      setUseOffchainAttestations: (use) => set({ useOffchainAttestations: use }),
      setUsePrivateDataAttestations: (use) => set({ usePrivateDataAttestations: use }),

      setAllowReputationExport: (allow) => set({ allowReputationExport: allow }),
      setAllowDataAggregation: (allow) => set({ allowDataAggregation: allow }),

      updateSettings: (settings) => set(settings),
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'calibr-privacy-settings',
      version: 1,
    }
  )
);
