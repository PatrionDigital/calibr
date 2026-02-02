/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  ForecasterProfile,
  ProfileStats,
  ProfileAchievement,
  ProfileActivity,
  TierInfo,
  PrivacySettings,
} from '../../src/components/forecaster-profiles';
import {
  ProfileHeader,
  ProfileStatsPanel,
  ProfileAchievementsList,
  ProfileActivityFeed,
  ProfileCalibrationSection,
  ProfileTierProgress,
  ForecasterProfileCard,
  ForecasterProfilePage,
  useForecasterProfile,
} from '../../src/components/forecaster-profiles';

// =============================================================================
// Test Data
// =============================================================================

const mockTierInfo: TierInfo = {
  currentTier: 'expert',
  nextTier: 'superforecaster',
  progress: 72,
  pointsToNext: 280,
  totalPoints: 720,
  promotedAt: '2025-06-15T10:00:00Z',
};

const mockProfileStats: ProfileStats = {
  totalForecasts: 245,
  resolvedForecasts: 198,
  activeForecasts: 47,
  avgBrierScore: 0.185,
  avgTimeWeightedBrier: 0.172,
  accuracy: 0.78,
  calibration: 0.82,
  profitLoss: 1250.75,
  winRate: 0.68,
  avgConfidence: 0.72,
  bestStreak: 15,
  currentStreak: 7,
};

const mockAchievements: ProfileAchievement[] = [
  {
    id: 'ach-1',
    name: 'First Forecast',
    description: 'Made your first prediction',
    icon: '🎯',
    earnedAt: '2024-01-15T10:00:00Z',
    rarity: 'common',
  },
  {
    id: 'ach-2',
    name: 'Century Club',
    description: 'Made 100 predictions',
    icon: '💯',
    earnedAt: '2024-06-20T14:30:00Z',
    rarity: 'rare',
  },
  {
    id: 'ach-3',
    name: 'Calibration Master',
    description: 'Achieved 90%+ calibration score',
    icon: '📊',
    earnedAt: '2025-01-10T09:15:00Z',
    rarity: 'epic',
  },
  {
    id: 'ach-4',
    name: 'Superforecaster Elite',
    description: 'Reached Superforecaster tier',
    icon: '🏆',
    earnedAt: null, // Not yet earned
    rarity: 'legendary',
  },
];

const mockActivities: ProfileActivity[] = [
  {
    id: 'act-1',
    type: 'forecast',
    title: 'Made a prediction',
    description: 'Will BTC reach $100k by EOY?',
    timestamp: '2025-12-01T15:30:00Z',
    metadata: { probability: 0.65 },
  },
  {
    id: 'act-2',
    type: 'resolution',
    title: 'Forecast resolved',
    description: 'ETH 2.0 merge completion',
    timestamp: '2025-11-28T10:00:00Z',
    metadata: { outcome: 'correct', brierScore: 0.12 },
  },
  {
    id: 'act-3',
    type: 'achievement',
    title: 'Achievement unlocked',
    description: 'Earned "Century Club" badge',
    timestamp: '2025-11-25T14:30:00Z',
    metadata: { achievementId: 'ach-2' },
  },
  {
    id: 'act-4',
    type: 'tier_change',
    title: 'Tier promotion',
    description: 'Advanced to Expert tier',
    timestamp: '2025-11-20T09:00:00Z',
    metadata: { fromTier: 'advanced', toTier: 'expert' },
  },
];

const mockPrivacySettings: PrivacySettings = {
  showProfile: true,
  showStats: true,
  showForecasts: true,
  showAchievements: true,
  showActivity: true,
  showPnL: false,
};

const mockProfile: ForecasterProfile = {
  id: 'user-123',
  address: '0x1234567890abcdef1234567890abcdef12345678',
  displayName: 'PredictionPro',
  avatarUrl: 'https://example.com/avatar.png',
  bio: 'Professional forecaster specializing in tech and crypto markets.',
  joinedAt: '2024-01-01T00:00:00Z',
  tier: mockTierInfo,
  stats: mockProfileStats,
  achievements: mockAchievements,
  recentActivity: mockActivities,
  privacy: mockPrivacySettings,
  isVerified: true,
  socialLinks: {
    twitter: 'predictionpro',
    github: 'predpro',
  },
};

