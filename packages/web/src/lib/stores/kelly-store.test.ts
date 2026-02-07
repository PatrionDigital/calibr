/**
 * Kelly Store Tests
 *
 * Tests for Kelly Criterion settings store:
 * - Default state
 * - Multiplier setting and clamping
 * - Preset selection
 * - Bankroll management
 * - Max position size
 * - Auto-expand preference
 * - Reset to defaults
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useKellyStore,
  MULTIPLIER_PRESETS,
  type KellyMultiplierPreset,
} from './kelly-store';

// =============================================================================
// Tests
// =============================================================================

describe('MULTIPLIER_PRESETS', () => {
  it('has FULL preset at 1.0', () => {
    expect(MULTIPLIER_PRESETS.FULL.value).toBe(1.0);
    expect(MULTIPLIER_PRESETS.FULL.label).toBe('Full Kelly');
  });

  it('has THREE_QUARTER preset at 0.75', () => {
    expect(MULTIPLIER_PRESETS.THREE_QUARTER.value).toBe(0.75);
    expect(MULTIPLIER_PRESETS.THREE_QUARTER.label).toBe('3/4 Kelly');
  });

  it('has HALF preset at 0.5', () => {
    expect(MULTIPLIER_PRESETS.HALF.value).toBe(0.5);
    expect(MULTIPLIER_PRESETS.HALF.label).toBe('Half Kelly');
  });

  it('has QUARTER preset at 0.25', () => {
    expect(MULTIPLIER_PRESETS.QUARTER.value).toBe(0.25);
    expect(MULTIPLIER_PRESETS.QUARTER.label).toBe('1/4 Kelly');
  });

  it('has CONSERVATIVE preset at 0.1', () => {
    expect(MULTIPLIER_PRESETS.CONSERVATIVE.value).toBe(0.1);
    expect(MULTIPLIER_PRESETS.CONSERVATIVE.label).toBe('1/10 Kelly');
  });

  it('all presets have descriptions', () => {
    const presets: KellyMultiplierPreset[] = ['FULL', 'THREE_QUARTER', 'HALF', 'QUARTER', 'CONSERVATIVE'];
    presets.forEach((preset) => {
      expect(MULTIPLIER_PRESETS[preset].description).toBeTruthy();
    });
  });
});

describe('useKellyStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    const { result } = renderHook(() => useKellyStore());
    act(() => {
      result.current.resetToDefaults();
    });
  });

  describe('default state', () => {
    it('has default multiplier of 0.5 (Half Kelly)', () => {
      const { result } = renderHook(() => useKellyStore());
      expect(result.current.multiplier).toBe(0.5);
      expect(result.current.multiplierPreset).toBe('HALF');
    });

    it('has default bankroll of 1000', () => {
      const { result } = renderHook(() => useKellyStore());
      expect(result.current.bankroll).toBe(1000);
    });

    it('has default maxPositionSize of 0.25', () => {
      const { result } = renderHook(() => useKellyStore());
      expect(result.current.maxPositionSize).toBe(0.25);
    });

    it('has autoExpandCalculator disabled by default', () => {
      const { result } = renderHook(() => useKellyStore());
      expect(result.current.autoExpandCalculator).toBe(false);
    });
  });

  describe('setMultiplier', () => {
    it('sets multiplier to specified value', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(0.75);
      });

      expect(result.current.multiplier).toBe(0.75);
    });

    it('updates preset when multiplier matches', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(1.0);
      });

      expect(result.current.multiplierPreset).toBe('FULL');
    });

    it('clamps multiplier to minimum 0.01', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(0);
      });

      expect(result.current.multiplier).toBe(0.01);
    });

    it('clamps multiplier to maximum 1.0', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(2.0);
      });

      expect(result.current.multiplier).toBe(1.0);
    });

    it('clamps negative multiplier to minimum', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(-0.5);
      });

      expect(result.current.multiplier).toBe(0.01);
    });
  });

  describe('setMultiplierPreset', () => {
    const presets: KellyMultiplierPreset[] = ['FULL', 'THREE_QUARTER', 'HALF', 'QUARTER', 'CONSERVATIVE'];

    presets.forEach((preset) => {
      it(`sets ${preset} preset correctly`, () => {
        const { result } = renderHook(() => useKellyStore());

        act(() => {
          result.current.setMultiplierPreset(preset);
        });

        expect(result.current.multiplierPreset).toBe(preset);
        expect(result.current.multiplier).toBe(MULTIPLIER_PRESETS[preset].value);
      });
    });
  });

  describe('setBankroll', () => {
    it('sets bankroll to specified amount', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setBankroll(5000);
      });

      expect(result.current.bankroll).toBe(5000);
    });

    it('clamps bankroll to minimum 0', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setBankroll(-100);
      });

      expect(result.current.bankroll).toBe(0);
    });

    it('accepts zero bankroll', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setBankroll(0);
      });

      expect(result.current.bankroll).toBe(0);
    });

    it('accepts large bankroll values', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setBankroll(1000000);
      });

      expect(result.current.bankroll).toBe(1000000);
    });
  });

  describe('setMaxPositionSize', () => {
    it('sets maxPositionSize to specified fraction', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMaxPositionSize(0.5);
      });

      expect(result.current.maxPositionSize).toBe(0.5);
    });

    it('clamps to minimum 0.01', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMaxPositionSize(0);
      });

      expect(result.current.maxPositionSize).toBe(0.01);
    });

    it('clamps to maximum 1.0', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMaxPositionSize(1.5);
      });

      expect(result.current.maxPositionSize).toBe(1.0);
    });

    it('clamps negative values to minimum', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMaxPositionSize(-0.25);
      });

      expect(result.current.maxPositionSize).toBe(0.01);
    });
  });

  describe('setAutoExpandCalculator', () => {
    it('enables auto-expand', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setAutoExpandCalculator(true);
      });

      expect(result.current.autoExpandCalculator).toBe(true);
    });

    it('disables auto-expand', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setAutoExpandCalculator(true);
      });

      act(() => {
        result.current.setAutoExpandCalculator(false);
      });

      expect(result.current.autoExpandCalculator).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all values to defaults', () => {
      const { result } = renderHook(() => useKellyStore());

      // Change all values
      act(() => {
        result.current.setMultiplier(1.0);
        result.current.setBankroll(5000);
        result.current.setMaxPositionSize(0.5);
        result.current.setAutoExpandCalculator(true);
      });

      // Verify changed
      expect(result.current.multiplier).toBe(1.0);
      expect(result.current.bankroll).toBe(5000);

      // Reset
      act(() => {
        result.current.resetToDefaults();
      });

      // Verify defaults
      expect(result.current.multiplier).toBe(0.5);
      expect(result.current.multiplierPreset).toBe('HALF');
      expect(result.current.bankroll).toBe(1000);
      expect(result.current.maxPositionSize).toBe(0.25);
      expect(result.current.autoExpandCalculator).toBe(false);
    });
  });

  describe('preset detection from multiplier', () => {
    it('detects FULL for multiplier >= 1.0', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(1.0);
      });

      expect(result.current.multiplierPreset).toBe('FULL');
    });

    it('detects THREE_QUARTER for multiplier >= 0.75', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(0.8);
      });

      expect(result.current.multiplierPreset).toBe('THREE_QUARTER');
    });

    it('detects HALF for multiplier >= 0.5', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(0.6);
      });

      expect(result.current.multiplierPreset).toBe('HALF');
    });

    it('detects QUARTER for multiplier >= 0.25', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(0.3);
      });

      expect(result.current.multiplierPreset).toBe('QUARTER');
    });

    it('detects CONSERVATIVE for multiplier < 0.25', () => {
      const { result } = renderHook(() => useKellyStore());

      act(() => {
        result.current.setMultiplier(0.15);
      });

      expect(result.current.multiplierPreset).toBe('CONSERVATIVE');
    });
  });
});
