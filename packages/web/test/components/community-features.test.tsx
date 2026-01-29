'use client';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  CommunityChannel,
  ChannelList,
  ChannelAccess,
  TierPerk,
  PerkList,
  ExclusiveContent,
  VIPBadge,
  CommunityGate,
  SuperforecasterHub,
  useCommunityAccess,
  type SuperforecasterTier,
  type CommunityChannelData,
  type TierPerkData,
} from '@/components/community-features';

// =============================================================================
// Test Data
// =============================================================================

const mockChannels: CommunityChannelData[] = [
  {
    id: 'general',
    name: 'General Discussion',
    description: 'Open to all members',
    requiredTier: 'APPRENTICE',
    memberCount: 1250,
    isActive: true,
  },
  {
    id: 'expert-lounge',
    name: 'Expert Lounge',
    description: 'Exclusive space for verified experts',
    requiredTier: 'EXPERT',
    memberCount: 156,
    isActive: true,
  },
  {
    id: 'grandmaster-circle',
    name: 'Grandmaster Circle',
    description: 'Elite forecaster discussion',
    requiredTier: 'GRANDMASTER',
    memberCount: 12,
    isActive: true,
  },
  {
    id: 'alpha-signals',
    name: 'Alpha Signals',
    description: 'Market analysis from top forecasters',
    requiredTier: 'MASTER',
    memberCount: 45,
    isActive: false,
  },
];

const mockPerks: TierPerkData[] = [
  {
    id: 'early-access',
    name: 'Early Market Access',
    description: 'Get notified about new markets 24h early',
    requiredTier: 'JOURNEYMAN',
    icon: '⏰',
  },
  {
    id: 'reduced-fees',
    name: 'Reduced Fees',
    description: '25% reduction on trading fees',
    requiredTier: 'EXPERT',
    icon: '💰',
  },
  {
    id: 'private-analytics',
    name: 'Private Analytics',
    description: 'Advanced performance dashboards',
    requiredTier: 'MASTER',
    icon: '📊',
  },
  {
    id: 'mentorship',
    name: 'Mentorship Program',
    description: 'One-on-one sessions with grandmasters',
    requiredTier: 'GRANDMASTER',
    icon: '🎓',
  },
];

const tierOrder: SuperforecasterTier[] = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

function meetsRequirement(userTier: SuperforecasterTier, requiredTier: SuperforecasterTier): boolean {
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}

// =============================================================================
// CommunityChannel Tests
// =============================================================================

describe('CommunityChannel', () => {
  it('should render channel name', () => {
    render(<CommunityChannel channel={mockChannels[0]!} userTier="APPRENTICE" />);
    expect(screen.getByText('General Discussion')).toBeInTheDocument();
  });

  it('should render channel description', () => {
    render(<CommunityChannel channel={mockChannels[0]!} userTier="APPRENTICE" />);
    expect(screen.getByText('Open to all members')).toBeInTheDocument();
  });

  it('should display member count', () => {
    render(<CommunityChannel channel={mockChannels[0]!} userTier="APPRENTICE" />);
    expect(screen.getByTestId('member-count')).toHaveTextContent('1,250');
  });

  it('should show locked state for insufficient tier', () => {
    render(<CommunityChannel channel={mockChannels[1]!} userTier="JOURNEYMAN" />);
    expect(screen.getByTestId('channel-locked')).toBeInTheDocument();
  });

  it('should show unlocked state for sufficient tier', () => {
    render(<CommunityChannel channel={mockChannels[1]!} userTier="EXPERT" />);
    expect(screen.queryByTestId('channel-locked')).not.toBeInTheDocument();
  });

  it('should display required tier badge', () => {
    render(<CommunityChannel channel={mockChannels[2]!} userTier="EXPERT" />);
    expect(screen.getByText('GRANDMASTER')).toBeInTheDocument();
  });

  it('should show active indicator when channel is active', () => {
    render(<CommunityChannel channel={mockChannels[0]!} userTier="APPRENTICE" />);
    expect(screen.getByTestId('channel-active')).toBeInTheDocument();
  });

  it('should show inactive indicator when channel is not active', () => {
    render(<CommunityChannel channel={mockChannels[3]!} userTier="MASTER" />);
    expect(screen.queryByTestId('channel-active')).not.toBeInTheDocument();
  });

  it('should apply tier-specific styling', () => {
    render(<CommunityChannel channel={mockChannels[2]!} userTier="GRANDMASTER" />);
    const container = screen.getByTestId('community-channel');
    expect(container).toHaveClass('border-yellow-400/30');
  });

  it('should call onJoin when clicked and unlocked', () => {
    const onJoin = vi.fn();
    render(<CommunityChannel channel={mockChannels[0]!} userTier="APPRENTICE" onJoin={onJoin} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onJoin).toHaveBeenCalledWith('general');
  });

  it('should not call onJoin when clicked and locked', () => {
    const onJoin = vi.fn();
    render(<CommunityChannel channel={mockChannels[2]!} userTier="JOURNEYMAN" onJoin={onJoin} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onJoin).not.toHaveBeenCalled();
  });
});

