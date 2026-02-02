'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type ExportDataType = 'forecasts' | 'resolutions' | 'stats' | 'achievements' | 'activity';
export type ExportStatus = 'idle' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface ExportOptions {
  format: ExportFormat;
  dataTypes: ExportDataType[];
  dateRange: {
    start: string;
    end: string;
  };
  includePrivate: boolean;
  anonymize: boolean;
}

export interface ExportPreviewData {
  totalRecords: number;
  estimatedSize: string;
  dataTypes: ExportDataType[];
  sampleData: Record<string, unknown>[];
}

// =============================================================================
// Utility Functions
// =============================================================================

const formatDescriptions: Record<ExportFormat, string> = {
  csv: 'Comma-separated values for spreadsheet applications',
  json: 'JavaScript Object Notation for programmatic use',
  xlsx: 'Excel spreadsheet format',
};

// =============================================================================
// ExportButton Component
// =============================================================================

interface ExportButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({ onClick, isLoading = false, label, disabled = false }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center gap-2 px-4 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] font-mono transition-colors ${
        isLoading || disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[var(--terminal-green)] hover:text-black'
      }`}
    >
      <span data-testid="export-icon" className="text-lg">
        {isLoading ? '⏳' : '📥'}
      </span>
      <span>{isLoading ? 'Exporting...' : label || 'Export'}</span>
    </button>
  );
}

// =============================================================================
// ExportFormatSelector Component
// =============================================================================

interface ExportFormatSelectorProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
  formats?: ExportFormat[];
  showDescriptions?: boolean;
}

export function ExportFormatSelector({
  value,
  onChange,
  formats = ['csv', 'json'],
  showDescriptions = false,
}: ExportFormatSelectorProps) {
  return (
    <div className="font-mono">
      <div className="text-[var(--terminal-dim)] text-xs mb-2">Format</div>
      <div className="flex gap-2 flex-wrap">
        {formats.map((format) => (
          <button
            key={format}
            data-testid={`format-${format}`}
            onClick={() => onChange(format)}
            className={`px-3 py-2 border border-[var(--terminal-green)] text-sm uppercase transition-colors ${
              value === format
                ? 'bg-[var(--terminal-green)] text-black selected'
                : 'text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
            }`}
          >
            {format}
          </button>
        ))}
      </div>
      {showDescriptions && (
        <div className="text-[var(--terminal-dim)] text-xs mt-2">
          {formatDescriptions[value]}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ExportOptionsPanel Component
// =============================================================================

interface ExportOptionsPanelProps {
  options: ExportOptions;
  onChange: (options: ExportOptions) => void;
}

export function ExportOptionsPanel({ options, onChange }: ExportOptionsPanelProps) {
  const dataTypeOptions: { key: ExportDataType; label: string }[] = [
    { key: 'forecasts', label: 'Forecasts' },
    { key: 'resolutions', label: 'Resolutions' },
    { key: 'stats', label: 'Statistics' },
    { key: 'achievements', label: 'Achievements' },
    { key: 'activity', label: 'Activity Log' },
  ];

  const toggleDataType = (type: ExportDataType) => {
    const newTypes = options.dataTypes.includes(type)
      ? options.dataTypes.filter((t) => t !== type)
      : [...options.dataTypes, type];
    onChange({ ...options, dataTypes: newTypes });
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Data Types */}
      <div>
        <div className="text-[var(--terminal-dim)] text-xs mb-2">Data to Export</div>
        <div className="space-y-2">
          {dataTypeOptions.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-[var(--terminal-green)] cursor-pointer">
              <input
                type="checkbox"
                checked={options.dataTypes.includes(key)}
                onChange={() => toggleDataType(key)}
                className="w-4 h-4 accent-[var(--terminal-green)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <div className="text-[var(--terminal-dim)] text-xs mb-2">Date Range</div>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs text-[var(--terminal-dim)]" htmlFor="start-date">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={options.dateRange.start}
              onChange={(e) =>
                onChange({
                  ...options,
                  dateRange: { ...options.dateRange, start: e.target.value },
                })
              }
              className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--terminal-dim)]" htmlFor="end-date">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={options.dateRange.end}
              onChange={(e) =>
                onChange({
                  ...options,
                  dateRange: { ...options.dateRange, end: e.target.value },
                })
              }
              className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Privacy Options */}
      <div>
        <div className="text-[var(--terminal-dim)] text-xs mb-2">Privacy Options</div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-[var(--terminal-green)] cursor-pointer">
            <input
              type="checkbox"
              checked={options.includePrivate}
              onChange={(e) => onChange({ ...options, includePrivate: e.target.checked })}
              className="w-4 h-4 accent-[var(--terminal-green)]"
            />
            Include Private Data
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--terminal-green)] cursor-pointer">
            <input
              type="checkbox"
              checked={options.anonymize}
              onChange={(e) => onChange({ ...options, anonymize: e.target.checked })}
              className="w-4 h-4 accent-[var(--terminal-green)]"
            />
            Anonymize Data
          </label>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ExportPreview Component
// =============================================================================

interface ExportPreviewProps {
  preview: ExportPreviewData | null;
  format?: ExportFormat;
  isLoading?: boolean;
}

export function ExportPreview({ preview, format = 'csv', isLoading = false }: ExportPreviewProps) {
  if (isLoading) {
    return (
      <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="export-preview">
        <div className="text-[var(--terminal-dim)] animate-pulse">Loading preview...</div>
      </div>
    );
  }

  if (!preview || preview.totalRecords === 0) {
    return (
      <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="export-preview">
        <div className="text-[var(--terminal-dim)]">No data to export</div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="export-preview">
      <h3 className="text-[var(--terminal-green)] mb-3 border-b border-[var(--terminal-green)] pb-2">
        ┌─ PREVIEW ─┐
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Records</div>
          <div className="text-[var(--terminal-green)]">{preview.totalRecords}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Est. Size</div>
          <div className="text-[var(--terminal-green)]">{preview.estimatedSize}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Types</div>
          <div className="text-[var(--terminal-green)]">{preview.dataTypes.join(', ')}</div>
        </div>
      </div>

      {/* Sample Data */}
      <div className="text-[var(--terminal-dim)] text-xs mb-2">Sample Data</div>
      {format === 'json' ? (
        <pre
          data-testid="json-preview"
          className="bg-black border border-[var(--terminal-green)] p-2 text-xs text-[var(--terminal-green)] overflow-x-auto max-h-48"
        >
          {JSON.stringify(preview.sampleData, null, 2)}
        </pre>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--terminal-green)]">
              {preview.sampleData.length > 0 &&
                Object.keys(preview.sampleData[0] as object).map((key) => (
                  <th key={key} className="text-left text-[var(--terminal-dim)] py-1 px-2">
                    {key}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {preview.sampleData.map((row, idx) => (
              <tr key={idx} className="border-b border-[var(--terminal-green)] border-opacity-30">
                {Object.values(row as object).map((val, vidx) => (
                  <td key={vidx} className="text-[var(--terminal-green)] py-1 px-2">
                    {String(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// =============================================================================
// ExportProgress Component
// =============================================================================

interface ExportProgressProps {
  status: ExportStatus;
  progress: number;
  error?: string;
  onDownload?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function ExportProgress({
  status,
  progress,
  error,
  onDownload,
  onCancel,
  onRetry,
}: ExportProgressProps) {
  const statusLabels: Record<ExportStatus, string> = {
    idle: 'Ready',
    processing: 'Processing...',
    completed: 'Completed',
    error: 'Error',
    cancelled: 'Cancelled',
  };

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="export-progress">
      {/* Status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--terminal-green)]">{statusLabels[status]}</span>
        <span className="text-[var(--terminal-dim)]">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-4 border border-[var(--terminal-green)] bg-black mb-3">
        <div
          data-testid="export-progress-bar"
          className={`h-full ${status === 'error' ? 'bg-red-500' : 'bg-[var(--terminal-green)]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Error Message */}
      {status === 'error' && error && (
        <div className="text-red-500 text-sm mb-3">{error}</div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === 'processing' && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1 border border-[var(--terminal-green)] text-[var(--terminal-green)] text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
          >
            Cancel
          </button>
        )}
        {status === 'completed' && onDownload && (
          <button
            onClick={onDownload}
            className="px-3 py-1 border border-[var(--terminal-green)] text-[var(--terminal-green)] text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
          >
            Download
          </button>
        )}
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 border border-[var(--terminal-green)] text-[var(--terminal-green)] text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DataExportDialog Component
// =============================================================================

interface DataExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialOptions?: ExportOptions;
  initialStatus?: ExportStatus;
}

