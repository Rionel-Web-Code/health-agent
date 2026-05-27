import type { Contract, ActivityLog } from '@/lib/types';

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'contract-001',
    code: 'CTR-2024-001',
    name: 'Contrato de Capitación Regional Norte',
    epsName: 'EPS Salud Total',
    ipsName: 'Hospital Regional del Norte',
    contractType: 'capitacion',
    status: 'approved',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    populationCount: 25000,
    createdAt: '2023-11-15T10:30:00Z',
    updatedAt: '2024-01-05T14:20:00Z',
    createdBy: '1',
  },
  {
    id: 'contract-002',
    code: 'CTR-2024-002',
    name: 'Contrato por Evento Urgencias',
    epsName: 'Nueva EPS',
    ipsName: 'Clínica del Caribe',
    contractType: 'evento',
    status: 'in_progress',
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    populationCount: 15000,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-02-15T16:45:00Z',
    createdBy: '2',
  },
  {
    id: 'contract-003',
    code: 'CTR-2024-003',
    name: 'Contrato Mixto Atención Integral',
    epsName: 'Sura EPS',
    ipsName: 'Red de Clínicas Integral',
    contractType: 'mixto',
    status: 'review',
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    populationCount: 45000,
    createdAt: '2024-02-01T11:15:00Z',
    updatedAt: '2024-02-28T10:00:00Z',
    createdBy: '1',
  },
  {
    id: 'contract-004',
    code: 'CTR-2024-004',
    name: 'Contrato Capitación Zona Sur',
    epsName: 'Coomeva EPS',
    ipsName: 'Fundación Valle de Lili',
    contractType: 'capitacion',
    status: 'draft',
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    populationCount: 32000,
    createdAt: '2024-03-01T08:30:00Z',
    updatedAt: '2024-03-01T08:30:00Z',
    createdBy: '2',
  },
  {
    id: 'contract-005',
    code: 'CTR-2024-005',
    name: 'Contrato Evento Especialidades',
    epsName: 'Sanitas EPS',
    ipsName: 'Centro Médico Especializado',
    contractType: 'evento',
    status: 'rejected',
    startDate: '2024-02-15',
    endDate: '2024-08-15',
    populationCount: 8500,
    createdAt: '2024-01-20T13:00:00Z',
    updatedAt: '2024-02-10T09:30:00Z',
    createdBy: '1',
  },
];

export const MOCK_ACTIVITY_LOG: ActivityLog[] = [
  {
    id: 'act-001',
    type: 'contract_created',
    description: 'Contrato CTR-2024-004 creado',
    userId: '2',
    userName: 'Ana Analyst',
    entityId: 'contract-004',
    entityType: 'contract',
    timestamp: '2024-03-01T08:30:00Z',
  },
  {
    id: 'act-002',
    type: 'data_uploaded',
    description: 'Datos RIPS cargados para CTR-2024-001',
    userId: '2',
    userName: 'Ana Analyst',
    entityId: 'contract-001',
    entityType: 'contract',
    timestamp: '2024-02-28T16:00:00Z',
  },
  {
    id: 'act-003',
    type: 'status_changed',
    description: 'CTR-2024-003 cambió a estado En Revisión',
    userId: '1',
    userName: 'Admin Usuario',
    entityId: 'contract-003',
    entityType: 'contract',
    timestamp: '2024-02-28T10:00:00Z',
  },
  {
    id: 'act-004',
    type: 'data_uploaded',
    description: 'Padrón de población cargado para CTR-2024-002',
    userId: '2',
    userName: 'Ana Analyst',
    entityId: 'contract-002',
    entityType: 'contract',
    timestamp: '2024-02-27T14:30:00Z',
  },
  {
    id: 'act-005',
    type: 'contract_updated',
    description: 'CTR-2024-002 actualizado - población ajustada',
    userId: '1',
    userName: 'Admin Usuario',
    entityId: 'contract-002',
    entityType: 'contract',
    timestamp: '2024-02-15T16:45:00Z',
  },
];

// LocalStorage keys
const CONTRACTS_STORAGE_KEY = 'nota-tecnica-contracts';

// Contract storage utilities
export function getStoredContracts(): Contract[] {
  if (typeof window === 'undefined') return MOCK_CONTRACTS;
  
  const stored = localStorage.getItem(CONTRACTS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(MOCK_CONTRACTS));
    return MOCK_CONTRACTS;
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return MOCK_CONTRACTS;
  }
}

export function saveContracts(contracts: Contract[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
}

export function getContractById(id: string): Contract | undefined {
  const contracts = getStoredContracts();
  return contracts.find(c => c.id === id);
}

export function createContract(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Contract {
  const contracts = getStoredContracts();
  const newContract: Contract = {
    ...data,
    id: `contract-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  contracts.push(newContract);
  saveContracts(contracts);
  return newContract;
}

export function updateContract(id: string, data: Partial<Contract>): Contract | null {
  const contracts = getStoredContracts();
  const index = contracts.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  contracts[index] = {
    ...contracts[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveContracts(contracts);
  return contracts[index];
}

export function deleteContract(id: string): boolean {
  const contracts = getStoredContracts();
  const index = contracts.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  contracts.splice(index, 1);
  saveContracts(contracts);
  return true;
}
