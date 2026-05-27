import type { TarifarioRecord, TarifarioSummary, TarifarioType } from '@/lib/types';

// Sample CUPS codes with descriptions
const SOAT_SERVICES = [
  { code: '890201', name: 'Consulta de primera vez por medicina general', baseValue: 28500 },
  { code: '890301', name: 'Consulta de primera vez por medicina especializada', baseValue: 45000 },
  { code: '890401', name: 'Consulta de primera vez por odontología general', baseValue: 22000 },
  { code: '890701', name: 'Consulta de primera vez por psicología', baseValue: 35000 },
  { code: '881301', name: 'Radiografía de tórax', baseValue: 42000 },
  { code: '883101', name: 'Ecografía de abdomen total', baseValue: 85000 },
  { code: '871111', name: 'Electrocardiograma de ritmo', baseValue: 35000 },
  { code: '901301', name: 'Hemograma tipo IV', baseValue: 18000 },
  { code: '902201', name: 'Glucemia basal', baseValue: 8500 },
  { code: '903001', name: 'Creatinina en suero u otros fluidos', baseValue: 9000 },
  { code: '903426', name: 'Perfil lipídico', baseValue: 32000 },
  { code: '906011', name: 'Uroanálisis con sedimento', baseValue: 12000 },
  { code: '230101', name: 'Estancia general', baseValue: 180000 },
  { code: '230201', name: 'Estancia en cuidado intermedio', baseValue: 450000 },
  { code: '230301', name: 'Estancia en cuidado intensivo', baseValue: 850000 },
  { code: '890601', name: 'Consulta de urgencias', baseValue: 55000 },
  { code: '990101', name: 'Atención al recién nacido', baseValue: 120000 },
  { code: '860201', name: 'Fisioterapia integral', baseValue: 25000 },
  { code: '930801', name: 'Terapia de lenguaje individual', baseValue: 28000 },
  { code: '620101', name: 'Parto vaginal atención', baseValue: 850000 },
];

const ISS_SERVICES = [
  { code: '890201', name: 'Consulta de primera vez por medicina general', baseValue: 25000 },
  { code: '890301', name: 'Consulta de primera vez por medicina especializada', baseValue: 40000 },
  { code: '890401', name: 'Consulta de primera vez por odontología general', baseValue: 18000 },
  { code: '890701', name: 'Consulta de primera vez por psicología', baseValue: 30000 },
  { code: '881301', name: 'Radiografía de tórax', baseValue: 38000 },
  { code: '883101', name: 'Ecografía de abdomen total', baseValue: 75000 },
  { code: '871111', name: 'Electrocardiograma de ritmo', baseValue: 30000 },
  { code: '901301', name: 'Hemograma tipo IV', baseValue: 15000 },
  { code: '902201', name: 'Glucemia basal', baseValue: 7000 },
  { code: '903001', name: 'Creatinina en suero u otros fluidos', baseValue: 7500 },
  { code: '903426', name: 'Perfil lipídico', baseValue: 28000 },
  { code: '906011', name: 'Uroanálisis con sedimento', baseValue: 10000 },
  { code: '230101', name: 'Estancia general', baseValue: 150000 },
  { code: '230201', name: 'Estancia en cuidado intermedio', baseValue: 380000 },
  { code: '230301', name: 'Estancia en cuidado intensivo', baseValue: 720000 },
  { code: '890601', name: 'Consulta de urgencias', baseValue: 48000 },
  { code: '990101', name: 'Atención al recién nacido', baseValue: 100000 },
  { code: '860201', name: 'Fisioterapia integral', baseValue: 22000 },
  { code: '930801', name: 'Terapia de lenguaje individual', baseValue: 25000 },
  { code: '620101', name: 'Parto vaginal atención', baseValue: 720000 },
];

export function generateTarifarioRecords(type: TarifarioType, adjustmentFactor: number = 1.0): TarifarioRecord[] {
  const services = type === 'soat' ? SOAT_SERVICES : ISS_SERVICES;
  
  return services.map((service, index) => ({
    id: `TAR-${type.toUpperCase()}-${String(index + 1).padStart(4, '0')}`,
    tarifarioType: type,
    serviceCode: service.code,
    serviceName: service.name,
    baseValue: service.baseValue,
    adjustmentFactor,
    finalValue: Math.round(service.baseValue * adjustmentFactor),
  }));
}

export function calculateTarifarioSummary(records: TarifarioRecord[]): TarifarioSummary {
  if (records.length === 0) {
    return {
      type: 'soat',
      totalServices: 0,
      lastUpdate: new Date().toISOString(),
    };
  }
  
  return {
    type: records[0].tarifarioType,
    totalServices: records.length,
    lastUpdate: new Date().toISOString(),
  };
}

// LocalStorage key
const TARIFARIOS_STORAGE_KEY = 'nota-tecnica-tarifarios';

// Storage utilities
export function getStoredTarifarios(): Record<TarifarioType, TarifarioRecord[]> {
  if (typeof window === 'undefined') {
    return {
      soat: generateTarifarioRecords('soat'),
      iss: generateTarifarioRecords('iss', 0.85),
      custom: [],
    };
  }
  
  const stored = localStorage.getItem(TARIFARIOS_STORAGE_KEY);
  if (!stored) {
    const defaultTarifarios = {
      soat: generateTarifarioRecords('soat'),
      iss: generateTarifarioRecords('iss', 0.85),
      custom: [],
    };
    localStorage.setItem(TARIFARIOS_STORAGE_KEY, JSON.stringify(defaultTarifarios));
    return defaultTarifarios;
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return {
      soat: generateTarifarioRecords('soat'),
      iss: generateTarifarioRecords('iss', 0.85),
      custom: [],
    };
  }
}

export function saveTarifarios(tarifarios: Record<TarifarioType, TarifarioRecord[]>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TARIFARIOS_STORAGE_KEY, JSON.stringify(tarifarios));
}

export function updateTarifario(type: TarifarioType, records: TarifarioRecord[]): void {
  const tarifarios = getStoredTarifarios();
  tarifarios[type] = records;
  saveTarifarios(tarifarios);
}

// Pre-generated mock data
export const MOCK_SOAT_TARIFARIO = generateTarifarioRecords('soat');
export const MOCK_ISS_TARIFARIO = generateTarifarioRecords('iss', 0.85);
