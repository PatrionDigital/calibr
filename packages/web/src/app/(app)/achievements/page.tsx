'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
// Achievement components available for future use:
// AchievementPanel, AchievementGrid, AchievementCard from '@/components/achievements'

// =============================================================================
// Types
// =============================================================================

type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';
type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  maxProgress: number;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_DESCRIPTIONS: Record<AchievementCategory, string> = {
  STREAK: 'Consistency in forecasting over time',
  VOLUME: 'Number of forecasts made',
  ACCURACY: 'Low Brier scores indicate high accuracy',
  CALIBRATION: 'How well-calibrated your predictions are',
  SPECIAL: 'Unique milestones and accomplishments',
};

const TIER_ORDER: AchievementTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

// =============================================================================
// Main Page
// =============================================================================

export default function AchievementsPage() {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    async function fetchDefinitions() {
      try {
        const response = await fetch(`${API_BASE}/api/leaderboard/achievements`);
        if (!response.ok) throw new Error('Failed to fetch achievements');

        const data = await response.json();
        if (data.success) {
          setDefinitions(data.data.achievements);
        }
      } catch (err) {
        console.error('Failed to fetch achievement definitions:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDefinitions();
  }, [API_BASE]);

  // Group definitions by category
  const byCategory = definitions.reduce(
    (acc, def) => {
      if (!acc[def.category]) {
        acc[def.category] = [];
      }
      acc[def.category].push(def);
      return acc;
    },
    {} as Record<AchievementCategory, AchievementDefinition[]>
  );

  // Sort each category by tier
  Object.keys(byCategory).forEach((cat) => {
    byCategory[cat as AchievementCategory].sort(
      (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
    );
  });

  const categories = Object.keys(byCategory) as AchievementCategory[];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/leaderboard" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            &lt; LEADERBOARD
          </Link>
          <h1 className="text-2xl font-bold terminal-glow">ACHIEVEMENT SYSTEM</h1>
        </div>

        {/* Overview */}
        <div className="ascii-box p-4 mb-6">
          <p className="text-sm mb-4">
            Unlock achievements by forecasting consistently, accurately, and reaching new milestones.
            Each achievement grants points towards your Achievement Score.
          </p>
          <div className="grid grid-cols-5 gap-4 text-center text-xs">
            <div>
              <div className="text-amber-600 font-bold">[B] BRONZE</div>
              <div className="text-[hsl(var(--muted-foreground))]">10 pts</div>
            </div>
            <div>
              <div className="text-gray-300 font-bold">[S] SILVER</div>
              <div className="text-[hsl(var(--muted-foreground))]">25 pts</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold">[G] GOLD</div>
              <div className="text-[hsl(var(--muted-foreground))]">50 pts</div>
            </div>
            <div>
              <div className="text-blue-200 font-bold">[P] PLATINUM</div>
              <div className="text-[hsl(var(--muted-foreground))]">100 pts</div>
            </div>
            <div>
              <div className="text-cyan-300 font-bold">[D] DIAMOND</div>
              <div className="text-[hsl(var(--muted-foreground))]">200 pts</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
            Loading achievements...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Category Navigation */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 text-sm font-mono border transition-colors ${
                  selectedCategory === null
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
                }`}
              >
                ALL ({definitions.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-sm font-mono border transition-colors ${
                    selectedCategory === cat
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
                  }`}
                >
                  {cat} ({byCategory[cat].length})
                </button>
              ))}
            </div>

            {/* Achievement Lists */}
            {selectedCategory === null ? (
              // Show all categories
              categories.map((cat) => (
                <div key={cat}>
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-[hsl(var(--primary))]">
                      [{cat}]
                    </h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {CATEGORY_DESCRIPTIONS[cat]}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {byCategory[cat].map((def) => (
                      <div
                        key={def.id}
                        className="ascii-box p-4 border-[hsl(var(--border))]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`font-mono text-xs ${
                                  def.tier === 'BRONZE'
                                    ? 'text-amber-600'
                                    : def.tier === 'SILVER'
                                    ? 'text-gray-300'
                                    : def.tier === 'GOLD'
                                    ? 'text-yellow-400'
                                    : def.tier === 'PLATINUM'
                                    ? 'text-blue-200'
                                    : 'text-cyan-300'
                                }`}
                              >
                                [{def.tier.charAt(0)}]
                              </span>
                              <h4 className="font-bold">{def.name}</h4>
                            </div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                              {def.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Show selected category
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-[hsl(var(--primary))]">
                    [{selectedCategory}]
                  </h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {CATEGORY_DESCRIPTIONS[selectedCategory]}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {byCategory[selectedCategory]?.map((def) => (
                    <div
                      key={def.id}
                      className="ascii-box p-4 border-[hsl(var(--border))]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-mono text-xs ${
                                def.tier === 'BRONZE'
                                  ? 'text-amber-600'
                                  : def.tier === 'SILVER'
                                  ? 'text-gray-300'
                                  : def.tier === 'GOLD'
                                  ? 'text-yellow-400'
                                  : def.tier === 'PLATINUM'
                                  ? 'text-blue-200'
                                  : 'text-cyan-300'
                              }`}
                            >
                              [{def.tier.charAt(0)}]
                            </span>
                            <h4 className="font-bold">{def.name}</h4>
                          </div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {def.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Your Achievements Section */}
        <div className="mt-12 pt-8 border-t border-[hsl(var(--border))]">
          <h2 className="text-lg font-bold text-[hsl(var(--primary))] mb-4">
            [YOUR ACHIEVEMENTS]
          </h2>
          <div className="ascii-box p-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Connect your wallet to track your achievement progress.
            </p>
            <button className="ascii-box px-4 py-2 text-sm hover:border-[hsl(var(--primary))] transition-colors">
              CONNECT WALLET
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
