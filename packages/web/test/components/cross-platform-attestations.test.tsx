'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  AttestationExport,
  PlatformSelector,
  AttestationPreview,
  ShareStatus,
  VerificationLink,
  AttestationBadge,
  ExportHistory,
  CrossPlatformHub,
  useAttestationExport,
  type EASPlatform,
  type AttestationData,
  type ExportRecord,
} from '@/components/cross-platform-attestations';

// =============================================================================
// Test Data
// =============================================================================

const mockPlatforms: EASPlatform[] = [
  {
    id: 'base',
    name: 'Base',
    chain: 'Base',
    chainId: 8453,
    easAddress: '0x4200000000000000000000000000000000000021',
    explorerUrl: 'https://base.easscan.org',
    icon: '🔵',
    supported: true,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chain: 'Optimism',
    chainId: 10,
    easAddress: '0x4200000000000000000000000000000000000021',
    explorerUrl: 'https://optimism.easscan.org',
    icon: '🔴',
    supported: true,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    chain: 'Ethereum',
    chainId: 1,
    easAddress: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',
    explorerUrl: 'https://easscan.org',
    icon: '⟠',
    supported: true,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chain: 'Arbitrum',
    chainId: 42161,
    easAddress: '0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458',
    explorerUrl: 'https://arbitrum.easscan.org',
    icon: '🔷',
    supported: false,
  },
];

const mockAttestation: AttestationData = {
  uid: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  schema: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
  schemaName: 'CalibrAchievement',
  attester: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
  timestamp: Date.now() - 86400000,
  data: {
    achievementId: 'first-prediction',
    achievementName: 'First Prediction',
    tier: 'JOURNEYMAN',
    score: 85,
  },
  revocable: false,
  revoked: false,
};

const mockExportHistory: ExportRecord[] = [
  {
    id: 'export-1',
    attestationUid: mockAttestation.uid,
    targetPlatform: 'optimism',
    status: 'completed',
    txHash: '0xabc123',
    exportedAt: Date.now() - 3600000,
    newUid: '0xnewuid123',
  },
  {
    id: 'export-2',
    attestationUid: mockAttestation.uid,
    targetPlatform: 'ethereum',
    status: 'pending',
    exportedAt: Date.now() - 1800000,
  },
  {
    id: 'export-3',
    attestationUid: '0xother',
    targetPlatform: 'base',
    status: 'failed',
    error: 'Insufficient gas',
    exportedAt: Date.now() - 7200000,
  },
];

// =============================================================================
// AttestationExport Tests
// =============================================================================

describe('AttestationExport', () => {
  it('should render export button', () => {
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} />);
    expect(screen.getByTestId('attestation-export')).toBeInTheDocument();
  });

  it('should display attestation name', () => {
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} />);
    expect(screen.getByText('First Prediction')).toBeInTheDocument();
  });

  it('should show platform selector when export clicked', () => {
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByTestId('platform-selector')).toBeInTheDocument();
  });

  it('should call onExport when platform selected', async () => {
    const onExport = vi.fn();
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Optimism'));
    expect(onExport).toHaveBeenCalledWith(mockAttestation.uid, 'optimism');
  });

  it('should show loading state during export', () => {
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} isExporting />);
    expect(screen.getByTestId('export-loading')).toBeInTheDocument();
  });

  it('should disable export button when already exported to all platforms', () => {
    const exportedTo = ['optimism', 'ethereum', 'base'];
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} exportedTo={exportedTo} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('should show badge count of available platforms', () => {
    render(<AttestationExport attestation={mockAttestation} platforms={mockPlatforms} />);
    const supportedCount = mockPlatforms.filter(p => p.supported).length;
    expect(screen.getByTestId('export-platform-count')).toHaveTextContent(String(supportedCount));
  });
});

// =============================================================================
// PlatformSelector Tests
// =============================================================================