const mockCalibrationData = [
  { bucket: 0.1, predicted: 0.1, actual: 0.08, count: 15 },
  { bucket: 0.2, predicted: 0.2, actual: 0.22, count: 18 },
  { bucket: 0.3, predicted: 0.3, actual: 0.28, count: 22 },
  { bucket: 0.4, predicted: 0.4, actual: 0.42, count: 25 },
  { bucket: 0.5, predicted: 0.5, actual: 0.48, count: 30 },
  { bucket: 0.6, predicted: 0.6, actual: 0.62, count: 28 },
  { bucket: 0.7, predicted: 0.7, actual: 0.68, count: 24 },
  { bucket: 0.8, predicted: 0.8, actual: 0.82, count: 20 },
  { bucket: 0.9, predicted: 0.9, actual: 0.88, count: 16 },
];

// =============================================================================
// ProfileHeader Tests
// =============================================================================

describe('ProfileHeader', () => {
  it('renders display name', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByText('PredictionPro')).toBeInTheDocument();
  });

  it('shows verification badge for verified users', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
  });

  it('hides verification badge for unverified users', () => {
    const unverifiedProfile = { ...mockProfile, isVerified: false };
    render(<ProfileHeader profile={unverifiedProfile} />);
    expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument();
  });

  it('displays user bio', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByText(/Professional forecaster/)).toBeInTheDocument();
  });

  it('shows current tier badge', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByText(/expert/i)).toBeInTheDocument();
  });

  it('displays join date', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
  });

  it('renders social links when provided', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByTestId('social-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('social-github')).toBeInTheDocument();
  });

  it('hides social links when not provided', () => {
    const profileNoSocial = { ...mockProfile, socialLinks: {} };
    render(<ProfileHeader profile={profileNoSocial} />);
    expect(screen.queryByTestId('social-twitter')).not.toBeInTheDocument();
  });

  it('truncates long addresses', () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByText(/0x1234\.\.\.5678/)).toBeInTheDocument();
  });
});

// =============================================================================
// ProfileStatsPanel Tests
// =============================================================================

describe('ProfileStatsPanel', () => {
  it('displays total forecasts count', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText('245')).toBeInTheDocument();
  });

  it('shows resolved vs active breakdown', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText('198')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('displays Brier score formatted correctly', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText('0.185')).toBeInTheDocument();
  });

  it('shows accuracy percentage', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText(/78%/)).toBeInTheDocument();
  });

  it('displays calibration score', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });

  it('shows win rate', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText(/68%/)).toBeInTheDocument();
  });

  it('displays current streak', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows best streak', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('hides P&L when privacy setting is off', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} showPnL={false} />);
    expect(screen.queryByText(/1250\.75/)).not.toBeInTheDocument();
  });

  it('shows P&L when privacy setting is on', () => {
    render(<ProfileStatsPanel stats={mockProfileStats} showPnL={true} />);
    expect(screen.getByText(/1,?250\.75/)).toBeInTheDocument();
  });
});

// =============================================================================
// ProfileAchievementsList Tests
// =============================================================================

