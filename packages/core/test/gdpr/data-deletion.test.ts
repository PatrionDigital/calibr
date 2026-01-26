/**
 * GDPR Data Deletion Tests (Phase 7.2.2-7.2.3)
 * TDD: Tests for data deletion functionality
 */

import { describe, it, expect } from 'vitest';
import {
  type DeletionRequest,
  type DeletionType,
  getDeletionSteps,
  createDeletionPlan,
  validateDeletionRequest,
  canCreateDeletionRequest,
  estimateDeletionTime,
  formatDeletionRequest,
  getNextStatus,
} from '../../src/gdpr/data-deletion';

// =============================================================================
// Deletion Steps Tests
// =============================================================================

describe('getDeletionSteps', () => {
  it('should return 8 steps for FULL_ACCOUNT', () => {
    const steps = getDeletionSteps('FULL_ACCOUNT');

    expect(steps).toHaveLength(8);
    expect(steps[0]?.name).toBe('revoke_attestations');
    expect(steps[7]?.name).toBe('delete_user');
  });

  it('should return 3 steps for FORECASTS_ONLY', () => {
    const steps = getDeletionSteps('FORECASTS_ONLY');

    expect(steps).toHaveLength(3);
    expect(steps[0]?.name).toBe('revoke_forecast_attestations');
    expect(steps[2]?.name).toBe('reset_calibration');
  });

  it('should return 3 steps for PII_ONLY', () => {
    const steps = getDeletionSteps('PII_ONLY');

    expect(steps).toHaveLength(3);
    expect(steps[0]?.name).toBe('anonymize_user');
  });

  it('should have all steps in order', () => {
    const steps = getDeletionSteps('FULL_ACCOUNT');

    steps.forEach((step, index) => {
      expect(step.order).toBe(index + 1);
    });
  });

  it('should mark steps as required appropriately', () => {
    const fullAccountSteps = getDeletionSteps('FULL_ACCOUNT');
    const piiSteps = getDeletionSteps('PII_ONLY');

    // All FULL_ACCOUNT steps should be required
    expect(fullAccountSteps.every((s) => s.required)).toBe(true);

    // PII_ONLY has optional steps
    expect(piiSteps.some((s) => !s.required)).toBe(true);
  });
});

// =============================================================================
// Deletion Plan Tests
// =============================================================================

