/**
 * Reputation Card Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReputationCard, ReputationBadge, type ReputationSource } from '@/components/reputation-card';

describe('ReputationCard', () => {
  const mockReputations: ReputationSource[] = [
    {
      platform: 'CALIBR',
      score: 85,
      lastUpdated: new Date('2025-01-24'),
      verified: true,
    },
    {
      platform: 'POLYMARKET',
      score: 72,
      lastUpdated: new Date('2025-01-20'),
      verified: true,
    },
    {
      platform: 'LIMITLESS',
      score: 68,
      lastUpdated: new Date('2025-01-15'),
      verified: true,
    },
  ];

  it('renders with connected reputations', () => {
    render(<ReputationCard reputations={mockReputations} />);

    expect(screen.getByText(/CROSS-PLATFORM REPUTATION/i)).toBeDefined();
    expect(screen.getByText('Calibr.xyz')).toBeDefined();
    expect(screen.getByText('Polymarket')).toBeDefined();
    expect(screen.getByText('Limitless')).toBeDefined();
  });

  it('displays aggregate score', () => {
    render(<ReputationCard reputations={mockReputations} />);

    expect(screen.getByText(/AGGREGATE REPUTATION/i)).toBeDefined();
    // Should show 3 connected sources
    expect(screen.getByText('3 / 6')).toBeDefined();
  });

  it('shows platform scores', () => {
    render(<ReputationCard reputations={mockReputations} />);

    expect(screen.getByText('85')).toBeDefined();
    expect(screen.getByText('72')).toBeDefined();
    expect(screen.getByText('68')).toBeDefined();
  });

  it('shows verified badge for verified platforms', () => {
    render(<ReputationCard reputations={mockReputations} />);

    // Each verified platform should have a checkmark
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBe(3);
  });

  it('shows unconnected platforms section', () => {
    render(<ReputationCard reputations={mockReputations} />);

    expect(screen.getByText(/3.*more platforms/)).toBeDefined();
  });

  it('expands to show unconnected platforms', () => {
    render(<ReputationCard reputations={mockReputations} />);

    const expandButton = screen.getByText(/3.*more platforms/);
    fireEvent.click(expandButton);

    expect(screen.getByText('Gitcoin Passport')).toBeDefined();
    expect(screen.getByText('Coinbase')).toBeDefined();
    expect(screen.getByText('Optimism')).toBeDefined();
  });

  it('calls onConnect when connect button clicked', () => {
    const onConnect = vi.fn();
    render(<ReputationCard reputations={mockReputations} onConnect={onConnect} />);

    // Expand to show unconnected platforms
    const expandButton = screen.getByText(/3.*more platforms/);
    fireEvent.click(expandButton);

    // Click first CONNECT button
    const connectButtons = screen.getAllByText('CONNECT');
    fireEvent.click(connectButtons[0]!);

    expect(onConnect).toHaveBeenCalled();
  });

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn();
    render(<ReputationCard reputations={mockReputations} onRefresh={onRefresh} />);

    // Find refresh buttons (↻)
    const refreshButtons = screen.getAllByText('↻');
    fireEvent.click(refreshButtons[0]!);

    expect(onRefresh).toHaveBeenCalledWith('CALIBR');
  });

  it('shows loading state', () => {
    const onConnect = vi.fn();
    render(
      <ReputationCard
        reputations={mockReputations}
        onConnect={onConnect}
        isLoading={true}
      />
    );

    // Expand to show connect buttons
    const expandButton = screen.getByText(/3.*more platforms/);
    fireEvent.click(expandButton);

    // Buttons should be disabled
    const connectButtons = screen.getAllByText('CONNECT');
    connectButtons.forEach(button => {
      expect(button).toHaveProperty('disabled', true);
    });
  });

  it('shows weight percentages', () => {
    render(<ReputationCard reputations={mockReputations} />);

    expect(screen.getByText('(40%)')).toBeDefined(); // CALIBR
    expect(screen.getByText('(20%)')).toBeDefined(); // POLYMARKET
    expect(screen.getByText('(15%)')).toBeDefined(); // LIMITLESS
  });
});

describe('ReputationBadge', () => {
  const mockReputations: ReputationSource[] = [
    {
      platform: 'CALIBR',
      score: 80,
      lastUpdated: new Date(),
      verified: true,
    },
    {
      platform: 'POLYMARKET',
      score: 70,
      lastUpdated: new Date(),
      verified: true,
    },
  ];

  it('renders compact badge', () => {
    render(<ReputationBadge reputations={mockReputations} />);

    expect(screen.getByText('REP')).toBeDefined();
    expect(screen.getByText('(2)')).toBeDefined();
  });

  it('calculates weighted score', () => {
    render(<ReputationBadge reputations={mockReputations} />);

    // CALIBR (80) * 0.4 + POLYMARKET (70) * 0.2 = 32 + 14 = 46
    // Divided by total weight (0.4 + 0.2 = 0.6) = 46 / 0.6 = 76.67 ≈ 77
    expect(screen.getByText('77')).toBeDefined();
  });

  it('supports size variants', () => {
    const { rerender } = render(<ReputationBadge reputations={mockReputations} size="sm" />);

    // Check that it renders without error for each size
    expect(screen.getByText('REP')).toBeDefined();

    rerender(<ReputationBadge reputations={mockReputations} size="lg" />);
    expect(screen.getByText('REP')).toBeDefined();
  });

  it('handles empty reputations', () => {
    render(<ReputationBadge reputations={[]} />);

    expect(screen.getByText('0')).toBeDefined();
    expect(screen.getByText('(0)')).toBeDefined();
  });
});
