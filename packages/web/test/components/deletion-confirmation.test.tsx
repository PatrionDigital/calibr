/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  DeletionResult,
  DeletionCategory,
  DeletionSummary as DeletionSummaryType,
} from '../../src/components/deletion-confirmation';
import {
  DeletionCategoryCard,
  DeletionCategoryIcon,
  DeletionCategoryStatus,
  DeletionResultList,
  DeletionSummaryStats,
  DeletionTimeline,
  DeletionTimelineItem,
  DeletionReceiptCard,
  DownloadReceiptButton,
  DeletionConfirmationPanel,
  useDeletionConfirmation,
} from '../../src/components/deletion-confirmation';

// =============================================================================
// Test Data
// =============================================================================

const mockDeletionResults: DeletionResult[] = [
  {
    id: 'del-1',
    category: 'forecasts',
    label: 'Forecasts',
    itemsDeleted: 42,
    itemsFailed: 0,
    completedAt: '2025-01-15T10:05:00Z',
    status: 'completed',
    error: null,
  },
  {
    id: 'del-2',
    category: 'positions',
    label: 'Trading Positions',
    itemsDeleted: 15,
    itemsFailed: 2,
    completedAt: '2025-01-15T10:06:00Z',
    status: 'partial',
    error: '2 items could not be deleted',
  },
  {
    id: 'del-3',
    category: 'attestations',
    label: 'EAS Attestations',
    itemsDeleted: 8,
    itemsFailed: 0,
    completedAt: '2025-01-15T10:07:00Z',
    status: 'completed',
    error: null,
  },
  {
    id: 'del-4',
    category: 'offchain',
    label: 'Off-chain Data',
    itemsDeleted: 0,
    itemsFailed: 5,
    completedAt: null,
    status: 'failed',
    error: 'IPFS gateway unavailable',
  },
];

const mockSummary: DeletionSummaryType = {
  requestId: 'req-abc123',
  requestedAt: '2025-01-15T10:00:00Z',
  completedAt: '2025-01-15T10:07:00Z',
  totalItemsDeleted: 65,
  totalItemsFailed: 7,
  status: 'completed',
  results: mockDeletionResults,
};

// =============================================================================
// DeletionCategoryIcon Tests
// =============================================================================

describe('DeletionCategoryIcon', () => {
  it('renders icon', () => {
    render(<DeletionCategoryIcon category="forecasts" />);
    expect(screen.getByTestId('deletion-category-icon')).toBeInTheDocument();
  });

  it('shows forecasts icon', () => {
    render(<DeletionCategoryIcon category="forecasts" />);
    const icon = screen.getByTestId('deletion-category-icon');
    expect(icon).toHaveTextContent(/forecast|prediction/i);
  });

  it('shows positions icon', () => {
    render(<DeletionCategoryIcon category="positions" />);
    const icon = screen.getByTestId('deletion-category-icon');
    expect(icon).toHaveTextContent(/position|trade/i);
  });

  it('shows attestations icon', () => {
    render(<DeletionCategoryIcon category="attestations" />);
    const icon = screen.getByTestId('deletion-category-icon');
    expect(icon).toHaveTextContent(/attest|eas/i);
  });

  it('shows offchain icon', () => {
    render(<DeletionCategoryIcon category="offchain" />);
    const icon = screen.getByTestId('deletion-category-icon');
    expect(icon).toHaveTextContent(/off|chain|data/i);
  });
});

// =============================================================================
// DeletionCategoryStatus Tests
// =============================================================================

describe('DeletionCategoryStatus', () => {
  it('renders status badge', () => {
    render(<DeletionCategoryStatus status="completed" />);
    expect(screen.getByTestId('deletion-category-status')).toBeInTheDocument();
  });

  it('shows completed status', () => {
    render(<DeletionCategoryStatus status="completed" />);
    const status = screen.getByTestId('deletion-category-status');
    expect(status).toHaveTextContent(/completed/i);
  });

  it('shows partial status', () => {
    render(<DeletionCategoryStatus status="partial" />);
    const status = screen.getByTestId('deletion-category-status');
    expect(status).toHaveTextContent(/partial/i);
  });

  it('shows failed status', () => {
    render(<DeletionCategoryStatus status="failed" />);
    const status = screen.getByTestId('deletion-category-status');
    expect(status).toHaveTextContent(/failed/i);
  });

  it('has appropriate styling for completed', () => {
    render(<DeletionCategoryStatus status="completed" />);
    const status = screen.getByTestId('deletion-category-status');
    expect(status.className).toMatch(/green|success/i);
  });

  it('has appropriate styling for failed', () => {
    render(<DeletionCategoryStatus status="failed" />);
    const status = screen.getByTestId('deletion-category-status');
    expect(status.className).toMatch(/red|error|fail/i);
  });
});

// =============================================================================
// DeletionCategoryCard Tests
// =============================================================================