describe('PlatformSelector', () => {
  it('should render all supported platforms', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} />);
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Optimism')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} />);
    expect(screen.getByTestId('platform-selector')).toBeInTheDocument();
  });

  it('should show platform icons', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} />);
    expect(screen.getByText('🔵')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('should disable unsupported platforms', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} />);
    const arbitrumButton = screen.getByTestId('platform-arbitrum');
    expect(arbitrumButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should mark already exported platforms', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} exportedTo={['optimism']} />);
    expect(screen.getByTestId('platform-optimism-exported')).toBeInTheDocument();
  });

  it('should call onSelect with platform id', () => {
    const onSelect = vi.fn();
    render(<PlatformSelector platforms={mockPlatforms} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Base'));
    expect(onSelect).toHaveBeenCalledWith('base');
  });

  it('should not call onSelect for unsupported platforms', () => {
    const onSelect = vi.fn();
    render(<PlatformSelector platforms={mockPlatforms} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('platform-arbitrum'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should show chain ID for each platform', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} showChainId />);
    expect(screen.getByText(/8453/)).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('should highlight selected platform', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} selectedPlatform="base" />);
    const baseButton = screen.getByTestId('platform-base');
    expect(baseButton).toHaveClass('border-blue-400');
  });
});

// =============================================================================
// AttestationPreview Tests
// =============================================================================

describe('AttestationPreview', () => {
  it('should render attestation UID', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByText(/0x1234/)).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByTestId('attestation-preview')).toBeInTheDocument();
  });

  it('should display schema name', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByText('CalibrAchievement')).toBeInTheDocument();
  });

  it('should show attestation data fields', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByText(/first-prediction/i)).toBeInTheDocument();
    expect(screen.getByText(/JOURNEYMAN/)).toBeInTheDocument();
  });

  it('should display timestamp', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByTestId('attestation-timestamp')).toBeInTheDocument();
  });

  it('should show revocable status', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByText(/non-revocable/i)).toBeInTheDocument();
  });

  it('should show revoked warning if revoked', () => {
    const revokedAttestation = { ...mockAttestation, revoked: true };
    render(<AttestationPreview attestation={revokedAttestation} />);
    expect(screen.getByTestId('revoked-warning')).toBeInTheDocument();
  });

  it('should truncate long UID', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    const uidElement = screen.getByTestId('attestation-uid');
    expect(uidElement.textContent!.length).toBeLessThan(mockAttestation.uid.length);
  });

  it('should show copy button for UID', () => {
    render(<AttestationPreview attestation={mockAttestation} />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
});

// =============================================================================
// ShareStatus Tests
// =============================================================================

describe('ShareStatus', () => {
  it('should show pending status', () => {
    render(<ShareStatus status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('should show completed status', () => {
    render(<ShareStatus status="completed" txHash="0xabc123" />);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('should show failed status with error', () => {
    render(<ShareStatus status="failed" error="Network error" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<ShareStatus status="pending" />);
    expect(screen.getByTestId('share-status')).toBeInTheDocument();
  });

  it('should show transaction hash link when completed', () => {
    render(<ShareStatus status="completed" txHash="0xabc123" explorerUrl="https://etherscan.io" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('0xabc123'));
  });

  it('should apply status-specific styling', () => {
    render(<ShareStatus status="completed" />);
    const statusElement = screen.getByTestId('share-status');
    expect(statusElement).toHaveClass('text-green-400');
  });

  it('should show spinner for pending status', () => {
    render(<ShareStatus status="pending" />);
    expect(screen.getByTestId('status-spinner')).toBeInTheDocument();
  });

  it('should show retry button for failed status', () => {
    const onRetry = vi.fn();
    render(<ShareStatus status="failed" error="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});

// =============================================================================
// VerificationLink Tests
// =============================================================================

describe('VerificationLink', () => {
  it('should render verification link', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('should have test id', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByTestId('verification-link')).toBeInTheDocument();
  });

  it('should link to platform explorer', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('base.easscan.org'));
  });

  it('should include attestation UID in link', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining(mockAttestation.uid));
  });

  it('should open in new tab', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  it('should display platform name', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByText(/base/i)).toBeInTheDocument();
  });

  it('should show copy button', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('should call onCopy when copy clicked', async () => {
    const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// AttestationBadge Tests
// =============================================================================

describe('AttestationBadge', () => {
  it('should render badge', () => {
    render(<AttestationBadge attestation={mockAttestation} />);
    expect(screen.getByTestId('attestation-badge')).toBeInTheDocument();
  });

  it('should display achievement name', () => {
    render(<AttestationBadge attestation={mockAttestation} />);
    expect(screen.getByText('First Prediction')).toBeInTheDocument();
  });

  it('should show tier styling', () => {
    render(<AttestationBadge attestation={mockAttestation} />);
    const badge = screen.getByTestId('attestation-badge');
    expect(badge).toHaveClass('border-blue-400/30');
  });

  it('should display verification icon', () => {
    render(<AttestationBadge attestation={mockAttestation} verified />);
    expect(screen.getByTestId('verified-icon')).toBeInTheDocument();
  });

  it('should show export count', () => {
    render(<AttestationBadge attestation={mockAttestation} exportCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should be clickable when onClick provided', () => {
    const onClick = vi.fn();
    render(<AttestationBadge attestation={mockAttestation} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('attestation-badge'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should show compact mode', () => {
    render(<AttestationBadge attestation={mockAttestation} compact />);
    const badge = screen.getByTestId('attestation-badge');
    expect(badge).toHaveClass('p-2');
  });
});

// =============================================================================
// ExportHistory Tests
// =============================================================================

describe('ExportHistory', () => {
  it('should render export history', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} />);
    expect(screen.getByTestId('export-history')).toBeInTheDocument();
  });

  it('should show header', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} />);
    expect(screen.getByText(/export history/i)).toBeInTheDocument();
  });

  it('should display all export records', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} />);
    expect(screen.getAllByTestId(/export-record/)).toHaveLength(mockExportHistory.length);
  });

  it('should show platform name for each record', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} />);
    expect(screen.getByText('Optimism')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
  });

  it('should show status for each record', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} />);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('should show empty state when no records', () => {
    render(<ExportHistory records={[]} platforms={mockPlatforms} />);
    expect(screen.getByText(/no exports/i)).toBeInTheDocument();
  });

  it('should show timestamp for each record', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} />);
    expect(screen.getAllByTestId(/export-timestamp/)).toHaveLength(mockExportHistory.length);
  });

  it('should filter by status when filter provided', () => {
    render(<ExportHistory records={mockExportHistory} platforms={mockPlatforms} filterStatus="completed" />);
    expect(screen.getAllByTestId(/export-record/)).toHaveLength(1);
  });
});