describe('createDeletionPlan', () => {
  const mockCounts = {
    forecasts: 50,
    positions: 10,
    transactions: 100,
    attestations: 20,
    wallets: 2,
  };

  it('should create plan with user and type', () => {
    const plan = createDeletionPlan('user_123', 'FULL_ACCOUNT', mockCounts);

    expect(plan.userId).toBe('user_123');
    expect(plan.requestType).toBe('FULL_ACCOUNT');
  });

  it('should include steps for the request type', () => {
    const plan = createDeletionPlan('user_123', 'FULL_ACCOUNT', mockCounts);

    expect(plan.steps).toHaveLength(8);
  });

  it('should include estimated item counts', () => {
    const plan = createDeletionPlan('user_123', 'FULL_ACCOUNT', mockCounts);

    expect(plan.estimatedItems.forecasts).toBe(50);
    expect(plan.estimatedItems.attestations).toBe(20);
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateDeletionRequest', () => {
  it('should pass for valid request', () => {
    const result = validateDeletionRequest({
      userId: 'user_123',
      requestType: 'FULL_ACCOUNT',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for missing userId', () => {
    const result = validateDeletionRequest({
      userId: '',
      requestType: 'FULL_ACCOUNT',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('userId is required');
  });

  it('should fail for invalid requestType', () => {
    const result = validateDeletionRequest({
      userId: 'user_123',
      requestType: 'INVALID' as DeletionType,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'requestType must be FULL_ACCOUNT, FORECASTS_ONLY, or PII_ONLY'
    );
  });

  it('should fail for reason over 1000 characters', () => {
    const result = validateDeletionRequest({
      userId: 'user_123',
      requestType: 'FULL_ACCOUNT',
      reason: 'x'.repeat(1001),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('reason must be 1000 characters or less');
  });

  it('should pass with valid optional reason', () => {
    const result = validateDeletionRequest({
      userId: 'user_123',
      requestType: 'FULL_ACCOUNT',
      reason: 'I want to delete my account',
    });

    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Can Create Request Tests
// =============================================================================

describe('canCreateDeletionRequest', () => {
  it('should allow when no existing requests', () => {
    const result = canCreateDeletionRequest([]);

    expect(result.allowed).toBe(true);
  });

  it('should allow when only completed requests exist', () => {
    const existingRequests: DeletionRequest[] = [
      {
        id: 'req_1',
        userId: 'user_123',
        requestType: 'PII_ONLY',
        reason: null,
        status: 'COMPLETED',
        createdAt: new Date(),
        processedAt: new Date(),
        completedAt: new Date(),
        attestationsRevoked: 0,
        offchainDataDeleted: false,
      },
    ];

    const result = canCreateDeletionRequest(existingRequests);

    expect(result.allowed).toBe(true);
  });

  it('should deny when pending request exists', () => {
    const existingRequests: DeletionRequest[] = [
      {
        id: 'req_1',
        userId: 'user_123',
        requestType: 'FULL_ACCOUNT',
        reason: null,
        status: 'PENDING',
        createdAt: new Date(),
        processedAt: null,
        completedAt: null,
        attestationsRevoked: 0,
        offchainDataDeleted: false,
      },
    ];

    const result = canCreateDeletionRequest(existingRequests);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('A deletion request is already pending or in progress');
  });

  it('should deny when in-progress request exists', () => {
    const existingRequests: DeletionRequest[] = [
      {
        id: 'req_1',
        userId: 'user_123',
        requestType: 'FULL_ACCOUNT',
        reason: null,
        status: 'IN_PROGRESS',
        createdAt: new Date(),
        processedAt: new Date(),
        completedAt: null,
        attestationsRevoked: 5,
        offchainDataDeleted: false,
      },
    ];

    const result = canCreateDeletionRequest(existingRequests);

    expect(result.allowed).toBe(false);
  });

  it('should allow when only failed requests exist', () => {
    const existingRequests: DeletionRequest[] = [
      {
        id: 'req_1',
        userId: 'user_123',
        requestType: 'FULL_ACCOUNT',
        reason: null,
        status: 'FAILED',
        createdAt: new Date(),
        processedAt: new Date(),
        completedAt: null,
        attestationsRevoked: 0,
        offchainDataDeleted: false,
      },
    ];

    const result = canCreateDeletionRequest(existingRequests);

    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// Time Estimation Tests
// =============================================================================

describe('estimateDeletionTime', () => {
  it('should estimate low time for few items', () => {
    const result = estimateDeletionTime({
      forecasts: 5,
      positions: 2,
      transactions: 10,
      attestations: 1,
      wallets: 1,
    });

    expect(result.minMinutes).toBeGreaterThanOrEqual(1);
    expect(result.maxMinutes).toBeLessThanOrEqual(10);
  });

  it('should estimate higher time for many attestations', () => {
    const result = estimateDeletionTime({
      forecasts: 10,
      positions: 5,
      transactions: 20,
      attestations: 50,
      wallets: 2,
    });

    expect(result.maxMinutes).toBeGreaterThan(10);
  });

  it('should provide description for quick deletion', () => {
    const result = estimateDeletionTime({
      forecasts: 1,
      positions: 0,
      transactions: 0,
      attestations: 0,
      wallets: 1,
    });

    expect(result.description).toBe('Less than a minute');
  });

  it('should provide range description for moderate deletion', () => {
    const result = estimateDeletionTime({
      forecasts: 100,
      positions: 50,
      transactions: 200,
      attestations: 30,
      wallets: 3,
    });

    expect(result.description).toMatch(/minutes/);
  });
});

// =============================================================================
// Format Request Tests
// =============================================================================

describe('formatDeletionRequest', () => {
  const mockRequest: DeletionRequest = {
    id: 'req_123',
    userId: 'user_123',
    requestType: 'FULL_ACCOUNT',
    reason: 'Leaving the platform',
    status: 'IN_PROGRESS',
    createdAt: new Date('2024-06-20T10:00:00Z'),
    processedAt: new Date('2024-06-20T10:05:00Z'),
    completedAt: null,
    attestationsRevoked: 15,
    offchainDataDeleted: false,
  };

  it('should format request for API response', () => {
    const result = formatDeletionRequest(mockRequest);

    expect(result.id).toBe('req_123');
    expect(result.requestType).toBe('FULL_ACCOUNT');
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.attestationsRevoked).toBe(15);
  });

  it('should format dates as ISO strings', () => {
    const result = formatDeletionRequest(mockRequest);

    expect(result.createdAt).toBe('2024-06-20T10:00:00.000Z');
    expect(result.processedAt).toBe('2024-06-20T10:05:00.000Z');
  });

  it('should handle null completedAt', () => {
    const result = formatDeletionRequest(mockRequest);

    expect(result.completedAt).toBeNull();
  });

  it('should handle completed request', () => {
    const completedRequest: DeletionRequest = {
      ...mockRequest,
      status: 'COMPLETED',
      completedAt: new Date('2024-06-20T10:30:00Z'),
    };

    const result = formatDeletionRequest(completedRequest);

    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBe('2024-06-20T10:30:00.000Z');
  });
});

// =============================================================================
// Status Transition Tests
// =============================================================================

describe('getNextStatus', () => {
  it('should transition from PENDING to IN_PROGRESS', () => {
    const result = getNextStatus('PENDING', false, false);

    expect(result).toBe('IN_PROGRESS');
  });

  it('should transition from IN_PROGRESS to COMPLETED when all steps done', () => {
    const result = getNextStatus('IN_PROGRESS', true, false);

    expect(result).toBe('COMPLETED');
  });

  it('should stay IN_PROGRESS when not all steps done', () => {
    const result = getNextStatus('IN_PROGRESS', false, false);

    expect(result).toBe('IN_PROGRESS');
  });

  it('should transition to FAILED on error from any status', () => {
    expect(getNextStatus('PENDING', false, true)).toBe('FAILED');
    expect(getNextStatus('IN_PROGRESS', false, true)).toBe('FAILED');
    expect(getNextStatus('IN_PROGRESS', true, true)).toBe('FAILED');
  });

  it('should keep COMPLETED status', () => {
    const result = getNextStatus('COMPLETED', true, false);

    expect(result).toBe('COMPLETED');
  });
});
