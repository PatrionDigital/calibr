/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  VerificationInput,
  VerificationResult,
  VerificationStatus,
  VerifiedField,
} from '../../src/components/attestation-verification';
import {
  ProofInputField,
  MerkleRootDisplay,
  VerifyButton,
  VerificationStatusBadge,
  VerifiedFieldCard,
  VerifiedFieldList,
  VerificationResultCard,
  AttestationInfoCard,
  VerificationHistoryItem,
  VerificationHistoryList,
  AttestationVerificationForm,
  AttestationVerificationPanel,
  useAttestationVerification,
} from '../../src/components/attestation-verification';

// =============================================================================
// Test Data
// =============================================================================

const mockVerifiedFields: VerifiedField[] = [
  {
    index: 0,
    name: 'probability',
    label: 'Probability',
    value: '65%',
    verified: true,
  },
  {
    index: 1,
    name: 'confidence',
    label: 'Confidence',
    value: '80%',
    verified: true,
  },
];

const mockVerificationInput: VerificationInput = {
  attestationUid: '0x1234567890abcdef',
  merkleRoot: '0xabcdef1234567890',
  revealedIndices: [0, 1],
  revealedValues: ['65%', '80%'],
  proof: ['0xproof1', '0xproof2'],
};

const mockVerificationResult: VerificationResult = {
  id: 'verify-1',
  valid: true,
  attestationUid: '0x1234567890abcdef',
  merkleRoot: '0xabcdef1234567890',
  verifiedFields: mockVerifiedFields,
  verifiedAt: '2025-01-15T14:00:00Z',
  schema: 'ForecastAttestation',
  attester: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
};

const mockFailedResult: VerificationResult = {
  id: 'verify-2',
  valid: false,
  attestationUid: '0x1234567890abcdef',
  merkleRoot: '0xabcdef1234567890',
  verifiedFields: [],
  verifiedAt: '2025-01-15T14:30:00Z',
  error: 'Invalid Merkle proof',
};

// =============================================================================
// ProofInputField Tests
// =============================================================================

describe('ProofInputField', () => {
  it('renders input', () => {
    render(<ProofInputField value="" onChange={() => {}} />);
    expect(screen.getByTestId('proof-input-field')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<ProofInputField value="" onChange={() => {}} />);
    expect(screen.getByText(/proof|paste/i)).toBeInTheDocument();
  });

  it('shows current value', () => {
    render(<ProofInputField value="0x123" onChange={() => {}} />);
    const input = screen.getByTestId('proof-input-field');
    expect(input).toHaveValue('0x123');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<ProofInputField value="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('proof-input-field'), {
      target: { value: '0xnewproof' },
    });
    expect(onChange).toHaveBeenCalledWith('0xnewproof');
  });

  it('shows placeholder', () => {
    render(<ProofInputField value="" onChange={() => {}} />);
    const input = screen.getByTestId('proof-input-field') as HTMLTextAreaElement;
    expect(input.placeholder).toMatch(/paste.*proof|enter.*proof/i);
  });

  it('shows error state', () => {
    render(<ProofInputField value="" onChange={() => {}} error="Invalid format" />);
    expect(screen.getByText(/invalid format/i)).toBeInTheDocument();
  });
});

// =============================================================================
// MerkleRootDisplay Tests
// =============================================================================

describe('MerkleRootDisplay', () => {
  it('renders display', () => {
    render(<MerkleRootDisplay root="0xabcdef1234567890" />);
    expect(screen.getByTestId('merkle-root-display')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<MerkleRootDisplay root="0xabcdef1234567890" />);
    expect(screen.getByText(/merkle root/i)).toBeInTheDocument();
  });

  it('shows root value', () => {
    render(<MerkleRootDisplay root="0xabcdef1234567890" />);
    const display = screen.getByTestId('merkle-root-display');
    expect(display).toHaveTextContent(/0xabcdef/i);
  });

  it('shows verified indicator when verified', () => {
    render(<MerkleRootDisplay root="0xabcdef1234567890" verified={true} />);
    const display = screen.getByTestId('merkle-root-display');
    expect(display).toHaveTextContent(/verified|✓/i);
  });

  it('shows unverified indicator when not verified', () => {
    render(<MerkleRootDisplay root="0xabcdef1234567890" verified={false} />);
    const display = screen.getByTestId('merkle-root-display');
    expect(display).toHaveTextContent(/unverified|pending|✗/i);
  });
});