// =============================================================================
// CrossPlatformHub Tests
// =============================================================================

describe('CrossPlatformHub', () => {
  it('should render hub', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    expect(screen.getByTestId('cross-platform-hub')).toBeInTheDocument();
  });

  it('should show hub title', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    expect(screen.getByText(/cross-platform/i)).toBeInTheDocument();
  });

  it('should display attestation count', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    expect(screen.getByTestId('attestation-count')).toHaveTextContent('1');
  });

  it('should display platform count', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    const supportedCount = mockPlatforms.filter(p => p.supported).length;
    expect(screen.getByTestId('platform-count')).toHaveTextContent(String(supportedCount));
  });

  it('should render attestation list', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    expect(screen.getByText('First Prediction')).toBeInTheDocument();
  });

  it('should render export history section', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    expect(screen.getByTestId('export-history')).toBeInTheDocument();
  });

  it('should call onExport when attestation exported', () => {
    const onExport = vi.fn();
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={[]}
        onExport={onExport}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Base'));
    expect(onExport).toHaveBeenCalled();
  });

  it('should show summary stats', () => {
    render(
      <CrossPlatformHub
        attestations={[mockAttestation]}
        platforms={mockPlatforms}
        exportHistory={mockExportHistory}
      />
    );
    expect(screen.getByTestId('export-stats')).toBeInTheDocument();
  });
});

// =============================================================================
// useAttestationExport Hook Tests
// =============================================================================

