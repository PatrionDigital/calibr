'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export type DeletionStatus = 'idle' | 'warning' | 'confirming' | 'deleting' | 'success' | 'error';

export interface DeletionType {
  id: string;
  label: string;
  description: string;
  count: number;
}

export interface DeletionState {
  status: DeletionStatus;
  progress: number;
  error: string | null;
  selectedType: string | null;
}

// =============================================================================
// DeletionWarning Component
// =============================================================================

interface DeletionWarningProps {
  type: string;
  count: number;
}

export function DeletionWarning({ type, count }: DeletionWarningProps) {
  const isAccountDeletion = type === 'account';

  return (
    <div
      data-testid="deletion-warning"
      className={`border p-4 font-mono ${
        isAccountDeletion ? 'border-red-500 bg-red-500 bg-opacity-10 danger' : 'border-yellow-500 bg-yellow-500 bg-opacity-10'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">⚠️</span>
        <h3 className={`text-lg font-bold ${isAccountDeletion ? 'text-red-500' : 'text-yellow-500'}`}>
          Warning: Deletion Request
        </h3>
      </div>

      <p className={`mb-3 ${isAccountDeletion ? 'text-red-400' : 'text-yellow-400'}`}>
        You are about to delete {count} {type}. This action <strong>cannot be undone</strong>.
      </p>

      <div data-testid="deletion-consequences" className="text-sm opacity-80">
        <p className={isAccountDeletion ? 'text-red-400' : 'text-yellow-400'}>Consequences:</p>
        <ul className={`list-disc list-inside mt-1 ${isAccountDeletion ? 'text-red-400' : 'text-yellow-400'}`}>
          <li>All {type} data will be permanently removed</li>
          <li>This cannot be recovered after deletion</li>
          {isAccountDeletion && <li>Your account and all associated data will be erased</li>}
          {type === 'attestations' && <li>On-chain attestations may still exist but will be unlinked</li>}
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// DeletionConfirmInput Component
// =============================================================================

interface DeletionConfirmInputProps {
  confirmText: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function DeletionConfirmInput({ confirmText, onConfirm, onCancel }: DeletionConfirmInputProps) {
  const [inputValue, setInputValue] = useState('');
  const isMatch = inputValue === confirmText;

  return (
    <div className="font-mono">
      <p className="text-[var(--terminal-green)] mb-3">
        To confirm deletion, type <span className="font-bold text-red-400">{confirmText}</span> below:
      </p>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={confirmText}
        className="w-full p-2 mb-4 bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] font-mono focus:outline-none focus:border-red-500"
      />

      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={!isMatch}
          className={`flex-1 py-2 border transition-colors ${
            isMatch
              ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-black'
              : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
          }`}
        >
          Confirm Deletion
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// DeletionProgress Component
// =============================================================================

interface DeletionProgressProps {
  status: string;
  progress: number;
  currentItem?: string;
  deletedCount?: number;
  totalCount?: number;
}

export function DeletionProgress({
  status: _status,
  progress,
  currentItem,
  deletedCount,
  totalCount,
}: DeletionProgressProps) {
  return (
    <div data-testid="deletion-progress" className="font-mono">
      <div className="flex items-center gap-3 mb-4">
        <div data-testid="deletion-spinner" className="animate-spin text-2xl">
          ⟳
        </div>
        <span className="text-[var(--terminal-green)]">Deleting data...</span>
      </div>

      <div className="mb-3">
        <div className="h-2 bg-[var(--terminal-dim)] bg-opacity-30 rounded overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-[var(--terminal-dim)]">
          <span>{progress}%</span>
          {deletedCount !== undefined && totalCount !== undefined && (
            <span>{deletedCount} / {totalCount} items</span>
          )}
        </div>
      </div>

      {currentItem && (
        <p className="text-sm text-[var(--terminal-dim)]">
          Currently removing: {currentItem}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// DeletionSuccess Component
// =============================================================================

interface DeletionSuccessProps {
  type: string;
  count: number;
  onClose: () => void;
}

export function DeletionSuccess({ type, count, onClose }: DeletionSuccessProps) {
  return (
    <div className="font-mono text-center">
      <div data-testid="success-icon" className="text-4xl mb-4 text-[var(--terminal-green)]">
        ✓
      </div>

      <h3 className="text-xl text-[var(--terminal-green)] mb-2">Deletion Successful</h3>

      <p className="text-[var(--terminal-green)] opacity-80 mb-6">
        Successfully deleted {count} {type}.
      </p>

      <button
        onClick={onClose}
        className="w-full py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// =============================================================================
// DeletionError Component
// =============================================================================

interface DeletionErrorProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

export function DeletionError({ error, onRetry, onClose }: DeletionErrorProps) {
  return (
    <div className="font-mono">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl text-red-500">✗</span>
        <h3 className="text-lg text-red-500">Deletion Error</h3>
      </div>

      <p className="text-red-400 mb-4 text-sm">
        {error}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
        >
          Close
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// DeletionDialog Component
// =============================================================================

interface DeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  type: string;
  count: number;
}

export function DeletionDialog({ isOpen, onClose, onConfirm, type, count }: DeletionDialogProps) {
  const [step, setStep] = useState<'warning' | 'confirm' | 'progress' | 'success' | 'error'>('warning');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleProceed = useCallback(() => {
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback(async () => {
    setStep('progress');
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      await onConfirm();
      clearInterval(progressInterval);
      setProgress(100);
      setStep('success');
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Deletion failed');
      setStep('error');
    }
  }, [onConfirm]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleConfirm();
  }, [handleConfirm]);

  const handleClose = useCallback(() => {
    setStep('warning');
    setProgress(0);
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="deletion-dialog"
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50"
    >
      <div className="w-full max-w-md border border-[var(--terminal-green)] bg-black p-6">
        <div className="text-[var(--terminal-dim)] text-xs mb-4 font-mono">
          ┌── DELETE DATA ──────────────────────────────────────────────┐
        </div>

        {step === 'warning' && (
          <>
            <DeletionWarning type={type} count={count} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleClose}
                className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                className="flex-1 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors font-mono"
              >
                Proceed →
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <DeletionConfirmInput
            confirmText="DELETE"
            onConfirm={handleConfirm}
            onCancel={() => setStep('warning')}
          />
        )}

        {step === 'progress' && (
          <DeletionProgress
            status="deleting"
            progress={progress}
            deletedCount={Math.floor((progress / 100) * count)}
            totalCount={count}
          />
        )}

        {step === 'success' && (
          <DeletionSuccess type={type} count={count} onClose={handleClose} />
        )}

        {step === 'error' && error && (
          <DeletionError error={error} onRetry={handleRetry} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DeletionTypeSelector Component
// =============================================================================

interface DeletionTypeSelectorProps {
  types: DeletionType[];
  onSelect: (typeId: string) => void;
}

export function DeletionTypeSelector({ types, onSelect }: DeletionTypeSelectorProps) {
  return (
    <div data-testid="deletion-type-selector" className="font-mono space-y-2">
      {types.map((type) => (
        <button
          key={type.id}
          data-type={type.id}
          onClick={() => onSelect(type.id)}
          className={`w-full p-4 border text-left transition-colors ${
            type.id === 'account'
              ? 'border-red-500 hover:bg-red-500 hover:bg-opacity-10 danger'
              : 'border-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-10'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className={`font-bold ${type.id === 'account' ? 'text-red-500' : 'text-[var(--terminal-green)]'}`}>
                {type.label}
              </h4>
              <p className="text-sm text-[var(--terminal-dim)] mt-1">{type.description}</p>
            </div>
            <span className="text-xs text-[var(--terminal-dim)]">{type.count} items</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// useDataDeletion Hook
// =============================================================================

interface UseDataDeletionReturn {
  status: DeletionStatus;
  progress: number;
  error: string | null;
  selectedType: string | null;
  setSelectedType: (type: string | null) => void;
  startDeletion: () => Promise<void>;
  reset: () => void;
}

export function useDataDeletion(): UseDataDeletionReturn {
  const [status, setStatus] = useState<DeletionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const startDeletion = useCallback(async () => {
    if (!selectedType) return;

    setStatus('deleting');
    setProgress(0);

    try {
      // Simulate deletion progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed');
      setStatus('error');
    }
  }, [selectedType]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setSelectedType(null);
  }, []);

  return {
    status,
    progress,
    error,
    selectedType,
    setSelectedType,
    startDeletion,
    reset,
  };
}