const defaultOptions: ExportOptions = {
  format: 'csv',
  dataTypes: ['forecasts', 'resolutions'],
  dateRange: {
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
    end: new Date().toISOString().split('T')[0]!,
  },
  includePrivate: false,
  anonymize: false,
};

export function DataExportDialog({
  isOpen,
  onClose,
  initialOptions = defaultOptions,
  initialStatus = 'idle',
}: DataExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>(initialOptions);
  const [status, setStatus] = useState<ExportStatus>(initialStatus);
  const [progress, setProgress] = useState(0);

  const preview: ExportPreviewData = useMemo(
    () => ({
      totalRecords: 150,
      estimatedSize: '500 KB',
      dataTypes: options.dataTypes,
      sampleData: [
        { id: 'f-1', question: 'Sample forecast 1', probability: 0.65 },
        { id: 'f-2', question: 'Sample forecast 2', probability: 0.45 },
      ],
    }),
    [options.dataTypes]
  );

  const handleExport = useCallback(() => {
    setStatus('processing');
    setProgress(0);

    // Simulate export progress
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setStatus('completed');
          return 100;
        }
        return p + 10;
      });
    }, 200);
  }, []);

  const isExportDisabled = options.dataTypes.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" role="dialog">
      <div className="bg-black border-2 border-[var(--terminal-green)] p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[var(--terminal-green)] pb-2">
          <h2 className="text-[var(--terminal-green)] text-lg">┌─ EXPORT DATA ─┐</h2>
          <button
            onClick={onClose}
            className="text-[var(--terminal-green)] hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {status === 'processing' || status === 'completed' || status === 'error' ? (
          <ExportProgress
            status={status}
            progress={progress}
            onDownload={() => {
              // Simulate download
              setStatus('idle');
              setProgress(0);
              onClose();
            }}
            onCancel={() => {
              setStatus('idle');
              setProgress(0);
            }}
            onRetry={handleExport}
          />
        ) : (
          <>
            {/* Format Selector */}
            <div className="mb-4">
              <ExportFormatSelector
                value={options.format}
                onChange={(format) => setOptions({ ...options, format })}
                showDescriptions={true}
              />
            </div>

            {/* Options */}
            <div className="mb-4">
              <ExportOptionsPanel options={options} onChange={setOptions} />
            </div>

            {/* Preview */}
            <div className="mb-4">
              <ExportPreview preview={preview} format={options.format} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleExport}
                disabled={isExportDisabled}
                className={`px-4 py-2 border border-[var(--terminal-green)] transition-colors ${
                  isExportDisabled
                    ? 'opacity-50 cursor-not-allowed text-[var(--terminal-dim)]'
                    : 'text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
                }`}
              >
                Export
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// useDataExport Hook
// =============================================================================

