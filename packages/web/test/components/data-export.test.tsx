/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  ExportFormat,
  ExportDataType,
  ExportOptions,
  ExportStatus,
} from '../../src/components/data-export';
import {
  ExportButton,
  ExportFormatSelector,
  ExportOptionsPanel,
  ExportPreview,
  ExportProgress,
  DataExportDialog,
  useDataExport,
} from '../../src/components/data-export';

// =============================================================================
// Test Data
// =============================================================================

const mockExportOptions: ExportOptions = {
  format: 'csv',
  dataTypes: ['forecasts', 'resolutions', 'stats'],
  dateRange: {
    start: '2024-01-01',
    end: '2025-12-31',
  },
  includePrivate: false,
  anonymize: false,
};

const mockForecastData = [
  {
    id: 'f-1',
    question: 'Will BTC reach $100k?',
    probability: 0.65,
    createdAt: '2025-06-15T10:00:00Z',
    resolvedAt: '2025-12-01T00:00:00Z',
    outcome: true,
    brierScore: 0.12,
  },
  {
    id: 'f-2',
    question: 'ETH merge successful?',
    probability: 0.85,
    createdAt: '2025-03-10T14:30:00Z',
    resolvedAt: '2025-09-15T00:00:00Z',
    outcome: true,
    brierScore: 0.02,
  },
  {
    id: 'f-3',
    question: 'US recession in 2025?',
    probability: 0.30,
    createdAt: '2025-01-05T09:00:00Z',
    resolvedAt: null,
    outcome: null,
    brierScore: null,
  },
];

const mockPreviewData = {
  totalRecords: 245,
  estimatedSize: '1.2 MB',
  dataTypes: ['forecasts', 'resolutions', 'stats'] as ExportDataType[],
  sampleData: mockForecastData.slice(0, 2),
};

// =============================================================================
// ExportButton Tests
// =============================================================================

