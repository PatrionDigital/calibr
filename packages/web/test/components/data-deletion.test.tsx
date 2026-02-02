/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  DeletionType,
  DeletionStatus,
  DeletionState,
} from '../../src/components/data-deletion';
import {
  DeletionWarning,
  DeletionConfirmInput,
  DeletionProgress,
  DeletionSuccess,
  DeletionError,
  DeletionDialog,
  DeletionTypeSelector,
  useDataDeletion,
} from '../../src/components/data-deletion';

// =============================================================================
// Test Data
// =============================================================================

const mockDeletionTypes: DeletionType[] = [
  { id: 'forecasts', label: 'Forecasts', description: 'Delete all your forecasts', count: 42 },
  { id: 'positions', label: 'Positions', description: 'Delete position history', count: 15 },
  { id: 'attestations', label: 'Attestations', description: 'Revoke on-chain attestations', count: 8 },
  { id: 'account', label: 'Account', description: 'Delete entire account', count: 1 },
];

// =============================================================================
// DeletionWarning Tests
// =============================================================================

describe('DeletionWarning', () => {
  it('renders warning message', () => {
    render(<DeletionWarning type="forecasts" count={42} />);
    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('displays deletion type', () => {
    render(<DeletionWarning type="forecasts" count={42} />);
    // "forecasts" appears multiple times
    expect(screen.getAllByText(/forecasts/i).length).toBeGreaterThan(0);
  });

  it('shows item count', () => {
    render(<DeletionWarning type="forecasts" count={42} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('indicates irreversible action', () => {
    render(<DeletionWarning type="account" count={1} />);
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('shows danger styling', () => {
    render(<DeletionWarning type="account" count={1} />);
    const warning = screen.getByTestId('deletion-warning');
    expect(warning).toHaveClass('danger');
  });

  it('lists consequences', () => {
    render(<DeletionWarning type="account" count={1} />);
    expect(screen.getByTestId('deletion-consequences')).toBeInTheDocument();
  });
});

// =============================================================================
// DeletionConfirmInput Tests
// =============================================================================

describe('DeletionConfirmInput', () => {
  it('renders confirmation input', () => {
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required confirmation text', () => {
    render(<DeletionConfirmInput confirmText="DELETE MY DATA" onConfirm={() => {}} />);
    expect(screen.getByText(/DELETE MY DATA/)).toBeInTheDocument();
  });

  it('disables confirm button when text does not match', () => {
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={() => {}} />);
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('enables confirm button when text matches', () => {
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled();
  });

  it('calls onConfirm when confirmed', () => {
    const onConfirm = vi.fn();
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={onConfirm} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('has cancel button', () => {
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancelled', () => {
    const onCancel = vi.fn();
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows input helper text', () => {
    render(<DeletionConfirmInput confirmText="DELETE" onConfirm={() => {}} />);
    // Helper text contains "To confirm deletion, type..."
    expect(screen.getAllByText(/confirm deletion/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// DeletionProgress Tests
// =============================================================================

describe('DeletionProgress', () => {
  it('renders progress indicator', () => {
    render(<DeletionProgress status="deleting" progress={50} />);
    expect(screen.getByTestId('deletion-progress')).toBeInTheDocument();
  });

  it('shows percentage', () => {
    render(<DeletionProgress status="deleting" progress={75} />);
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('shows status message', () => {
    render(<DeletionProgress status="deleting" progress={50} />);
    expect(screen.getByText(/deleting/i)).toBeInTheDocument();
  });

  it('shows current item being deleted', () => {
    render(<DeletionProgress status="deleting" progress={50} currentItem="Forecast #42" />);
    expect(screen.getByText(/Forecast #42/)).toBeInTheDocument();
  });

  it('has loading animation', () => {
    render(<DeletionProgress status="deleting" progress={50} />);
    expect(screen.getByTestId('deletion-spinner')).toBeInTheDocument();
  });

  it('shows items deleted count', () => {
    render(<DeletionProgress status="deleting" progress={50} deletedCount={21} totalCount={42} />);
    expect(screen.getByText(/21.*42/)).toBeInTheDocument();
  });
});

// =============================================================================
// DeletionSuccess Tests
// =============================================================================

describe('DeletionSuccess', () => {
  it('renders success message', () => {
    render(<DeletionSuccess type="forecasts" count={42} onClose={() => {}} />);
    expect(screen.getAllByText(/success/i).length).toBeGreaterThan(0);
  });

  it('shows what was deleted', () => {
    render(<DeletionSuccess type="forecasts" count={42} onClose={() => {}} />);
    expect(screen.getAllByText(/forecasts/i).length).toBeGreaterThan(0);
  });

  it('shows deleted count', () => {
    render(<DeletionSuccess type="forecasts" count={42} onClose={() => {}} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('has close button', () => {
    render(<DeletionSuccess type="forecasts" count={42} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /close|done/i })).toBeInTheDocument();
  });

  it('calls onClose when closed', () => {
    const onClose = vi.fn();
    render(<DeletionSuccess type="forecasts" count={42} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close|done/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows success icon', () => {
    render(<DeletionSuccess type="forecasts" count={42} onClose={() => {}} />);
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// DeletionError Tests
// =============================================================================

describe('DeletionError', () => {
  it('renders error message', () => {
    render(<DeletionError error="Network error" onRetry={() => {}} onClose={() => {}} />);
    // "error" appears in both heading and error message
    expect(screen.getAllByText(/error/i).length).toBeGreaterThan(0);
  });

  it('shows error details', () => {
    render(<DeletionError error="Network error" onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('has retry button', () => {
    render(<DeletionError error="Network error" onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(<DeletionError error="Network error" onRetry={onRetry} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('has close button', () => {
    render(<DeletionError error="Network error" onRetry={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /close|cancel/i })).toBeInTheDocument();
  });

  it('calls onClose when closed', () => {
    const onClose = vi.fn();
    render(<DeletionError error="Network error" onRetry={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close|cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// DeletionDialog Tests
// =============================================================================

describe('DeletionDialog', () => {
  it('renders deletion dialog', () => {
    render(<DeletionDialog isOpen={true} onClose={() => {}} onConfirm={async () => {}} type="forecasts" count={42} />);
    expect(screen.getByTestId('deletion-dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DeletionDialog isOpen={false} onClose={() => {}} onConfirm={async () => {}} type="forecasts" count={42} />);
    expect(screen.queryByTestId('deletion-dialog')).not.toBeInTheDocument();
  });

  it('shows warning step initially', () => {
    render(<DeletionDialog isOpen={true} onClose={() => {}} onConfirm={async () => {}} type="forecasts" count={42} />);
    expect(screen.getByTestId('deletion-warning')).toBeInTheDocument();
  });

  it('shows confirm input after clicking proceed', () => {
    render(<DeletionDialog isOpen={true} onClose={() => {}} onConfirm={async () => {}} type="forecasts" count={42} />);
    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows progress during deletion', async () => {
    const onConfirm = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(<DeletionDialog isOpen={true} onClose={() => {}} onConfirm={onConfirm} type="forecasts" count={42} />);
    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(screen.getByTestId('deletion-progress')).toBeInTheDocument();
    });
  });

  it('shows success on completion', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeletionDialog isOpen={true} onClose={() => {}} onConfirm={onConfirm} type="forecasts" count={42} />);
    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/success/i).length).toBeGreaterThan(0);
    });
  });

  it('shows error on failure', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Deletion failed'));
    render(<DeletionDialog isOpen={true} onClose={() => {}} onConfirm={onConfirm} type="forecasts" count={42} />);
    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancelled', () => {
    const onClose = vi.fn();
    render(<DeletionDialog isOpen={true} onClose={onClose} onConfirm={async () => {}} type="forecasts" count={42} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// DeletionTypeSelector Tests
// =============================================================================

describe('DeletionTypeSelector', () => {
  it('renders deletion type selector', () => {
    render(<DeletionTypeSelector types={mockDeletionTypes} onSelect={() => {}} />);
    expect(screen.getByTestId('deletion-type-selector')).toBeInTheDocument();
  });

  it('shows all deletion types', () => {
    render(<DeletionTypeSelector types={mockDeletionTypes} onSelect={() => {}} />);
    expect(screen.getByText('Forecasts')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Attestations')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('shows descriptions', () => {
    render(<DeletionTypeSelector types={mockDeletionTypes} onSelect={() => {}} />);
    expect(screen.getByText(/Delete all your forecasts/)).toBeInTheDocument();
  });

  it('shows item counts', () => {
    render(<DeletionTypeSelector types={mockDeletionTypes} onSelect={() => {}} />);
    expect(screen.getByText(/42 items/)).toBeInTheDocument();
    expect(screen.getByText(/15 items/)).toBeInTheDocument();
  });

  it('calls onSelect when type selected', () => {
    const onSelect = vi.fn();
    render(<DeletionTypeSelector types={mockDeletionTypes} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Forecasts'));
    expect(onSelect).toHaveBeenCalledWith('forecasts');
  });

  it('highlights dangerous options', () => {
    render(<DeletionTypeSelector types={mockDeletionTypes} onSelect={() => {}} />);
    const accountOption = screen.getByText('Account').closest('[data-type]');
    expect(accountOption).toHaveClass('danger');
  });
});

// =============================================================================
// useDataDeletion Hook Tests
// =============================================================================

describe('useDataDeletion', () => {
  function TestComponent() {
    const {
      status,
      progress,
      error,
      selectedType,
      setSelectedType,
      startDeletion,
      reset,
    } = useDataDeletion();

    return (
      <div>
        <span data-testid="status">{status}</span>
        <span data-testid="progress">{progress}</span>
        <span data-testid="error">{error || 'none'}</span>
        <span data-testid="selected-type">{selectedType || 'none'}</span>
        <button onClick={() => setSelectedType('forecasts')}>Select Forecasts</button>
        <button onClick={() => startDeletion()}>Start</button>
        <button onClick={reset}>Reset</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle status', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('has 0 initial progress', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('progress')).toHaveTextContent('0');
  });

  it('has no initial error', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('has no initial selected type', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('selected-type')).toHaveTextContent('none');
  });

  it('allows selecting deletion type', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Select Forecasts'));
    expect(screen.getByTestId('selected-type')).toHaveTextContent('forecasts');
  });

  it('resets to initial state', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Select Forecasts'));
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('selected-type')).toHaveTextContent('none');
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });
});
