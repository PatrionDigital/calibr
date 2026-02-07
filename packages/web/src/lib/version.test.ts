/**
 * Version Utility Tests
 *
 * Tests for version string utilities:
 * - getVersionString
 * - VERSION constant
 * - GIT_HASH constant
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('version utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('VERSION constant', () => {
    it('defaults to 0.0.0 when env not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
      const { VERSION } = await import('./version');
      expect(VERSION).toBe('0.0.0');
    });

    it('uses environment variable when set', async () => {
      process.env.NEXT_PUBLIC_APP_VERSION = '1.2.3';
      const { VERSION } = await import('./version');
      expect(VERSION).toBe('1.2.3');
    });
  });

  describe('GIT_HASH constant', () => {
    it('defaults to dev when env not set', async () => {
      delete process.env.NEXT_PUBLIC_GIT_HASH;
      const { GIT_HASH } = await import('./version');
      expect(GIT_HASH).toBe('dev');
    });

    it('uses environment variable when set', async () => {
      process.env.NEXT_PUBLIC_GIT_HASH = 'abc123def456';
      const { GIT_HASH } = await import('./version');
      expect(GIT_HASH).toBe('abc123def456');
    });
  });

  describe('getVersionString', () => {
    it('returns formatted version string with defaults', async () => {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
      delete process.env.NEXT_PUBLIC_GIT_HASH;
      const { getVersionString } = await import('./version');
      expect(getVersionString()).toBe('v0.0.0-dev');
    });

    it('returns formatted version string with custom values', async () => {
      process.env.NEXT_PUBLIC_APP_VERSION = '2.5.0';
      process.env.NEXT_PUBLIC_GIT_HASH = 'a1b2c3d4e5f6g7';
      const { getVersionString } = await import('./version');
      expect(getVersionString()).toBe('v2.5.0-a1b2c3d');
    });

    it('truncates git hash to 7 characters', async () => {
      process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0';
      process.env.NEXT_PUBLIC_GIT_HASH = 'abcdefghijklmnop';
      const { getVersionString } = await import('./version');
      expect(getVersionString()).toBe('v1.0.0-abcdefg');
    });

    it('handles short git hash', async () => {
      process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0';
      process.env.NEXT_PUBLIC_GIT_HASH = 'abc';
      const { getVersionString } = await import('./version');
      expect(getVersionString()).toBe('v1.0.0-abc');
    });
  });
});