describe('ExportButton', () => {
  it('renders export button', () => {
    render(<ExportButton onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays export text', () => {
    render(<ExportButton onClick={() => {}} />);
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ExportButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows loading state when exporting', () => {
    render(<ExportButton onClick={() => {}} isLoading={true} />);
    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<ExportButton onClick={() => {}} isLoading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows custom label when provided', () => {
    render(<ExportButton onClick={() => {}} label="Download CSV" />);
    expect(screen.getByText('Download CSV')).toBeInTheDocument();
  });

  it('shows download icon', () => {
    render(<ExportButton onClick={() => {}} />);
    expect(screen.getByTestId('export-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// ExportFormatSelector Tests
// =============================================================================

describe('ExportFormatSelector', () => {
  it('renders format options', () => {
    render(<ExportFormatSelector value="csv" onChange={() => {}} />);
    expect(screen.getByText(/csv/i)).toBeInTheDocument();
    expect(screen.getByText(/json/i)).toBeInTheDocument();
  });

  it('shows selected format', () => {
    render(<ExportFormatSelector value="csv" onChange={() => {}} />);
    const csvOption = screen.getByTestId('format-csv');
    expect(csvOption).toHaveClass('selected');
  });

  it('calls onChange when format is selected', () => {
    const onChange = vi.fn();
    render(<ExportFormatSelector value="csv" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('format-json'));
    expect(onChange).toHaveBeenCalledWith('json');
  });

  it('displays format descriptions', () => {
    render(<ExportFormatSelector value="csv" onChange={() => {}} showDescriptions={true} />);
    expect(screen.getByText(/spreadsheet/i)).toBeInTheDocument();
  });

  it('supports xlsx format option', () => {
    render(<ExportFormatSelector value="csv" onChange={() => {}} formats={['csv', 'json', 'xlsx']} />);
    expect(screen.getByText(/xlsx/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ExportOptionsPanel Tests
// =============================================================================

describe('ExportOptionsPanel', () => {
  it('renders data type checkboxes', () => {
    render(<ExportOptionsPanel options={mockExportOptions} onChange={() => {}} />);
    expect(screen.getByLabelText(/forecasts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resolutions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/statistics/i)).toBeInTheDocument();
  });

  it('shows selected data types as checked', () => {
    render(<ExportOptionsPanel options={mockExportOptions} onChange={() => {}} />);
    expect(screen.getByLabelText(/forecasts/i)).toBeChecked();
    expect(screen.getByLabelText(/resolutions/i)).toBeChecked();
  });

  it('calls onChange when data type is toggled', () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel options={mockExportOptions} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/forecasts/i));
    expect(onChange).toHaveBeenCalled();
  });

  it('renders date range inputs', () => {
    render(<ExportOptionsPanel options={mockExportOptions} onChange={() => {}} />);
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('displays current date range values', () => {
    render(<ExportOptionsPanel options={mockExportOptions} onChange={() => {}} />);
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-12-31')).toBeInTheDocument();
  });

  it('renders privacy options', () => {
    render(<ExportOptionsPanel options={mockExportOptions} onChange={() => {}} />);
    expect(screen.getByLabelText(/include private/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/anonymize/i)).toBeInTheDocument();
  });

  it('shows privacy options unchecked by default', () => {
    render(<ExportOptionsPanel options={mockExportOptions} onChange={() => {}} />);
    expect(screen.getByLabelText(/include private/i)).not.toBeChecked();
    expect(screen.getByLabelText(/anonymize/i)).not.toBeChecked();
  });

  it('calls onChange when date range changes', () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel options={mockExportOptions} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-06-01' } });
    expect(onChange).toHaveBeenCalled();
  });
});

// =============================================================================
// ExportPreview Tests
// =============================================================================

describe('ExportPreview', () => {
  it('displays total record count', () => {
    render(<ExportPreview preview={mockPreviewData} />);
    expect(screen.getByText(/245/)).toBeInTheDocument();
  });

  it('shows estimated file size', () => {
    render(<ExportPreview preview={mockPreviewData} />);
    expect(screen.getByText(/1\.2 MB/)).toBeInTheDocument();
  });

  it('lists included data types', () => {
    render(<ExportPreview preview={mockPreviewData} />);
    expect(screen.getByText(/forecasts/i)).toBeInTheDocument();
    expect(screen.getByText(/resolutions/i)).toBeInTheDocument();
    expect(screen.getByText(/stats/i)).toBeInTheDocument();
  });

  it('shows sample data preview', () => {
    render(<ExportPreview preview={mockPreviewData} />);
    expect(screen.getByText(/BTC.*100k/i)).toBeInTheDocument();
    expect(screen.getByText(/ETH merge/i)).toBeInTheDocument();
  });

  it('displays sample data in table format for CSV', () => {
    render(<ExportPreview preview={mockPreviewData} format="csv" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays sample data in JSON format for JSON', () => {
    render(<ExportPreview preview={mockPreviewData} format="json" />);
    expect(screen.getByTestId('json-preview')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ExportPreview preview={null} isLoading={true} />);
    expect(screen.getByText(/loading preview/i)).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<ExportPreview preview={{ ...mockPreviewData, totalRecords: 0 }} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ExportProgress Tests
// =============================================================================

describe('ExportProgress', () => {
  it('displays progress percentage', () => {
    render(<ExportProgress status="processing" progress={45} />);
    expect(screen.getByText(/45%/)).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<ExportProgress status="processing" progress={45} />);
    const progressBar = screen.getByTestId('export-progress-bar');
    expect(progressBar).toHaveStyle({ width: '45%' });
  });

  it('displays processing status', () => {
    render(<ExportProgress status="processing" progress={45} />);
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('shows completed status', () => {
    render(<ExportProgress status="completed" progress={100} />);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('shows error status', () => {
    render(<ExportProgress status="error" progress={0} error="Export failed" />);
    expect(screen.getByText(/export failed/i)).toBeInTheDocument();
  });

  it('displays download button when completed', () => {
    const onDownload = vi.fn();
    render(<ExportProgress status="completed" progress={100} onDownload={onDownload} />);
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('calls onDownload when download button clicked', () => {
    const onDownload = vi.fn();
    render(<ExportProgress status="completed" progress={100} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(onDownload).toHaveBeenCalled();
  });

  it('shows cancel button during processing', () => {
    const onCancel = vi.fn();
    render(<ExportProgress status="processing" progress={45} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ExportProgress status="processing" progress={45} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows retry button on error', () => {
    const onRetry = vi.fn();
    render(<ExportProgress status="error" progress={0} error="Failed" onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

// =============================================================================
// DataExportDialog Tests
// =============================================================================

describe('DataExportDialog', () => {
  it('renders dialog when open', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DataExportDialog isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/export data/i)).toBeInTheDocument();
  });

  it('shows format selector', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/csv/i)).toBeInTheDocument();
    expect(screen.getByText(/json/i)).toBeInTheDocument();
  });

  it('shows options panel', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByLabelText(/forecasts/i)).toBeInTheDocument();
  });

  it('shows preview section', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId('export-preview')).toBeInTheDocument();
  });

  it('has close button', () => {
    const onClose = vi.fn();
    render(<DataExportDialog isOpen={true} onClose={onClose} />);
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[0]!);
    expect(onClose).toHaveBeenCalled();
  });

  it('has export button', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shows progress when exporting', async () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} initialStatus="processing" />);
    expect(screen.getByTestId('export-progress')).toBeInTheDocument();
  });

  it('disables export button when no data types selected', () => {
    render(<DataExportDialog isOpen={true} onClose={() => {}} initialOptions={{ ...mockExportOptions, dataTypes: [] }} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });
});

// =============================================================================
// useDataExport Hook Tests
// =============================================================================

describe('useDataExport', () => {
  function TestComponent() {
    const {
      options,
      setOptions,
      preview,
      status,
      progress,
      error,
      startExport,
      cancelExport,
      downloadFile,
      reset,
    } = useDataExport();

    return (
      <div>
        <span data-testid="status">{status}</span>
        <span data-testid="progress">{progress}</span>
        <span data-testid="error">{error || 'no-error'}</span>
        <span data-testid="format">{options.format}</span>
        <span data-testid="preview-count">{preview?.totalRecords ?? 'no-preview'}</span>
        <button onClick={() => setOptions({ ...options, format: 'json' })}>Change Format</button>
        <button onClick={startExport}>Start Export</button>
        <button onClick={cancelExport}>Cancel</button>
        <button onClick={downloadFile}>Download</button>
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

  it('initializes with default format', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('format')).toHaveTextContent('csv');
  });

  it('allows changing options', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Change Format'));
    expect(screen.getByTestId('format')).toHaveTextContent('json');
  });

  it('starts export when triggered', async () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Start Export'));
    await waitFor(() => {
      expect(screen.getByTestId('status')).not.toHaveTextContent('idle');
    });
  });

  it('can cancel export', async () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Start Export'));
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('cancelled');
    });
  });

  it('can reset to initial state', async () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Start Export'));
    await waitFor(() => {
      expect(screen.getByTestId('status')).not.toHaveTextContent('idle');
    });
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('provides preview data', async () => {
    render(<TestComponent />);
    await waitFor(() => {
      expect(screen.getByTestId('preview-count')).not.toHaveTextContent('no-preview');
    });
  });
});