// =============================================================================
// ChannelList Tests
// =============================================================================

describe('ChannelList', () => {
  it('should render all channels', () => {
    render(<ChannelList channels={mockChannels} userTier="GRANDMASTER" />);
    expect(screen.getByText('General Discussion')).toBeInTheDocument();
    expect(screen.getByText('Expert Lounge')).toBeInTheDocument();
    expect(screen.getByText('Grandmaster Circle')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<ChannelList channels={mockChannels} userTier="GRANDMASTER" />);
    expect(screen.getByTestId('channel-list')).toBeInTheDocument();
  });

  it('should show header text', () => {
    render(<ChannelList channels={mockChannels} userTier="GRANDMASTER" />);
    expect(screen.getByText('Community Channels')).toBeInTheDocument();
  });

  it('should filter to show only accessible channels when filterAccessible is true', () => {
    render(<ChannelList channels={mockChannels} userTier="JOURNEYMAN" filterAccessible />);
    expect(screen.getByText('General Discussion')).toBeInTheDocument();
    expect(screen.queryByText('Expert Lounge')).not.toBeInTheDocument();
  });

  it('should count accessible channels', () => {
    render(<ChannelList channels={mockChannels} userTier="EXPERT" />);
    const accessCount = mockChannels.filter(c => meetsRequirement('EXPERT', c.requiredTier)).length;
    expect(screen.getByTestId('accessible-count')).toHaveTextContent(String(accessCount));
  });

  it('should show empty state when no channels', () => {
    render(<ChannelList channels={[]} userTier="APPRENTICE" />);
    expect(screen.getByText(/no channels/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ChannelAccess Tests
// =============================================================================

describe('ChannelAccess', () => {
  it('should show access granted message for unlocked tier', () => {
    render(<ChannelAccess requiredTier="APPRENTICE" userTier="EXPERT" />);
    expect(screen.getByText(/access granted/i)).toBeInTheDocument();
  });

  it('should show locked message for insufficient tier', () => {
    render(<ChannelAccess requiredTier="GRANDMASTER" userTier="EXPERT" />);
    expect(screen.getByText(/requires/i)).toBeInTheDocument();
    expect(screen.getByText('GRANDMASTER')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<ChannelAccess requiredTier="EXPERT" userTier="EXPERT" />);
    expect(screen.getByTestId('channel-access')).toBeInTheDocument();
  });

  it('should show progress to next tier', () => {
    render(<ChannelAccess requiredTier="MASTER" userTier="EXPERT" showProgress />);
    expect(screen.getByTestId('tier-progress')).toBeInTheDocument();
  });

  it('should display tier icon', () => {
    render(<ChannelAccess requiredTier="MASTER" userTier="JOURNEYMAN" />);
    expect(screen.getByTestId('tier-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// TierPerk Tests
// =============================================================================

describe('TierPerk', () => {
  it('should render perk name', () => {
    render(<TierPerk perk={mockPerks[0]!} userTier="JOURNEYMAN" />);
    expect(screen.getByText('Early Market Access')).toBeInTheDocument();
  });

  it('should render perk description', () => {
    render(<TierPerk perk={mockPerks[0]!} userTier="JOURNEYMAN" />);
    expect(screen.getByText('Get notified about new markets 24h early')).toBeInTheDocument();
  });

  it('should render perk icon', () => {
    render(<TierPerk perk={mockPerks[0]!} userTier="JOURNEYMAN" />);
    expect(screen.getByText('⏰')).toBeInTheDocument();
  });

  it('should show unlocked state when user has sufficient tier', () => {
    render(<TierPerk perk={mockPerks[0]!} userTier="JOURNEYMAN" />);
    expect(screen.getByTestId('perk-unlocked')).toBeInTheDocument();
  });

  it('should show locked state when user has insufficient tier', () => {
    render(<TierPerk perk={mockPerks[1]!} userTier="JOURNEYMAN" />);
    expect(screen.getByTestId('perk-locked')).toBeInTheDocument();
  });

  it('should display required tier', () => {
    render(<TierPerk perk={mockPerks[2]!} userTier="APPRENTICE" />);
    expect(screen.getByText('MASTER')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<TierPerk perk={mockPerks[0]!} userTier="JOURNEYMAN" />);
    expect(screen.getByTestId('tier-perk')).toBeInTheDocument();
  });

  it('should apply locked styling', () => {
    render(<TierPerk perk={mockPerks[3]!} userTier="EXPERT" />);
    const container = screen.getByTestId('tier-perk');
    expect(container).toHaveClass('opacity-50');
  });
});

// =============================================================================
// PerkList Tests
// =============================================================================

describe('PerkList', () => {
  it('should render all perks', () => {
    render(<PerkList perks={mockPerks} userTier="GRANDMASTER" />);
    expect(screen.getByText('Early Market Access')).toBeInTheDocument();
    expect(screen.getByText('Reduced Fees')).toBeInTheDocument();
    expect(screen.getByText('Private Analytics')).toBeInTheDocument();
    expect(screen.getByText('Mentorship Program')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<PerkList perks={mockPerks} userTier="GRANDMASTER" />);
    expect(screen.getByTestId('perk-list')).toBeInTheDocument();
  });

  it('should show header text', () => {
    render(<PerkList perks={mockPerks} userTier="GRANDMASTER" />);
    expect(screen.getByText('Tier Perks')).toBeInTheDocument();
  });

  it('should count unlocked perks', () => {
    render(<PerkList perks={mockPerks} userTier="EXPERT" />);
    const unlockedCount = mockPerks.filter(p => meetsRequirement('EXPERT', p.requiredTier)).length;
    expect(screen.getByTestId('unlocked-count')).toHaveTextContent(String(unlockedCount));
  });

  it('should show empty state when no perks', () => {
    render(<PerkList perks={[]} userTier="APPRENTICE" />);
    expect(screen.getByText(/no perks/i)).toBeInTheDocument();
  });

  it('should filter to show only unlocked perks when filterUnlocked is true', () => {
    render(<PerkList perks={mockPerks} userTier="JOURNEYMAN" filterUnlocked />);
    expect(screen.getByText('Early Market Access')).toBeInTheDocument();
    expect(screen.queryByText('Mentorship Program')).not.toBeInTheDocument();
  });
});

// =============================================================================
// ExclusiveContent Tests
// =============================================================================

describe('ExclusiveContent', () => {
  it('should render title', () => {
    render(
      <ExclusiveContent title="Alpha Insights" requiredTier="MASTER" userTier="MASTER">
        <p>Secret content</p>
      </ExclusiveContent>
    );
    expect(screen.getByText('Alpha Insights')).toBeInTheDocument();
  });

  it('should render children when user has access', () => {
    render(
      <ExclusiveContent title="Premium" requiredTier="EXPERT" userTier="MASTER">
        <p>Premium content here</p>
      </ExclusiveContent>
    );
    expect(screen.getByText('Premium content here')).toBeInTheDocument();
  });

  it('should not render children when user lacks access', () => {
    render(
      <ExclusiveContent title="Premium" requiredTier="MASTER" userTier="JOURNEYMAN">
        <p>Premium content here</p>
      </ExclusiveContent>
    );
    expect(screen.queryByText('Premium content here')).not.toBeInTheDocument();
  });

  it('should show locked overlay when user lacks access', () => {
    render(
      <ExclusiveContent title="Premium" requiredTier="GRANDMASTER" userTier="EXPERT">
        <p>Content</p>
      </ExclusiveContent>
    );
    expect(screen.getByTestId('content-locked')).toBeInTheDocument();
  });

  it('should display required tier in locked state', () => {
    render(
      <ExclusiveContent title="Elite" requiredTier="GRANDMASTER" userTier="APPRENTICE">
        <p>Content</p>
      </ExclusiveContent>
    );
    expect(screen.getByText('GRANDMASTER')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(
      <ExclusiveContent title="Test" requiredTier="APPRENTICE" userTier="APPRENTICE">
        <p>Content</p>
      </ExclusiveContent>
    );
    expect(screen.getByTestId('exclusive-content')).toBeInTheDocument();
  });

  it('should apply tier styling when unlocked', () => {
    render(
      <ExclusiveContent title="Master Content" requiredTier="MASTER" userTier="MASTER">
        <p>Content</p>
      </ExclusiveContent>
    );
    const container = screen.getByTestId('exclusive-content');
    expect(container).toHaveClass('border-purple-400/30');
  });
});

// =============================================================================
// VIPBadge Tests
// =============================================================================

describe('VIPBadge', () => {
  it('should render for EXPERT tier', () => {
    render(<VIPBadge tier="EXPERT" />);
    expect(screen.getByTestId('vip-badge')).toBeInTheDocument();
  });

  it('should render for MASTER tier', () => {
    render(<VIPBadge tier="MASTER" />);
    expect(screen.getByTestId('vip-badge')).toBeInTheDocument();
  });

  it('should render for GRANDMASTER tier', () => {
    render(<VIPBadge tier="GRANDMASTER" />);
    expect(screen.getByTestId('vip-badge')).toBeInTheDocument();
  });

  it('should not render for APPRENTICE tier', () => {
    render(<VIPBadge tier="APPRENTICE" />);
    expect(screen.queryByTestId('vip-badge')).not.toBeInTheDocument();
  });

  it('should not render for JOURNEYMAN tier', () => {
    render(<VIPBadge tier="JOURNEYMAN" />);
    expect(screen.queryByTestId('vip-badge')).not.toBeInTheDocument();
  });

  it('should display tier name', () => {
    render(<VIPBadge tier="GRANDMASTER" />);
    expect(screen.getByText(/GRANDMASTER/)).toBeInTheDocument();
  });

  it('should display VIP text', () => {
    render(<VIPBadge tier="MASTER" />);
    expect(screen.getByText(/vip/i)).toBeInTheDocument();
  });

  it('should apply tier-specific colors', () => {
    render(<VIPBadge tier="GRANDMASTER" />);
    const badge = screen.getByTestId('vip-badge');
    expect(badge).toHaveClass('text-yellow-400');
  });

  it('should show custom size when specified', () => {
    render(<VIPBadge tier="MASTER" size="lg" />);
    const badge = screen.getByTestId('vip-badge');
    expect(badge).toHaveClass('text-lg');
  });
});

// =============================================================================
// CommunityGate Tests
// =============================================================================

describe('CommunityGate', () => {
  it('should render children when user meets tier requirement', () => {
    render(
      <CommunityGate requiredTier="EXPERT" userTier="MASTER">
        <p>Gated content</p>
      </CommunityGate>
    );
    expect(screen.getByText('Gated content')).toBeInTheDocument();
  });

  it('should not render children when user does not meet tier', () => {
    render(
      <CommunityGate requiredTier="MASTER" userTier="JOURNEYMAN">
        <p>Gated content</p>
      </CommunityGate>
    );
    expect(screen.queryByText('Gated content')).not.toBeInTheDocument();
  });

  it('should render fallback when provided and user lacks access', () => {
    render(
      <CommunityGate
        requiredTier="GRANDMASTER"
        userTier="EXPERT"
        fallback={<p>Upgrade to access</p>}
      >
        <p>Gated content</p>
      </CommunityGate>
    );
    expect(screen.getByText('Upgrade to access')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(
      <CommunityGate requiredTier="APPRENTICE" userTier="APPRENTICE">
        <p>Content</p>
      </CommunityGate>
    );
    expect(screen.getByTestId('community-gate')).toBeInTheDocument();
  });

  it('should show upgrade prompt by default when lacking access', () => {
    render(
      <CommunityGate requiredTier="MASTER" userTier="JOURNEYMAN">
        <p>Content</p>
      </CommunityGate>
    );
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
  });

  it('should call onUpgradeClick when upgrade button is clicked', () => {
    const onUpgradeClick = vi.fn();
    render(
      <CommunityGate requiredTier="MASTER" userTier="JOURNEYMAN" onUpgradeClick={onUpgradeClick}>
        <p>Content</p>
      </CommunityGate>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onUpgradeClick).toHaveBeenCalled();
  });
});

// =============================================================================
// SuperforecasterHub Tests
// =============================================================================

describe('SuperforecasterHub', () => {
  it('should render hub title', () => {
    render(<SuperforecasterHub userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByText(/superforecaster/i)).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<SuperforecasterHub userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('superforecaster-hub')).toBeInTheDocument();
  });

  it('should display user tier', () => {
    render(<SuperforecasterHub userTier="MASTER" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getAllByText('MASTER').length).toBeGreaterThan(0);
  });

  it('should render channel section', () => {
    render(<SuperforecasterHub userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('channel-list')).toBeInTheDocument();
  });

  it('should render perks section', () => {
    render(<SuperforecasterHub userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('perk-list')).toBeInTheDocument();
  });

  it('should show VIP badge for eligible tiers', () => {
    render(<SuperforecasterHub userTier="GRANDMASTER" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('vip-badge')).toBeInTheDocument();
  });

  it('should not show VIP badge for non-VIP tiers', () => {
    render(<SuperforecasterHub userTier="JOURNEYMAN" channels={mockChannels} perks={mockPerks} />);
    expect(screen.queryByTestId('vip-badge')).not.toBeInTheDocument();
  });

  it('should show access summary', () => {
    render(<SuperforecasterHub userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('access-summary')).toBeInTheDocument();
  });

  it('should call onChannelJoin when channel is selected', () => {
    const onChannelJoin = vi.fn();
    render(
      <SuperforecasterHub
        userTier="EXPERT"
        channels={mockChannels}
        perks={mockPerks}
        onChannelJoin={onChannelJoin}
      />
    );
    const channelButton = screen.getAllByRole('button')[0];
    fireEvent.click(channelButton!);
    expect(onChannelJoin).toHaveBeenCalled();
  });
});

// =============================================================================
// useCommunityAccess Hook Tests
// =============================================================================

function TestHookComponent({
  userTier,
  channels,
  perks,
}: {
  userTier: SuperforecasterTier;
  channels: CommunityChannelData[];
  perks: TierPerkData[];
}) {
  const access = useCommunityAccess(userTier, channels, perks);
  return (
    <div>
      <span data-testid="accessible-channels">{access.accessibleChannels.length}</span>
      <span data-testid="unlocked-perks">{access.unlockedPerks.length}</span>
      <span data-testid="is-vip">{access.isVIP ? 'yes' : 'no'}</span>
      <span data-testid="next-tier">{access.nextTier ?? 'none'}</span>
      <span data-testid="can-access-expert">{access.canAccessTier('EXPERT') ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('useCommunityAccess', () => {
  it('should return accessible channels count', () => {
    render(<TestHookComponent userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    const accessibleCount = mockChannels.filter(c => meetsRequirement('EXPERT', c.requiredTier)).length;
    expect(screen.getByTestId('accessible-channels')).toHaveTextContent(String(accessibleCount));
  });

  it('should return unlocked perks count', () => {
    render(<TestHookComponent userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    const unlockedCount = mockPerks.filter(p => meetsRequirement('EXPERT', p.requiredTier)).length;
    expect(screen.getByTestId('unlocked-perks')).toHaveTextContent(String(unlockedCount));
  });

  it('should return isVIP true for EXPERT and above', () => {
    render(<TestHookComponent userTier="EXPERT" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('is-vip')).toHaveTextContent('yes');
  });

  it('should return isVIP false for JOURNEYMAN and below', () => {
    render(<TestHookComponent userTier="JOURNEYMAN" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('is-vip')).toHaveTextContent('no');
  });

  it('should return next tier for non-GRANDMASTER', () => {
    render(<TestHookComponent userTier="MASTER" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('next-tier')).toHaveTextContent('GRANDMASTER');
  });

  it('should return null next tier for GRANDMASTER', () => {
    render(<TestHookComponent userTier="GRANDMASTER" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('next-tier')).toHaveTextContent('none');
  });

  it('should correctly evaluate canAccessTier for higher tiers', () => {
    render(<TestHookComponent userTier="JOURNEYMAN" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('can-access-expert')).toHaveTextContent('no');
  });

  it('should correctly evaluate canAccessTier for lower tiers', () => {
    render(<TestHookComponent userTier="MASTER" channels={mockChannels} perks={mockPerks} />);
    expect(screen.getByTestId('can-access-expert')).toHaveTextContent('yes');
  });
});

// =============================================================================
// Tier Styling Tests
// =============================================================================

describe('Tier Styling', () => {
  const tiers: SuperforecasterTier[] = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

  it.each(tiers)('CommunityChannel should apply styling for %s tier', (tier) => {
    const channel: CommunityChannelData = { ...mockChannels[0]!, requiredTier: tier };
    render(<CommunityChannel channel={channel} userTier="GRANDMASTER" />);
    expect(screen.getByTestId('community-channel')).toBeInTheDocument();
  });

  it.each(tiers)('TierPerk should apply styling for %s tier', (tier) => {
    const perk: TierPerkData = { ...mockPerks[0]!, requiredTier: tier };
    render(<TierPerk perk={perk} userTier="GRANDMASTER" />);
    expect(screen.getByTestId('tier-perk')).toBeInTheDocument();
  });

  it.each(['EXPERT', 'MASTER', 'GRANDMASTER'] as SuperforecasterTier[])(
    'VIPBadge should render for %s',
    (tier) => {
      render(<VIPBadge tier={tier} />);
      expect(screen.getByTestId('vip-badge')).toBeInTheDocument();
    }
  );
});

// =============================================================================
// Empty State Tests
// =============================================================================

describe('Empty States', () => {
  it('ChannelList should show message when no channels available', () => {
    render(<ChannelList channels={[]} userTier="GRANDMASTER" />);
    expect(screen.getByText(/no channels/i)).toBeInTheDocument();
  });

  it('PerkList should show message when no perks available', () => {
    render(<PerkList perks={[]} userTier="GRANDMASTER" />);
    expect(screen.getByText(/no perks/i)).toBeInTheDocument();
  });

  it('ChannelList should show message when no accessible channels after filtering', () => {
    render(<ChannelList channels={mockChannels.slice(2)} userTier="APPRENTICE" filterAccessible />);
    expect(screen.getByText(/no channels/i)).toBeInTheDocument();
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility', () => {
  it('CommunityChannel should have proper aria-label', () => {
    render(<CommunityChannel channel={mockChannels[0]!} userTier="APPRENTICE" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', expect.stringContaining('General Discussion'));
  });

  it('locked channel should indicate locked state to screen readers', () => {
    render(<CommunityChannel channel={mockChannels[2]!} userTier="APPRENTICE" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('VIPBadge should have accessible text', () => {
    render(<VIPBadge tier="MASTER" />);
    expect(screen.getByTestId('vip-badge')).toHaveAttribute('role', 'status');
  });

  it('ExclusiveContent locked overlay should have proper role', () => {
    render(
      <ExclusiveContent title="Premium" requiredTier="GRANDMASTER" userTier="APPRENTICE">
        <p>Content</p>
      </ExclusiveContent>
    );
    expect(screen.getByTestId('content-locked')).toHaveAttribute('role', 'alert');
  });
});
