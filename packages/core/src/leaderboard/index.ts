/**
 * Leaderboard Module
 * Superforecaster leaderboard system with tier progression and composite scoring
 */

// Types
export {
  // Tier system
  FORECASTER_TIERS,
  type ForecasterTier,
  TIER_THRESHOLDS,

  // Reputation
  REPUTATION_PLATFORMS,
  type ReputationPlatform,
  type ReputationSource,
  REPUTATION_WEIGHTS,

  // Achievements
  type AchievementCategory,
  type AchievementTier,
  type Achievement,

  // Leaderboard entries
  type LeaderboardEntry,
  type CompositeScore,

  // Categories & filtering
  type LeaderboardCategory,
  type LeaderboardFilter,
  type LeaderboardRanking,
  type PrivacyFilterOptions,
} from './types';

// Scoring
export {
  calculateCompositeScore,
  calculateCompositeScoreDetails,
  calculateStreakBonus,
  calculateTier,
  calculateTierProgress,
} from './scoring';

// Ranking
export {
  rankForecasters,
  filterLeaderboard,
  getLeaderboardByCategory,
  applyPrivacyFilter,
  maskPrivateEntries,
  calculateRankChanges,
  getTopForecasters,
  findForecasterPosition,
} from './ranking';

// Achievements
export {
  type AchievementDefinition,
  ACHIEVEMENT_DEFINITIONS,
  getAchievementDefinition,
  getAllAchievementDefinitions,
  getAchievementsByCategory,
  checkAchievements,
  checkNewlyUnlocked,
  getUnlockedAchievements,
  getInProgressAchievements,
  calculateAchievementScore,
  ACHIEVEMENT_TIER_COLORS,
  ACHIEVEMENT_CATEGORY_LABELS,
  getTierDisplayName,
  formatAchievementProgress,
} from './achievements';
