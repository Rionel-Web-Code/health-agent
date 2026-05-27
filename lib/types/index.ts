// =============================================================================
// CORE TYPES
// =============================================================================

export type Locale = 'es' | 'en';

export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// =============================================================================
// CONTRACT TYPES
// =============================================================================

export type ContractType = 'capitacion' | 'evento' | 'mixto';

export type ContractStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'rejected';

export interface Contract {
  id: string;
  code: string;
  name: string;
  epsName: string;
  ipsName: string;
  contractType: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  populationCount: number;
  technicalNoteId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ContractFormData {
  code: string;
  name: string;
  epsName: string;
  ipsName: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  populationCount: number;
}

// =============================================================================
// RIPS TYPES (Legacy flat format — kept for backward compatibility during
// migration. New code should use RipsTransaccion from rips-legal.ts)
// =============================================================================

export type RipsServiceType = 'AC' | 'AP' | 'AM' | 'AH' | 'AU' | 'AN';

export interface RipsRecord {
  id: string;
  serviceType: RipsServiceType;
  beneficiaryId: string;
  serviceDate: string;
  serviceCode: string;
  diagnosisCode: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  contractId?: string;
}

export interface RipsSummary {
  totalRecords: number;
  byServiceType: Record<RipsServiceType, number>;
  uniqueBeneficiaries: number;
  totalValue: number;
  dateRange: {
    start: string;
    end: string;
  };
}

// Legal RIPS types per Resolución 00002275/2023
export type {
  RipsTransaccion,
  RipsUsuario,
  RipsServicios,
  RipsConsulta,
  RipsProcedimiento,
  RipsUrgencia,
  RipsHospitalizacion,
  RipsRecienNacido,
  RipsMedicamento,
  RipsOtroServicio,
  RipsValidationResult,
  RipsValidationStatus,
} from './rips-legal';

// =============================================================================
// POPULATION TYPES
// =============================================================================

export type Gender = 'M' | 'F';

export type RiskCategory = 'healthy' | 'chronic' | 'highCost';

export type AgeGroup = 
  | '0-4' 
  | '5-14' 
  | '15-24' 
  | '25-34' 
  | '35-44' 
  | '45-54' 
  | '55-64' 
  | '65-74' 
  | '75+';

export interface PopulationRecord {
  id: string;
  beneficiaryId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  ageGroup: AgeGroup;
  riskCategory: RiskCategory;
  municipality?: string;
  zone?: string;
  contractId?: string;
}

export interface PopulationSummary {
  total: number;
  byGender: Record<Gender, number>;
  byAgeGroup: Record<AgeGroup, number>;
  byRiskCategory: Record<RiskCategory, number>;
}

// =============================================================================
// TARIFARIO TYPES
// =============================================================================

export type TarifarioType = 'soat' | 'iss' | 'custom';

export interface TarifarioRecord {
  id: string;
  tarifarioType: TarifarioType;
  serviceCode: string;
  serviceName: string;
  baseValue: number;
  adjustmentFactor: number;
  finalValue: number;
}

export interface TarifarioSummary {
  type: TarifarioType;
  totalServices: number;
  lastUpdate: string;
}

// =============================================================================
// FILE UPLOAD TYPES
// =============================================================================

export type FileType = 'csv' | 'json';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'validating' | 'complete' | 'error';

export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  uploadedAt: string;
  status: UploadStatus;
  recordCount?: number;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  row?: number;
  field?: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  row?: number;
  field?: string;
  message: string;
  code: string;
}

export interface ParsedData<T> {
  data: T[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  meta: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    columns: string[];
  };
}

// =============================================================================
// ACTIVITY LOG TYPES
// =============================================================================

export type ActivityType = 
  | 'contract_created'
  | 'contract_updated'
  | 'contract_deleted'
  | 'data_uploaded'
  | 'data_validated'
  | 'status_changed';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  description: string;
  userId: string;
  userName: string;
  entityId?: string;
  entityType?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface DashboardStats {
  activeContracts: number;
  pendingReviews: number;
  totalPopulation: number;
  ripsRecords: number;
  recentUploads: number;
}
