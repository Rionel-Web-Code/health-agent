/**
 * RIPS data types matching the mandatory JSON structure from
 * Resolución 00002275 de 2023, Anexo Técnico N° 1.
 *
 * Property names MUST match the resolution exactly (case-sensitive).
 * Article 8 Parágrafo 1 prohibits modifying field names or structure.
 */

// ============================================================================
// 3.1 Datos relativos a la transacción (Root object)
// ============================================================================

export interface RipsTransaccion {
  /** T01 — NIT del facturador electrónico en salud (9 chars) */
  numDocumentoIdObligado: string;
  /** T02 — Número de factura electrónica de venta (null if RIPS sin factura) */
  numFactura: string | null;
  /** T03 — Tipo de nota: tabla "TipoNota" (null if not a note) */
  tipoNota: string | null;
  /** T04 — Número de la nota crédito/débito/ajuste (null if not a note) */
  numNota: string | null;
  /** Array of users/patients in this transaction */
  usuarios: RipsUsuario[];
}

// ============================================================================
// 3.2 Datos relativos a los usuarios
// ============================================================================

export interface RipsUsuario {
  /** U01 — Tipo de documento: tabla "TipoIdPISIS" (CC, TI, RC, CE, PA, AS, MS, etc.) */
  tipoDocumentoIdentificacion: string;
  /** U02 — Número de documento de identificación (4-20 chars) */
  numDocumentoIdentificacion: string;
  /** U03 — Tipo de usuario: tabla "RIPSTipoUsuarioVersion2" */
  tipoUsuario: string;
  /** U04 — Fecha de nacimiento (AAAA-MM-DD) */
  fechaNacimiento: string;
  /** U05 — Sexo: tabla "Sexo" (M, F, I) */
  codSexo: string;
  /** U06 — Código del país de residencia (ISO 3166-1 alpha-3, 3 chars) */
  codPaisResidencia: string;
  /** U07 — Código del municipio de residencia DANE (5 chars, null if foreign) */
  codMunicipioResidencia: string | null;
  /** U08 — Zona territorial: tabla "ZonaVersion2" (null if foreign) */
  codZonaTerritorialResidencia: string | null;
  /** U09 — Incapacidad: "SI" | "NO" */
  incapacidad: string;
  /** U10 — Consecutivo del usuario dentro de la transacción (starts at 1) */
  consecutivo: number;
  /** U11 — Código del país de origen/nacimiento (ISO 3166-1, 3 chars) */
  codPaisOrigen: string;
  /** Servicios prestados a este usuario */
  servicios: RipsServicios;
}

// ============================================================================
// 3.3 Objeto servicios
// ============================================================================

export interface RipsServicios {
  consultas: RipsConsulta[];
  procedimientos: RipsProcedimiento[];
  urgencias: RipsUrgencia[];
  hospitalizacion: RipsHospitalizacion[];
  recienNacidos: RipsRecienNacido[];
  medicamentos: RipsMedicamento[];
  otrosServicios: RipsOtroServicio[];
}

// ============================================================================
// 3.3.1 Datos de las consultas
// ============================================================================

export interface RipsConsulta {
  /** CO1 — Código del prestador habilitado (12 chars) */
  codPrestador: string;
  /** CO2 — Fecha y hora de inicio de la consulta (AAAA-MM-DD HH:MM) */
  fechaInicioAtencion: string;
  /** CO3 — Número de autorización (null if not required) */
  numAutorizacion: string | null;
  /** CO4 — Código CUPS de la consulta (6 chars) */
  codConsulta: string;
  /** CO5 — Modalidad del grupo de servicio: tabla "ModalidadAtencion" */
  modalidadGrupoServicioTecSal: string;
  /** CO6 — Grupo de servicios: tabla "GrupoServicios" */
  grupoServicios: string;
  /** CO7 — Código del servicio: tabla "Servicios" */
  codServicio: string;
  /** CO8 — Finalidad de la consulta: tabla "RIPSFinalidadConsultaVersion2" */
  finalidadTecnologiaSalud: string;
  /** CO9 — Causa que motiva la atención: tabla "RIPSCausaExternaVersion2" */
  causaMotivoAtencion: string;
  /** CO10 — Diagnóstico principal CIE-10 (4-25 chars) */
  codDiagnosticoPrincipal: string;
  /** CO11 — Diagnóstico relacionado 1 (null if N/A) */
  codDiagnosticoRelacionado1: string | null;
  /** CO12 — Diagnóstico relacionado 2 (null if N/A) */
  codDiagnosticoRelacionado2: string | null;
  /** CO13 — Diagnóstico relacionado 3 (null if N/A) */
  codDiagnosticoRelacionado3: string | null;
  /** CO14 — Tipo de diagnóstico principal: tabla "TipoDiagnosticoPrincipal" */
  tipoDiagnosticoPrincipal: string;
  /** CO15 — Tipo de pago moderador: tabla "TipoPagoModerador" */
  tipoPagoModerador: string;
  /** CO16 — Valor de la consulta (positive integer) */
  vrServicio: number;
  /** CO17 — Valor del pago moderador (copago/cuota moderadora) */
  valorPagoModerador: number;
  /** CO18 — Número de la autorización FEV (null if N/A) */
  numFEVPagoModerador: string | null;
  /** CO19 — Consecutivo (matches usuario.consecutivo) */
  consecutivo: number;
}

