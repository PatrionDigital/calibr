'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface DisclosableField {
  id: string;
  name: string;
  label: string;
  value: string;
  revealed: boolean;
  index: number;
}

export interface AttestationData {
  uid: string;
  merkleRoot: string;
  schema: string;
  createdAt: string;
  fields: DisclosableField[];
}

export type DisclosureRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface DisclosureRequest {
  id: string;
  requester: string;
  requesterLabel: string;
  requestedFields: string[];
  message: string;
  createdAt: string;
  status: DisclosureRequestStatus;
}

export interface DisclosureProof {
  id: string;
  attestationUid: string;
  merkleRoot: string;
  revealedIndices: number[];
  revealedValues: string[];
  proof: string[];
  createdAt: string;
}

export type ProofStatus = 'idle' | 'generating' | 'success' | 'error';

// =============================================================================
// FieldDisclosureToggle Component
// =============================================================================

interface FieldDisclosureToggleProps {
  field: DisclosableField;
  onToggle: (fieldId: string) => void;
}

export function FieldDisclosureToggle({ field, onToggle }: FieldDisclosureToggleProps) {
  return (
    <button
      data-testid="field-disclosure-toggle"
      onClick={() => onToggle(field.id)}
      className={`w-full font-mono text-left p-3 border transition-colors ${
        field.revealed
          ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] bg-[var(--terminal-green)]/10 revealed active'
          : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)]'
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold">{field.label}</div>
        <div className="text-xs">
          {field.revealed ? '[REVEAL]' : '[HIDDEN]'}
        </div>
      </div>
      <div className="text-xs mt-1 truncate">
        {field.revealed ? field.value : '***'}
      </div>
    </button>
  );
}

// =============================================================================
// FieldDisclosureList Component
// =============================================================================

interface FieldDisclosureListProps {
  fields: DisclosableField[];
  onToggle: (fieldId: string) => void;
}

export function FieldDisclosureList({ fields, onToggle }: FieldDisclosureListProps) {
  const revealedCount = fields.filter((f) => f.revealed).length;

  return (
    <div data-testid="field-disclosure-list" className="font-mono space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[var(--terminal-green)] font-bold text-sm">Select Fields to Disclose</div>
        <div className="text-[var(--terminal-dim)] text-xs">
          {revealedCount} revealed / {fields.length} total
        </div>
      </div>
      <div className="space-y-2">
        {fields.map((field) => (
          <FieldDisclosureToggle key={field.id} field={field} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// DisclosureFieldPreview Component
// =============================================================================

interface DisclosureFieldPreviewProps {
  fields: DisclosableField[];
}

export function DisclosureFieldPreview({ fields }: DisclosureFieldPreviewProps) {
  if (fields.length === 0) {
    return (
      <div
        data-testid="disclosure-field-preview"
        className="border border-[var(--terminal-dim)] p-3 font-mono text-center text-[var(--terminal-dim)] text-sm"
      >
        No fields selected. Select fields to reveal.
      </div>
    );
  }

  return (
    <div
      data-testid="disclosure-field-preview"
      className="border border-[var(--terminal-green)] p-3 font-mono space-y-2"
    >
      <div className="text-[var(--terminal-green)] font-bold text-sm">
        Preview: Fields That Will Be Revealed
      </div>
      <div className="space-y-1">
        {fields.map((field) => (
          <div key={field.id} className="flex justify-between text-xs">
            <span className="text-[var(--terminal-dim)]">{field.label}:</span>
            <span className="text-[var(--terminal-green)]">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ProofGenerationStatus Component
// =============================================================================

interface ProofGenerationStatusProps {
  status: ProofStatus;
  error?: string;
}

const STATUS_CONFIG: Record<ProofStatus, { label: string; className: string }> = {
  idle: { label: 'Ready - Select fields to generate proof', className: 'text-[var(--terminal-dim)]' },
  generating: { label: 'Generating proof...', className: 'text-yellow-400' },
  success: { label: 'Proof generated successfully!', className: 'text-green-400' },
  error: { label: 'Error generating proof', className: 'text-red-400' },
};

export function ProofGenerationStatus({ status, error }: ProofGenerationStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      data-testid="proof-generation-status"
      className={`font-mono text-sm p-2 border border-[var(--terminal-dim)] ${config.className}`}
    >
      {status === 'error' && error ? `Failed: ${error}` : config.label}
    </div>
  );
}

// =============================================================================
// ProofShareButton Component
// =============================================================================

interface ProofShareButtonProps {
  proof: DisclosureProof | null;
  onShare: () => void;
}

export function ProofShareButton({ proof, onShare }: ProofShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (proof) {
      onShare();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      data-testid="proof-share-button"
      onClick={handleClick}
      disabled={!proof}
      className={`w-full font-mono text-sm py-2 border ${
        !proof
          ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
          : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
      }`}
    >
      {copied ? 'Copied!' : 'Share Proof'}
    </button>
  );
}

// =============================================================================
// ProofQRCode Component
// =============================================================================

interface ProofQRCodeProps {
  proof: DisclosureProof | null;
}

export function ProofQRCode({ proof }: ProofQRCodeProps) {
  if (!proof) {
    return (
      <div
        data-testid="proof-qr-code"
        className="border border-[var(--terminal-dim)] p-4 font-mono text-center"
      >
        <div className="w-32 h-32 mx-auto border border-[var(--terminal-dim)] flex items-center justify-center text-[var(--terminal-dim)] text-xs">
          Generate proof first. No proof available.
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="proof-qr-code"
      className="border border-[var(--terminal-green)] p-4 font-mono space-y-2"
    >
      <div className="text-[var(--terminal-green)] font-bold text-sm text-center">
        Scan QR to Verify
      </div>
      <div className="w-32 h-32 mx-auto border border-[var(--terminal-green)] flex items-center justify-center bg-white text-black text-xs">
        [QR: {proof.id}]
      </div>
      <div className="text-[var(--terminal-dim)] text-xs text-center">
        Proof ID: {proof.id}
      </div>
    </div>
  );
}

// =============================================================================
// DisclosureRequestCard Component
// =============================================================================

interface DisclosureRequestCardProps {
  request: DisclosureRequest;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}

const REQUEST_STATUS_CONFIG: Record<DisclosureRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-yellow-400' },
  approved: { label: 'Approved', className: 'text-green-400' },
  denied: { label: 'Denied', className: 'text-red-400' },
  expired: { label: 'Expired', className: 'text-[var(--terminal-dim)]' },
};

export function DisclosureRequestCard({ request, onApprove, onDeny }: DisclosureRequestCardProps) {
  const statusConfig = REQUEST_STATUS_CONFIG[request.status];

  return (
    <div
      data-testid="disclosure-request-card"
      className="border border-[var(--terminal-dim)] p-3 font-mono space-y-3"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[var(--terminal-green)] font-bold text-sm">
            {request.requesterLabel}
          </div>
          <div className="text-[var(--terminal-dim)] text-xs truncate">
            {request.requester}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 border border-current ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="text-[var(--terminal-dim)] text-xs">
        <div className="mb-1">Requested fields:</div>
        <div className="flex flex-wrap gap-1">
          {request.requestedFields.map((field) => (
            <span
              key={field}
              className="px-1 border border-[var(--terminal-dim)] text-[var(--terminal-green)]"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className="text-[var(--terminal-dim)] text-xs italic">
        "{request.message}"
      </div>

      {request.status === 'pending' && (
        <div className="flex gap-2">
          <button
            data-testid="approve-request-button"
            onClick={() => onApprove(request.id)}
            className="flex-1 py-1 border border-green-400 text-green-400 text-xs hover:bg-green-400 hover:text-black"
          >
            Approve
          </button>
          <button
            data-testid="deny-request-button"
            onClick={() => onDeny(request.id)}
            className="flex-1 py-1 border border-red-400 text-red-400 text-xs hover:bg-red-400 hover:text-black"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DisclosureHistoryItem Component
// =============================================================================

interface DisclosureHistoryItemProps {
  proof: DisclosureProof;
}

export function DisclosureHistoryItem({ proof }: DisclosureHistoryItemProps) {
  const date = new Date(proof.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid="disclosure-history-item"
      className="border border-[var(--terminal-dim)] p-2 font-mono text-xs"
    >
      <div className="flex justify-between items-center">
        <span className="text-[var(--terminal-green)]">{proof.id}</span>
        <span className="text-[var(--terminal-dim)]">{date}</span>
      </div>
      <div className="text-[var(--terminal-dim)] mt-1">
        {proof.revealedIndices.length} fields revealed
      </div>
    </div>
  );
}

// =============================================================================
// DisclosureHistoryList Component
// =============================================================================

interface DisclosureHistoryListProps {
  proofs: DisclosureProof[];
}

export function DisclosureHistoryList({ proofs }: DisclosureHistoryListProps) {
  if (proofs.length === 0) {
    return (
      <div
        data-testid="disclosure-history-list"
        className="font-mono text-center py-4 text-[var(--terminal-dim)] text-sm"
      >
        No disclosure history yet
      </div>
    );
  }

  return (
    <div data-testid="disclosure-history-list" className="font-mono space-y-2">
      <div className="text-[var(--terminal-green)] font-bold text-sm">
        Past Disclosures History
      </div>
      <div className="space-y-2">
        {proofs.map((proof) => (
          <DisclosureHistoryItem key={proof.id} proof={proof} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SelectiveDisclosureForm Component
// =============================================================================

interface SelectiveDisclosureFormProps {
  attestation: AttestationData;
  onGenerate: (indices: number[]) => void;
  loading?: boolean;
}

export function SelectiveDisclosureForm({
  attestation,
  onGenerate,
  loading = false,
}: SelectiveDisclosureFormProps) {
  const [fields, setFields] = useState<DisclosableField[]>(attestation.fields);

  const toggleField = useCallback((fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, revealed: !f.revealed } : f))
    );
  }, []);

  const revealedFields = useMemo(() => fields.filter((f) => f.revealed), [fields]);
  const canGenerate = revealedFields.length > 0;

  const handleGenerate = () => {
    const indices = revealedFields.map((f) => f.index);
    onGenerate(indices);
  };

  return (
    <div data-testid="selective-disclosure-form" className="space-y-4">
      <div className="border border-[var(--terminal-dim)] p-2 font-mono text-xs">
        <div className="text-[var(--terminal-dim)]">Attestation UID:</div>
        <div className="text-[var(--terminal-green)] truncate">{attestation.uid}</div>
      </div>

      <FieldDisclosureList fields={fields} onToggle={toggleField} />

      <DisclosureFieldPreview fields={revealedFields} />

      <button
        data-testid="generate-proof-button"
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        className={`w-full font-mono text-sm py-2 border ${
          !canGenerate || loading
            ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
            : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
        }`}
      >
        {loading ? 'Generating...' : 'Generate Disclosure Proof'}
      </button>
    </div>
  );
}

// =============================================================================
// SelectiveDisclosurePanel Component
// =============================================================================

interface SelectiveDisclosurePanelProps {
  attestation: AttestationData | null;
  loading?: boolean;
  generatedProof?: DisclosureProof | null;
  onGenerate?: (indices: number[]) => void;
  onShare?: () => void;
}

export function SelectiveDisclosurePanel({
  attestation,
  loading = false,
  generatedProof = null,
  onGenerate,
  onShare,
}: SelectiveDisclosurePanelProps) {
  const handleGenerate = (indices: number[]) => {
    if (onGenerate) {
      onGenerate(indices);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    }
  };

  if (loading) {
    return (
      <div data-testid="selective-disclosure-panel" className="max-w-xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">
            Loading attestation...
          </div>
        </div>
      </div>
    );
  }

  if (!attestation) {
    return (
      <div data-testid="selective-disclosure-panel" className="max-w-xl mx-auto p-4 font-mono">
        <div className="text-center py-8 text-[var(--terminal-dim)]">
          No attestation selected. Select an attestation to disclose.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="selective-disclosure-panel" className="max-w-xl mx-auto p-4 font-mono space-y-6">
      <div className="text-[var(--terminal-green)] font-bold text-lg border-b border-[var(--terminal-dim)] pb-2">
        Selective Disclosure
      </div>

      <SelectiveDisclosureForm
        attestation={attestation}
        onGenerate={handleGenerate}
        loading={loading}
      />

      {generatedProof && (
        <>
          <ProofQRCode proof={generatedProof} />
          <ProofShareButton proof={generatedProof} onShare={handleShare} />
        </>
      )}
    </div>
  );
}

// =============================================================================
// useSelectiveDisclosure Hook
// =============================================================================

interface UseSelectiveDisclosureReturn {
  fields: DisclosableField[];
  revealedCount: number;
  revealedIndices: number[];
  canGenerate: boolean;
  isGenerating: boolean;
  proof: DisclosureProof | null;
  toggleField: (fieldId: string) => void;
  revealAll: () => void;
  hideAll: () => void;
  generateProof: () => void;
  resetProof: () => void;
}

export function useSelectiveDisclosure(
  attestation: AttestationData | null
): UseSelectiveDisclosureReturn {
  const [fields, setFields] = useState<DisclosableField[]>(attestation?.fields ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<DisclosureProof | null>(null);

  const revealedCount = useMemo(() => fields.filter((f) => f.revealed).length, [fields]);

  const revealedIndices = useMemo(
    () => fields.filter((f) => f.revealed).map((f) => f.index),
    [fields]
  );

  const canGenerate = useMemo(() => revealedCount > 0, [revealedCount]);

  const toggleField = useCallback((fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, revealed: !f.revealed } : f))
    );
  }, []);

  const revealAll = useCallback(() => {
    setFields((prev) => prev.map((f) => ({ ...f, revealed: true })));
  }, []);

  const hideAll = useCallback(() => {
    setFields((prev) => prev.map((f) => ({ ...f, revealed: false })));
  }, []);

  const generateProof = useCallback(() => {
    if (!canGenerate || !attestation) return;
    setIsGenerating(true);
    // Simulate proof generation
    setTimeout(() => {
      const newProof: DisclosureProof = {
        id: `proof-${Date.now()}`,
        attestationUid: attestation.uid,
        merkleRoot: attestation.merkleRoot,
        revealedIndices,
        revealedValues: fields.filter((f) => f.revealed).map((f) => f.value),
        proof: revealedIndices.map((i) => `0xproof${i}`),
        createdAt: new Date().toISOString(),
      };
      setProof(newProof);
      setIsGenerating(false);
    }, 100);
  }, [canGenerate, attestation, revealedIndices, fields]);

  const resetProof = useCallback(() => {
    setProof(null);
  }, []);

  return {
    fields,
    revealedCount,
    revealedIndices,
    canGenerate,
    isGenerating,
    proof,
    toggleField,
    revealAll,
    hideAll,
    generateProof,
    resetProof,
  };
}