describe('DeletionCategoryCard', () => {
  it('renders card', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[0]!} />);
    expect(screen.getByTestId('deletion-category-card')).toBeInTheDocument();
  });

  it('shows category label', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[0]!} />);
    expect(screen.getByText('Forecasts')).toBeInTheDocument();
  });

  it('shows items deleted count', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[0]!} />);
    const card = screen.getByTestId('deletion-category-card');
    expect(card).toHaveTextContent('42');
  });

  it('shows status badge', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[0]!} />);
    expect(screen.getByTestId('deletion-category-status')).toBeInTheDocument();
  });

  it('shows error for failed items', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[3]!} />);
    expect(screen.getByText(/ipfs gateway unavailable/i)).toBeInTheDocument();
  });

  it('shows completion time', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[0]!} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('shows failed count for partial deletions', () => {
    render(<DeletionCategoryCard result={mockDeletionResults[1]!} />);
    const card = screen.getByTestId('deletion-category-card');
    expect(card).toHaveTextContent(/2.*failed/i);
  });
});

// =============================================================================
// DeletionResultList Tests
// =============================================================================

describe('DeletionResultList', () => {
  it('renders list', () => {
    render(<DeletionResultList results={mockDeletionResults} />);
    expect(screen.getByTestId('deletion-result-list')).toBeInTheDocument();
  });

  it('shows all results', () => {
    render(<DeletionResultList results={mockDeletionResults} />);
    const cards = screen.getAllByTestId('deletion-category-card');
    expect(cards.length).toBe(4);
  });

  it('shows empty state when no results', () => {
    render(<DeletionResultList results={[]} />);
    expect(screen.getByText(/no deletion|results/i)).toBeInTheDocument();
  });
});

// =============================================================================
// DeletionSummaryStats Tests
// =============================================================================

describe('DeletionSummaryStats', () => {
  it('renders summary', () => {
    render(<DeletionSummaryStats summary={mockSummary} />);
    expect(screen.getByTestId('deletion-summary-stats')).toBeInTheDocument();
  });

  it('shows total deleted count', () => {
    render(<DeletionSummaryStats summary={mockSummary} />);
    const summary = screen.getByTestId('deletion-summary-stats');
    expect(summary).toHaveTextContent('65');
  });

  it('shows total failed count', () => {
    render(<DeletionSummaryStats summary={mockSummary} />);
    const summary = screen.getByTestId('deletion-summary-stats');
    expect(summary).toHaveTextContent('7');
  });

  it('shows request ID', () => {
    render(<DeletionSummaryStats summary={mockSummary} />);
    const summary = screen.getByTestId('deletion-summary-stats');
    expect(summary).toHaveTextContent(/req-abc123/);
  });

  it('shows overall status', () => {
    render(<DeletionSummaryStats summary={mockSummary} />);
    const summary = screen.getByTestId('deletion-summary-stats');
    expect(summary).toHaveTextContent(/completed/i);
  });
});

// =============================================================================
// DeletionTimelineItem Tests
// =============================================================================

describe('DeletionTimelineItem', () => {
  it('renders timeline item', () => {
    render(<DeletionTimelineItem result={mockDeletionResults[0]!} index={0} total={4} />);
    expect(screen.getByTestId('deletion-timeline-item')).toBeInTheDocument();
  });

  it('shows category label', () => {
    render(<DeletionTimelineItem result={mockDeletionResults[0]!} index={0} total={4} />);
    expect(screen.getByText('Forecasts')).toBeInTheDocument();
  });

  it('shows completed checkmark for success', () => {
    render(<DeletionTimelineItem result={mockDeletionResults[0]!} index={0} total={4} />);
    const item = screen.getByTestId('deletion-timeline-item');
    expect(item).toHaveTextContent(/✓|✔|done/i);
  });

  it('shows error indicator for failed', () => {
    render(<DeletionTimelineItem result={mockDeletionResults[3]!} index={3} total={4} />);
    const item = screen.getByTestId('deletion-timeline-item');
    expect(item).toHaveTextContent(/✗|×|fail/i);
  });
});

// =============================================================================
// DeletionTimeline Tests
// =============================================================================

describe('DeletionTimeline', () => {
  it('renders timeline', () => {
    render(<DeletionTimeline results={mockDeletionResults} />);
    expect(screen.getByTestId('deletion-timeline')).toBeInTheDocument();
  });

  it('shows all timeline items', () => {
    render(<DeletionTimeline results={mockDeletionResults} />);
    const items = screen.getAllByTestId('deletion-timeline-item');
    expect(items.length).toBe(4);
  });
});

// =============================================================================
// DeletionReceiptCard Tests
// =============================================================================

