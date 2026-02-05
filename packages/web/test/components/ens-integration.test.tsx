/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  EnsRecord,
  EnsProfile,
} from '../../src/components/ens-integration';
import {
  EnsAvatar,
  EnsNameBadge,
  EnsRecordCard,
  EnsRecordList,
  EnsConnectionStatus,
  EnsResolutionInfo,
  EnsProfileSummary,
  EnsProfileLink,
  EnsIntegrationHub,
  useEnsIdentity,
} from '../../src/components/ens-integration';

// =============================================================================
// Test Data
// =============================================================================

const mockRecords: EnsRecord[] = [
  {
    key: 'com.twitter',
    value: '@calibr_xyz',
    verified: true,
  },
  {
    key: 'com.github',
    value: 'calibr-xyz',
    verified: true,
  },
  {
    key: 'url',
    value: 'https://calibr.xyz',
    verified: false,
  },
  {
    key: 'email',
    value: 'hello@calibr.xyz',
    verified: false,
  },
];

const mockProfile: EnsProfile = {
  address: '0xabcdef1234567890',
  ensName: 'calibr.eth',
  avatar: 'https://example.com/avatar.png',
  records: mockRecords,
  resolvedAt: '2024-03-01T00:00:00Z',
  expiresAt: '2025-03-01T00:00:00Z',
  registeredAt: '2023-01-15T00:00:00Z',
  ownerAddress: '0xabcdef1234567890',
  isPrimary: true,
};

// =============================================================================
// EnsAvatar Tests
// =============================================================================

describe('EnsAvatar', () => {
  it('renders avatar', () => {
    render(<EnsAvatar src="https://example.com/avatar.png" name="calibr.eth" />);
    expect(screen.getByTestId('ens-avatar')).toBeInTheDocument();
  });

  it('shows image when src provided', () => {
    render(<EnsAvatar src="https://example.com/avatar.png" name="calibr.eth" />);
    const avatar = screen.getByTestId('ens-avatar');
    expect(avatar.querySelector('img')).toBeInTheDocument();
  });

  it('shows fallback when no src', () => {
    render(<EnsAvatar src={null} name="calibr.eth" />);
    const avatar = screen.getByTestId('ens-avatar');
    expect(avatar).toHaveTextContent(/c/i);
  });
});

// =============================================================================
// EnsNameBadge Tests
// =============================================================================

describe('EnsNameBadge', () => {
  it('renders badge', () => {
    render(<EnsNameBadge name="calibr.eth" isPrimary={true} />);
    expect(screen.getByTestId('ens-name-badge')).toBeInTheDocument();
  });

  it('shows ENS name', () => {
    render(<EnsNameBadge name="calibr.eth" isPrimary={true} />);
    const badge = screen.getByTestId('ens-name-badge');
    expect(badge).toHaveTextContent('calibr.eth');
  });

  it('shows primary indicator', () => {
    render(<EnsNameBadge name="calibr.eth" isPrimary={true} />);
    const badge = screen.getByTestId('ens-name-badge');
    expect(badge).toHaveTextContent(/primary/i);
  });

  it('hides primary indicator when not primary', () => {
    render(<EnsNameBadge name="calibr.eth" isPrimary={false} />);
    const badge = screen.getByTestId('ens-name-badge');
    expect(badge.textContent?.toLowerCase()).not.toContain('primary');
  });
});

// =============================================================================
// EnsRecordCard Tests
// =============================================================================

describe('EnsRecordCard', () => {
  it('renders card', () => {
    render(<EnsRecordCard record={mockRecords[0]!} />);
    expect(screen.getByTestId('ens-record-card')).toBeInTheDocument();
  });

  it('shows record key', () => {
    render(<EnsRecordCard record={mockRecords[0]!} />);
    const card = screen.getByTestId('ens-record-card');
    expect(card).toHaveTextContent(/twitter/i);
  });

  it('shows record value', () => {
    render(<EnsRecordCard record={mockRecords[0]!} />);
    const card = screen.getByTestId('ens-record-card');
    expect(card).toHaveTextContent('@calibr_xyz');
  });

  it('shows verified status', () => {
    render(<EnsRecordCard record={mockRecords[0]!} />);
    const card = screen.getByTestId('ens-record-card');
    expect(card).toHaveTextContent(/verified/i);
  });

  it('shows unverified status', () => {
    render(<EnsRecordCard record={mockRecords[2]!} />);
    const card = screen.getByTestId('ens-record-card');
    expect(card).toHaveTextContent(/unverified/i);
  });
});

