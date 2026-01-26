/**
 * GDPR Data Export Service (Phase 7.2.1)
 * Exports all user data in a portable format
 */

// =============================================================================
// Types
// =============================================================================

export interface ExportedForecast {
  id: string;
  marketQuestion: string;
  probability: number;
  confidence: number;
  commitMessage: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  easAttestationUid: string | null;
}

export interface ExportedPosition {
  id: string;
  platform: string;
  marketQuestion: string;
  outcome: string;
  shares: number;
  avgCostBasis: number;
  currentValue: number | null;
  unrealizedPnl: number | null;
  createdAt: string;
}

export interface ExportedTransaction {
  id: string;
  type: string;
  platform: string;
  outcome: string;
  shares: number;
  pricePerShare: number;
  totalCost: number;
  fees: number;
  status: string;
  createdAt: string;
  txHash: string | null;
}

export interface ExportedAttestation {
  uid: string;
  schemaName: string;
  createdAt: string;
  revoked: boolean;
  isOffchain: boolean;
  isPrivate: boolean;
}

export interface ExportedWallet {
  address: string;
  chainId: number;
  label: string | null;
  verifiedAt: string | null;
}

export interface ExportedPrivacySettings {
  profileVisibility: string;
  showOnLeaderboard: boolean;
  showWalletAddress: boolean;
  defaultForecastPrivacy: string;
  shareReasoningPublicly: boolean;
}

export interface ExportedCalibration {
  avgBrierScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  currentTier: string;
  globalRank: number | null;
}

export interface UserDataExport {
  exportedAt: string;
  exportVersion: string;
  user: {
    id: string;
    displayName: string | null;
    email: string | null;
    createdAt: string;
    updatedAt: string;
  };
  privacySettings: ExportedPrivacySettings | null;
  calibration: ExportedCalibration | null;
  wallets: ExportedWallet[];
  forecasts: ExportedForecast[];
  positions: ExportedPosition[];
  transactions: ExportedTransaction[];
  attestations: ExportedAttestation[];
}

// =============================================================================
// Export Formatting
// =============================================================================

export const EXPORT_VERSION = '1.0.0';

/**
 * Format a date for export (ISO 8601)
 */
export function formatExportDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString();
}

/**
 * Create export metadata
 */
export function createExportMetadata(): { exportedAt: string; exportVersion: string } {
  return {
    exportedAt: new Date().toISOString(),
    exportVersion: EXPORT_VERSION,
  };
}

/**
 * Sanitize user data for export (remove sensitive internal fields)
 */
