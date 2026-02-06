/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  AttestationToRevoke,
  RevocationStatus,
} from '../../src/components/attestation-revocation';
import {
  AttestationRevocationCard,
  AttestationRevocationStatus,
  AttestationRevocationProgress,
  AttestationTypeFilter,
  AttestationRevocationList,
  RevocationSummary,
  RevocationConfirmDialog,
  AttestationRevocationPanel,
  useAttestationRevocation,
} from '../../src/components/attestation-revocation';

// =============================================================================
// Test Data
// =============================================================================

const mockAttestations: AttestationToRevoke[] = [
  {
    id: 'att-1',
    uid: '0xabc123def456',
    schemaId: 'calibr-forecast',
    type: 'forecast',
    label: 'BTC Price Forecast',
    createdAt: '2024-06-15T10:00:00Z',
    status: 'pending',
    txHash: null,
    error: null,
  },
  {
    id: 'att-2',
    uid: '0xdef789ghi012',
    schemaId: 'calibr-position',
    type: 'position',
    label: 'ETH Long Position',
    createdAt: '2024-07-20T14:30:00Z',
    status: 'revoked',
    txHash: '0x123456789abcdef',
    error: null,
  },
  {
    id: 'att-3',
    uid: '0xjkl345mno678',
    schemaId: 'calibr-achievement',
    type: 'achievement',
    label: 'First Forecast Badge',
    createdAt: '2024-05-01T09:00:00Z',
    status: 'revoking',
    txHash: null,
    error: null,
  },
  {
    id: 'att-4',
    uid: '0xpqr901stu234',
    schemaId: 'calibr-identity',
    type: 'identity',
    label: 'Superforecaster Status',
    createdAt: '2024-08-10T16:45:00Z',
    status: 'failed',
    txHash: null,
    error: 'Transaction reverted: insufficient gas',
  },
];

// =============================================================================
// AttestationRevocationCard Tests
// =============================================================================

describe('AttestationRevocationCard', () => {
  it('renders card', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[0]!} />);
    expect(screen.getByTestId('attestation-revocation-card')).toBeInTheDocument();
  });

  it('shows attestation label', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[0]!} />);
    expect(screen.getByText('BTC Price Forecast')).toBeInTheDocument();
  });

  it('shows attestation type', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[0]!} />);
    const card = screen.getByTestId('attestation-revocation-card');
    expect(card).toHaveTextContent(/forecast/i);
  });

  it('shows truncated UID', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[0]!} />);
    const card = screen.getByTestId('attestation-revocation-card');
    expect(card).toHaveTextContent(/0xabc/);
  });

  it('shows created date', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[0]!} />);
    expect(screen.getAllByText(/jun/i).length).toBeGreaterThan(0);
  });

  it('shows status badge', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[0]!} />);
    expect(screen.getByTestId('attestation-revocation-status')).toBeInTheDocument();
  });

  it('shows error for failed attestations', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[3]!} />);
    expect(screen.getByText(/insufficient gas/i)).toBeInTheDocument();
  });

  it('shows tx hash for revoked attestations', () => {
    render(<AttestationRevocationCard attestation={mockAttestations[1]!} />);
    const card = screen.getByTestId('attestation-revocation-card');
    expect(card).toHaveTextContent(/0x1234/);
  });
});

// =============================================================================
// AttestationRevocationStatus Tests
// =============================================================================

describe('AttestationRevocationStatus', () => {
  it('renders status badge', () => {
    render(<AttestationRevocationStatus status="pending" />);
    expect(screen.getByTestId('attestation-revocation-status')).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<AttestationRevocationStatus status="pending" />);
    const status = screen.getByTestId('attestation-revocation-status');
    expect(status).toHaveTextContent(/pending/i);
  });

  it('shows revoking status', () => {
    render(<AttestationRevocationStatus status="revoking" />);
    const status = screen.getByTestId('attestation-revocation-status');
    expect(status).toHaveTextContent(/revoking/i);
  });

  it('shows revoked status', () => {
    render(<AttestationRevocationStatus status="revoked" />);
    const status = screen.getByTestId('attestation-revocation-status');
    expect(status).toHaveTextContent(/revoked/i);
  });

  it('shows failed status', () => {
    render(<AttestationRevocationStatus status="failed" />);
    const status = screen.getByTestId('attestation-revocation-status');
    expect(status).toHaveTextContent(/failed/i);
  });

  it('has appropriate styling for status', () => {
    render(<AttestationRevocationStatus status="revoked" />);
    const status = screen.getByTestId('attestation-revocation-status');
    expect(status.className).toMatch(/green|success/i);
  });
});

// =============================================================================
// AttestationRevocationProgress Tests
// =============================================================================

