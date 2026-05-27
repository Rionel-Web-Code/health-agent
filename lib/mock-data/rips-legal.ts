import type {
  RipsTransaccion,
  RipsUsuario,
  RipsConsulta,
  RipsProcedimiento,
  RipsMedicamento,
} from '@/lib/types/rips-legal';
import { createEmptyServicios } from '@/lib/types/rips-legal';

const CUPS_CONSULTAS = ['890201', '890301', '890401', '890501', '890701'];
const CUPS_PROCEDIMIENTOS = ['881301', '883101', '871111', '901301', '902201'];
const ATC_CODES = ['J01CA04', 'N02BE01', 'M01AE01', 'A02BC01', 'C09AA02'];

const CIE10_CODES = [
  'J00', 'J06', 'J20', 'K29', 'K30', 'K59',
  'I10', 'I11', 'I15', 'E11', 'E14',
  'M54', 'M79', 'F32', 'F41', 'Z00', 'Z01',
];

const DOC_TYPES_BY_AGE: Record<string, string[]> = {
  child: ['RC'],
  teen: ['TI'],
  adult: ['CC'],
};

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function docTypeForAge(age: number): string {
  if (age <= 6) return rand(DOC_TYPES_BY_AGE.child);
  if (age <= 17) return rand(DOC_TYPES_BY_AGE.teen);
  return rand(DOC_TYPES_BY_AGE.adult);
}

/**
 * Generate a legally-structured RIPS JSON transaction per Resolución 00002275/2023 Annex 1.
 */
export function generateLegalRipsTransaction(
  nit: string = '900000000',
  facturaNum: string | null = 'FAC00000001',
  userCount: number = 3,
): RipsTransaccion {
  const usuarios: RipsUsuario[] = [];

  for (let i = 0; i < userCount; i++) {
    const age = randInt(1, 85);
    const sex = Math.random() < 0.5 ? 'M' : 'F';
    const birthYear = new Date().getFullYear() - age;
    const birthDate = `${birthYear}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;
    const docNum = String(randInt(10000000, 9999999999));

    const servicios = createEmptyServicios();

    // Add a random consultation
    if (Math.random() < 0.7) {
      const consulta: RipsConsulta = {
        codPrestador: '050010101101',
        fechaInicioAtencion: `${dateStr(new Date())} ${String(randInt(7, 18)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}`,
        numAutorizacion: Math.random() < 0.5 ? `AUT${randInt(100000, 999999)}` : null,
        codConsulta: rand(CUPS_CONSULTAS),
        modalidadGrupoServicioTecSal: '01',
        grupoServicios: '01',
        codServicio: '101',
        finalidadTecnologiaSalud: '01',
        causaMotivoAtencion: '01',
        codDiagnosticoPrincipal: rand(CIE10_CODES),
        codDiagnosticoRelacionado1: null,
        codDiagnosticoRelacionado2: null,
        codDiagnosticoRelacionado3: null,
        tipoDiagnosticoPrincipal: '01',
        tipoPagoModerador: '01',
        vrServicio: randInt(25000, 80000),
        valorPagoModerador: 0,
        numFEVPagoModerador: null,
        consecutivo: i + 1,
      };
      servicios.consultas.push(consulta);
    }

    // Add a random procedure
    if (Math.random() < 0.4) {
      const proc: RipsProcedimiento = {
        codPrestador: '050010101101',
        fechaInicioAtencion: `${dateStr(new Date())} ${String(randInt(7, 18)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}`,
        numAutorizacion: `AUT${randInt(100000, 999999)}`,
        codProcedimiento: rand(CUPS_PROCEDIMIENTOS),
        viaIngresoServicioSalud: '01',
        modalidadGrupoServicioTecSal: '01',
        grupoServicios: '01',
        codServicio: '101',
        finalidadTecnologiaSalud: '01',
        tipoDocumentoIdentificacion: '01',
        codDiagnosticoPrincipal: rand(CIE10_CODES),
        codDiagnosticoRelacionado: null,
        codComplicacion: null,
        vrServicio: randInt(50000, 500000),
        valorPagoModerador: 0,
        numFEVPagoModerador: null,
        consecutivo: i + 1,
      };
      servicios.procedimientos.push(proc);
    }

    // Add a random medication
    if (Math.random() < 0.5) {
      const med: RipsMedicamento = {
        codPrestador: '050010101101',
        numAutorizacion: null,
        codMedicamento: rand(ATC_CODES),
        tipoMedicamento: '01',
        nombreGenericoMedicamento: 'Medicamento genérico',
        formaFarmaceutica: 'Tableta',
        concentracionMedicamento: '500mg',
        unidadMedidaMedicamento: 'mg',
        numeroDosisUsada: randInt(1, 3),
        unidadMedidaDosis: 'Tableta',
        cantidadMedicamento: randInt(1, 30),
        diasTratamiento: randInt(3, 30),
        tipoDocumentoIdentificacion: docTypeForAge(age),
        numDocumentoIdentificacion: docNum,
        vrUnitMedicamento: randInt(500, 15000),
        vrServicio: randInt(5000, 150000),
        valorPagoModerador: 0,
        numFEVPagoModerador: null,
        consecutivo: i + 1,
      };
      servicios.medicamentos.push(med);
    }

    const usuario: RipsUsuario = {
      tipoDocumentoIdentificacion: docTypeForAge(age),
      numDocumentoIdentificacion: docNum,
      tipoUsuario: '01',
      fechaNacimiento: birthDate,
      codSexo: sex,
      codPaisResidencia: '170',
      codMunicipioResidencia: '05001',
      codZonaTerritorialResidencia: '01',
      incapacidad: 'NO',
      consecutivo: i + 1,
      codPaisOrigen: '170',
      servicios,
    };

    usuarios.push(usuario);
  }

  return {
    numDocumentoIdObligado: nit,
    numFactura: facturaNum,
    tipoNota: null,
    numNota: null,
    usuarios,
  };
}

const LEGAL_RIPS_STORAGE_KEY = 'nota-tecnica-rips-legal';

export function getStoredLegalRips(): RipsTransaccion[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LEGAL_RIPS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveLegalRips(transactions: RipsTransaccion[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEGAL_RIPS_STORAGE_KEY, JSON.stringify(transactions));
}

export function addLegalRips(transaction: RipsTransaccion): RipsTransaccion[] {
  const existing = getStoredLegalRips();
  existing.push(transaction);
  saveLegalRips(existing);
  return existing;
}

export function clearLegalRips(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGAL_RIPS_STORAGE_KEY);
}

export function generateMockLegalRips(count: number = 5): RipsTransaccion[] {
  return Array.from({ length: count }, (_, i) =>
    generateLegalRipsTransaction(
      '900000000',
      `FAC${String(i + 1).padStart(8, '0')}`,
      randInt(1, 5),
    ),
  );
}

export const MOCK_LEGAL_RIPS = generateMockLegalRips(5);
