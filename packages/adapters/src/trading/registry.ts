/**
 * Trading Adapter Registry
 * Manages registration and retrieval of trading adapters for different platforms
 */

import type {
  TradingPlatform,
  ITradingAdapter,
  TradingAdapterFactory,
  TradingAdapterRegistry,
} from './types';

class AdapterRegistry implements TradingAdapterRegistry {
  private factories = new Map<TradingPlatform, TradingAdapterFactory>();
  private instances = new Map<string, ITradingAdapter>();

  /**
   * Register an adapter factory for a platform
   */
  register(platform: TradingPlatform, factory: TradingAdapterFactory): void {
    this.factories.set(platform, factory);
  }

  /**
   * Get a factory for a platform
   */
  get(platform: TradingPlatform): TradingAdapterFactory | undefined {
    return this.factories.get(platform);
  }

  /**
   * Get all registered factories
   */
  getAll(): Map<TradingPlatform, TradingAdapterFactory> {
    return new Map(this.factories);
  }

  /**
   * Create or get an adapter instance
   * Uses a key to cache instances (e.g., "POLYMARKET:0x123...")
   */
  getOrCreate(
    platform: TradingPlatform,
    config: Record<string, unknown>,
    instanceKey?: string
  ): ITradingAdapter {
    const key = instanceKey || `${platform}:default`;

    // Return cached instance if exists
    const existing = this.instances.get(key);
    if (existing) {
      return existing;
    }

    // Create new instance
    const factory = this.factories.get(platform);
    if (!factory) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }

    const instance = factory(config);
    this.instances.set(key, instance);
    return instance;
  }

  /**
   * Remove a cached instance
   */
  removeInstance(instanceKey: string): boolean {
    return this.instances.delete(instanceKey);
  }

  /**
   * Clear all cached instances
   */
  clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Get all available platforms
   */
  getAvailablePlatforms(): TradingPlatform[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Check if a platform is registered
   */
  isRegistered(platform: TradingPlatform): boolean {
    return this.factories.has(platform);
  }
}

// Singleton registry instance
export const tradingAdapterRegistry = new AdapterRegistry();

/**
 * Helper function to get a trading adapter
 */
export function getTradingAdapter(
  platform: TradingPlatform,
  config: Record<string, unknown> = {},
  instanceKey?: string
): ITradingAdapter {
  return tradingAdapterRegistry.getOrCreate(platform, config, instanceKey);
}

/**
 * Helper function to register an adapter
 */
export function registerTradingAdapter(
  platform: TradingPlatform,
  factory: TradingAdapterFactory
): void {
  tradingAdapterRegistry.register(platform, factory);
}