// =============================================================================
// VerifyButton Tests
// =============================================================================

describe('VerifyButton', () => {
  it('renders button', () => {
    render(<VerifyButton onClick={() => {}} />);
    expect(screen.getByTestId('verify-button')).toBeInTheDocument();
  });

  it('shows verify text', () => {
    render(<VerifyButton onClick={() => {}} />);
    expect(screen.getByText(/verify/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<VerifyButton onClick={onClick} />);
    fireEvent.click(screen.getByTestId('verify-button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<VerifyButton onClick={() => {}} disabled={true} />);
    expect(screen.getByTestId('verify-button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<VerifyButton onClick={() => {}} loading={true} />);
    expect(screen.getByText(/verifying/i)).toBeInTheDocument();
  });
});

// =============================================================================
// VerificationStatusBadge Tests
// =============================================================================

describe('VerificationStatusBadge', () => {
  it('renders badge', () => {
    render(<VerificationStatusBadge status="verified" />);
    expect(screen.getByTestId('verification-status-badge')).toBeInTheDocument();
  });

  it('shows verified status', () => {
    render(<VerificationStatusBadge status="verified" />);
    expect(screen.getByText(/verified|valid/i)).toBeInTheDocument();
  });

  it('shows invalid status', () => {
    render(<VerificationStatusBadge status="invalid" />);
    expect(screen.getByText(/invalid|failed/i)).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<VerificationStatusBadge status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('has green styling for verified', () => {
    render(<VerificationStatusBadge status="verified" />);
    const badge = screen.getByTestId('verification-status-badge');
    expect(badge.className).toMatch(/green/i);
  });

  it('has red styling for invalid', () => {
    render(<VerificationStatusBadge status="invalid" />);
    const badge = screen.getByTestId('verification-status-badge');
    expect(badge.className).toMatch(/red/i);
  });
});

// =============================================================================
// VerifiedFieldCard Tests
// =============================================================================

describe('VerifiedFieldCard', () => {
  it('renders card', () => {
    render(<VerifiedFieldCard field={mockVerifiedFields[0]!} />);
    expect(screen.getByTestId('verified-field-card')).toBeInTheDocument();
  });

  it('shows field label', () => {
    render(<VerifiedFieldCard field={mockVerifiedFields[0]!} />);
    expect(screen.getByText('Probability')).toBeInTheDocument();
  });

  it('shows field value', () => {
    render(<VerifiedFieldCard field={mockVerifiedFields[0]!} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('shows verified indicator', () => {
    render(<VerifiedFieldCard field={mockVerifiedFields[0]!} />);
    const card = screen.getByTestId('verified-field-card');
    expect(card).toHaveTextContent(/verified|✓/i);
  });

  it('shows index', () => {
    render(<VerifiedFieldCard field={mockVerifiedFields[0]!} />);
    const card = screen.getByTestId('verified-field-card');
    expect(card).toHaveTextContent(/0|index/i);
  });
});

// =============================================================================
// VerifiedFieldList Tests
// =============================================================================

describe('VerifiedFieldList', () => {
  it('renders list', () => {
    render(<VerifiedFieldList fields={mockVerifiedFields} />);
    expect(screen.getByTestId('verified-field-list')).toBeInTheDocument();
  });

  it('shows all fields', () => {
    render(<VerifiedFieldList fields={mockVerifiedFields} />);
    const cards = screen.getAllByTestId('verified-field-card');
    expect(cards.length).toBe(2);
  });

  it('shows header', () => {
    render(<VerifiedFieldList fields={mockVerifiedFields} />);
    expect(screen.getByText(/verified fields|revealed/i)).toBeInTheDocument();
  });

  it('shows empty state when no fields', () => {
    render(<VerifiedFieldList fields={[]} />);
    expect(screen.getByText(/no.*fields|empty/i)).toBeInTheDocument();
  });

  it('shows field count', () => {
    render(<VerifiedFieldList fields={mockVerifiedFields} />);
    const list = screen.getByTestId('verified-field-list');
    expect(list).toHaveTextContent(/2/);
  });
});

// =============================================================================
// VerificationResultCard Tests
// =============================================================================

describe('VerificationResultCard', () => {
  it('renders card', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('verification-result-card')).toBeInTheDocument();
  });

  it('shows success for valid result', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByText('Verification Successful')).toBeInTheDocument();
  });

  it('shows failure for invalid result', () => {
    render(<VerificationResultCard result={mockFailedResult} />);
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
  });

  it('shows error message for failed verification', () => {
    render(<VerificationResultCard result={mockFailedResult} />);
    expect(screen.getByText(/invalid merkle proof/i)).toBeInTheDocument();
  });

  it('shows verified fields for valid result', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('verified-field-list')).toBeInTheDocument();
  });

  it('shows verification time', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// AttestationInfoCard Tests
// =============================================================================

describe('AttestationInfoCard', () => {
  it('renders card', () => {
    render(
      <AttestationInfoCard
        uid="0x1234567890abcdef"
        schema="ForecastAttestation"
        attester="0x742d35cc6634c0532925a3b844bc454e4438f44e"
      />
    );
    expect(screen.getByTestId('attestation-info-card')).toBeInTheDocument();
  });

  it('shows UID', () => {
    render(
      <AttestationInfoCard
        uid="0x1234567890abcdef"
        schema="ForecastAttestation"
        attester="0x742d35cc6634c0532925a3b844bc454e4438f44e"
      />
    );
    const card = screen.getByTestId('attestation-info-card');
    expect(card).toHaveTextContent(/0x1234/i);
  });

  it('shows schema', () => {
    render(
      <AttestationInfoCard
        uid="0x1234567890abcdef"
        schema="ForecastAttestation"
        attester="0x742d35cc6634c0532925a3b844bc454e4438f44e"
      />
    );
    expect(screen.getByText(/forecastattestation/i)).toBeInTheDocument();
  });

  it('shows attester address', () => {
    render(
      <AttestationInfoCard
        uid="0x1234567890abcdef"
        schema="ForecastAttestation"
        attester="0x742d35cc6634c0532925a3b844bc454e4438f44e"
      />
    );
    const card = screen.getByTestId('attestation-info-card');
    expect(card).toHaveTextContent(/0x742d/i);
  });

  it('shows labels', () => {
    render(
      <AttestationInfoCard
        uid="0x1234567890abcdef"
        schema="ForecastAttestation"
        attester="0x742d35cc6634c0532925a3b844bc454e4438f44e"
      />
    );
    expect(screen.getByText('UID:')).toBeInTheDocument();
    expect(screen.getByText('Schema:')).toBeInTheDocument();
  });
});

// =============================================================================
// VerificationHistoryItem Tests
// =============================================================================

describe('VerificationHistoryItem', () => {
  it('renders item', () => {
    render(<VerificationHistoryItem result={mockVerificationResult} />);
    expect(screen.getByTestId('verification-history-item')).toBeInTheDocument();
  });

  it('shows result id', () => {
    render(<VerificationHistoryItem result={mockVerificationResult} />);
    const item = screen.getByTestId('verification-history-item');
    expect(item).toHaveTextContent(/verify-1/);
  });

  it('shows status', () => {
    render(<VerificationHistoryItem result={mockVerificationResult} />);
    expect(screen.getByTestId('verification-status-badge')).toBeInTheDocument();
  });

  it('shows date', () => {
    render(<VerificationHistoryItem result={mockVerificationResult} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('shows field count', () => {
    render(<VerificationHistoryItem result={mockVerificationResult} />);
    const item = screen.getByTestId('verification-history-item');
    expect(item).toHaveTextContent(/2.*field/i);
  });
});

// =============================================================================
// VerificationHistoryList Tests
// =============================================================================

describe('VerificationHistoryList', () => {
  it('renders list', () => {
    render(<VerificationHistoryList results={[mockVerificationResult]} />);
    expect(screen.getByTestId('verification-history-list')).toBeInTheDocument();
  });

  it('shows all results', () => {
    render(
      <VerificationHistoryList results={[mockVerificationResult, mockFailedResult]} />
    );
    const items = screen.getAllByTestId('verification-history-item');
    expect(items.length).toBe(2);
  });

  it('shows empty state', () => {
    render(<VerificationHistoryList results={[]} />);
    expect(screen.getByText(/no.*verification|no.*history/i)).toBeInTheDocument();
  });

  it('shows header', () => {
    render(<VerificationHistoryList results={[mockVerificationResult]} />);
    expect(screen.getByText(/history|past verification/i)).toBeInTheDocument();
  });
});

// =============================================================================
// AttestationVerificationForm Tests
// =============================================================================

describe('AttestationVerificationForm', () => {
  it('renders form', () => {
    render(<AttestationVerificationForm onVerify={() => {}} />);
    expect(screen.getByTestId('attestation-verification-form')).toBeInTheDocument();
  });

  it('shows proof input', () => {
    render(<AttestationVerificationForm onVerify={() => {}} />);
    expect(screen.getByTestId('proof-input-field')).toBeInTheDocument();
  });

  it('shows verify button', () => {
    render(<AttestationVerificationForm onVerify={() => {}} />);
    expect(screen.getByTestId('verify-button')).toBeInTheDocument();
  });

  it('disables button when no input', () => {
    render(<AttestationVerificationForm onVerify={() => {}} />);
    expect(screen.getByTestId('verify-button')).toBeDisabled();
  });

  it('calls onVerify with parsed input', () => {
    const onVerify = vi.fn();
    render(<AttestationVerificationForm onVerify={onVerify} initialInput={JSON.stringify(mockVerificationInput)} />);
    fireEvent.click(screen.getByTestId('verify-button'));
    expect(onVerify).toHaveBeenCalled();
  });

  it('disables button for invalid JSON', () => {
    render(<AttestationVerificationForm onVerify={() => {}} />);
    fireEvent.change(screen.getByTestId('proof-input-field'), {
      target: { value: 'not valid json' },
    });
    expect(screen.getByTestId('verify-button')).toBeDisabled();
  });
});

// =============================================================================
// AttestationVerificationPanel Tests
// =============================================================================

describe('AttestationVerificationPanel', () => {
  it('renders panel', () => {
    render(<AttestationVerificationPanel />);
    expect(screen.getByTestId('attestation-verification-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<AttestationVerificationPanel />);
    expect(screen.getByText(/verify.*attestation|attestation.*verification/i)).toBeInTheDocument();
  });

  it('shows form', () => {
    render(<AttestationVerificationPanel />);
    expect(screen.getByTestId('attestation-verification-form')).toBeInTheDocument();
  });

  it('shows result after verification', () => {
    render(<AttestationVerificationPanel result={mockVerificationResult} />);
    expect(screen.getByTestId('verification-result-card')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<AttestationVerificationPanel loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows attestation info when result available', () => {
    render(<AttestationVerificationPanel result={mockVerificationResult} />);
    expect(screen.getByTestId('attestation-info-card')).toBeInTheDocument();
  });
});

// =============================================================================
// useAttestationVerification Hook Tests
// =============================================================================

describe('useAttestationVerification', () => {
  function TestComponent() {
    const {
      input,
      parsedInput,
      result,
      isVerifying,
      error,
      isValid,
      setInput,
      verify,
      reset,
    } = useAttestationVerification();

    return (
      <div>
        <span data-testid="input">{input}</span>
        <span data-testid="has-parsed">{parsedInput ? 'yes' : 'no'}</span>
        <span data-testid="has-result">{result ? 'yes' : 'no'}</span>
        <span data-testid="is-verifying">{isVerifying ? 'yes' : 'no'}</span>
        <span data-testid="has-error">{error ? 'yes' : 'no'}</span>
        <span data-testid="is-valid">{isValid ? 'yes' : 'no'}</span>
        <button
          data-testid="set-input"
          onClick={() => setInput(JSON.stringify(mockVerificationInput))}
        >
          Set Input
        </button>
        <button data-testid="verify" onClick={verify}>
          Verify
        </button>
        <button data-testid="reset" onClick={reset}>
          Reset
        </button>
      </div>
    );
  }

  it('initializes with empty input', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('input')).toHaveTextContent('');
  });

  it('parses valid JSON input', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-input'));
    expect(screen.getByTestId('has-parsed')).toHaveTextContent('yes');
  });

  it('shows valid for parseable input', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-input'));
    expect(screen.getByTestId('is-valid')).toHaveTextContent('yes');
  });

  it('resets state', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-input'));
    fireEvent.click(screen.getByTestId('reset'));
    expect(screen.getByTestId('input')).toHaveTextContent('');
  });

  it('tracks verifying state', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('is-verifying')).toHaveTextContent('no');
  });

  it('has no result initially', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('has-result')).toHaveTextContent('no');
  });

  it('has no error initially', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('has-error')).toHaveTextContent('no');
  });
});