function TestHookComponent({
  attestations,
  platforms,
}: {
  attestations: AttestationData[];
  platforms: EASPlatform[];
}) {
  const {
    exportAttestation,
    isExporting,
    getExportedPlatforms,
    supportedPlatforms,
  } = useAttestationExport(attestations, platforms);

  return (
    <div>
      <span data-testid="is-exporting">{isExporting ? 'yes' : 'no'}</span>
      <span data-testid="supported-count">{supportedPlatforms.length}</span>
      <span data-testid="exported-platforms">
        {getExportedPlatforms(attestations[0]?.uid ?? '').join(',')}
      </span>
      <button onClick={() => exportAttestation(attestations[0]?.uid ?? '', 'optimism')}>
        Export
      </button>
    </div>
  );
}

describe('useAttestationExport', () => {
  it('should return supported platforms', () => {
    render(<TestHookComponent attestations={[mockAttestation]} platforms={mockPlatforms} />);
    const supportedCount = mockPlatforms.filter(p => p.supported).length;
    expect(screen.getByTestId('supported-count')).toHaveTextContent(String(supportedCount));
  });

  it('should track exporting state', () => {
    render(<TestHookComponent attestations={[mockAttestation]} platforms={mockPlatforms} />);
    expect(screen.getByTestId('is-exporting')).toHaveTextContent('no');
  });

  it('should get exported platforms for attestation', () => {
    render(<TestHookComponent attestations={[mockAttestation]} platforms={mockPlatforms} />);
    expect(screen.getByTestId('exported-platforms')).toBeInTheDocument();
  });

  it('should call exportAttestation', () => {
    render(<TestHookComponent attestations={[mockAttestation]} platforms={mockPlatforms} />);
    fireEvent.click(screen.getByRole('button'));
    // Hook should handle the export
    expect(screen.getByTestId('is-exporting')).toBeInTheDocument();
  });
});

// =============================================================================
// Platform Styling Tests
// =============================================================================

describe('Platform Styling', () => {
  it.each(mockPlatforms.filter(p => p.supported))(
    'should render $name platform correctly',
    (platform) => {
      render(<PlatformSelector platforms={[platform]} onSelect={vi.fn()} />);
      expect(screen.getByText(platform.name)).toBeInTheDocument();
      expect(screen.getByText(platform.icon)).toBeInTheDocument();
    }
  );
});

// =============================================================================
// Status Styling Tests
// =============================================================================

describe('Status Styling', () => {
  const statuses: Array<'pending' | 'completed' | 'failed'> = ['pending', 'completed', 'failed'];

  it.each(statuses)('should apply correct styling for %s status', (status) => {
    render(<ShareStatus status={status} error={status === 'failed' ? 'Error' : undefined} />);
    expect(screen.getByTestId('share-status')).toBeInTheDocument();
  });
});

// =============================================================================
// Empty State Tests
// =============================================================================

describe('Empty States', () => {
  it('ExportHistory should show message when no exports', () => {
    render(<ExportHistory records={[]} platforms={mockPlatforms} />);
    expect(screen.getByText(/no exports/i)).toBeInTheDocument();
  });

  it('CrossPlatformHub should show message when no attestations', () => {
    render(
      <CrossPlatformHub
        attestations={[]}
        platforms={mockPlatforms}
        exportHistory={[]}
      />
    );
    expect(screen.getByText(/no attestations/i)).toBeInTheDocument();
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility', () => {
  it('PlatformSelector should have proper aria labels', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} />);
    expect(screen.getByTestId('platform-base')).toHaveAttribute('aria-label', expect.stringContaining('Base'));
  });

  it('unsupported platforms should indicate disabled state', () => {
    render(<PlatformSelector platforms={mockPlatforms} onSelect={vi.fn()} />);
    expect(screen.getByTestId('platform-arbitrum')).toHaveAttribute('aria-disabled', 'true');
  });

  it('VerificationLink should have security attributes', () => {
    render(<VerificationLink uid={mockAttestation.uid} platform={mockPlatforms[0]!} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('ShareStatus should indicate status to screen readers', () => {
    render(<ShareStatus status="pending" />);
    expect(screen.getByTestId('share-status')).toHaveAttribute('role', 'status');
  });
});