// ============================================================================
// 3.3.2 Datos de los procedimientos
// ============================================================================

export interface RipsProcedimiento {
  codPrestador: string;
  fechaInicioAtencion: string;
  numAutorizacion: string | null;
  codProcedimiento: string;
  viaIngresoServicioSalud: string;
  modalidadGrupoServicioTecSal: string;
  grupoServicios: string;
  codServicio: string;
  finalidadTecnologiaSalud: string;
  tipoDocumentoIdentificacion: string;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  codComplicacion: string | null;
  vrServicio: number;
  valorPagoModerador: number;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

// ============================================================================
// 3.3.3 Datos de la urgencia con observación
// ============================================================================

export interface RipsUrgencia {
  codPrestador: string;
  fechaInicioAtencion: string;
  causaMotivoAtencion: string;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  destino: string;
  estadoSalida: string;
  causaBasicaMuerte: string | null;
  fechaInicioObservacion: string | null;
  fechaFinObservacion: string | null;
  consecutivo: number;
}

// ============================================================================
// 3.3.4 Datos de hospitalización
// ============================================================================

export interface RipsHospitalizacion {
  codPrestador: string;
  viaIngresoServicioSalud: string;
  fechaInicioAtencion: string;
  numAutorizacion: string | null;
  causaMotivoAtencion: string;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  codComplicacion: string | null;
  estadoSalida: string;
  causaBasicaMuerte: string | null;
  fechaEgreso: string;
  consecutivo: number;
}

// ============================================================================
// 3.3.5 Datos de recién nacidos
// ============================================================================

export interface RipsRecienNacido {
  codPrestador: string;
  fechaNacimiento: string;
  edadGestacional: number;
  numConsultasCPrenatal: number;
  codSexo: string;
  peso: number;
  codDiagnosticoPrincipal: string;
  condicionDestinoUsuarioEgreso: string;
  codDiagnosticoCausaMuerte: string | null;
  fechaEgreso: string;
  consecutivo: number;
}

// ============================================================================
// 3.3.6 Datos de medicamentos
// ============================================================================

export interface RipsMedicamento {
  codPrestador: string;
  numAutorizacion: string | null;
  codMedicamento: string;
  tipoMedicamento: string;
  nombreGenericoMedicamento: string;
  formaFarmaceutica: string;
  concentracionMedicamento: string;
  unidadMedidaMedicamento: string;
  numeroDosisUsada: number;
  unidadMedidaDosis: string;
  cantidadMedicamento: number;
  diasTratamiento: number;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  vrUnitMedicamento: number;
  vrServicio: number;
  valorPagoModerador: number;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

// ============================================================================
// 3.3.7 Datos de otros servicios
// ============================================================================

export interface RipsOtroServicio {
  codPrestador: string;
  numAutorizacion: string | null;
  codTecnologiaSalud: string;
  nomTecnologiaSalud: string;
  cantidadOS: number;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  vrUnitOS: number;
  vrServicio: number;
  valorPagoModerador: number;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

// ============================================================================
// Helper: empty servicios skeleton
// ============================================================================

export function createEmptyServicios(): RipsServicios {
  return {
    consultas: [],
    procedimientos: [],
    urgencias: [],
    hospitalizacion: [],
    recienNacidos: [],
    medicamentos: [],
    otrosServicios: [],
  };
}

// ============================================================================
// Validation result
// ============================================================================

export type RipsValidationSeverity = 'R' | 'N'; // Rechazo | Notificación

export interface RipsValidationResult {
  ruleId: string;
  severity: RipsValidationSeverity;
  field?: string;
  message: string;
  messageId: string;
}

export type RipsValidationStatus = 'APROBADO' | 'RECHAZADO' | 'NOTIFICADO';