describe('ProfileAchievementsList', () => {
  it('renders all achievements', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    expect(document.querySelectorAll('[data-achievement-item="true"]').length).toBe(4);
  });

  it('displays achievement names', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    expect(screen.getByText('First Forecast')).toBeInTheDocument();
    expect(screen.getByText('Century Club')).toBeInTheDocument();
  });

  it('shows achievement icons', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('💯')).toBeInTheDocument();
  });

  it('indicates unearned achievements', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    const unearnedAchievement = screen.getByTestId('achievement-ach-4');
    expect(unearnedAchievement).toHaveClass('opacity-50');
  });

  it('shows earned date for earned achievements', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    expect(screen.getByText(/Jan.*2024/i)).toBeInTheDocument();
  });

  it('displays rarity indicator', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    expect(screen.getByText(/common/i)).toBeInTheDocument();
    expect(screen.getByText(/rare/i)).toBeInTheDocument();
    expect(screen.getByText(/epic/i)).toBeInTheDocument();
  });

  it('filters by earned status when filter is applied', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} filter="earned" />);
    expect(document.querySelectorAll('[data-achievement-item="true"]').length).toBe(3);
  });

  it('filters by unearned status when filter is applied', () => {
    render(<ProfileAchievementsList achievements={mockAchievements} filter="unearned" />);
    expect(document.querySelectorAll('[data-achievement-item="true"]').length).toBe(1);
  });

  it('shows achievement description on hover', async () => {
    render(<ProfileAchievementsList achievements={mockAchievements} />);
    const achievement = screen.getByTestId('achievement-ach-1');
    fireEvent.mouseEnter(achievement);
    await waitFor(() => {
      expect(screen.getByText('Made your first prediction')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// ProfileActivityFeed Tests
// =============================================================================

describe('ProfileActivityFeed', () => {
  it('renders all activities', () => {
    render(<ProfileActivityFeed activities={mockActivities} />);
    expect(screen.getAllByTestId('activity-item').length).toBe(4);
  });

  it('displays activity titles', () => {
    render(<ProfileActivityFeed activities={mockActivities} />);
    expect(screen.getByText('Made a prediction')).toBeInTheDocument();
    expect(screen.getByText('Forecast resolved')).toBeInTheDocument();
  });

  it('shows activity timestamps', () => {
    render(<ProfileActivityFeed activities={mockActivities} />);
    expect(screen.getByText(/Dec.*2025/i)).toBeInTheDocument();
  });

  it('displays correct icon for each activity type', () => {
    render(<ProfileActivityFeed activities={mockActivities} />);
    expect(screen.getByTestId('activity-icon-forecast')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-resolution')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-achievement')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-tier_change')).toBeInTheDocument();
  });

  it('shows forecast probability for forecast activities', () => {
    render(<ProfileActivityFeed activities={mockActivities} />);
    expect(screen.getByText(/65%/)).toBeInTheDocument();
  });

  it('shows Brier score for resolution activities', () => {
    render(<ProfileActivityFeed activities={mockActivities} />);
    expect(screen.getByText(/0\.12/)).toBeInTheDocument();
  });

  it('filters by activity type', () => {
    render(<ProfileActivityFeed activities={mockActivities} filterType="forecast" />);
    expect(screen.getAllByTestId('activity-item').length).toBe(1);
  });

  it('limits number of displayed activities', () => {
    render(<ProfileActivityFeed activities={mockActivities} limit={2} />);
    expect(screen.getAllByTestId('activity-item').length).toBe(2);
  });

  it('shows empty state when no activities', () => {
    render(<ProfileActivityFeed activities={[]} />);
    expect(screen.getByText(/no activity/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ProfileCalibrationSection Tests
// =============================================================================

describe('ProfileCalibrationSection', () => {
  it('renders calibration chart', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    expect(screen.getByTestId('calibration-chart')).toBeInTheDocument();
  });

  it('displays overall calibration score', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    expect(screen.getAllByText(/82%/).length).toBeGreaterThan(0);
  });

  it('shows Brier score', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    expect(screen.getByText('0.185')).toBeInTheDocument();
  });

  it('displays time-weighted Brier score', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    expect(screen.getByText('0.172')).toBeInTheDocument();
  });

  it('shows bucket breakdown', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    expect(document.querySelectorAll('[data-calibration-bucket="true"]').length).toBe(9);
  });

  it('highlights over/under confident buckets', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    const bucket20 = screen.getByTestId('calibration-bucket-0.2');
    expect(bucket20).toHaveClass('underconfident');
  });

  it('shows perfect calibration line reference', () => {
    render(<ProfileCalibrationSection calibrationData={mockCalibrationData} stats={mockProfileStats} />);
    expect(screen.getByTestId('perfect-calibration-line')).toBeInTheDocument();
  });
});

// =============================================================================
// ProfileTierProgress Tests
// =============================================================================

describe('ProfileTierProgress', () => {
  it('displays current tier', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    expect(screen.getByText(/expert/i)).toBeInTheDocument();
  });

  it('shows next tier goal', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    expect(screen.getByText(/superforecaster/i)).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    expect(screen.getByText(/72%/)).toBeInTheDocument();
  });

  it('shows points to next tier', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    expect(screen.getByText(/280/)).toBeInTheDocument();
  });

  it('displays total points', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    expect(screen.getByText(/720/)).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    const progressBar = screen.getByTestId('tier-progress-bar');
    expect(progressBar).toHaveStyle({ width: '72%' });
  });

  it('shows promotion date when provided', () => {
    render(<ProfileTierProgress tier={mockTierInfo} />);
    expect(screen.getByText(/promoted/i)).toBeInTheDocument();
  });

  it('handles max tier gracefully', () => {
    const maxTier: TierInfo = {
      ...mockTierInfo,
      currentTier: 'superforecaster',
      nextTier: null,
      progress: 100,
      pointsToNext: 0,
    };
    render(<ProfileTierProgress tier={maxTier} />);
    expect(screen.getByText(/max tier/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ForecasterProfileCard Tests
// =============================================================================

describe('ForecasterProfileCard', () => {
  it('renders profile summary', () => {
    render(<ForecasterProfileCard profile={mockProfile} />);
    expect(screen.getByText('PredictionPro')).toBeInTheDocument();
  });

  it('shows key stats', () => {
    render(<ForecasterProfileCard profile={mockProfile} />);
    expect(screen.getByText(/245.*forecasts/)).toBeInTheDocument();
    expect(screen.getByText(/78%.*accuracy/)).toBeInTheDocument();
  });

  it('displays tier badge', () => {
    render(<ForecasterProfileCard profile={mockProfile} />);
    expect(screen.getByText(/expert/i)).toBeInTheDocument();
  });

  it('shows achievement count', () => {
    render(<ForecasterProfileCard profile={mockProfile} />);
    expect(screen.getByText(/3.*achievements/i)).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<ForecasterProfileCard profile={mockProfile} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('profile-card'));
    expect(onClick).toHaveBeenCalledWith(mockProfile.id);
  });

  it('shows compact version when size is small', () => {
    render(<ForecasterProfileCard profile={mockProfile} size="small" />);
    expect(screen.queryByText(/Professional forecaster/)).not.toBeInTheDocument();
  });

  it('shows full version when size is large', () => {
    render(<ForecasterProfileCard profile={mockProfile} size="large" />);
    expect(screen.getByText(/Professional forecaster/)).toBeInTheDocument();
  });
});

// =============================================================================
// ForecasterProfilePage Tests
// =============================================================================

describe('ForecasterProfilePage', () => {
  it('renders all profile sections', () => {
    render(<ForecasterProfilePage profile={mockProfile} calibrationData={mockCalibrationData} />);
    expect(screen.getByTestId('profile-header')).toBeInTheDocument();
    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
    expect(screen.getByTestId('profile-achievements')).toBeInTheDocument();
    expect(screen.getByTestId('profile-calibration')).toBeInTheDocument();
    expect(screen.getByTestId('profile-activity')).toBeInTheDocument();
    expect(screen.getByTestId('profile-tier-progress')).toBeInTheDocument();
  });

  it('respects privacy settings for stats', () => {
    const privateProfile = {
      ...mockProfile,
      privacy: { ...mockPrivacySettings, showStats: false },
    };
    render(<ForecasterProfilePage profile={privateProfile} calibrationData={mockCalibrationData} />);
    expect(screen.queryByTestId('profile-stats')).not.toBeInTheDocument();
  });

  it('respects privacy settings for achievements', () => {
    const privateProfile = {
      ...mockProfile,
      privacy: { ...mockPrivacySettings, showAchievements: false },
    };
    render(<ForecasterProfilePage profile={privateProfile} calibrationData={mockCalibrationData} />);
    expect(screen.queryByTestId('profile-achievements')).not.toBeInTheDocument();
  });

  it('respects privacy settings for activity', () => {
    const privateProfile = {
      ...mockProfile,
      privacy: { ...mockPrivacySettings, showActivity: false },
    };
    render(<ForecasterProfilePage profile={privateProfile} calibrationData={mockCalibrationData} />);
    expect(screen.queryByTestId('profile-activity')).not.toBeInTheDocument();
  });

  it('shows edit button for own profile', () => {
    render(<ForecasterProfilePage profile={mockProfile} calibrationData={mockCalibrationData} isOwnProfile={true} />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('hides edit button for other profiles', () => {
    render(<ForecasterProfilePage profile={mockProfile} calibrationData={mockCalibrationData} isOwnProfile={false} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ForecasterProfilePage profile={null} calibrationData={[]} isLoading={true} />);
    expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<ForecasterProfilePage profile={null} calibrationData={[]} error="Profile not found" />);
    expect(screen.getByText(/profile not found/i)).toBeInTheDocument();
  });

  it('shows private profile message for hidden profiles', () => {
    const hiddenProfile = {
      ...mockProfile,
      privacy: { ...mockPrivacySettings, showProfile: false },
    };
    render(<ForecasterProfilePage profile={hiddenProfile} calibrationData={mockCalibrationData} />);
    expect(screen.getByText(/private profile/i)).toBeInTheDocument();
  });
});

// =============================================================================
// useForecasterProfile Hook Tests
// =============================================================================

describe('useForecasterProfile', () => {
  function TestComponent({ profileId }: { profileId: string }) {
    const { profile, isLoading, error, refresh } = useForecasterProfile(profileId);
    return (
      <div>
        <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
        <span data-testid="error">{error || 'no-error'}</span>
        <span data-testid="profile-name">{profile?.displayName || 'none'}</span>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    render(<TestComponent profileId="user-123" />);
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('loads profile data', async () => {
    render(<TestComponent profileId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    expect(screen.getByTestId('profile-name')).not.toHaveTextContent('none');
  });

  it('handles missing profile', async () => {
    render(<TestComponent profileId="nonexistent" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });
  });

  it('allows refresh', async () => {
    render(<TestComponent profileId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    fireEvent.click(screen.getByText('Refresh'));
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('updates when profileId changes', async () => {
    const { rerender } = render(<TestComponent profileId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    rerender(<TestComponent profileId="user-456" />);
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });
});
