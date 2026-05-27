import type { RipsRecord, RipsSummary, RipsServiceType } from '@/lib/types';

// Common CUPS codes for each service type
const CUPS_CODES = {
  AC: ['890201', '890301', '890401', '890501', '890701'], // Consultations
  AP: ['881301', '883101', '871111', '901301', '902201'], // Procedures
  AM: ['J01CA04', 'N02BE01', 'M01AE01', 'A02BC01', 'C09AA02'], // Medications (ATC codes)
  AH: ['230101', '230201', '230301', '230401', '230501'], // Hospitalizations
  AU: ['890601', '890602', '890603', '890604', '890605'], // Emergency
  AN: ['990101', '990102', '990103', '990104', '990105'], // Newborns
};

// Common CIE-10 diagnosis codes
const CIE10_CODES = [
  'J00', 'J06', 'J20', // Respiratory infections
  'K29', 'K30', 'K59', // GI issues
  'I10', 'I11', 'I15', // Hypertension
  'E11', 'E14', // Diabetes
  'M54', 'M79', // Musculoskeletal
  'F32', 'F41', // Mental health
  'Z00', 'Z01', // Routine exams
];

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate mock RIPS records
export function generateMockRipsRecords(count: number = 500): RipsRecord[] {
  const serviceTypes: RipsServiceType[] = ['AC', 'AP', 'AM', 'AH', 'AU', 'AN'];
  const records: RipsRecord[] = [];
  
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2024-03-15');
  
  // Generate unique beneficiary IDs (simulating 200 unique patients)
  const beneficiaryIds = Array.from({ length: 200 }, (_, i) => 
    `BEN-${String(i + 1).padStart(6, '0')}`
  );
  
  for (let i = 0; i < count; i++) {
    const serviceType = randomElement(serviceTypes);
    const quantity = serviceType === 'AM' ? randomBetween(1, 30) : randomBetween(1, 5);
    
    let unitValue: number;
    switch (serviceType) {
      case 'AC':
        unitValue = randomBetween(25000, 80000);
        break;
      case 'AP':
        unitValue = randomBetween(50000, 500000);
        break;
      case 'AM':
        unitValue = randomBetween(5000, 150000);
        break;
      case 'AH':
        unitValue = randomBetween(500000, 5000000);
        break;
      case 'AU':
        unitValue = randomBetween(100000, 800000);
        break;
      case 'AN':
        unitValue = randomBetween(200000, 1000000);
        break;
      default:
        unitValue = 50000;
    }
    
    records.push({
      id: `RIPS-${String(i + 1).padStart(8, '0')}`,
      serviceType,
      beneficiaryId: randomElement(beneficiaryIds),
      serviceDate: randomDate(startDate, endDate),
      serviceCode: randomElement(CUPS_CODES[serviceType]),
      diagnosisCode: randomElement(CIE10_CODES),
      quantity,
      unitValue,
      totalValue: unitValue * quantity,
    });
  }
  
  return records.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
}

// Calculate summary from RIPS records
export function calculateRipsSummary(records: RipsRecord[]): RipsSummary {
  const byServiceType: Record<RipsServiceType, number> = {
    AC: 0,
    AP: 0,
    AM: 0,
    AH: 0,
    AU: 0,
    AN: 0,
  };
  
  const uniqueBeneficiaries = new Set<string>();
  let totalValue = 0;
  let minDate = records[0]?.serviceDate || '';
  let maxDate = records[0]?.serviceDate || '';
  
  for (const record of records) {
    byServiceType[record.serviceType]++;
    uniqueBeneficiaries.add(record.beneficiaryId);
    totalValue += record.totalValue;
    
    if (record.serviceDate < minDate) minDate = record.serviceDate;
    if (record.serviceDate > maxDate) maxDate = record.serviceDate;
  }
  
  return {
    totalRecords: records.length,
    byServiceType,
    uniqueBeneficiaries: uniqueBeneficiaries.size,
    totalValue,
    dateRange: {
      start: minDate,
      end: maxDate,
    },
  };
}

// LocalStorage key
const RIPS_STORAGE_KEY = 'nota-tecnica-rips';

// Storage utilities
export function getStoredRipsRecords(): RipsRecord[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(RIPS_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveRipsRecords(records: RipsRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RIPS_STORAGE_KEY, JSON.stringify(records));
}

export function addRipsRecords(newRecords: RipsRecord[]): RipsRecord[] {
  const existing = getStoredRipsRecords();
  const combined = [...existing, ...newRecords];
  saveRipsRecords(combined);
  return combined;
}

export function clearRipsRecords(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RIPS_STORAGE_KEY);
}

// Pre-generated mock data for demo
export const MOCK_RIPS_RECORDS = generateMockRipsRecords(500);