interface UseDataExportReturn {
  options: ExportOptions;
  setOptions: (options: ExportOptions) => void;
  preview: ExportPreviewData | null;
  status: ExportStatus;
  progress: number;
  error: string | null;
  startExport: () => void;
  cancelExport: () => void;
  downloadFile: () => void;
  reset: () => void;
}

export function useDataExport(): UseDataExportReturn {
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [preview, setPreview] = useState<ExportPreviewData | null>(null);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Load preview when options change
  useEffect(() => {
    const loadPreview = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));
      setPreview({
        totalRecords: 150,
        estimatedSize: '500 KB',
        dataTypes: options.dataTypes,
        sampleData: [
          { id: 'f-1', question: 'Sample forecast', probability: 0.65 },
        ],
      });
    };
    loadPreview();
  }, [options.dataTypes]);

  const startExport = useCallback(() => {
    const controller = new AbortController();
    setAbortController(controller);
    setStatus('processing');
    setProgress(0);
    setError(null);

    // Simulate export process
    let currentProgress = 0;
    const interval = setInterval(() => {
      if (controller.signal.aborted) {
        clearInterval(interval);
        return;
      }

      currentProgress += 10;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setStatus('completed');
      }
    }, 200);
  }, []);

  const cancelExport = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setStatus('cancelled');
    setProgress(0);
  }, [abortController]);

  const downloadFile = useCallback(() => {
    // In a real implementation, this would trigger the actual file download
    console.log('Downloading file...');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setAbortController(null);
  }, []);

  return {
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
  };
}
