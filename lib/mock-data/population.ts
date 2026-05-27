import type { PopulationRecord, PopulationSummary, Gender, AgeGroup, RiskCategory } from '@/lib/types';

// Colombian first names
const FIRST_NAMES_M = ['Carlos', 'Juan', 'Luis', 'José', 'Miguel', 'Andrés', 'David', 'Santiago', 'Daniel', 'Felipe', 'Alejandro', 'Sebastián', 'Nicolás', 'Mateo', 'Samuel'];
const FIRST_NAMES_F = ['María', 'Ana', 'Laura', 'Sofía', 'Valentina', 'Isabella', 'Camila', 'Paula', 'Andrea', 'Carolina', 'Natalia', 'Daniela', 'Gabriela', 'Mariana', 'Juliana'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Morales', 'Cruz', 'Ortiz', 'Gutiérrez', 'Vargas'];

// Colombian municipalities
const MUNICIPALITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
  'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Manizales',
  'Villavicencio', 'Pasto', 'Montería', 'Neiva', 'Armenia'
];

/**
 * Document types assigned per Res. 00002275/2023 Art. U04 rules:
 * - 0-6 years: RC (Registro Civil)
 * - 7-17 years: TI (Tarjeta de Identidad)
 * - 18+ years: CC (Cédula de Ciudadanía)
 * Fallbacks (CE, PA) allowed per the resolution's hierarchy.
 */
function getDocTypeForAge(age: number): string {
  if (age <= 6) return 'RC';
  if (age <= 17) return 'TI';
  return 'CC';
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getAgeGroup(age: number): AgeGroup {
  if (age <= 4) return '0-4';
  if (age <= 14) return '5-14';
  if (age <= 24) return '15-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  if (age <= 64) return '55-64';
  if (age <= 74) return '65-74';
  return '75+';
}

function getRiskCategory(age: number): RiskCategory {
  // Simple risk assignment based on age
  if (age < 5 || age > 65) {
    return Math.random() < 0.3 ? 'highCost' : 'chronic';
  }
  if (age > 45) {
    return Math.random() < 0.4 ? 'chronic' : 'healthy';
  }
  return Math.random() < 0.1 ? 'chronic' : 'healthy';
}

function generateBirthDate(ageGroup: AgeGroup): string {
  const today = new Date();
  const year = today.getFullYear();
  
  let minAge: number, maxAge: number;
  switch (ageGroup) {
    case '0-4': minAge = 0; maxAge = 4; break;
    case '5-14': minAge = 5; maxAge = 14; break;
    case '15-24': minAge = 15; maxAge = 24; break;
    case '25-34': minAge = 25; maxAge = 34; break;
    case '35-44': minAge = 35; maxAge = 44; break;
    case '45-54': minAge = 45; maxAge = 54; break;
    case '55-64': minAge = 55; maxAge = 64; break;
    case '65-74': minAge = 65; maxAge = 74; break;
    case '75+': minAge = 75; maxAge = 95; break;
  }
  
  const age = randomBetween(minAge, maxAge);
  const birthYear = year - age;
  const month = randomBetween(1, 12);
  const day = randomBetween(1, 28);
  
  return `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Generate mock population records
export function generateMockPopulationRecords(count: number = 1000): PopulationRecord[] {
  const records: PopulationRecord[] = [];
  const ageGroups: AgeGroup[] = ['0-4', '5-14', '15-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+'];
  
  // Distribution weights to simulate Colombian demographics
  const ageDistribution: Record<AgeGroup, number> = {
    '0-4': 0.08,
    '5-14': 0.15,
    '15-24': 0.17,
    '25-34': 0.16,
    '35-44': 0.14,
    '45-54': 0.12,
    '55-64': 0.09,
    '65-74': 0.06,
    '75+': 0.03,
  };
  
  for (let i = 0; i < count; i++) {
    // Select age group based on distribution
    const rand = Math.random();
    let cumulative = 0;
    let selectedAgeGroup: AgeGroup = '25-34';
    for (const ag of ageGroups) {
      cumulative += ageDistribution[ag];
      if (rand <= cumulative) {
        selectedAgeGroup = ag;
        break;
      }
    }
    
    const gender: Gender = Math.random() < 0.51 ? 'F' : 'M';
    const birthDate = generateBirthDate(selectedAgeGroup);
    const age = calculateAge(birthDate);
    
    const firstName = gender === 'M' 
      ? randomElement(FIRST_NAMES_M)
      : randomElement(FIRST_NAMES_F);
    
    records.push({
      id: `POP-${String(i + 1).padStart(8, '0')}`,
      beneficiaryId: `BEN-${String(i + 1).padStart(6, '0')}`,
      documentType: getDocTypeForAge(age),
      documentNumber: String(randomBetween(10000000, 99999999999)),
      firstName,
      lastName: `${randomElement(LAST_NAMES)} ${randomElement(LAST_NAMES)}`,
      birthDate,
      gender,
      ageGroup: getAgeGroup(age),
      riskCategory: getRiskCategory(age),
      municipality: randomElement(MUNICIPALITIES),
      zone: Math.random() < 0.7 ? 'Urbana' : 'Rural',
    });
  }
  
  return records;
}

// Calculate summary from population records
export function calculatePopulationSummary(records: PopulationRecord[]): PopulationSummary {
  const byGender: Record<Gender, number> = { M: 0, F: 0 };
  const byAgeGroup: Record<AgeGroup, number> = {
    '0-4': 0,
    '5-14': 0,
    '15-24': 0,
    '25-34': 0,
    '35-44': 0,
    '45-54': 0,
    '55-64': 0,
    '65-74': 0,
    '75+': 0,
  };
  const byRiskCategory: Record<RiskCategory, number> = {
    healthy: 0,
    chronic: 0,
    highCost: 0,
  };
  
  for (const record of records) {
    byGender[record.gender]++;
    byAgeGroup[record.ageGroup]++;
    byRiskCategory[record.riskCategory]++;
  }
  
  return {
    total: records.length,
    byGender,
    byAgeGroup,
    byRiskCategory,
  };
}

// LocalStorage key
const POPULATION_STORAGE_KEY = 'nota-tecnica-population';

// Storage utilities
export function getStoredPopulationRecords(): PopulationRecord[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(POPULATION_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function savePopulationRecords(records: PopulationRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(POPULATION_STORAGE_KEY, JSON.stringify(records));
}

export function addPopulationRecords(newRecords: PopulationRecord[]): PopulationRecord[] {
  const existing = getStoredPopulationRecords();
  const combined = [...existing, ...newRecords];
  savePopulationRecords(combined);
  return combined;
}

export function clearPopulationRecords(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(POPULATION_STORAGE_KEY);
}

// Pre-generated mock data for demo
export const MOCK_POPULATION_RECORDS = generateMockPopulationRecords(1000);
