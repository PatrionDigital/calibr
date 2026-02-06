/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  DisclosableField,
  DisclosureRequest,
  DisclosureProof,
  AttestationData,
} from '../../src/components/selective-disclosure';
import {
  FieldDisclosureToggle,
  FieldDisclosureList,
  DisclosureFieldPreview,
  ProofGenerationStatus,
  ProofShareButton,
  ProofQRCode,
  DisclosureRequestCard,
  DisclosureHistoryItem,
  DisclosureHistoryList,
  SelectiveDisclosureForm,
  SelectiveDisclosurePanel,
  useSelectiveDisclosure,
} from '../../src/components/selective-disclosure';

// =============================================================================
// Test Data
// =============================================================================

const mockFields: DisclosableField[] = [
  {
    id: 'field-1',
    name: 'probability',
    label: 'Probability',
    value: '65%',
    revealed: false,
    index: 0,
  },
  {
    id: 'field-2',
    name: 'confidence',
    label: 'Confidence',
    value: '80%',
    revealed: false,
    index: 1,
  },
  {
    id: 'field-3',
    name: 'reasoning',
    label: 'Reasoning',
    value: 'Based on historical trends...',
    revealed: true,
    index: 2,
  },
  {
    id: 'field-4',
    name: 'timestamp',
    label: 'Created At',
    value: '2025-01-15T10:00:00Z',
    revealed: false,
    index: 3,
  },
];

const mockAttestation: AttestationData = {
  uid: '0x1234567890abcdef',
  merkleRoot: '0xabcdef1234567890',
  schema: 'ForecastAttestation',
  createdAt: '2025-01-15T10:00:00Z',
  fields: mockFields,
};

const mockDisclosureRequest: DisclosureRequest = {
  id: 'req-1',
  requester: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
  requesterLabel: 'Polymarket Verifier',
  requestedFields: ['probability', 'confidence'],
  message: 'Verification for leaderboard entry',
  createdAt: '2025-01-15T12:00:00Z',
  status: 'pending',
};

const mockProof: DisclosureProof = {
  id: 'proof-1',
  attestationUid: '0x1234567890abcdef',
  merkleRoot: '0xabcdef1234567890',
  revealedIndices: [0, 1],
  revealedValues: ['65%', '80%'],
  proof: ['0xproof1', '0xproof2'],
  createdAt: '2025-01-15T12:30:00Z',
};

// =============================================================================
// FieldDisclosureToggle Tests
// =============================================================================

describe('FieldDisclosureToggle', () => {
  it('renders toggle', () => {
    render(<FieldDisclosureToggle field={mockFields[0]!} onToggle={() => {}} />);
    expect(screen.getByTestId('field-disclosure-toggle')).toBeInTheDocument();
  });

  it('shows field label', () => {
    render(<FieldDisclosureToggle field={mockFields[0]!} onToggle={() => {}} />);
    expect(screen.getByText('Probability')).toBeInTheDocument();
  });

  it('shows field value when revealed', () => {
    render(<FieldDisclosureToggle field={mockFields[2]!} onToggle={() => {}} />);
    const toggle = screen.getByTestId('field-disclosure-toggle');
    expect(toggle).toHaveTextContent(/based on historical/i);
  });

  it('hides value when not revealed', () => {
    render(<FieldDisclosureToggle field={mockFields[0]!} onToggle={() => {}} />);
    const toggle = screen.getByTestId('field-disclosure-toggle');
    expect(toggle).toHaveTextContent(/hidden|\*\*\*/i);
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<FieldDisclosureToggle field={mockFields[0]!} onToggle={onToggle} />);
    fireEvent.click(screen.getByTestId('field-disclosure-toggle'));
    expect(onToggle).toHaveBeenCalledWith('field-1');
  });

  it('shows revealed state styling', () => {
    render(<FieldDisclosureToggle field={mockFields[2]!} onToggle={() => {}} />);
    const toggle = screen.getByTestId('field-disclosure-toggle');
    expect(toggle.className).toMatch(/green|revealed|active/i);
  });
});

