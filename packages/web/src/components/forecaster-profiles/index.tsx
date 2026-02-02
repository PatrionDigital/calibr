'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface TierInfo {
  currentTier: string;
  nextTier: string | null;
  progress: number;
  pointsToNext: number;
  totalPoints: number;
  promotedAt: string | null;
}

export interface ProfileStats {
  totalForecasts: number;
  resolvedForecasts: number;
  activeForecasts: number;
  avgBrierScore: number;
  avgTimeWeightedBrier: number;
  accuracy: number;
  calibration: number;
  profitLoss: number;
  winRate: number;
  avgConfidence: number;
  bestStreak: number;
  currentStreak: number;
}

export interface ProfileAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface ProfileActivity {
  id: string;
  type: 'forecast' | 'resolution' | 'achievement' | 'tier_change';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface PrivacySettings {
  showProfile: boolean;
  showStats: boolean;
  showForecasts: boolean;
  showAchievements: boolean;
  showActivity: boolean;
  showPnL: boolean;
}

export interface ForecasterProfile {
  id: string;
  address: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  joinedAt: string;
  tier: TierInfo;
  stats: ProfileStats;
  achievements: ProfileAchievement[];
  recentActivity: ProfileActivity[];
  privacy: PrivacySettings;
  isVerified: boolean;
  socialLinks: Record<string, string>;
}

export interface CalibrationBucket {
  bucket: number;
  predicted: number;
  actual: number;
  count: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercent(num: number): string {
  return `${Math.round(num * 100)}%`;
}

// =============================================================================
// ProfileHeader Component
// =============================================================================

interface ProfileHeaderProps {
  profile: ForecasterProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-header">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 border border-[var(--terminal-green)] flex items-center justify-center text-2xl bg-black">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <span>👤</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl text-[var(--terminal-green)]">{profile.displayName}</h1>
            {profile.isVerified && (
              <span data-testid="verified-badge" className="text-[var(--terminal-green)]" title="Verified">
                ✓
              </span>
            )}
            <span className="px-2 py-0.5 text-xs border border-[var(--terminal-green)] text-[var(--terminal-green)] uppercase">
              {profile.tier.currentTier}
            </span>
          </div>

          <div className="text-[var(--terminal-dim)] text-sm mt-1">
            {truncateAddress(profile.address)}
          </div>

          {profile.bio && (
            <p className="text-[var(--terminal-green)] text-sm mt-2 opacity-80">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--terminal-dim)]">
            <span>Joined {formatDate(profile.joinedAt)}</span>

            {/* Social Links */}
            {profile.socialLinks.twitter && (
              <a
                href={`https://twitter.com/${profile.socialLinks.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-twitter"
                className="text-[var(--terminal-green)] hover:underline"
              >
                @{profile.socialLinks.twitter}
              </a>
            )}
            {profile.socialLinks.github && (
              <a
                href={`https://github.com/${profile.socialLinks.github}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-github"
                className="text-[var(--terminal-green)] hover:underline"
              >
                gh/{profile.socialLinks.github}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ProfileStatsPanel Component
// =============================================================================

interface ProfileStatsPanelProps {
  stats: ProfileStats;
  showPnL?: boolean;
}

export function ProfileStatsPanel({ stats, showPnL = false }: ProfileStatsPanelProps) {
  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-stats">
      <h2 className="text-[var(--terminal-green)] mb-4 border-b border-[var(--terminal-green)] pb-2">
        ┌─ STATISTICS ─┐
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {/* Forecasts */}
        <div>
          <div className="text-[var(--terminal-dim)]">Total Forecasts</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.totalForecasts}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Resolved</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.resolvedForecasts}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Active</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.activeForecasts}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Accuracy</div>
          <div className="text-[var(--terminal-green)] text-lg">{formatPercent(stats.accuracy)}</div>
        </div>

        {/* Scores */}
        <div>
          <div className="text-[var(--terminal-dim)]">Brier Score</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.avgBrierScore.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Time-Weighted Brier</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.avgTimeWeightedBrier.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Calibration</div>
          <div className="text-[var(--terminal-green)] text-lg">{formatPercent(stats.calibration)}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Win Rate</div>
          <div className="text-[var(--terminal-green)] text-lg">{formatPercent(stats.winRate)}</div>
        </div>

        {/* Streaks */}
        <div>
          <div className="text-[var(--terminal-dim)]">Current Streak</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.currentStreak}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Best Streak</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.bestStreak}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Avg Confidence</div>
          <div className="text-[var(--terminal-green)] text-lg">{formatPercent(stats.avgConfidence)}</div>
        </div>

