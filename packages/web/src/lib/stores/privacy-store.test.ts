/**
 * Privacy Store Tests
 *
 * Tests for privacy settings store:
 * - Default state
 * - Profile visibility settings
 * - Forecast privacy settings
 * - Attestation mode settings
 * - Data sharing settings
 * - Bulk updates
 * - Reset to defaults
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  usePrivacyStore,
  PROFILE_VISIBILITY_OPTIONS,
  FORECAST_PRIVACY_OPTIONS,
  ATTESTATION_MODE_OPTIONS,
  type ProfileVisibility,
  type ForecastPrivacy,
} from './privacy-store';

// =============================================================================
// Tests
// =============================================================================

describe('Privacy options constants', () => {
  describe('PROFILE_VISIBILITY_OPTIONS', () => {
    it('has PUBLIC option', () => {
      expect(PROFILE_VISIBILITY_OPTIONS.PUBLIC.label).toBe('Public');
      expect(PROFILE_VISIBILITY_OPTIONS.PUBLIC.description).toBeTruthy();
    });

    it('has AUTHENTICATED option', () => {
      expect(PROFILE_VISIBILITY_OPTIONS.AUTHENTICATED.label).toBe('Authenticated');
      expect(PROFILE_VISIBILITY_OPTIONS.AUTHENTICATED.description).toBeTruthy();
    });

    it('has PRIVATE option', () => {
      expect(PROFILE_VISIBILITY_OPTIONS.PRIVATE.label).toBe('Private');
      expect(PROFILE_VISIBILITY_OPTIONS.PRIVATE.description).toBeTruthy();
    });
  });

  describe('FORECAST_PRIVACY_OPTIONS', () => {
    it('has PUBLIC option', () => {
      expect(FORECAST_PRIVACY_OPTIONS.PUBLIC.label).toBe('Fully Public');
    });

    it('has PROBABILITY_ONLY option', () => {
      expect(FORECAST_PRIVACY_OPTIONS.PROBABILITY_ONLY.label).toBe('Probability Only');
    });

    it('has PRIVATE option', () => {
      expect(FORECAST_PRIVACY_OPTIONS.PRIVATE.label).toBe('Private');
    });

    it('has MERKLE option', () => {
      expect(FORECAST_PRIVACY_OPTIONS.MERKLE.label).toBe('Merkle Private');
    });
  });

  describe('ATTESTATION_MODE_OPTIONS', () => {
    it('has ON_CHAIN option', () => {
      expect(ATTESTATION_MODE_OPTIONS.ON_CHAIN.label).toBe('On-Chain');
    });

    it('has OFF_CHAIN option', () => {
      expect(ATTESTATION_MODE_OPTIONS.OFF_CHAIN.label).toBe('Off-Chain');
    });

    it('has PRIVATE option', () => {
      expect(ATTESTATION_MODE_OPTIONS.PRIVATE.label).toBe('Private (Merkle)');
    });
  });
});

describe('usePrivacyStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    const { result } = renderHook(() => usePrivacyStore());
    act(() => {
      result.current.resetToDefaults();
    });
  });

  describe('default state', () => {
    it('has default profile visibility of PUBLIC', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.profileVisibility).toBe('PUBLIC');
    });

    it('has showOnLeaderboard enabled by default', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.showOnLeaderboard).toBe(true);
    });

    it('has showWalletAddress disabled by default', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.showWalletAddress).toBe(false);
    });

    it('has default forecast privacy of PUBLIC', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.defaultForecastPrivacy).toBe('PUBLIC');
    });

    it('has shareReasoningPublicly disabled by default', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.shareReasoningPublicly).toBe(false);
    });

    it('has default attestation mode of ON_CHAIN', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.defaultAttestationMode).toBe('ON_CHAIN');
    });

    it('has allowReputationExport enabled by default', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.allowReputationExport).toBe(true);
    });

    it('has allowDataAggregation enabled by default', () => {
      const { result } = renderHook(() => usePrivacyStore());
      expect(result.current.allowDataAggregation).toBe(true);
    });
  });

  describe('profile settings', () => {
    describe('setProfileVisibility', () => {
      const visibilities: ProfileVisibility[] = ['PUBLIC', 'AUTHENTICATED', 'PRIVATE'];

      visibilities.forEach((visibility) => {
        it(`sets profile visibility to ${visibility}`, () => {
          const { result } = renderHook(() => usePrivacyStore());

          act(() => {
            result.current.setProfileVisibility(visibility);
          });

          expect(result.current.profileVisibility).toBe(visibility);
        });
      });
    });

    describe('setShowOnLeaderboard', () => {
      it('enables leaderboard visibility', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setShowOnLeaderboard(false);
        });

        act(() => {
          result.current.setShowOnLeaderboard(true);
        });

        expect(result.current.showOnLeaderboard).toBe(true);
      });

      it('disables leaderboard visibility', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setShowOnLeaderboard(false);
        });

        expect(result.current.showOnLeaderboard).toBe(false);
      });
    });

    describe('setShowWalletAddress', () => {
      it('enables wallet address visibility', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setShowWalletAddress(true);
        });

        expect(result.current.showWalletAddress).toBe(true);
      });

      it('disables wallet address visibility', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setShowWalletAddress(true);
        });

        act(() => {
          result.current.setShowWalletAddress(false);
        });

        expect(result.current.showWalletAddress).toBe(false);
      });
    });
  });

  describe('forecast settings', () => {
    describe('setDefaultForecastPrivacy', () => {
      const privacies: ForecastPrivacy[] = ['PUBLIC', 'PROBABILITY_ONLY', 'PRIVATE', 'MERKLE'];

      privacies.forEach((privacy) => {
        it(`sets forecast privacy to ${privacy}`, () => {
          const { result } = renderHook(() => usePrivacyStore());

          act(() => {
            result.current.setDefaultForecastPrivacy(privacy);
          });

          expect(result.current.defaultForecastPrivacy).toBe(privacy);
        });
      });
    });

    describe('setShareReasoningPublicly', () => {
      it('enables public reasoning sharing', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setShareReasoningPublicly(true);
        });

        expect(result.current.shareReasoningPublicly).toBe(true);
      });

      it('disables public reasoning sharing', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setShareReasoningPublicly(true);
        });

        act(() => {
          result.current.setShareReasoningPublicly(false);
        });

        expect(result.current.shareReasoningPublicly).toBe(false);
      });
    });
  });

  describe('attestation settings', () => {
    describe('setDefaultAttestationMode', () => {
      it('sets to ON_CHAIN mode', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setDefaultAttestationMode('ON_CHAIN');
        });

        expect(result.current.defaultAttestationMode).toBe('ON_CHAIN');
        expect(result.current.useOffchainAttestations).toBe(false);
        expect(result.current.usePrivateDataAttestations).toBe(false);
      });

      it('sets to OFF_CHAIN mode and enables offchain flag', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setDefaultAttestationMode('OFF_CHAIN');
        });

        expect(result.current.defaultAttestationMode).toBe('OFF_CHAIN');
        expect(result.current.useOffchainAttestations).toBe(true);
        expect(result.current.usePrivateDataAttestations).toBe(false);
      });

      it('sets to PRIVATE mode and enables private flag', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setDefaultAttestationMode('PRIVATE');
        });

        expect(result.current.defaultAttestationMode).toBe('PRIVATE');
        expect(result.current.useOffchainAttestations).toBe(false);
        expect(result.current.usePrivateDataAttestations).toBe(true);
      });
    });

    describe('setUseOffchainAttestations', () => {
      it('enables offchain attestations', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setUseOffchainAttestations(true);
        });

        expect(result.current.useOffchainAttestations).toBe(true);
      });

      it('disables offchain attestations', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setUseOffchainAttestations(true);
        });

        act(() => {
          result.current.setUseOffchainAttestations(false);
        });

        expect(result.current.useOffchainAttestations).toBe(false);
      });
    });

    describe('setUsePrivateDataAttestations', () => {
      it('enables private attestations', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setUsePrivateDataAttestations(true);
        });

        expect(result.current.usePrivateDataAttestations).toBe(true);
      });

      it('disables private attestations', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setUsePrivateDataAttestations(true);
        });

        act(() => {
          result.current.setUsePrivateDataAttestations(false);
        });

        expect(result.current.usePrivateDataAttestations).toBe(false);
      });
    });
  });

  describe('data sharing settings', () => {
    describe('setAllowReputationExport', () => {
      it('enables reputation export', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setAllowReputationExport(false);
        });

        act(() => {
          result.current.setAllowReputationExport(true);
        });

        expect(result.current.allowReputationExport).toBe(true);
      });

      it('disables reputation export', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setAllowReputationExport(false);
        });

        expect(result.current.allowReputationExport).toBe(false);
      });
    });

    describe('setAllowDataAggregation', () => {
      it('enables data aggregation', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setAllowDataAggregation(false);
        });

        act(() => {
          result.current.setAllowDataAggregation(true);
        });

        expect(result.current.allowDataAggregation).toBe(true);
      });

      it('disables data aggregation', () => {
        const { result } = renderHook(() => usePrivacyStore());

        act(() => {
          result.current.setAllowDataAggregation(false);
        });

        expect(result.current.allowDataAggregation).toBe(false);
      });
    });
  });

  describe('updateSettings', () => {
    it('updates multiple settings at once', () => {
      const { result } = renderHook(() => usePrivacyStore());

      act(() => {
        result.current.updateSettings({
          profileVisibility: 'PRIVATE',
          showOnLeaderboard: false,
          defaultForecastPrivacy: 'MERKLE',
        });
      });

      expect(result.current.profileVisibility).toBe('PRIVATE');
      expect(result.current.showOnLeaderboard).toBe(false);
      expect(result.current.defaultForecastPrivacy).toBe('MERKLE');
    });

    it('preserves unspecified settings', () => {
      const { result } = renderHook(() => usePrivacyStore());

      act(() => {
        result.current.setShowWalletAddress(true);
      });

      act(() => {
        result.current.updateSettings({
          profileVisibility: 'AUTHENTICATED',
        });
      });

      expect(result.current.showWalletAddress).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      const { result } = renderHook(() => usePrivacyStore());

      // Change all settings
      act(() => {
        result.current.setProfileVisibility('PRIVATE');
        result.current.setShowOnLeaderboard(false);
        result.current.setShowWalletAddress(true);
        result.current.setDefaultForecastPrivacy('MERKLE');
        result.current.setShareReasoningPublicly(true);
        result.current.setDefaultAttestationMode('PRIVATE');
        result.current.setAllowReputationExport(false);
        result.current.setAllowDataAggregation(false);
      });

      // Verify changed
      expect(result.current.profileVisibility).toBe('PRIVATE');
      expect(result.current.showOnLeaderboard).toBe(false);

      // Reset
      act(() => {
        result.current.resetToDefaults();
      });

      // Verify defaults
      expect(result.current.profileVisibility).toBe('PUBLIC');
      expect(result.current.showOnLeaderboard).toBe(true);
      expect(result.current.showWalletAddress).toBe(false);
      expect(result.current.defaultForecastPrivacy).toBe('PUBLIC');
      expect(result.current.shareReasoningPublicly).toBe(false);
      expect(result.current.defaultAttestationMode).toBe('ON_CHAIN');
      expect(result.current.useOffchainAttestations).toBe(false);
      expect(result.current.usePrivateDataAttestations).toBe(false);
      expect(result.current.allowReputationExport).toBe(true);
      expect(result.current.allowDataAggregation).toBe(true);
    });
  });
});
