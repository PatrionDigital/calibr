'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface VerifiedField {
  index: number;
  name: string;
  label: string;
  value: string;
  verified: boolean;
}

export interface VerificationInput {
  attestationUid: string;
  merkleRoot: string;
  revealedIndices: number[];
  revealedValues: string[];
  proof: string[];
}

export interface VerificationResult {
  id: string;
  valid: boolean;
  attestationUid: string;
  merkleRoot: string;
  verifiedFields: VerifiedField[];
  verifiedAt: string;
  schema?: string;
  attester?: string;
  error?: string;
}

export type VerificationStatus = 'verified' | 'invalid' | 'pending';

// =============================================================================
// ProofInputField Component
// =============================================================================

interface ProofInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProofInputField({ value, onChange, error }: ProofInputFieldProps) {
  return (
    <div className="font-mono space-y-2">
      <div className="text-[var(--terminal-dim)] text-xs">Paste Proof Data</div>
      <textarea
        data-testid="proof-input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste proof JSON here..."
        className={`w-full h-32 bg-black border p-2 text-sm focus:outline-none resize-none ${
          error
            ? 'border-red-400 text-red-400'
            : 'border-[var(--terminal-dim)] text-[var(--terminal-green)] focus:border-[var(--terminal-green)]'
        }`}
      />
      {error && <div className="text-red-400 text-xs">{error}</div>}
    </div>
  );
}

// =============================================================================
// MerkleRootDisplay Component
// =============================================================================

interface MerkleRootDisplayProps {
  root: string;
  verified?: boolean;
}

export function MerkleRootDisplay({ root, verified }: MerkleRootDisplayProps) {
  return (
    <div
      data-testid="merkle-root-display"
      className="border border-[var(--terminal-dim)] p-2 font-mono"
    >
      <div className="flex justify-between items-center">
        <div className="text-[var(--terminal-dim)] text-xs">Merkle Root</div>
        {verified !== undefined && (
          <span
            className={`text-xs ${verified ? 'text-green-400' : 'text-yellow-400'}`}
          >
            {verified ? '✓ Verified' : '✗ Unverified'}
          </span>
        )}
      </div>
      <div className="text-[var(--terminal-green)] text-sm truncate">{root}</div>
    </div>
  );
}

// =============================================================================
// VerifyButton Component
// =============================================================================

