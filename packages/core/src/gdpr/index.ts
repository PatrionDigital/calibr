/**
 * GDPR Module (Phase 7.2)
 * Data export and deletion functionality
 */

// Data Export
export {
  type ExportedForecast,
  type ExportedPosition,
  type ExportedTransaction,
  type ExportedAttestation,
  type ExportedWallet,
  type ExportedPrivacySettings,
  type ExportedCalibration,
  type UserDataExport,
  EXPORT_VERSION,
  formatExportDate,
  createExportMetadata,
  sanitizeUserForExport,
  formatPrivacySettings,
  formatCalibration,
  formatWallet,
  formatForecast,
  formatPosition,
  formatTransaction,
  formatAttestation,
  buildUserExport,
} from './data-export';

// Data Deletion
export {
  type DeletionType,
  type DeletionStatus,
  type DeletionRequest,
  type CreateDeletionRequestParams,
  type DeletionResult,
  type DeletionPlan,
  type DeletionStep,
  getDeletionSteps,
  createDeletionPlan,
  validateDeletionRequest,
  canCreateDeletionRequest,
  estimateDeletionTime,
  formatDeletionRequest,
  getNextStatus,
} from './data-deletion';