export function sanitizeUserForExport(user: {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserDataExport['user'] {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    createdAt: formatExportDate(user.createdAt),
    updatedAt: formatExportDate(user.updatedAt),
  };
}

/**
 * Format privacy settings for export
 */
export function formatPrivacySettings(settings: {
  profileVisibility: string;
  showOnLeaderboard: boolean;
  showWalletAddress: boolean;
  defaultForecastPrivacy: string;
  shareReasoningPublicly: boolean;
} | null): ExportedPrivacySettings | null {
  if (!settings) return null;
  return {
    profileVisibility: settings.profileVisibility,
    showOnLeaderboard: settings.showOnLeaderboard,
    showWalletAddress: settings.showWalletAddress,
    defaultForecastPrivacy: settings.defaultForecastPrivacy,
    shareReasoningPublicly: settings.shareReasoningPublicly,
  };
}

/**
 * Format calibration data for export
 */
export function formatCalibration(calibration: {
  avgBrierScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  currentTier: string;
  globalRank: number | null;
} | null): ExportedCalibration | null {
  if (!calibration) return null;
  return {
    avgBrierScore: calibration.avgBrierScore,
    totalForecasts: calibration.totalForecasts,
    resolvedForecasts: calibration.resolvedForecasts,
    currentTier: calibration.currentTier,
    globalRank: calibration.globalRank,
  };
}

/**
 * Format wallet for export
 */
export function formatWallet(wallet: {
  address: string;
  chainId: number;
  label: string | null;
  verifiedAt: Date | null;
}): ExportedWallet {
  return {
    address: wallet.address,
    chainId: wallet.chainId,
    label: wallet.label,
    verifiedAt: formatExportDate(wallet.verifiedAt),
  };
}

/**
 * Format forecast for export
 */
export function formatForecast(forecast: {
  id: string;
  probability: number;
  confidence: number;
  commitMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  easAttestationUid: string | null;
  unifiedMarket: { question: string } | null;
}): ExportedForecast {
  return {
    id: forecast.id,
    marketQuestion: forecast.unifiedMarket?.question || 'Unknown',
    probability: forecast.probability,
    confidence: forecast.confidence,
    commitMessage: forecast.commitMessage,
    createdAt: formatExportDate(forecast.createdAt),
    updatedAt: formatExportDate(forecast.updatedAt),
    isPublic: forecast.isPublic,
    easAttestationUid: forecast.easAttestationUid,
  };
}

/**
 * Format position for export
 */
export function formatPosition(position: {
  id: string;
  platform: string;
  outcome: string;
  shares: number;
  avgCostBasis: number;
  currentValue: number | null;
  unrealizedPnl: number | null;
  createdAt: Date;
  platformMarket: { question: string } | null;
}): ExportedPosition {
  return {
    id: position.id,
    platform: position.platform,
    marketQuestion: position.platformMarket?.question || 'Unknown',
    outcome: position.outcome,
    shares: position.shares,
    avgCostBasis: position.avgCostBasis,
    currentValue: position.currentValue,
    unrealizedPnl: position.unrealizedPnl,
    createdAt: formatExportDate(position.createdAt),
  };
}

/**
 * Format transaction for export
 */
export function formatTransaction(tx: {
  id: string;
  type: string;
  platform: string;
  outcome: string;
  shares: number;
  pricePerShare: number;
  totalCost: number;
  fees: number;
  status: string;
  createdAt: Date;
  txHash: string | null;
}): ExportedTransaction {
  return {
    id: tx.id,
    type: tx.type,
    platform: tx.platform,
    outcome: tx.outcome,
    shares: tx.shares,
    pricePerShare: tx.pricePerShare,
    totalCost: tx.totalCost,
    fees: tx.fees,
    status: tx.status,
    createdAt: formatExportDate(tx.createdAt),
    txHash: tx.txHash,
  };
}

/**
 * Format attestation for export
 */
export function formatAttestation(attestation: {
  uid: string;
  schemaName: string;
  createdAt: Date;
  revoked: boolean;
  isOffchain: boolean;
  isPrivate: boolean;
}): ExportedAttestation {
  return {
    uid: attestation.uid,
    schemaName: attestation.schemaName,
    createdAt: formatExportDate(attestation.createdAt),
    revoked: attestation.revoked,
    isOffchain: attestation.isOffchain,
    isPrivate: attestation.isPrivate,
  };
}

/**
 * Build complete user data export
 */
export function buildUserExport(data: {
  user: Parameters<typeof sanitizeUserForExport>[0];
  privacySettings: Parameters<typeof formatPrivacySettings>[0];
  calibration: Parameters<typeof formatCalibration>[0];
  wallets: Parameters<typeof formatWallet>[0][];
  forecasts: Parameters<typeof formatForecast>[0][];
  positions: Parameters<typeof formatPosition>[0][];
  transactions: Parameters<typeof formatTransaction>[0][];
  attestations: Parameters<typeof formatAttestation>[0][];
}): UserDataExport {
  return {
    ...createExportMetadata(),
    user: sanitizeUserForExport(data.user),
    privacySettings: formatPrivacySettings(data.privacySettings),
    calibration: formatCalibration(data.calibration),
    wallets: data.wallets.map(formatWallet),
    forecasts: data.forecasts.map(formatForecast),
    positions: data.positions.map(formatPosition),
    transactions: data.transactions.map(formatTransaction),
    attestations: data.attestations.map(formatAttestation),
  };
}