describe('AttestationRevocationProgress', () => {
  it('renders progress', () => {
    render(<AttestationRevocationProgress revoked={2} total={4} />);
    expect(screen.getByTestId('attestation-revocation-progress')).toBeInTheDocument();
  });

  it('shows counts', () => {
    render(<AttestationRevocationProgress revoked={2} total={4} />);
    const progress = screen.getByTestId('attestation-revocation-progress');
    expect(progress).toHaveTextContent('2');
    expect(progress).toHaveTextContent('4');
  });

  it('shows percentage', () => {
    render(<AttestationRevocationProgress revoked={2} total={4} />);
    const progress = screen.getByTestId('attestation-revocation-progress');
    expect(progress).toHaveTextContent('50%');
  });

  it('shows progress bar', () => {
    render(<AttestationRevocationProgress revoked={2} total={4} />);
    expect(screen.getByTestId('progress-fill')).toBeInTheDocument();
  });
});

// =============================================================================
// AttestationTypeFilter Tests
// =============================================================================

describe('AttestationTypeFilter', () => {
  it('renders filter', () => {
    render(<AttestationTypeFilter types={['forecast', 'position']} selected="all" onSelect={() => {}} />);
    expect(screen.getByTestId('attestation-type-filter')).toBeInTheDocument();
  });

  it('shows all option', () => {
    render(<AttestationTypeFilter types={['forecast', 'position']} selected="all" onSelect={() => {}} />);
    expect(screen.getByText(/all/i)).toBeInTheDocument();
  });

  it('shows type options', () => {
    render(<AttestationTypeFilter types={['forecast', 'position']} selected="all" onSelect={() => {}} />);
    expect(screen.getByText(/forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/position/i)).toBeInTheDocument();
  });

  it('calls onSelect when option clicked', () => {
    const onSelect = vi.fn();
    render(<AttestationTypeFilter types={['forecast', 'position']} selected="all" onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/forecast/i));
    expect(onSelect).toHaveBeenCalledWith('forecast');
  });

  it('highlights selected option', () => {
    render(<AttestationTypeFilter types={['forecast', 'position']} selected="forecast" onSelect={() => {}} />);
    const forecastBtn = screen.getByText(/forecast/i);
    expect(forecastBtn.className).toMatch(/active|selected|green/i);
  });
});

// =============================================================================
// AttestationRevocationList Tests
// =============================================================================

describe('AttestationRevocationList', () => {
  it('renders list', () => {
    render(<AttestationRevocationList attestations={mockAttestations} />);
    expect(screen.getByTestId('attestation-revocation-list')).toBeInTheDocument();
  });

  it('shows all attestations', () => {
    render(<AttestationRevocationList attestations={mockAttestations} />);
    const cards = screen.getAllByTestId('attestation-revocation-card');
    expect(cards.length).toBe(4);
  });

  it('shows empty state when no attestations', () => {
    render(<AttestationRevocationList attestations={[]} />);
    expect(screen.getByText(/no attestations/i)).toBeInTheDocument();
  });
});

// =============================================================================
// RevocationSummary Tests
// =============================================================================

describe('RevocationSummary', () => {
  it('renders summary', () => {
    render(<RevocationSummary attestations={mockAttestations} />);
    expect(screen.getByTestId('revocation-summary')).toBeInTheDocument();
  });

  it('shows total count', () => {
    render(<RevocationSummary attestations={mockAttestations} />);
    const summary = screen.getByTestId('revocation-summary');
    expect(summary).toHaveTextContent('4');
  });

  it('shows pending count', () => {
    render(<RevocationSummary attestations={mockAttestations} />);
    const summary = screen.getByTestId('revocation-summary');
    expect(summary).toHaveTextContent(/1.*pending/i);
  });

  it('shows revoked count', () => {
    render(<RevocationSummary attestations={mockAttestations} />);
    const summary = screen.getByTestId('revocation-summary');
    expect(summary).toHaveTextContent(/1.*revoked/i);
  });

  it('shows failed count', () => {
    render(<RevocationSummary attestations={mockAttestations} />);
    const summary = screen.getByTestId('revocation-summary');
    expect(summary).toHaveTextContent(/1.*failed/i);
  });
});

// =============================================================================
// RevocationConfirmDialog Tests
// =============================================================================