// =============================================================================
// FieldDisclosureList Tests
// =============================================================================

describe('FieldDisclosureList', () => {
  it('renders list', () => {
    render(<FieldDisclosureList fields={mockFields} onToggle={() => {}} />);
    expect(screen.getByTestId('field-disclosure-list')).toBeInTheDocument();
  });

  it('shows all fields', () => {
    render(<FieldDisclosureList fields={mockFields} onToggle={() => {}} />);
    const toggles = screen.getAllByTestId('field-disclosure-toggle');
    expect(toggles.length).toBe(4);
  });

  it('shows header', () => {
    render(<FieldDisclosureList fields={mockFields} onToggle={() => {}} />);
    expect(screen.getByText(/fields|select|disclosure/i)).toBeInTheDocument();
  });

  it('shows count of revealed fields', () => {
    render(<FieldDisclosureList fields={mockFields} onToggle={() => {}} />);
    const list = screen.getByTestId('field-disclosure-list');
    expect(list).toHaveTextContent(/1.*revealed|1.*selected/i);
  });

  it('calls onToggle with correct field id', () => {
    const onToggle = vi.fn();
    render(<FieldDisclosureList fields={mockFields} onToggle={onToggle} />);
    const toggles = screen.getAllByTestId('field-disclosure-toggle');
    fireEvent.click(toggles[1]!);
    expect(onToggle).toHaveBeenCalledWith('field-2');
  });
});

// =============================================================================
// DisclosureFieldPreview Tests
// =============================================================================