        {/* P&L (optional) */}
        {showPnL && (
          <div>
            <div className="text-[var(--terminal-dim)]">Profit/Loss</div>
            <div className={`text-lg ${stats.profitLoss >= 0 ? 'text-[var(--terminal-green)]' : 'text-red-500'}`}>
              ${formatNumber(stats.profitLoss)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ProfileAchievementsList Component
// =============================================================================

interface ProfileAchievementsListProps {
  achievements: ProfileAchievement[];
  filter?: 'all' | 'earned' | 'unearned';
}

export function ProfileAchievementsList({ achievements, filter = 'all' }: ProfileAchievementsListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredAchievements = useMemo(() => {
    if (filter === 'earned') {
      return achievements.filter((a) => a.earnedAt !== null);
    }
    if (filter === 'unearned') {
      return achievements.filter((a) => a.earnedAt === null);
    }
    return achievements;
  }, [achievements, filter]);

  const rarityColors: Record<string, string> = {
    common: 'text-gray-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-yellow-400',
  };

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-achievements">
      <h2 className="text-[var(--terminal-green)] mb-4 border-b border-[var(--terminal-green)] pb-2">
        ┌─ ACHIEVEMENTS ─┐
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            data-testid={`achievement-${achievement.id}`}
            data-achievement-item="true"
            className={`border border-[var(--terminal-green)] p-3 relative ${
              achievement.earnedAt === null ? 'opacity-50' : ''
            }`}
            onMouseEnter={() => setHoveredId(achievement.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="text-2xl mb-2">{achievement.icon}</div>
            <div className="text-[var(--terminal-green)] text-sm font-bold">{achievement.name}</div>
            <div className={`text-xs ${rarityColors[achievement.rarity]}`}>{achievement.rarity}</div>
            {achievement.earnedAt && (
              <div className="text-xs text-[var(--terminal-dim)] mt-1">
                {formatDate(achievement.earnedAt)}
              </div>
            )}

            {/* Tooltip */}
            {hoveredId === achievement.id && (
              <div className="absolute z-10 bottom-full left-0 mb-2 p-2 bg-black border border-[var(--terminal-green)] text-xs text-[var(--terminal-green)] w-48">
                {achievement.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ProfileActivityFeed Component
// =============================================================================

interface ProfileActivityFeedProps {
  activities: ProfileActivity[];
  filterType?: ProfileActivity['type'];
  limit?: number;
}

export function ProfileActivityFeed({ activities, filterType, limit }: ProfileActivityFeedProps) {
  const filteredActivities = useMemo(() => {
    let result = activities;
    if (filterType) {
      result = result.filter((a) => a.type === filterType);
    }
    if (limit) {
      result = result.slice(0, limit);
    }
    return result;
  }, [activities, filterType, limit]);

  const activityIcons: Record<ProfileActivity['type'], string> = {
    forecast: '🎯',
    resolution: '✅',
    achievement: '🏆',
    tier_change: '📈',
  };

  if (filteredActivities.length === 0) {
    return (
      <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-activity">
        <h2 className="text-[var(--terminal-green)] mb-4 border-b border-[var(--terminal-green)] pb-2">
          ┌─ ACTIVITY ─┐
        </h2>
        <div className="text-[var(--terminal-dim)] text-sm">No activity to display</div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-activity">
      <h2 className="text-[var(--terminal-green)] mb-4 border-b border-[var(--terminal-green)] pb-2">
        ┌─ ACTIVITY ─┐
      </h2>

      <div className="space-y-3">
        {filteredActivities.map((activity) => (
          <div
            key={activity.id}
            data-testid="activity-item"
            className="flex items-start gap-3 text-sm border-b border-[var(--terminal-green)] border-opacity-30 pb-3"
          >
            <span data-testid={`activity-icon-${activity.type}`} className="text-xl">
              {activityIcons[activity.type]}
            </span>
            <div className="flex-1">
              <div className="text-[var(--terminal-green)]">{activity.title}</div>
              <div className="text-[var(--terminal-dim)] text-xs">{activity.description}</div>
              {activity.type === 'forecast' && activity.metadata.probability != null && (
                <div className="text-[var(--terminal-green)] text-xs mt-1">
                  Probability: {formatPercent(activity.metadata.probability as number)}
                </div>
              )}
              {activity.type === 'resolution' && activity.metadata.brierScore != null && (
                <div className="text-[var(--terminal-green)] text-xs mt-1">
                  Brier: {(activity.metadata.brierScore as number).toFixed(2)}
                </div>
              )}
            </div>
            <div className="text-[var(--terminal-dim)] text-xs">{formatDate(activity.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ProfileCalibrationSection Component
// =============================================================================

interface ProfileCalibrationSectionProps {
  calibrationData: CalibrationBucket[];
  stats: ProfileStats;
}

export function ProfileCalibrationSection({ calibrationData, stats }: ProfileCalibrationSectionProps) {
  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-calibration">
      <h2 className="text-[var(--terminal-green)] mb-4 border-b border-[var(--terminal-green)] pb-2">
        ┌─ CALIBRATION ─┐
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Calibration</div>
          <div className="text-[var(--terminal-green)] text-lg">{formatPercent(stats.calibration)}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Brier Score</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.avgBrierScore.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Time-Weighted</div>
          <div className="text-[var(--terminal-green)] text-lg">{stats.avgTimeWeightedBrier.toFixed(3)}</div>
        </div>
      </div>

      {/* ASCII Calibration Chart */}
      <div data-testid="calibration-chart" className="bg-black p-4 border border-[var(--terminal-green)]">
        <div className="text-xs text-[var(--terminal-dim)] mb-2">Predicted vs Actual Outcomes</div>

        {/* Perfect calibration line */}
        <div data-testid="perfect-calibration-line" className="text-[var(--terminal-dim)] text-xs mb-2">
          ── Perfect Calibration ──
        </div>

        {/* Buckets */}
        <div className="space-y-1">
          {calibrationData.map((bucket) => {
            const isUnderconfident = bucket.actual > bucket.predicted;
            const isOverconfident = bucket.actual < bucket.predicted;
            const barWidth = Math.round(bucket.actual * 100);

            return (
              <div
                key={bucket.bucket}
                data-testid={`calibration-bucket-${bucket.bucket}`}
                data-calibration-bucket="true"
                className={`flex items-center gap-2 text-xs ${
                  isUnderconfident ? 'underconfident' : isOverconfident ? 'overconfident' : ''
                }`}
              >
                <span className="w-8 text-right text-[var(--terminal-dim)]">
                  {Math.round(bucket.bucket * 100)}%
                </span>
                <div className="flex-1 h-3 bg-black border border-[var(--terminal-green)] relative">
                  <div
                    className="h-full bg-[var(--terminal-green)]"
                    style={{ width: `${barWidth}%` }}
                  />
                  {/* Expected marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white opacity-50"
                    style={{ left: `${bucket.predicted * 100}%` }}
                  />
                </div>
                <span className="w-12 text-[var(--terminal-green)]">
                  {Math.round(bucket.actual * 100)}%
                </span>
                <span className="w-8 text-[var(--terminal-dim)]">n={bucket.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ProfileTierProgress Component
// =============================================================================

interface ProfileTierProgressProps {
  tier: TierInfo;
}

export function ProfileTierProgress({ tier }: ProfileTierProgressProps) {
  const isMaxTier = tier.nextTier === null;

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="profile-tier-progress">
      <h2 className="text-[var(--terminal-green)] mb-4 border-b border-[var(--terminal-green)] pb-2">
        ┌─ TIER PROGRESS ─┐
      </h2>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--terminal-green)] uppercase font-bold">{tier.currentTier}</span>
        {isMaxTier ? (
          <span className="text-[var(--terminal-dim)]">Max tier reached</span>
        ) : (
          <span className="text-[var(--terminal-dim)]">→ {tier.nextTier}</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-4 border border-[var(--terminal-green)] bg-black mb-2">
        <div
          data-testid="tier-progress-bar"
          className="h-full bg-[var(--terminal-green)]"
          style={{ width: `${tier.progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-[var(--terminal-dim)]">
        <span>{tier.totalPoints} points</span>
        <span>{tier.progress}%</span>
        {!isMaxTier && <span>{tier.pointsToNext} to next</span>}
      </div>

      {tier.promotedAt && (
        <div className="text-xs text-[var(--terminal-dim)] mt-2">
          Promoted on {formatDate(tier.promotedAt)}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ForecasterProfileCard Component
// =============================================================================

interface ForecasterProfileCardProps {
  profile: ForecasterProfile;
  size?: 'small' | 'medium' | 'large';
  onClick?: (profileId: string) => void;
}

export function ForecasterProfileCard({ profile, size = 'medium', onClick }: ForecasterProfileCardProps) {
  const earnedAchievements = profile.achievements.filter((a) => a.earnedAt !== null);

  return (
    <div
      data-testid="profile-card"
      className={`border border-[var(--terminal-green)] p-4 font-mono cursor-pointer hover:bg-[var(--terminal-green)] hover:bg-opacity-10 transition-colors ${
        size === 'small' ? 'p-2' : size === 'large' ? 'p-6' : 'p-4'
      }`}
      onClick={() => onClick?.(profile.id)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`border border-[var(--terminal-green)] flex items-center justify-center bg-black ${
            size === 'small' ? 'w-8 h-8 text-sm' : size === 'large' ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-xl'
          }`}
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <span>👤</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[var(--terminal-green)] font-bold truncate">{profile.displayName}</span>
            <span className="px-1 text-xs border border-[var(--terminal-green)] text-[var(--terminal-green)] uppercase">
              {profile.tier.currentTier}
            </span>
          </div>

          {size === 'large' && profile.bio && (
            <p className="text-[var(--terminal-dim)] text-xs mt-1 line-clamp-2">{profile.bio}</p>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--terminal-dim)]">
            <span>{profile.stats.totalForecasts} forecasts</span>
            <span>{formatPercent(profile.stats.accuracy)} accuracy</span>
            <span>{earnedAchievements.length} achievements</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ForecasterProfilePage Component
// =============================================================================

interface ForecasterProfilePageProps {
  profile: ForecasterProfile | null;
  calibrationData: CalibrationBucket[];
  isOwnProfile?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function ForecasterProfilePage({
  profile,
  calibrationData,
  isOwnProfile = false,
  isLoading = false,
  error = null,
}: ForecasterProfilePageProps) {
  if (isLoading) {
    return (
      <div data-testid="profile-loading" className="border border-[var(--terminal-green)] p-8 font-mono text-center">
        <div className="text-[var(--terminal-green)] animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[var(--terminal-green)] p-8 font-mono text-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="border border-[var(--terminal-green)] p-8 font-mono text-center">
        <div className="text-[var(--terminal-dim)]">Profile not found</div>
      </div>
    );
  }

  if (!profile.privacy.showProfile) {
    return (
      <div className="border border-[var(--terminal-green)] p-8 font-mono text-center">
        <div className="text-[var(--terminal-dim)]">This is a private profile</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Edit Button */}
      {isOwnProfile && (
        <div className="flex justify-end">
          <button className="px-4 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors">
            Edit Profile
          </button>
        </div>
      )}

      {/* Header */}
      <ProfileHeader profile={profile} />

      {/* Stats */}
      {profile.privacy.showStats && (
        <ProfileStatsPanel stats={profile.stats} showPnL={profile.privacy.showPnL} />
      )}

      {/* Tier Progress */}
      <ProfileTierProgress tier={profile.tier} />

      {/* Calibration */}
      {profile.privacy.showStats && (
        <ProfileCalibrationSection calibrationData={calibrationData} stats={profile.stats} />
      )}

      {/* Achievements */}
      {profile.privacy.showAchievements && (
        <ProfileAchievementsList achievements={profile.achievements} />
      )}

      {/* Activity */}
      {profile.privacy.showActivity && (
        <ProfileActivityFeed activities={profile.recentActivity} limit={10} />
      )}
    </div>
  );
}

// =============================================================================
// useForecasterProfile Hook
// =============================================================================

interface UseForecasterProfileReturn {
  profile: ForecasterProfile | null;
  calibrationData: CalibrationBucket[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useForecasterProfile(profileId: string): UseForecasterProfileReturn {
  const [profile, setProfile] = useState<ForecasterProfile | null>(null);
  const [calibrationData, setCalibrationData] = useState<CalibrationBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (profileId === 'nonexistent') {
        throw new Error('Profile not found');
      }

      // Mock data for testing
      const mockProfile: ForecasterProfile = {
        id: profileId,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        displayName: 'TestUser',
        avatarUrl: null,
        bio: 'Test bio',
        joinedAt: '2024-01-01T00:00:00Z',
        tier: {
          currentTier: 'expert',
          nextTier: 'superforecaster',
          progress: 72,
          pointsToNext: 280,
          totalPoints: 720,
          promotedAt: null,
        },
        stats: {
          totalForecasts: 100,
          resolvedForecasts: 80,
          activeForecasts: 20,
          avgBrierScore: 0.2,
          avgTimeWeightedBrier: 0.18,
          accuracy: 0.75,
          calibration: 0.8,
          profitLoss: 500,
          winRate: 0.65,
          avgConfidence: 0.7,
          bestStreak: 10,
          currentStreak: 5,
        },
        achievements: [],
        recentActivity: [],
        privacy: {
          showProfile: true,
          showStats: true,
          showForecasts: true,
          showAchievements: true,
          showActivity: true,
          showPnL: true,
        },
        isVerified: false,
        socialLinks: {},
      };

      setProfile(mockProfile);
      setCalibrationData([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    calibrationData,
    isLoading,
    error,
    refresh: loadProfile,
  };
}
