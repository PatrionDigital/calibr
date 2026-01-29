/**
 * Social Recognition Tests
 * TDD tests for shoutouts, highlights, and social sharing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ShoutoutCard,
  ShareCard,
  RecognitionFeed,
  FeaturedSpotlight,
  CongratulationsMessage,
  ShareButtons,
} from '@/components/social-recognition';
import type {
  ShoutoutData,
  RecognitionEvent,
  SpotlightData,
  ShareData,
} from '@/components/social-recognition';

// =============================================================================
// Test Data
// =============================================================================

const mockShoutout: ShoutoutData = {
  id: 'shoutout-001',
  type: 'milestone',
  userId: 'user-123',
  displayName: 'OracleVision',
  tier: 'GRANDMASTER',
  title: '1000 Forecasts!',
  description: 'Reached an incredible milestone of 1000 predictions',
  metric: {
    label: 'Total Forecasts',
    value: 1000,
  },
  timestamp: '2024-01-15T10:30:00Z',
};

const mockStreakShoutout: ShoutoutData = {
  id: 'shoutout-002',
  type: 'streak',
  userId: 'user-456',
  displayName: 'PredictorPrime',
  tier: 'MASTER',
  title: '100 Day Streak!',
  description: 'Achieved centurion status with 100 consecutive days',
  metric: {
    label: 'Streak Days',
    value: 100,
  },
  timestamp: '2024-01-14T15:00:00Z',
};

const mockTierUpShoutout: ShoutoutData = {
  id: 'shoutout-003',
  type: 'tier-up',
  userId: 'user-789',
  displayName: 'InsightSeeker',
  tier: 'EXPERT',
  title: 'Promoted to EXPERT!',
  description: 'Earned promotion through exceptional forecasting',
  previousTier: 'JOURNEYMAN',
  timestamp: '2024-01-13T09:00:00Z',
};

const mockRecognitionEvents: RecognitionEvent[] = [
  {
    id: 'event-001',
    type: 'tier-up',
    userId: 'user-123',
    displayName: 'OracleVision',
    tier: 'GRANDMASTER',
    message: 'promoted to GRANDMASTER',
    timestamp: '2024-01-15T10:30:00Z',
  },
  {
    id: 'event-002',
    type: 'achievement',
    userId: 'user-456',
    displayName: 'PredictorPrime',
    tier: 'MASTER',
    message: 'unlocked Centurion achievement',
    timestamp: '2024-01-15T09:00:00Z',
  },
  {
    id: 'event-003',
    type: 'streak',
    userId: 'user-789',
    displayName: 'InsightSeeker',
    tier: 'EXPERT',
    message: 'reached a 30 day streak',
    timestamp: '2024-01-15T08:00:00Z',
  },
];

const mockSpotlight: SpotlightData = {
  userId: 'user-spotlight',
  displayName: 'WeeklyChampion',
  tier: 'MASTER',
  title: 'Forecaster of the Week',
  subtitle: 'January 8-14, 2024',
  bio: 'Specializing in technology sector predictions with remarkable accuracy.',
  stats: {
    forecasts: 45,
    accuracy: 0.92,
    brierScore: 0.11,
  },
  achievements: ['week-champion', 'accuracy-elite', 'streak-master'],
  featuredReason: 'Highest accuracy this week with 92% correct predictions',
};

const mockShareData: ShareData = {
  title: 'I reached GRANDMASTER on Calibr!',
  description: 'After 500 forecasts, I achieved the highest tier in prediction markets.',
  url: 'https://calibr.xyz/profile/user-123',
  image: 'https://calibr.xyz/share/grandmaster.png',
  stats: {
    tier: 'GRANDMASTER',
    forecasts: 500,
    brierScore: 0.09,
  },
};

// =============================================================================
// ShoutoutCard Tests
// =============================================================================

describe('ShoutoutCard', () => {
  it('should render shoutout container', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-card')).toBeInTheDocument();
  });

  it('should display shoutout title', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-title')).toHaveTextContent('1000 Forecasts!');
  });

  it('should display user name', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-user')).toHaveTextContent('OracleVision');
  });

  it('should display description', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-description')).toHaveTextContent(/1000 predictions/);
  });

  it('should display tier badge', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-tier')).toHaveTextContent('GRANDMASTER');
  });

  it('should display metric when provided', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-metric-value')).toHaveTextContent('1,000');
    expect(screen.getByTestId('shoutout-metric-label')).toHaveTextContent('Total Forecasts');
  });

  it('should show milestone icon for milestone type', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-icon')).toHaveTextContent('🏆');
  });

  it('should show flame icon for streak type', () => {
    render(<ShoutoutCard data={mockStreakShoutout} />);
    expect(screen.getByTestId('shoutout-icon')).toHaveTextContent('🔥');
  });

  it('should show promotion icon for tier-up type', () => {
    render(<ShoutoutCard data={mockTierUpShoutout} />);
    expect(screen.getByTestId('shoutout-icon')).toHaveTextContent('⬆️');
  });

  it('should show previous tier for tier-up shoutouts', () => {
    render(<ShoutoutCard data={mockTierUpShoutout} />);
    expect(screen.getByTestId('shoutout-previous-tier')).toHaveTextContent('JOURNEYMAN');
  });

  it('should apply tier-specific styling', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    const card = screen.getByTestId('shoutout-card');
    expect(card).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should show share button', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-share-button')).toBeInTheDocument();
  });

  it('should call onShare when share button clicked', () => {
    const onShare = vi.fn();
    render(<ShoutoutCard data={mockShoutout} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('shoutout-share-button'));
    expect(onShare).toHaveBeenCalledWith(mockShoutout);
  });

  it('should format timestamp', () => {
    render(<ShoutoutCard data={mockShoutout} />);
    expect(screen.getByTestId('shoutout-timestamp')).toBeInTheDocument();
  });
});

// =============================================================================
// ShareCard Tests
// =============================================================================

describe('ShareCard', () => {
  it('should render share card container', () => {
    render(<ShareCard data={mockShareData} />);
    expect(screen.getByTestId('share-card')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<ShareCard data={mockShareData} />);
    expect(screen.getByTestId('share-title')).toHaveTextContent('I reached GRANDMASTER');
  });

  it('should display description', () => {
    render(<ShareCard data={mockShareData} />);
    expect(screen.getByTestId('share-description')).toHaveTextContent(/500 forecasts/);
  });

  it('should display stats when provided', () => {
    render(<ShareCard data={mockShareData} />);
    expect(screen.getByTestId('share-stat-tier')).toHaveTextContent('GRANDMASTER');
    expect(screen.getByTestId('share-stat-forecasts')).toHaveTextContent('500');
    expect(screen.getByTestId('share-stat-brier')).toHaveTextContent('0.09');
  });

  it('should show Calibr branding', () => {
    render(<ShareCard data={mockShareData} />);
    expect(screen.getByTestId('share-branding')).toHaveTextContent('calibr.xyz');
  });

  it('should apply preview styling for social cards', () => {
    render(<ShareCard data={mockShareData} variant="preview" />);
    const card = screen.getByTestId('share-card');
    expect(card).toHaveAttribute('data-variant', 'preview');
  });

  it('should show tier emoji', () => {
    render(<ShareCard data={mockShareData} />);
    expect(screen.getByTestId('share-tier-emoji')).toBeInTheDocument();
  });
});

// =============================================================================
// RecognitionFeed Tests
// =============================================================================

describe('RecognitionFeed', () => {
  it('should render feed container', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} />);
    expect(screen.getByTestId('recognition-feed')).toBeInTheDocument();
  });

  it('should render all events', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} />);
    const events = screen.getAllByTestId('recognition-event');
    expect(events).toHaveLength(3);
  });

  it('should display event message', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} />);
    expect(screen.getByText(/promoted to GRANDMASTER/)).toBeInTheDocument();
  });

  it('should display user name for each event', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} />);
    expect(screen.getByText('OracleVision')).toBeInTheDocument();
    expect(screen.getByText('PredictorPrime')).toBeInTheDocument();
  });

  it('should show tier badges', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} />);
    const badges = screen.getAllByTestId('event-tier-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should show empty state when no events', () => {
    render(<RecognitionFeed events={[]} />);
    expect(screen.getByTestId('recognition-feed-empty')).toBeInTheDocument();
  });

  it('should show event icons by type', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} />);
    const icons = screen.getAllByTestId('event-icon');
    expect(icons).toHaveLength(3);
  });

  it('should show feed title', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} title="Recent Activity" />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should limit displayed events with maxEvents prop', () => {
    render(<RecognitionFeed events={mockRecognitionEvents} maxEvents={2} />);
    const events = screen.getAllByTestId('recognition-event');
    expect(events).toHaveLength(2);
  });

  it('should call onEventClick when event clicked', () => {
    const onClick = vi.fn();
    render(<RecognitionFeed events={mockRecognitionEvents} onEventClick={onClick} />);
    fireEvent.click(screen.getAllByTestId('recognition-event')[0]!);
    expect(onClick).toHaveBeenCalledWith(mockRecognitionEvents[0]);
  });
});

// =============================================================================
// FeaturedSpotlight Tests
// =============================================================================

describe('FeaturedSpotlight', () => {
  it('should render spotlight container', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('featured-spotlight')).toBeInTheDocument();
  });

  it('should display spotlight title', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-title')).toHaveTextContent('Forecaster of the Week');
  });

  it('should display subtitle', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-subtitle')).toHaveTextContent('January 8-14');
  });

  it('should display user name', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-user')).toHaveTextContent('WeeklyChampion');
  });

  it('should display tier', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-tier')).toHaveTextContent('MASTER');
  });

  it('should display bio', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-bio')).toHaveTextContent(/technology sector/);
  });

  it('should display stats', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-stat-forecasts')).toHaveTextContent('45');
    expect(screen.getByTestId('spotlight-stat-accuracy')).toHaveTextContent('92%');
    expect(screen.getByTestId('spotlight-stat-brier')).toHaveTextContent('0.11');
  });

  it('should display achievements', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-achievements')).toBeInTheDocument();
  });

  it('should display featured reason', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-reason')).toHaveTextContent(/92% correct/);
  });

  it('should show star decoration', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    expect(screen.getByTestId('spotlight-star')).toBeInTheDocument();
  });

  it('should apply tier-specific styling', () => {
    render(<FeaturedSpotlight data={mockSpotlight} />);
    const spotlight = screen.getByTestId('featured-spotlight');
    expect(spotlight).toHaveAttribute('data-tier', 'MASTER');
  });
});

// =============================================================================
// CongratulationsMessage Tests
// =============================================================================

describe('CongratulationsMessage', () => {
  it('should render message container', () => {
    render(
      <CongratulationsMessage
        type="tier-up"
        userName="TestUser"
        tier="EXPERT"
      />
    );
    expect(screen.getByTestId('congratulations-message')).toBeInTheDocument();
  });

  it('should display user name', () => {
    render(
      <CongratulationsMessage
        type="tier-up"
        userName="TestUser"
        tier="EXPERT"
      />
    );
    expect(screen.getByText(/TestUser/)).toBeInTheDocument();
  });

  it('should show tier-up congratulations', () => {
    render(
      <CongratulationsMessage
        type="tier-up"
        userName="TestUser"
        tier="EXPERT"
        previousTier="JOURNEYMAN"
      />
    );
    expect(screen.getByText(/promoted/i)).toBeInTheDocument();
  });

  it('should show achievement congratulations', () => {
    render(
      <CongratulationsMessage
        type="achievement"
        userName="TestUser"
        tier="MASTER"
        achievementName="Centurion"
      />
    );
    expect(screen.getByText(/Centurion/)).toBeInTheDocument();
  });

  it('should show streak congratulations', () => {
    render(
      <CongratulationsMessage
        type="streak"
        userName="TestUser"
        tier="JOURNEYMAN"
        streakDays={30}
      />
    );
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('should display celebration emoji', () => {
    render(
      <CongratulationsMessage
        type="tier-up"
        userName="TestUser"
        tier="GRANDMASTER"
      />
    );
    expect(screen.getByTestId('congrats-emoji')).toBeInTheDocument();
  });

  it('should apply tier-specific styling', () => {
    render(
      <CongratulationsMessage
        type="tier-up"
        userName="TestUser"
        tier="GRANDMASTER"
      />
    );
    const message = screen.getByTestId('congratulations-message');
    expect(message).toHaveAttribute('data-tier', 'GRANDMASTER');
  });
});

// =============================================================================
// ShareButtons Tests
// =============================================================================

describe('ShareButtons', () => {
  const shareUrl = 'https://calibr.xyz/share/123';
  const shareText = 'Check out my forecasting stats!';

  beforeEach(() => {
    // Mock window.open
    vi.stubGlobal('open', vi.fn());
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('should render share buttons container', () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    expect(screen.getByTestId('share-buttons')).toBeInTheDocument();
  });

  it('should show Twitter/X share button', () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
  });

  it('should show Farcaster share button', () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    expect(screen.getByTestId('share-farcaster')).toBeInTheDocument();
  });

  it('should show copy link button', () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    expect(screen.getByTestId('share-copy')).toBeInTheDocument();
  });

  it('should open Twitter share when Twitter button clicked', () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    fireEvent.click(screen.getByTestId('share-twitter'));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank'
    );
  });

  it('should open Farcaster share when Farcaster button clicked', () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    fireEvent.click(screen.getByTestId('share-farcaster'));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('warpcast.com'),
      '_blank'
    );
  });

  it('should copy link when copy button clicked', async () => {
    render(<ShareButtons url={shareUrl} text={shareText} />);
    fireEvent.click(screen.getByTestId('share-copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shareUrl);
  });

  it('should call onShare callback when sharing', () => {
    const onShare = vi.fn();
    render(<ShareButtons url={shareUrl} text={shareText} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('share-twitter'));
    expect(onShare).toHaveBeenCalledWith('twitter');
  });

  it('should apply compact variant', () => {
    render(<ShareButtons url={shareUrl} text={shareText} variant="compact" />);
    const buttons = screen.getByTestId('share-buttons');
    expect(buttons).toHaveAttribute('data-variant', 'compact');
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Social Recognition Integration', () => {
  it('should render shoutout with share buttons', () => {
    render(
      <div>
        <ShoutoutCard data={mockShoutout} />
        <ShareButtons url="https://calibr.xyz" text="Test" />
      </div>
    );
    expect(screen.getByTestId('shoutout-card')).toBeInTheDocument();
    expect(screen.getByTestId('share-buttons')).toBeInTheDocument();
  });

  it('should render recognition feed with spotlight', () => {
    render(
      <div>
        <FeaturedSpotlight data={mockSpotlight} />
        <RecognitionFeed events={mockRecognitionEvents} />
      </div>
    );
    expect(screen.getByTestId('featured-spotlight')).toBeInTheDocument();
    expect(screen.getByTestId('recognition-feed')).toBeInTheDocument();
  });
});