describe('DisclosureFieldPreview', () => {
  it('renders preview', () => {
    render(<DisclosureFieldPreview fields={mockFields.filter((f) => f.revealed)} />);
    expect(screen.getByTestId('disclosure-field-preview')).toBeInTheDocument();
  });

  it('shows preview title', () => {
    render(<DisclosureFieldPreview fields={mockFields.filter((f) => f.revealed)} />);
    expect(screen.getByText(/preview|will be revealed/i)).toBeInTheDocument();
  });

  it('shows only revealed fields', () => {
    render(<DisclosureFieldPreview fields={mockFields.filter((f) => f.revealed)} />);
    expect(screen.getByText('Reasoning:')).toBeInTheDocument();
    expect(screen.queryByText('Probability:')).not.toBeInTheDocument();
  });

  it('shows empty state when no fields revealed', () => {
    render(<DisclosureFieldPreview fields={[]} />);
    expect(screen.getByText(/no fields|select fields/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ProofGenerationStatus Tests
// =============================================================================

describe('ProofGenerationStatus', () => {
  it('renders status', () => {
    render(<ProofGenerationStatus status="idle" />);
    expect(screen.getByTestId('proof-generation-status')).toBeInTheDocument();
  });

  it('shows idle state', () => {
    render(<ProofGenerationStatus status="idle" />);
    expect(screen.getByText(/ready|select fields/i)).toBeInTheDocument();
  });

  it('shows generating state', () => {
    render(<ProofGenerationStatus status="generating" />);
    expect(screen.getByText(/generating|creating/i)).toBeInTheDocument();
  });

  it('shows success state', () => {
    render(<ProofGenerationStatus status="success" />);
    expect(screen.getByText(/success|generated|ready/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<ProofGenerationStatus status="error" error="Failed to generate proof" />);
    expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
  });

  it('shows spinner when generating', () => {
    render(<ProofGenerationStatus status="generating" />);
    const status = screen.getByTestId('proof-generation-status');
    expect(status).toHaveTextContent(/\.\.\.|generating/i);
  });
});

// =============================================================================
// ProofShareButton Tests
// =============================================================================

describe('ProofShareButton', () => {
  it('renders button', () => {
    render(<ProofShareButton proof={mockProof} onShare={() => {}} />);
    expect(screen.getByTestId('proof-share-button')).toBeInTheDocument();
  });

  it('shows share text', () => {
    render(<ProofShareButton proof={mockProof} onShare={() => {}} />);
    expect(screen.getByText(/share|copy/i)).toBeInTheDocument();
  });

  it('calls onShare when clicked', () => {
    const onShare = vi.fn();
    render(<ProofShareButton proof={mockProof} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('proof-share-button'));
    expect(onShare).toHaveBeenCalled();
  });

  it('is disabled when no proof', () => {
    render(<ProofShareButton proof={null} onShare={() => {}} />);
    expect(screen.getByTestId('proof-share-button')).toBeDisabled();
  });

  it('shows copied state after click', () => {
    render(<ProofShareButton proof={mockProof} onShare={() => {}} />);
    fireEvent.click(screen.getByTestId('proof-share-button'));
    expect(screen.getByText(/copied|shared/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ProofQRCode Tests
// =============================================================================

describe('ProofQRCode', () => {
  it('renders QR container', () => {
    render(<ProofQRCode proof={mockProof} />);
    expect(screen.getByTestId('proof-qr-code')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<ProofQRCode proof={mockProof} />);
    expect(screen.getByText('Scan QR to Verify')).toBeInTheDocument();
  });

  it('shows placeholder when no proof', () => {
    render(<ProofQRCode proof={null} />);
    expect(screen.getByText(/generate.*first|no proof/i)).toBeInTheDocument();
  });

  it('shows proof id', () => {
    render(<ProofQRCode proof={mockProof} />);
    const qr = screen.getByTestId('proof-qr-code');
    expect(qr).toHaveTextContent(/proof-1/);
  });
});

// =============================================================================
// DisclosureRequestCard Tests
// =============================================================================

describe('DisclosureRequestCard', () => {
  it('renders card', () => {
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={() => {}} onDeny={() => {}} />);
    expect(screen.getByTestId('disclosure-request-card')).toBeInTheDocument();
  });

  it('shows requester', () => {
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={() => {}} onDeny={() => {}} />);
    expect(screen.getByText(/polymarket verifier/i)).toBeInTheDocument();
  });

  it('shows requested fields', () => {
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={() => {}} onDeny={() => {}} />);
    const card = screen.getByTestId('disclosure-request-card');
    expect(card).toHaveTextContent(/probability/i);
    expect(card).toHaveTextContent(/confidence/i);
  });

  it('shows message', () => {
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={() => {}} onDeny={() => {}} />);
    expect(screen.getByText(/verification for leaderboard/i)).toBeInTheDocument();
  });

  it('calls onApprove when approve clicked', () => {
    const onApprove = vi.fn();
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={onApprove} onDeny={() => {}} />);
    fireEvent.click(screen.getByTestId('approve-request-button'));
    expect(onApprove).toHaveBeenCalledWith('req-1');
  });

  it('calls onDeny when deny clicked', () => {
    const onDeny = vi.fn();
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={() => {}} onDeny={onDeny} />);
    fireEvent.click(screen.getByTestId('deny-request-button'));
    expect(onDeny).toHaveBeenCalledWith('req-1');
  });

  it('shows pending status', () => {
    render(<DisclosureRequestCard request={mockDisclosureRequest} onApprove={() => {}} onDeny={() => {}} />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});

// =============================================================================
// DisclosureHistoryItem Tests
// =============================================================================

describe('DisclosureHistoryItem', () => {
  it('renders item', () => {
    render(<DisclosureHistoryItem proof={mockProof} />);
    expect(screen.getByTestId('disclosure-history-item')).toBeInTheDocument();
  });

  it('shows proof id', () => {
    render(<DisclosureHistoryItem proof={mockProof} />);
    const item = screen.getByTestId('disclosure-history-item');
    expect(item).toHaveTextContent(/proof-1/);
  });

  it('shows revealed field count', () => {
    render(<DisclosureHistoryItem proof={mockProof} />);
    const item = screen.getByTestId('disclosure-history-item');
    expect(item).toHaveTextContent(/2.*field/i);
  });

  it('shows date', () => {
    render(<DisclosureHistoryItem proof={mockProof} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// DisclosureHistoryList Tests
// =============================================================================

describe('DisclosureHistoryList', () => {
  it('renders list', () => {
    render(<DisclosureHistoryList proofs={[mockProof]} />);
    expect(screen.getByTestId('disclosure-history-list')).toBeInTheDocument();
  });

  it('shows all proofs', () => {
    render(<DisclosureHistoryList proofs={[mockProof, { ...mockProof, id: 'proof-2' }]} />);
    const items = screen.getAllByTestId('disclosure-history-item');
    expect(items.length).toBe(2);
  });

  it('shows empty state', () => {
    render(<DisclosureHistoryList proofs={[]} />);
    expect(screen.getByText(/no.*disclosure|no.*history/i)).toBeInTheDocument();
  });

  it('shows header', () => {
    render(<DisclosureHistoryList proofs={[mockProof]} />);
    expect(screen.getByText(/history|past disclosure/i)).toBeInTheDocument();
  });
});

// =============================================================================
// SelectiveDisclosureForm Tests
// =============================================================================

describe('SelectiveDisclosureForm', () => {
  it('renders form', () => {
    render(<SelectiveDisclosureForm attestation={mockAttestation} onGenerate={() => {}} />);
    expect(screen.getByTestId('selective-disclosure-form')).toBeInTheDocument();
  });

  it('shows field list', () => {
    render(<SelectiveDisclosureForm attestation={mockAttestation} onGenerate={() => {}} />);
    expect(screen.getByTestId('field-disclosure-list')).toBeInTheDocument();
  });

  it('shows preview', () => {
    render(<SelectiveDisclosureForm attestation={mockAttestation} onGenerate={() => {}} />);
    expect(screen.getByTestId('disclosure-field-preview')).toBeInTheDocument();
  });

  it('shows generate button', () => {
    render(<SelectiveDisclosureForm attestation={mockAttestation} onGenerate={() => {}} />);
    expect(screen.getByTestId('generate-proof-button')).toBeInTheDocument();
  });

  it('disables generate when no fields selected', () => {
    const attestationNoRevealed = {
      ...mockAttestation,
      fields: mockFields.map((f) => ({ ...f, revealed: false })),
    };
    render(<SelectiveDisclosureForm attestation={attestationNoRevealed} onGenerate={() => {}} />);
    expect(screen.getByTestId('generate-proof-button')).toBeDisabled();
  });

  it('calls onGenerate with selected indices', () => {
    const onGenerate = vi.fn();
    render(<SelectiveDisclosureForm attestation={mockAttestation} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByTestId('generate-proof-button'));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('shows attestation info', () => {
    render(<SelectiveDisclosureForm attestation={mockAttestation} onGenerate={() => {}} />);
    const form = screen.getByTestId('selective-disclosure-form');
    expect(form).toHaveTextContent(/0x1234/i);
  });
});

// =============================================================================
// SelectiveDisclosurePanel Tests
// =============================================================================

describe('SelectiveDisclosurePanel', () => {
  it('renders panel', () => {
    render(<SelectiveDisclosurePanel attestation={mockAttestation} />);
    expect(screen.getByTestId('selective-disclosure-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<SelectiveDisclosurePanel attestation={mockAttestation} />);
    expect(screen.getByText(/selective disclosure/i)).toBeInTheDocument();
  });

  it('shows form', () => {
    render(<SelectiveDisclosurePanel attestation={mockAttestation} />);
    expect(screen.getByTestId('selective-disclosure-form')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<SelectiveDisclosurePanel attestation={null} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows empty state when no attestation', () => {
    render(<SelectiveDisclosurePanel attestation={null} />);
    expect(screen.getByText(/no attestation|select.*attestation/i)).toBeInTheDocument();
  });

  it('shows proof after generation', () => {
    render(<SelectiveDisclosurePanel attestation={mockAttestation} generatedProof={mockProof} />);
    expect(screen.getByTestId('proof-share-button')).toBeInTheDocument();
  });

  it('shows QR code when proof generated', () => {
    render(<SelectiveDisclosurePanel attestation={mockAttestation} generatedProof={mockProof} />);
    expect(screen.getByTestId('proof-qr-code')).toBeInTheDocument();
  });
});

// =============================================================================
// useSelectiveDisclosure Hook Tests
// =============================================================================

describe('useSelectiveDisclosure', () => {
  function TestComponent({ attestation }: { attestation: AttestationData | null }) {
    const {
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
    } = useSelectiveDisclosure(attestation);

    return (
      <div>
        <span data-testid="revealed-count">{revealedCount}</span>
        <span data-testid="revealed-indices">{revealedIndices.join(',')}</span>
        <span data-testid="can-generate">{canGenerate ? 'yes' : 'no'}</span>
        <span data-testid="is-generating">{isGenerating ? 'yes' : 'no'}</span>
        <span data-testid="has-proof">{proof ? 'yes' : 'no'}</span>
        <span data-testid="field-count">{fields.length}</span>
        <button data-testid="toggle-first" onClick={() => fields[0] && toggleField(fields[0].id)}>
          Toggle First
        </button>
        <button data-testid="reveal-all" onClick={revealAll}>
          Reveal All
        </button>
        <button data-testid="hide-all" onClick={hideAll}>
          Hide All
        </button>
        <button data-testid="generate" onClick={generateProof}>
          Generate
        </button>
        <button data-testid="reset" onClick={resetProof}>
          Reset
        </button>
      </div>
    );
  }

  it('initializes with attestation fields', () => {
    render(<TestComponent attestation={mockAttestation} />);
    expect(screen.getByTestId('field-count')).toHaveTextContent('4');
  });

  it('counts revealed fields', () => {
    render(<TestComponent attestation={mockAttestation} />);
    expect(screen.getByTestId('revealed-count')).toHaveTextContent('1');
  });

  it('tracks revealed indices', () => {
    render(<TestComponent attestation={mockAttestation} />);
    expect(screen.getByTestId('revealed-indices')).toHaveTextContent('2');
  });

  it('toggles field reveal', () => {
    render(<TestComponent attestation={mockAttestation} />);
    fireEvent.click(screen.getByTestId('toggle-first'));
    expect(screen.getByTestId('revealed-count')).toHaveTextContent('2');
  });

  it('reveals all fields', () => {
    render(<TestComponent attestation={mockAttestation} />);
    fireEvent.click(screen.getByTestId('reveal-all'));
    expect(screen.getByTestId('revealed-count')).toHaveTextContent('4');
  });

  it('hides all fields', () => {
    render(<TestComponent attestation={mockAttestation} />);
    fireEvent.click(screen.getByTestId('hide-all'));
    expect(screen.getByTestId('revealed-count')).toHaveTextContent('0');
  });

  it('can generate when fields revealed', () => {
    render(<TestComponent attestation={mockAttestation} />);
    expect(screen.getByTestId('can-generate')).toHaveTextContent('yes');
  });

  it('cannot generate when no fields revealed', () => {
    render(<TestComponent attestation={mockAttestation} />);
    fireEvent.click(screen.getByTestId('hide-all'));
    expect(screen.getByTestId('can-generate')).toHaveTextContent('no');
  });

  it('handles null attestation', () => {
    render(<TestComponent attestation={null} />);
    expect(screen.getByTestId('field-count')).toHaveTextContent('0');
  });

  it('resets proof state', () => {
    render(<TestComponent attestation={mockAttestation} />);
    fireEvent.click(screen.getByTestId('reset'));
    expect(screen.getByTestId('has-proof')).toHaveTextContent('no');
  });
});
