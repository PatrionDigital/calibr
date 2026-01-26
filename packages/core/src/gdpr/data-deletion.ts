/**
 * GDPR Data Deletion Service (Phase 7.2.2-7.2.3)
 * Handles account and data deletion requests
 */

// =============================================================================
// Types
// =============================================================================

export type DeletionType = 'FULL_ACCOUNT' | 'FORECASTS_ONLY' | 'PII_ONLY';
export type DeletionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface DeletionRequest {
  id: string;
  userId: string;
  requestType: DeletionType;
  reason: string | null;
  status: DeletionStatus;
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
  attestationsRevoked: number;
  offchainDataDeleted: boolean;
}

export interface CreateDeletionRequestParams {
  userId: string;
  requestType: DeletionType;
  reason?: string;
}

export interface DeletionResult {
  success: boolean;
  requestId: string;
  status: DeletionStatus;
  attestationsRevoked: number;
  offchainDataDeleted: boolean;
  error?: string;
}

export interface DeletionPlan {
  userId: string;
  requestType: DeletionType;
  steps: DeletionStep[];
  estimatedItems: {
    forecasts: number;
    positions: number;
    transactions: number;
    attestations: number;
    wallets: number;
  };
}

export interface DeletionStep {
  order: number;
  name: string;
  description: string;
  required: boolean;
}

// =============================================================================
// Deletion Steps Configuration
// =============================================================================

const FULL_ACCOUNT_STEPS: DeletionStep[] = [
  {
    order: 1,
    name: 'revoke_attestations',
    description: 'Revoke all EAS attestations on-chain',
    required: true,
  },
  {
    order: 2,
    name: 'delete_forecasts',
    description: 'Delete all forecast records',
    required: true,
  },
  {
    order: 3,
    name: 'delete_positions',
    description: 'Delete all position records',
    required: true,
  },
  {
    order: 4,
    name: 'delete_transactions',
    description: 'Delete all transaction records',
    required: true,
  },
  {
    order: 5,
    name: 'delete_wallets',
    description: 'Delete wallet connections',
    required: true,
  },
  {
    order: 6,
    name: 'delete_calibration',
    description: 'Delete calibration data',
    required: true,
  },
  {
    order: 7,
    name: 'delete_privacy_settings',
    description: 'Delete privacy settings',
    required: true,
  },
  {
    order: 8,
    name: 'delete_user',
    description: 'Delete user account',
    required: true,
  },
];

const FORECASTS_ONLY_STEPS: DeletionStep[] = [
  {
    order: 1,
    name: 'revoke_forecast_attestations',
    description: 'Revoke forecast-related EAS attestations',
    required: true,
  },
  {
    order: 2,
    name: 'delete_forecasts',
    description: 'Delete all forecast records',
    required: true,
  },
  {
    order: 3,
    name: 'reset_calibration',
    description: 'Reset calibration data to defaults',
    required: true,
  },
];

const PII_ONLY_STEPS: DeletionStep[] = [
  {
    order: 1,
    name: 'anonymize_user',
    description: 'Remove display name and email',
    required: true,
  },
  {
    order: 2,
    name: 'remove_wallet_labels',
    description: 'Remove wallet labels',
    required: false,
  },
  {
    order: 3,
    name: 'anonymize_forecasts',
    description: 'Remove commit messages from forecasts',
    required: false,
  },
];

// =============================================================================
// Deletion Planning
// =============================================================================

/**
 * Get deletion steps for a given type
 */
export function getDeletionSteps(requestType: DeletionType): DeletionStep[] {
  switch (requestType) {
    case 'FULL_ACCOUNT':
      return FULL_ACCOUNT_STEPS;
    case 'FORECASTS_ONLY':
      return FORECASTS_ONLY_STEPS;
    case 'PII_ONLY':
      return PII_ONLY_STEPS;
    default:
      return [];
  }
}

/**
 * Create a deletion plan
 */
export function createDeletionPlan(
  userId: string,
  requestType: DeletionType,
  counts: DeletionPlan['estimatedItems']
): DeletionPlan {
  return {
    userId,
    requestType,
    steps: getDeletionSteps(requestType),
    estimatedItems: counts,
  };
}

/**
 * Validate deletion request parameters
 */
export function validateDeletionRequest(
  params: CreateDeletionRequestParams
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.userId || params.userId.trim() === '') {
    errors.push('userId is required');
  }

  if (!params.requestType) {
    errors.push('requestType is required');
  } else if (!['FULL_ACCOUNT', 'FORECASTS_ONLY', 'PII_ONLY'].includes(params.requestType)) {
    errors.push('requestType must be FULL_ACCOUNT, FORECASTS_ONLY, or PII_ONLY');
  }

  if (params.reason && params.reason.length > 1000) {
    errors.push('reason must be 1000 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if deletion request can proceed (no pending requests)
 */
export function canCreateDeletionRequest(existingRequests: DeletionRequest[]): {
  allowed: boolean;
  reason?: string;
} {
  const pendingOrInProgress = existingRequests.filter(
    (r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS'
  );

  if (pendingOrInProgress.length > 0) {
    return {
      allowed: false,
      reason: 'A deletion request is already pending or in progress',
    };
  }

  return { allowed: true };
}

/**
 * Estimate deletion completion time based on item counts
 */
export function estimateDeletionTime(counts: DeletionPlan['estimatedItems']): {
  minMinutes: number;
  maxMinutes: number;
  description: string;
} {
  const totalItems =
    counts.forecasts +
    counts.positions +
    counts.transactions +
    counts.attestations +
    counts.wallets;

  // Base time + time per attestation (blockchain operations are slow)
  const attestationTime = counts.attestations * 0.5; // 30 seconds per attestation
  const dataTime = (totalItems - counts.attestations) * 0.01; // 0.6 seconds per 100 records

  // Minimal base time for quick operations, scaling up with attestations
  const baseMin = counts.attestations > 0 ? 1 : 0;
  const baseMax = counts.attestations > 0 ? 5 : 1;

  const minMinutes = Math.max(1, Math.ceil(baseMin + attestationTime * 0.5 + dataTime * 0.5));
  const maxMinutes = Math.ceil(baseMax + attestationTime + dataTime);

  let description = 'Less than a minute';
  if (maxMinutes > 60) {
    description = 'Several hours due to on-chain operations';
  } else if (maxMinutes > 10) {
    description = `${minMinutes}-${maxMinutes} minutes`;
  } else if (maxMinutes > 2) {
    description = 'A few minutes';
  }

  return { minMinutes, maxMinutes, description };
}

/**
 * Format deletion request for API response
 */
export function formatDeletionRequest(request: DeletionRequest): {
  id: string;
  requestType: DeletionType;
  status: DeletionStatus;
  createdAt: string;
  processedAt: string | null;
  completedAt: string | null;
  attestationsRevoked: number;
} {
  return {
    id: request.id,
    requestType: request.requestType,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    processedAt: request.processedAt?.toISOString() || null,
    completedAt: request.completedAt?.toISOString() || null,
    attestationsRevoked: request.attestationsRevoked,
  };
}

/**
 * Determine next status based on current status and step completion
 */
export function getNextStatus(
  currentStatus: DeletionStatus,
  allStepsComplete: boolean,
  hasError: boolean
): DeletionStatus {
  if (hasError) {
    return 'FAILED';
  }

  if (currentStatus === 'PENDING') {
    return 'IN_PROGRESS';
  }

  if (currentStatus === 'IN_PROGRESS' && allStepsComplete) {
    return 'COMPLETED';
  }

  return currentStatus;
}