// =============================================================================
// EnsRecordList Tests
// =============================================================================

describe('EnsRecordList', () => {
  it('renders list', () => {
    render(<EnsRecordList records={mockRecords} />);
    expect(screen.getByTestId('ens-record-list')).toBeInTheDocument();
  });

  it('shows all records', () => {
    render(<EnsRecordList records={mockRecords} />);
    const cards = screen.getAllByTestId('ens-record-card');
    expect(cards.length).toBe(4);
  });

  it('shows empty state', () => {
    render(<EnsRecordList records={[]} />);
    expect(screen.getByText(/no records/i)).toBeInTheDocument();
  });

  it('shows verified count', () => {
    render(<EnsRecordList records={mockRecords} />);
    const list = screen.getByTestId('ens-record-list');
    expect(list).toHaveTextContent('2');
  });
});

// =============================================================================
// EnsConnectionStatus Tests
// =============================================================================

describe('EnsConnectionStatus', () => {
  it('renders status', () => {
    render(<EnsConnectionStatus status="connected" />);
    expect(screen.getByTestId('ens-connection-status')).toBeInTheDocument();
  });

  it('shows connected state', () => {
    render(<EnsConnectionStatus status="connected" />);
    expect(screen.getAllByText(/connected/i).length).toBeGreaterThan(0);
  });

  it('shows disconnected state', () => {
    render(<EnsConnectionStatus status="disconnected" />);
    expect(screen.getAllByText(/not connected|disconnected/i).length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    render(<EnsConnectionStatus status="error" error="Resolution failed" />);
    expect(screen.getByText(/resolution failed/i)).toBeInTheDocument();
  });
});

// =============================================================================
// EnsResolutionInfo Tests
// =============================================================================

describe('EnsResolutionInfo', () => {
  it('renders info', () => {
    render(<EnsResolutionInfo resolvedAt="2024-03-01T00:00:00Z" expiresAt="2025-03-01T00:00:00Z" />);
    expect(screen.getByTestId('ens-resolution-info')).toBeInTheDocument();
  });

  it('shows resolved date', () => {
    render(<EnsResolutionInfo resolvedAt="2024-03-01T00:00:00Z" expiresAt="2025-03-01T00:00:00Z" />);
    expect(screen.getAllByText(/mar/i).length).toBeGreaterThan(0);
  });

  it('shows expiry date', () => {
    render(<EnsResolutionInfo resolvedAt="2024-03-01T00:00:00Z" expiresAt="2025-03-01T00:00:00Z" />);
    const info = screen.getByTestId('ens-resolution-info');
    expect(info).toHaveTextContent(/2025/);
  });
});

// =============================================================================
// EnsProfileSummary Tests
// =============================================================================

describe('EnsProfileSummary', () => {
  it('renders summary', () => {
    render(<EnsProfileSummary profile={mockProfile} />);
    expect(screen.getByTestId('ens-profile-summary')).toBeInTheDocument();
  });

  it('shows ENS name', () => {
    render(<EnsProfileSummary profile={mockProfile} />);
    const summary = screen.getByTestId('ens-profile-summary');
    expect(summary).toHaveTextContent('calibr.eth');
  });

  it('shows record count', () => {
    render(<EnsProfileSummary profile={mockProfile} />);
    const summary = screen.getByTestId('ens-profile-summary');
    expect(summary).toHaveTextContent('4');
  });

  it('shows registration date', () => {
    render(<EnsProfileSummary profile={mockProfile} />);
    expect(screen.getAllByText(/jan|2023/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// EnsProfileLink Tests
// =============================================================================

describe('EnsProfileLink', () => {
  it('renders link', () => {
    render(<EnsProfileLink ensName="calibr.eth" address="0xabcdef1234567890" />);
    expect(screen.getByTestId('ens-profile-link')).toBeInTheDocument();
  });

  it('shows ENS name', () => {
    render(<EnsProfileLink ensName="calibr.eth" address="0xabcdef1234567890" />);
    const link = screen.getByTestId('ens-profile-link');
    expect(link).toHaveTextContent('calibr.eth');
  });

  it('shows truncated address', () => {
    render(<EnsProfileLink ensName="calibr.eth" address="0xabcdef1234567890" />);
    const link = screen.getByTestId('ens-profile-link');
    expect(link).toHaveTextContent(/0xabcd/);
  });

  it('shows ENS branding', () => {
    render(<EnsProfileLink ensName="calibr.eth" address="0xabcdef1234567890" />);
    const link = screen.getByTestId('ens-profile-link');
    expect(link).toHaveTextContent(/ens/i);
  });
});

// =============================================================================
// EnsIntegrationHub Tests
// =============================================================================

describe('EnsIntegrationHub', () => {
  it('renders hub', () => {
    render(<EnsIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('ens-integration-hub')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<EnsIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getAllByText(/ens/i).length).toBeGreaterThan(0);
  });

  it('shows connection status', () => {
    render(<EnsIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('ens-connection-status')).toBeInTheDocument();
  });

  it('shows record list', () => {
    render(<EnsIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('ens-record-list')).toBeInTheDocument();
  });

  it('shows profile summary', () => {
    render(<EnsIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('ens-profile-summary')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<EnsIntegrationHub profile={null} status="connected" loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows connect prompt when disconnected', () => {
    render(<EnsIntegrationHub profile={null} status="disconnected" />);
    expect(screen.getByTestId('connect-prompt')).toBeInTheDocument();
  });

  it('calls onConnect when connect clicked', () => {
    const onConnect = vi.fn();
    render(<EnsIntegrationHub profile={null} status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByTestId('connect-button'));
    expect(onConnect).toHaveBeenCalled();
  });
});

// =============================================================================
// useEnsIdentity Hook Tests
// =============================================================================

describe('useEnsIdentity', () => {
  function TestComponent({ profile }: { profile: EnsProfile | null }) {
    const {
      isConnected,
      ensName,
      recordCount,
      verifiedRecordCount,
      isPrimary,
      identityScore,
    } = useEnsIdentity(profile);

    return (
      <div>
        <span data-testid="is-connected">{isConnected ? 'yes' : 'no'}</span>
        <span data-testid="ens-name">{ensName}</span>
        <span data-testid="record-count">{recordCount}</span>
        <span data-testid="verified-count">{verifiedRecordCount}</span>
        <span data-testid="is-primary">{isPrimary ? 'yes' : 'no'}</span>
        <span data-testid="identity-score">{identityScore}</span>
      </div>
    );
  }

  it('shows connected when profile exists', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('is-connected')).toHaveTextContent('yes');
  });

  it('shows disconnected when no profile', () => {
    render(<TestComponent profile={null} />);
    expect(screen.getByTestId('is-connected')).toHaveTextContent('no');
  });

  it('returns ENS name', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('ens-name')).toHaveTextContent('calibr.eth');
  });

  it('counts records', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('record-count')).toHaveTextContent('4');
  });

  it('counts verified records', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('verified-count')).toHaveTextContent('2');
  });

  it('shows primary status', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('is-primary')).toHaveTextContent('yes');
  });

  it('calculates identity score', () => {
    render(<TestComponent profile={mockProfile} />);
    const score = parseInt(screen.getByTestId('identity-score').textContent!);
    expect(score).toBeGreaterThan(0);
  });

  it('handles null profile', () => {
    render(<TestComponent profile={null} />);
    expect(screen.getByTestId('ens-name')).toHaveTextContent('');
    expect(screen.getByTestId('record-count')).toHaveTextContent('0');
  });
});