describe('DeletionReceiptCard', () => {
  it('renders receipt card', () => {
    render(<DeletionReceiptCard summary={mockSummary} />);
    expect(screen.getByTestId('deletion-receipt-card')).toBeInTheDocument();
  });

  it('shows request ID', () => {
    render(<DeletionReceiptCard summary={mockSummary} />);
    const card = screen.getByTestId('deletion-receipt-card');
    expect(card).toHaveTextContent(/req-abc123/);
  });

  it('shows request date', () => {
    render(<DeletionReceiptCard summary={mockSummary} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('shows completion date', () => {
    render(<DeletionReceiptCard summary={mockSummary} />);
    const card = screen.getByTestId('deletion-receipt-card');
    expect(card).toHaveTextContent(/completed/i);
  });

  it('shows deletion counts', () => {
    render(<DeletionReceiptCard summary={mockSummary} />);
    const card = screen.getByTestId('deletion-receipt-card');
    expect(card).toHaveTextContent('65');
    expect(card).toHaveTextContent('7');
  });
});

// =============================================================================
// DownloadReceiptButton Tests
// =============================================================================

describe('DownloadReceiptButton', () => {
  it('renders button', () => {
    render(<DownloadReceiptButton summary={mockSummary} />);
    expect(screen.getByTestId('download-receipt-button')).toBeInTheDocument();
  });

  it('shows download text', () => {
    render(<DownloadReceiptButton summary={mockSummary} />);
    const button = screen.getByTestId('download-receipt-button');
    expect(button).toHaveTextContent(/download|receipt|export/i);
  });

  it('calls onDownload when clicked', () => {
    const onDownload = vi.fn();
    render(<DownloadReceiptButton summary={mockSummary} onDownload={onDownload} />);
    fireEvent.click(screen.getByTestId('download-receipt-button'));
    expect(onDownload).toHaveBeenCalled();
  });
});

// =============================================================================
// DeletionConfirmationPanel Tests
// =============================================================================

describe('DeletionConfirmationPanel', () => {
  it('renders panel', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    expect(screen.getByTestId('deletion-confirmation-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    expect(screen.getAllByText(/deletion|confirmation|complete/i).length).toBeGreaterThan(0);
  });

  it('shows summary stats', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    expect(screen.getByTestId('deletion-summary-stats')).toBeInTheDocument();
  });

  it('shows timeline', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    expect(screen.getByTestId('deletion-timeline')).toBeInTheDocument();
  });

  it('shows receipt card', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    expect(screen.getByTestId('deletion-receipt-card')).toBeInTheDocument();
  });

  it('shows download button', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    expect(screen.getByTestId('download-receipt-button')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DeletionConfirmationPanel summary={null} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows success message for completed', () => {
    render(<DeletionConfirmationPanel summary={mockSummary} />);
    const panel = screen.getByTestId('deletion-confirmation-panel');
    expect(panel).toHaveTextContent(/success|completed|done/i);
  });
});

// =============================================================================
// useDeletionConfirmation Hook Tests
// =============================================================================

describe('useDeletionConfirmation', () => {
  function TestComponent({ summary }: { summary: DeletionSummaryType | null }) {
    const {
      isComplete,
      hasErrors,
      successCount,
      failureCount,
      categoriesProcessed,
      overallStatus,
      completionPercentage,
    } = useDeletionConfirmation(summary);

    return (
      <div>
        <span data-testid="is-complete">{isComplete ? 'yes' : 'no'}</span>
        <span data-testid="has-errors">{hasErrors ? 'yes' : 'no'}</span>
        <span data-testid="success-count">{successCount}</span>
        <span data-testid="failure-count">{failureCount}</span>
        <span data-testid="categories-processed">{categoriesProcessed}</span>
        <span data-testid="overall-status">{overallStatus}</span>
        <span data-testid="completion-percentage">{completionPercentage}</span>
      </div>
    );
  }

  it('detects completion', () => {
    render(<TestComponent summary={mockSummary} />);
    expect(screen.getByTestId('is-complete')).toHaveTextContent('yes');
  });

  it('detects errors', () => {
    render(<TestComponent summary={mockSummary} />);
    expect(screen.getByTestId('has-errors')).toHaveTextContent('yes');
  });

  it('counts successes', () => {
    render(<TestComponent summary={mockSummary} />);
    expect(screen.getByTestId('success-count')).toHaveTextContent('65');
  });

  it('counts failures', () => {
    render(<TestComponent summary={mockSummary} />);
    expect(screen.getByTestId('failure-count')).toHaveTextContent('7');
  });

  it('counts categories processed', () => {
    render(<TestComponent summary={mockSummary} />);
    expect(screen.getByTestId('categories-processed')).toHaveTextContent('4');
  });

  it('determines overall status', () => {
    render(<TestComponent summary={mockSummary} />);
    expect(screen.getByTestId('overall-status')).toHaveTextContent('completed');
  });

  it('calculates completion percentage', () => {
    render(<TestComponent summary={mockSummary} />);
    const percentage = parseInt(screen.getByTestId('completion-percentage').textContent!);
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  it('handles null summary', () => {
    render(<TestComponent summary={null} />);
    expect(screen.getByTestId('is-complete')).toHaveTextContent('no');
    expect(screen.getByTestId('success-count')).toHaveTextContent('0');
  });
});