interface VerifyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function VerifyButton({ onClick, disabled = false, loading = false }: VerifyButtonProps) {
  return (
    <button
      data-testid="verify-button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full font-mono text-sm py-2 border ${
        disabled || loading
          ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
          : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
      }`}
    >
      {loading ? 'Verifying...' : 'Verify Proof'}
    </button>
  );
}

// =============================================================================
// VerificationStatusBadge Component
// =============================================================================

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; className: string }> = {
  verified: { label: 'Verified', className: 'text-green-400 border-green-400' },
  invalid: { label: 'Invalid', className: 'text-red-400 border-red-400' },
  pending: { label: 'Pending', className: 'text-yellow-400 border-yellow-400' },
};

export function VerificationStatusBadge({ status }: VerificationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid="verification-status-badge"
      className={`font-mono text-xs px-2 py-0.5 border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// VerifiedFieldCard Component
// =============================================================================

interface VerifiedFieldCardProps {
  field: VerifiedField;
}

export function VerifiedFieldCard({ field }: VerifiedFieldCardProps) {
  return (
    <div
      data-testid="verified-field-card"
      className="border border-[var(--terminal-dim)] p-2 font-mono"
    >
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-[var(--terminal-dim)">Index: {field.index}</span>
        {field.verified && (
          <span className="text-green-400">✓ Verified</span>
        )}
      </div>
      <div className="text-[var(--terminal-green)] font-bold text-sm">{field.label}</div>
      <div className="text-[var(--terminal-green)] text-sm">{field.value}</div>
    </div>
  );
}

// =============================================================================
// VerifiedFieldList Component
// =============================================================================

interface VerifiedFieldListProps {
  fields: VerifiedField[];
}

export function VerifiedFieldList({ fields }: VerifiedFieldListProps) {
  if (fields.length === 0) {
    return (
      <div
        data-testid="verified-field-list"
        className="font-mono text-center py-4 text-[var(--terminal-dim)] text-sm"
      >
        No fields verified
      </div>
    );
  }

  return (
    <div data-testid="verified-field-list" className="font-mono space-y-2">
      <div className="text-[var(--terminal-green)] font-bold text-sm">
        Verified Fields ({fields.length})
      </div>
      <div className="space-y-2">
        {fields.map((field) => (
          <VerifiedFieldCard key={field.index} field={field} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// VerificationResultCard Component
// =============================================================================

interface VerificationResultCardProps {
  result: VerificationResult;
}

export function VerificationResultCard({ result }: VerificationResultCardProps) {
  const date = new Date(result.verifiedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid="verification-result-card"
      className={`border p-4 font-mono space-y-3 ${
        result.valid
          ? 'border-green-400'
          : 'border-red-400'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className={`font-bold text-lg ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
          {result.valid ? 'Verification Successful' : 'Verification Failed'}
        </div>
        <VerificationStatusBadge status={result.valid ? 'verified' : 'invalid'} />
      </div>

      {result.error && (
        <div className="text-red-400 text-sm border border-red-400 p-2">
          Error: {result.error}
        </div>
      )}

      {result.valid && result.verifiedFields.length > 0 && (
        <VerifiedFieldList fields={result.verifiedFields} />
      )}

      <div className="text-[var(--terminal-dim)] text-xs">
        Verified at: {date}
      </div>
    </div>
  );
}

// =============================================================================
// AttestationInfoCard Component
// =============================================================================

interface AttestationInfoCardProps {
  uid: string;
  schema?: string;
  attester?: string;
}

export function AttestationInfoCard({ uid, schema, attester }: AttestationInfoCardProps) {
  return (
    <div
      data-testid="attestation-info-card"
      className="border border-[var(--terminal-dim)] p-3 font-mono space-y-2"
    >
      <div className="text-[var(--terminal-green)] font-bold text-sm">Attestation Info</div>
      <div className="grid grid-cols-1 gap-1 text-xs">
        <div>
          <span className="text-[var(--terminal-dim)]">UID: </span>
          <span className="text-[var(--terminal-green)] truncate">{uid}</span>
        </div>
        {schema && (
          <div>
            <span className="text-[var(--terminal-dim)]">Schema: </span>
            <span className="text-[var(--terminal-green)]">{schema}</span>
          </div>
        )}
        {attester && (
          <div>
            <span className="text-[var(--terminal-dim)]">Attester: </span>
            <span className="text-[var(--terminal-green)] truncate">{attester}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// VerificationHistoryItem Component
// =============================================================================

interface VerificationHistoryItemProps {
  result: VerificationResult;
}

export function VerificationHistoryItem({ result }: VerificationHistoryItemProps) {
  const date = new Date(result.verifiedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid="verification-history-item"
      className="border border-[var(--terminal-dim)] p-2 font-mono text-xs"
    >
      <div className="flex justify-between items-center">
        <span className="text-[var(--terminal-green)]">{result.id}</span>
        <VerificationStatusBadge status={result.valid ? 'verified' : 'invalid'} />
      </div>
      <div className="flex justify-between items-center mt-1 text-[var(--terminal-dim)]">
        <span>{result.verifiedFields.length} fields verified</span>
        <span>{date}</span>
      </div>
    </div>
  );
}

// =============================================================================
// VerificationHistoryList Component
// =============================================================================

interface VerificationHistoryListProps {
  results: VerificationResult[];
}

export function VerificationHistoryList({ results }: VerificationHistoryListProps) {
  if (results.length === 0) {
    return (
      <div
        data-testid="verification-history-list"
        className="font-mono text-center py-4 text-[var(--terminal-dim)] text-sm"
      >
        No verification history yet
      </div>
    );
  }

  return (
    <div data-testid="verification-history-list" className="font-mono space-y-2">
      <div className="text-[var(--terminal-green)] font-bold text-sm">
        Past Verifications History
      </div>
      <div className="space-y-2">
        {results.map((result) => (
          <VerificationHistoryItem key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// AttestationVerificationForm Component
// =============================================================================

interface AttestationVerificationFormProps {
  onVerify: (input: VerificationInput) => void;
  loading?: boolean;
  initialInput?: string;
}

export function AttestationVerificationForm({
  onVerify,
  loading = false,
  initialInput = '',
}: AttestationVerificationFormProps) {
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState<string | null>(null);

  const parsedInput = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return JSON.parse(input) as VerificationInput;
    } catch {
      return null;
    }
  }, [input]);

  const canVerify = parsedInput !== null;

  const handleVerify = () => {
    if (!input.trim()) {
      setError('Please enter proof data');
      return;
    }

    try {
      const parsed = JSON.parse(input) as VerificationInput;
      setError(null);
      onVerify(parsed);
    } catch {
      setError('Invalid JSON format - please check the proof data');
    }
  };

  return (
    <div data-testid="attestation-verification-form" className="space-y-4">
      <ProofInputField value={input} onChange={setInput} error={error || undefined} />
      <VerifyButton onClick={handleVerify} disabled={!canVerify} loading={loading} />
    </div>
  );
}

// =============================================================================
// AttestationVerificationPanel Component
// =============================================================================

interface AttestationVerificationPanelProps {
  result?: VerificationResult | null;
  loading?: boolean;
  onVerify?: (input: VerificationInput) => void;
}

export function AttestationVerificationPanel({
  result = null,
  loading = false,
  onVerify,
}: AttestationVerificationPanelProps) {
  const handleVerify = (input: VerificationInput) => {
    if (onVerify) {
      onVerify(input);
    }
  };

  return (
    <div data-testid="attestation-verification-panel" className="max-w-xl mx-auto p-4 font-mono space-y-6">
      <div className="text-[var(--terminal-green)] font-bold text-lg border-b border-[var(--terminal-dim)] pb-2">
        Verify Attestation Proof
      </div>

      {loading && (
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">
            Verifying proof...
          </div>
        </div>
      )}

      {!loading && (
        <AttestationVerificationForm onVerify={handleVerify} loading={loading} />
      )}

      {result && (
        <>
          <VerificationResultCard result={result} />
          {result.valid && result.schema && result.attester && (
            <AttestationInfoCard
              uid={result.attestationUid}
              schema={result.schema}
              attester={result.attester}
            />
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// useAttestationVerification Hook
// =============================================================================

interface UseAttestationVerificationReturn {
  input: string;
  parsedInput: VerificationInput | null;
  result: VerificationResult | null;
  isVerifying: boolean;
  error: string | null;
  isValid: boolean;
  setInput: (value: string) => void;
  verify: () => void;
  reset: () => void;
}

export function useAttestationVerification(): UseAttestationVerificationReturn {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedInput = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return JSON.parse(input) as VerificationInput;
    } catch {
      return null;
    }
  }, [input]);

  const isValid = parsedInput !== null;

  const verify = useCallback(() => {
    if (!parsedInput) {
      setError('Invalid input');
      return;
    }

    setIsVerifying(true);
    setError(null);

    // Simulate verification
    setTimeout(() => {
      const newResult: VerificationResult = {
        id: `verify-${Date.now()}`,
        valid: true,
        attestationUid: parsedInput.attestationUid,
        merkleRoot: parsedInput.merkleRoot,
        verifiedFields: parsedInput.revealedIndices.map((index, i) => ({
          index,
          name: `field-${index}`,
          label: `Field ${index}`,
          value: parsedInput.revealedValues[i] ?? '',
          verified: true,
        })),
        verifiedAt: new Date().toISOString(),
      };
      setResult(newResult);
      setIsVerifying(false);
    }, 100);
  }, [parsedInput]);

  const reset = useCallback(() => {
    setInput('');
    setResult(null);
    setError(null);
  }, []);

  return {
    input,
    parsedInput,
    result,
    isVerifying,
    error,
    isValid,
    setInput,
    verify,
    reset,
  };
}
