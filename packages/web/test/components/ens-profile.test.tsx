/**
 * ENS Profile Integration Tests (TDD)
 * Task 6.4.4: ENS profile integration
 *
 * Components:
 * - ENSAvatar: Shows ENS avatar/profile picture
 * - ENSNameBadge: Shows ENS name with verification
 * - ENSProfileCard: Full profile display with records
 * - ENSConnectionStatus: Connection state management
 * - ENSRecordList: List of ENS text records
 * - ENSProfileLink: Link to ENS profile
 * - ENSIntegrationHub: Main hub component
 * - useENSProfile: Hook for data management
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  ENSAvatar,
  ENSNameBadge,
  ENSProfileCard,
  ENSConnectionStatus,
  ENSRecordList,
  ENSProfileLink,
  ENSIntegrationHub,
  useENSProfile,
  type ENSRecord,
  type ENSProfile,
} from '@/components/ens-profile';

// =============================================================================
// Test Data
// =============================================================================

const mockRecords: ENSRecord[] = [
  {
    key: 'email',
    value: 'forecaster@example.com',
    verified: true,
  },
  {
    key: 'url',
    value: 'https://forecaster.xyz',
    verified: true,
  },
  {
    key: 'com.twitter',
    value: '@forecaster',
    verified: true,
  },
  {
    key: 'com.github',
    value: 'forecaster',
    verified: true,
  },
  {
    key: 'description',
    value: 'Prediction market enthusiast and calibration expert',
    verified: true,
  },
];

const mockENSProfile: ENSProfile = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  name: 'forecaster.eth',
  avatar: 'https://example.com/avatar.png',
  records: mockRecords,
  resolvedAt: new Date('2023-08-15').getTime(),
  expiresAt: new Date('2025-08-15').getTime(),
  isValid: true,
  registeredAt: new Date('2021-05-01').getTime(),
  owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
};

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// =============================================================================
// ENSAvatar Tests
// =============================================================================

describe('ENSAvatar', () => {
  it('should render avatar', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-avatar')).toBeInTheDocument();
  });

  it('should display image when src provided', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', mockENSProfile.avatar);
  });

  it('should show fallback when no src', () => {
    render(<ENSAvatar name={mockENSProfile.name} />);
    expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
  });

  it('should display initials in fallback', () => {
    render(<ENSAvatar name="forecaster.eth" />);
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('F');
  });

  it('should apply size small', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} size="sm" />);
    expect(screen.getByTestId('ens-avatar')).toHaveClass('w-8');
  });

  it('should apply size medium', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} size="md" />);
    expect(screen.getByTestId('ens-avatar')).toHaveClass('w-12');
  });

  it('should apply size large', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} size="lg" />);
    expect(screen.getByTestId('ens-avatar')).toHaveClass('w-16');
  });

  it('should have alt text', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringContaining('forecaster'));
  });
});

// =============================================================================
// ENSNameBadge Tests
// =============================================================================

describe('ENSNameBadge', () => {
  it('should render badge', () => {
    render(<ENSNameBadge name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-name-badge')).toBeInTheDocument();
  });

  it('should display ENS name', () => {
    render(<ENSNameBadge name={mockENSProfile.name} />);
    expect(screen.getByText('forecaster.eth')).toBeInTheDocument();
  });

  it('should show verified indicator when valid', () => {
    render(<ENSNameBadge name={mockENSProfile.name} isValid />);
    expect(screen.getByTestId('verified-indicator')).toBeInTheDocument();
  });

  it('should not show verified indicator when invalid', () => {
    render(<ENSNameBadge name={mockENSProfile.name} isValid={false} />);
    expect(screen.queryByTestId('verified-indicator')).not.toBeInTheDocument();
  });

  it('should display ENS icon', () => {
    render(<ENSNameBadge name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-icon')).toBeInTheDocument();
  });

  it('should apply primary styling', () => {
    render(<ENSNameBadge name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-name-badge')).toHaveClass('text-blue-400');
  });

  it('should show compact variant', () => {
    render(<ENSNameBadge name={mockENSProfile.name} compact />);
    expect(screen.getByTestId('ens-name-badge')).toHaveClass('px-1.5');
  });

  it('should have proper role', () => {
    render(<ENSNameBadge name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-name-badge')).toHaveAttribute('role', 'status');
  });
});

// =============================================================================
// ENSProfileCard Tests
// =============================================================================

describe('ENSProfileCard', () => {
  it('should render card', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-profile-card')).toBeInTheDocument();
  });

  it('should display ENS name', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByText('forecaster.eth')).toBeInTheDocument();
  });

  it('should show avatar', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-avatar')).toBeInTheDocument();
  });

  it('should display address', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByTestId('profile-address')).toBeInTheDocument();
  });

  it('should show registration date', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByTestId('registered-date')).toBeInTheDocument();
  });

  it('should show expiry date', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByTestId('expiry-date')).toBeInTheDocument();
  });

  it('should display description if available', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByText(/prediction market/i)).toBeInTheDocument();
  });

  it('should show verified status', () => {
    render(<ENSProfileCard profile={mockENSProfile} />);
    expect(screen.getByTestId('verified-indicator')).toBeInTheDocument();
  });

  it('should show expired warning when expired', () => {
    const expiredProfile = {
      ...mockENSProfile,
      expiresAt: Date.now() - 86400000,
      isValid: false,
    };
    render(<ENSProfileCard profile={expiredProfile} />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('should display social links', () => {
    render(<ENSProfileCard profile={mockENSProfile} showSocials />);
    expect(screen.getByText(/@forecaster/)).toBeInTheDocument();
  });
});

// =============================================================================
// ENSConnectionStatus Tests
// =============================================================================

describe('ENSConnectionStatus', () => {
  it('should render status', () => {
    render(<ENSConnectionStatus status="connected" />);
    expect(screen.getByTestId('ens-connection-status')).toBeInTheDocument();
  });

  it('should show connected state', () => {
    render(<ENSConnectionStatus status="connected" />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('should show disconnected state', () => {
    render(<ENSConnectionStatus status="disconnected" />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('should show connecting state', () => {
    render(<ENSConnectionStatus status="connecting" />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<ENSConnectionStatus status="error" error="Resolution failed" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<ENSConnectionStatus status="error" error="Resolution failed" />);
    expect(screen.getByText(/resolution failed/i)).toBeInTheDocument();
  });

  it('should show connect button when disconnected', () => {
    render(<ENSConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('should call onConnect when button clicked', () => {
    const onConnect = vi.fn();
    render(<ENSConnectionStatus status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it('should show spinner when connecting', () => {
    render(<ENSConnectionStatus status="connecting" />);
    expect(screen.getByTestId('connecting-spinner')).toBeInTheDocument();
  });

  it('should show last resolved time when connected', () => {
    const lastResolved = Date.now() - 3600000;
    render(<ENSConnectionStatus status="connected" lastResolved={lastResolved} />);
    expect(screen.getByTestId('last-resolved')).toBeInTheDocument();
  });

  it('should have status role', () => {
    render(<ENSConnectionStatus status="connected" />);
    expect(screen.getByTestId('ens-connection-status')).toHaveAttribute('role', 'status');
  });
});

// =============================================================================
// ENSRecordList Tests
// =============================================================================

describe('ENSRecordList', () => {
  it('should render list', () => {
    render(<ENSRecordList records={mockRecords} />);
    expect(screen.getByTestId('ens-record-list')).toBeInTheDocument();
  });

  it('should show list header', () => {
    render(<ENSRecordList records={mockRecords} />);
    expect(screen.getByText(/records/i)).toBeInTheDocument();
  });

  it('should display all records', () => {
    render(<ENSRecordList records={mockRecords} />);
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('url')).toBeInTheDocument();
    expect(screen.getByText('com.twitter')).toBeInTheDocument();
  });

  it('should show record values', () => {
    render(<ENSRecordList records={mockRecords} />);
    expect(screen.getByText('forecaster@example.com')).toBeInTheDocument();
  });

  it('should show record count', () => {
    render(<ENSRecordList records={mockRecords} />);
    expect(screen.getByTestId('record-count')).toHaveTextContent('5');
  });

  it('should show empty state when no records', () => {
    render(<ENSRecordList records={[]} />);
    expect(screen.getByText(/no records/i)).toBeInTheDocument();
  });

  it('should filter by category', () => {
    render(<ENSRecordList records={mockRecords} filterCategory="social" />);
    expect(screen.getByTestId('ens-record-list')).toBeInTheDocument();
  });

  it('should show verified indicator for records', () => {
    render(<ENSRecordList records={mockRecords} />);
    expect(screen.getAllByTestId('record-verified').length).toBeGreaterThan(0);
  });
});

// =============================================================================
// ENSProfileLink Tests
// =============================================================================

describe('ENSProfileLink', () => {
  it('should render link', () => {
    render(<ENSProfileLink name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-profile-link')).toBeInTheDocument();
  });

  it('should link to ENS app', () => {
    render(<ENSProfileLink name={mockENSProfile.name} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('app.ens.domains'));
  });

  it('should display ENS name', () => {
    render(<ENSProfileLink name={mockENSProfile.name} />);
    expect(screen.getByText('forecaster.eth')).toBeInTheDocument();
  });

  it('should open in new tab', () => {
    render(<ENSProfileLink name={mockENSProfile.name} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should have security attributes', () => {
    render(<ENSProfileLink name={mockENSProfile.name} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('should show avatar when provided', () => {
    render(<ENSProfileLink name={mockENSProfile.name} avatar={mockENSProfile.avatar} />);
    expect(screen.getByTestId('ens-avatar')).toBeInTheDocument();
  });

  it('should show verified indicator when valid', () => {
    render(<ENSProfileLink name={mockENSProfile.name} isValid />);
    expect(screen.getByTestId('link-verified')).toBeInTheDocument();
  });
});

// =============================================================================
// ENSIntegrationHub Tests
// =============================================================================

describe('ENSIntegrationHub', () => {
  it('should render hub', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-integration-hub')).toBeInTheDocument();
  });

  it('should show hub title', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByText(/ens/i)).toBeInTheDocument();
  });

  it('should display profile card', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-profile-card')).toBeInTheDocument();
  });

  it('should show record list', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-record-list')).toBeInTheDocument();
  });

  it('should display connection status', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} connectionStatus="connected" />);
    expect(screen.getByTestId('ens-connection-status')).toBeInTheDocument();
  });

  it('should show profile link', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-profile-link')).toBeInTheDocument();
  });

  it('should display resolved time', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByTestId('resolved-time')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn();
    render(<ENSIntegrationHub profile={mockENSProfile} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should show empty state when no profile', () => {
    render(<ENSIntegrationHub profile={null} />);
    expect(screen.getByText(/no ens name/i)).toBeInTheDocument();
  });

  it('should show name badge', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} />);
    expect(screen.getByTestId('ens-name-badge')).toBeInTheDocument();
  });
});

// =============================================================================
// useENSProfile Hook Tests
// =============================================================================

function TestHookComponent({ addressOrName }: { addressOrName: string }) {
  const {
    profile,
    isLoading,
    error,
    connectionStatus,
    name,
    avatar,
    records,
    isValid,
    refresh,
  } = useENSProfile(addressOrName);

  return (
    <div>
      <span data-testid="is-loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="has-profile">{profile ? 'yes' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="connection-status">{connectionStatus}</span>
      <span data-testid="name">{name ?? 'none'}</span>
      <span data-testid="avatar">{avatar ?? 'none'}</span>
      <span data-testid="record-count">{records.length}</span>
      <span data-testid="is-valid">{isValid ? 'yes' : 'no'}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('useENSProfile', () => {
  it('should return loading state initially', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('yes');
  });

  it('should return connection status', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should return name', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByTestId('name')).toBeInTheDocument();
  });

  it('should return avatar', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('should return records array', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByTestId('record-count')).toBeInTheDocument();
  });

  it('should return validity status', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByTestId('is-valid')).toBeInTheDocument();
  });

  it('should have refresh function', () => {
    render(<TestHookComponent addressOrName={mockENSProfile.name} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// =============================================================================
// Record Category Tests
// =============================================================================

describe('Record Categories', () => {
  const socialRecords: ENSRecord[] = [
    { key: 'com.twitter', value: '@test', verified: true },
    { key: 'com.github', value: 'test', verified: true },
    { key: 'com.discord', value: 'test#1234', verified: true },
  ];

  it('should identify social records', () => {
    render(<ENSRecordList records={socialRecords} filterCategory="social" />);
    expect(screen.getByTestId('ens-record-list')).toBeInTheDocument();
  });

  it('should display record icons', () => {
    render(<ENSRecordList records={socialRecords} />);
    expect(screen.getAllByTestId('record-icon').length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Avatar Size Tests
// =============================================================================

describe('Avatar Sizes', () => {
  const sizes = ['sm', 'md', 'lg'] as const;

  it.each(sizes)('should render %s size avatar', (size) => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} size={size} />);
    expect(screen.getByTestId('ens-avatar')).toBeInTheDocument();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle missing avatar gracefully', () => {
    const noAvatarProfile = { ...mockENSProfile, avatar: undefined };
    render(<ENSProfileCard profile={noAvatarProfile} />);
    expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
  });

  it('should handle empty records', () => {
    const noRecordsProfile = { ...mockENSProfile, records: [] };
    render(<ENSProfileCard profile={noRecordsProfile} />);
    expect(screen.getByTestId('ens-profile-card')).toBeInTheDocument();
  });

  it('should handle expired domain', () => {
    const expiredProfile = {
      ...mockENSProfile,
      expiresAt: Date.now() - 86400000,
      isValid: false,
    };
    render(<ENSIntegrationHub profile={expiredProfile} />);
    expect(screen.getByTestId('ens-integration-hub')).toBeInTheDocument();
  });

  it('should handle very long ENS names', () => {
    const longName = 'verylongensnamethatshouldbetruncated.eth';
    render(<ENSNameBadge name={longName} />);
    expect(screen.getByTestId('ens-name-badge')).toBeInTheDocument();
  });

  it('should handle subdomain names', () => {
    render(<ENSNameBadge name="sub.forecaster.eth" />);
    expect(screen.getByText('sub.forecaster.eth')).toBeInTheDocument();
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility', () => {
  it('ENSNameBadge should have proper role', () => {
    render(<ENSNameBadge name={mockENSProfile.name} />);
    expect(screen.getByTestId('ens-name-badge')).toHaveAttribute('role', 'status');
  });

  it('ENSConnectionStatus should indicate status to screen readers', () => {
    render(<ENSConnectionStatus status="connected" />);
    expect(screen.getByTestId('ens-connection-status')).toHaveAttribute('role', 'status');
  });

  it('ENSProfileLink should have security attributes', () => {
    render(<ENSProfileLink name={mockENSProfile.name} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('ENSAvatar should have alt text', () => {
    render(<ENSAvatar src={mockENSProfile.avatar} name={mockENSProfile.name} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt');
  });

  it('connect button should have accessible label', () => {
    render(<ENSConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('refresh button should have accessible label', () => {
    render(<ENSIntegrationHub profile={mockENSProfile} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });
});