describe('RevocationConfirmDialog', () => {
  it('renders dialog', () => {
    render(<RevocationConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('revocation-confirm-dialog')).toBeInTheDocument();
  });

  it('shows attestation count', () => {
    render(<RevocationConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('shows warning message', () => {
    render(<RevocationConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/cannot be undone|irreversible/i)).toBeInTheDocument();
  });

  it('calls onConfirm when confirmed', () => {
    const onConfirm = vi.fn();
    render(<RevocationConfirmDialog open={true} count={4} onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('confirm-revocation-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancelled', () => {
    const onCancel = vi.fn();
    render(<RevocationConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-revocation-button'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('hides when not open', () => {
    render(<RevocationConfirmDialog open={false} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByTestId('revocation-confirm-dialog')).not.toBeInTheDocument();
  });
});

// =============================================================================
// AttestationRevocationPanel Tests
// =============================================================================

describe('AttestationRevocationPanel', () => {
  it('renders panel', () => {
    render(<AttestationRevocationPanel attestations={mockAttestations} />);
    expect(screen.getByTestId('attestation-revocation-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<AttestationRevocationPanel attestations={mockAttestations} />);
    expect(screen.getAllByText(/attestation|revocation/i).length).toBeGreaterThan(0);
  });

  it('shows summary', () => {
    render(<AttestationRevocationPanel attestations={mockAttestations} />);
    expect(screen.getByTestId('revocation-summary')).toBeInTheDocument();
  });

  it('shows attestation list', () => {
    render(<AttestationRevocationPanel attestations={mockAttestations} />);
    expect(screen.getByTestId('attestation-revocation-list')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<AttestationRevocationPanel attestations={[]} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows revoke all button', () => {
    render(<AttestationRevocationPanel attestations={mockAttestations} />);
    expect(screen.getByTestId('revoke-all-button')).toBeInTheDocument();
  });

  it('calls onRevokeAll when clicked', () => {
    const onRevokeAll = vi.fn();
    // Use attestations without any "revoking" status so button is not disabled
    const nonProcessingAttestations = mockAttestations.map((a) =>
      a.status === 'revoking' ? { ...a, status: 'pending' as const } : a
    );
    render(<AttestationRevocationPanel attestations={nonProcessingAttestations} onRevokeAll={onRevokeAll} />);
    fireEvent.click(screen.getByTestId('revoke-all-button'));
    // Should open confirm dialog, not call immediately
    expect(screen.getByTestId('revocation-confirm-dialog')).toBeInTheDocument();
  });
});

// =============================================================================
// useAttestationRevocation Hook Tests
// =============================================================================

describe('useAttestationRevocation', () => {
  function TestComponent({ attestations }: { attestations: AttestationToRevoke[] }) {
    const {
      pendingCount,
      revokingCount,
      revokedCount,
      failedCount,
      attestationTypes,
      isProcessing,
      overallProgress,
    } = useAttestationRevocation(attestations);

    return (
      <div>
        <span data-testid="pending-count">{pendingCount}</span>
        <span data-testid="revoking-count">{revokingCount}</span>
        <span data-testid="revoked-count">{revokedCount}</span>
        <span data-testid="failed-count">{failedCount}</span>
        <span data-testid="type-count">{attestationTypes.length}</span>
        <span data-testid="is-processing">{isProcessing ? 'yes' : 'no'}</span>
        <span data-testid="overall-progress">{overallProgress}</span>
      </div>
    );
  }

  it('counts pending attestations', () => {
    render(<TestComponent attestations={mockAttestations} />);
    expect(screen.getByTestId('pending-count')).toHaveTextContent('1');
  });

  it('counts revoking attestations', () => {
    render(<TestComponent attestations={mockAttestations} />);
    expect(screen.getByTestId('revoking-count')).toHaveTextContent('1');
  });

  it('counts revoked attestations', () => {
    render(<TestComponent attestations={mockAttestations} />);
    expect(screen.getByTestId('revoked-count')).toHaveTextContent('1');
  });

  it('counts failed attestations', () => {
    render(<TestComponent attestations={mockAttestations} />);
    expect(screen.getByTestId('failed-count')).toHaveTextContent('1');
  });

  it('extracts attestation types', () => {
    render(<TestComponent attestations={mockAttestations} />);
    const count = parseInt(screen.getByTestId('type-count').textContent!);
    expect(count).toBe(4);
  });

  it('detects processing state', () => {
    render(<TestComponent attestations={mockAttestations} />);
    expect(screen.getByTestId('is-processing')).toHaveTextContent('yes');
  });

  it('calculates overall progress', () => {
    render(<TestComponent attestations={mockAttestations} />);
    const progress = parseInt(screen.getByTestId('overall-progress').textContent!);
    expect(progress).toBe(25); // 1 revoked out of 4
  });

  it('handles empty attestations', () => {
    render(<TestComponent attestations={[]} />);
    expect(screen.getByTestId('pending-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-processing')).toHaveTextContent('no');
  });
});
