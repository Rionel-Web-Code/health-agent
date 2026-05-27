/**
 * Three-layer RIPS validation engine per Resolución 00002275/2023
 * Anexo Técnico N° 1, Section 1.2.
 *
 * Layer 1 — Structure: JSON syntax, property names, required properties
 * Layer 2 — Content: field values, sizes, types, reference table lookups
 * Layer 3 — Relationship: cross-field consistency, FEV correlation
 *
 * Each rule is tagged R (Rechazo) or N (Notificación).
 */

import type {
  RipsTransaccion,
  RipsUsuario,
  RipsConsulta,
  RipsProcedimiento,
  RipsMedicamento,
  RipsValidationResult,
  RipsValidationStatus,
} from '@/lib/types/rips-legal';

// ============================================================================
// Reference tables (subsets for MVP; production would query web.sispro.gov.co)
// ============================================================================

const VALID_DOC_TYPES = new Set([
  'RC', 'TI', 'CC', 'CE', 'PA', 'CD', 'SC', 'PE', 'AS', 'MS', 'CN', 'DE', 'PT',
]);

const VALID_SEX_CODES = new Set(['M', 'F', 'I']);

const VALID_TIPO_USUARIO = new Set([
  '01', '02', '03', '04', '05', '06', '07', '08',
]);

const VALID_ZONA = new Set(['01', '02', '03']);

const VALID_SI_NO = new Set(['SI', 'NO']);

const ISO_3166_COUNTRIES = new Set(['170', '032', '076', '152', '218', '484', '604', '858', '862']);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const NIT_REGEX = /^\d{9}$/;

// ============================================================================
// Validation engine
// ============================================================================

export function validateRips(transaction: RipsTransaccion): {
  results: RipsValidationResult[];
  status: RipsValidationStatus;
} {
  const results: RipsValidationResult[] = [];

  // Layer 1: Structure
  results.push(...validateStructure(transaction));

  // Layer 2: Content
  results.push(...validateContent(transaction));

  // Layer 3: Relationship
  results.push(...validateRelationships(transaction));

  const hasRejection = results.some(r => r.severity === 'R');
  const hasNotification = results.some(r => r.severity === 'N');

  let status: RipsValidationStatus;
  if (hasRejection) {
    status = 'RECHAZADO';
  } else if (hasNotification) {
    status = 'NOTIFICADO';
  } else {
    status = 'APROBADO';
  }

  return { results, status };
}

// ============================================================================
// Layer 1 — Structure validations
// ============================================================================

function validateStructure(tx: RipsTransaccion): RipsValidationResult[] {
  const errors: RipsValidationResult[] = [];

  if (!tx.numDocumentoIdObligado) {
    errors.push({
      ruleId: 'RVE01',
      severity: 'R',
      field: 'numDocumentoIdObligado',
      message: 'El campo numDocumentoIdObligado es obligatorio',
      messageId: 'MSG001',
    });
  }

  if (!Array.isArray(tx.usuarios) || tx.usuarios.length === 0) {
    errors.push({
      ruleId: 'RVE02',
      severity: 'R',
      field: 'usuarios',
      message: 'El arreglo usuarios es obligatorio y debe contener al menos un usuario',
      messageId: 'MSG002',
    });
    return errors;
  }

  for (let i = 0; i < tx.usuarios.length; i++) {
    const u = tx.usuarios[i];
    const prefix = `usuarios[${i}]`;

    const requiredFields: (keyof RipsUsuario)[] = [
      'tipoDocumentoIdentificacion',
      'numDocumentoIdentificacion',
      'tipoUsuario',
      'fechaNacimiento',
      'codSexo',
      'codPaisResidencia',
      'incapacidad',
      'consecutivo',
      'codPaisOrigen',
    ];

    for (const field of requiredFields) {
      if (u[field] === undefined || u[field] === null || u[field] === '') {
        errors.push({
          ruleId: 'RVE03',
          severity: 'R',
          field: `${prefix}.${field}`,
          message: `El campo ${field} es obligatorio en el usuario ${i + 1}`,
          messageId: 'MSG003',
        });
      }
    }

    if (!u.servicios) {
      errors.push({
        ruleId: 'RVE04',
        severity: 'R',
        field: `${prefix}.servicios`,
        message: `El objeto servicios es obligatorio en el usuario ${i + 1}`,
        messageId: 'MSG004',
      });
    }
  }

  return errors;
}

// ============================================================================
// Layer 2 — Content validations
// ============================================================================

function validateContent(tx: RipsTransaccion): RipsValidationResult[] {
  const errors: RipsValidationResult[] = [];

  // T01: NIT validation
  if (tx.numDocumentoIdObligado && !NIT_REGEX.test(tx.numDocumentoIdObligado)) {
    errors.push({
      ruleId: 'RVC01',
      severity: 'R',
      field: 'numDocumentoIdObligado',
      message: 'El NIT debe ser numérico de 9 dígitos',
      messageId: 'MSG010',
    });
  }

  for (let i = 0; i < (tx.usuarios ?? []).length; i++) {
    const u = tx.usuarios[i];
    const prefix = `usuarios[${i}]`;

    // U01: Document type
    if (u.tipoDocumentoIdentificacion && !VALID_DOC_TYPES.has(u.tipoDocumentoIdentificacion)) {
      errors.push({
        ruleId: 'RVC02',
        severity: 'R',
        field: `${prefix}.tipoDocumentoIdentificacion`,
        message: `Tipo de documento "${u.tipoDocumentoIdentificacion}" no es válido según tabla TipoIdPISIS`,
        messageId: 'MSG011',
      });
    }

    // U02: Document number length
    if (u.numDocumentoIdentificacion) {
      const len = u.numDocumentoIdentificacion.length;
      if (len < 4 || len > 20) {
        errors.push({
          ruleId: 'RVC03',
          severity: 'R',
          field: `${prefix}.numDocumentoIdentificacion`,
          message: `El número de documento debe tener entre 4 y 20 caracteres (tiene ${len})`,
          messageId: 'MSG012',
        });
      }
    }

    // U03: Tipo usuario
    if (u.tipoUsuario && !VALID_TIPO_USUARIO.has(u.tipoUsuario)) {
      errors.push({
        ruleId: 'RVC04',
        severity: 'R',
        field: `${prefix}.tipoUsuario`,
        message: `Tipo de usuario "${u.tipoUsuario}" no es válido según tabla RIPSTipoUsuarioVersion2`,
        messageId: 'MSG013',
      });
    }

    // U04: Fecha nacimiento format
    if (u.fechaNacimiento && !DATE_REGEX.test(u.fechaNacimiento)) {
      errors.push({
        ruleId: 'RVC05',
        severity: 'R',
        field: `${prefix}.fechaNacimiento`,
        message: 'La fecha de nacimiento debe tener formato AAAA-MM-DD',
        messageId: 'MSG014',
      });
    }

    // U04: Fecha nacimiento calendar validity + future check
    if (u.fechaNacimiento && DATE_REGEX.test(u.fechaNacimiento)) {
      const parsed = new Date(u.fechaNacimiento);
      const [yStr, mStr, dStr] = u.fechaNacimiento.split('-');
      const roundTripsCorrectly =
        !isNaN(parsed.getTime()) &&
        parsed.getUTCFullYear() === Number(yStr) &&
        parsed.getUTCMonth() + 1 === Number(mStr) &&
        parsed.getUTCDate() === Number(dStr);
      if (!roundTripsCorrectly) {
        errors.push({
          ruleId: 'RVC05B',
          severity: 'R',
          field: `${prefix}.fechaNacimiento`,
          message: 'La fecha de nacimiento no es una fecha de calendario válida',
          messageId: 'MSG014B',
        });
      } else if (parsed > new Date()) {
        errors.push({
          ruleId: 'RVC06',
          severity: 'R',
          field: `${prefix}.fechaNacimiento`,
          message: 'La fecha de nacimiento no puede ser mayor a la fecha actual',
          messageId: 'MSG015',
        });
      }
    }

    // U05: Sex code
    if (u.codSexo && !VALID_SEX_CODES.has(u.codSexo)) {
      errors.push({
        ruleId: 'RVC07',
        severity: 'R',
        field: `${prefix}.codSexo`,
        message: `Código de sexo "${u.codSexo}" no es válido según tabla Sexo`,
        messageId: 'MSG016',
      });
    }

    // U06: Country code
    if (u.codPaisResidencia && u.codPaisResidencia.length !== 3) {
      errors.push({
        ruleId: 'RVC08',
        severity: 'R',
        field: `${prefix}.codPaisResidencia`,
        message: 'El código de país debe tener 3 caracteres (ISO 3166-1)',
        messageId: 'MSG017',
      });
    }

    // U07: Municipality required if Colombia
    if (u.codPaisResidencia === '170' && !u.codMunicipioResidencia) {
      errors.push({
        ruleId: 'RVC09',
        severity: 'R',
        field: `${prefix}.codMunicipioResidencia`,
        message: 'El código de municipio es obligatorio cuando el país es Colombia',
        messageId: 'MSG018',
      });
    }

    // U07: Municipality format
    if (u.codMunicipioResidencia && u.codMunicipioResidencia.length !== 5) {
      errors.push({
        ruleId: 'RVC10',
        severity: 'R',
        field: `${prefix}.codMunicipioResidencia`,
        message: 'El código de municipio DANE debe tener 5 caracteres',
        messageId: 'MSG019',
      });
    }

    // U08: Zona territorial
    if (u.codZonaTerritorialResidencia && !VALID_ZONA.has(u.codZonaTerritorialResidencia)) {
      errors.push({
        ruleId: 'RVC11',
        severity: 'N',
        field: `${prefix}.codZonaTerritorialResidencia`,
        message: `Zona territorial "${u.codZonaTerritorialResidencia}" no es válida según tabla ZonaVersion2`,
        messageId: 'MSG020',
      });
    }

    if (u.codPaisResidencia === '170' && !u.codZonaTerritorialResidencia) {
      errors.push({
        ruleId: 'RVC11B',
        severity: 'R',
        field: `${prefix}.codZonaTerritorialResidencia`,
        message: 'La zona territorial es obligatoria cuando el país es Colombia',
        messageId: 'MSG020B',
      });
    }

    // U09: Incapacidad
    if (u.incapacidad && !VALID_SI_NO.has(u.incapacidad)) {
      errors.push({
        ruleId: 'RVC12',
        severity: 'R',
        field: `${prefix}.incapacidad`,
        message: 'El campo incapacidad debe ser "SI" o "NO"',
        messageId: 'MSG021',
      });
    }

    // U10: Consecutivo > 0
    if (typeof u.consecutivo !== 'number' || !Number.isFinite(u.consecutivo) || !Number.isInteger(u.consecutivo) || u.consecutivo < 1) {
      errors.push({
        ruleId: 'RVC13',
        severity: 'R',
        field: `${prefix}.consecutivo`,
        message: 'El consecutivo debe ser un número positivo mayor a cero',
        messageId: 'MSG022',
      });
    }

    // Validate service dates in consultas
    if (u.servicios?.consultas) {
      for (let j = 0; j < u.servicios.consultas.length; j++) {
        const c = u.servicios.consultas[j];
        const cPrefix = `${prefix}.servicios.consultas[${j}]`;

        if (!c.codPrestador || c.codPrestador.length !== 12) {
          errors.push({
            ruleId: 'RVC14',
            severity: 'R',
            field: `${cPrefix}.codPrestador`,
            message: 'El código del prestador debe tener 12 caracteres',
            messageId: 'MSG030',
          });
        }

        if (c.fechaInicioAtencion && !DATETIME_REGEX.test(c.fechaInicioAtencion)) {
          errors.push({
            ruleId: 'RVC15',
            severity: 'R',
            field: `${cPrefix}.fechaInicioAtencion`,
            message: 'La fecha de inicio debe tener formato AAAA-MM-DD HH:MM',
            messageId: 'MSG031',
          });
        }

        if (c.codConsulta && c.codConsulta.length !== 6) {
          errors.push({
            ruleId: 'RVC16',
            severity: 'R',
            field: `${cPrefix}.codConsulta`,
            message: 'El código CUPS de consulta debe tener 6 caracteres',
            messageId: 'MSG032',
          });
        }

        // RVG01: Values must be positive
        if (typeof c.vrServicio === 'number' && c.vrServicio < 0) {
          errors.push({
            ruleId: 'RVG01',
            severity: 'R',
            field: `${cPrefix}.vrServicio`,
            message: 'Los valores monetarios deben ser positivos o cero',
            messageId: 'MSG040',
          });
        }
      }
    }

    // Validate medications
    if (u.servicios?.medicamentos) {
      for (let j = 0; j < u.servicios.medicamentos.length; j++) {
        const m = u.servicios.medicamentos[j];
        const mPrefix = `${prefix}.servicios.medicamentos[${j}]`;

        if (typeof m.cantidadMedicamento === 'number' && m.cantidadMedicamento <= 0) {
          errors.push({
            ruleId: 'RVG01',
            severity: 'R',
            field: `${mPrefix}.cantidadMedicamento`,
            message: 'La cantidad de medicamento debe ser mayor a cero',
            messageId: 'MSG041',
          });
        }

        if (typeof m.vrServicio === 'number' && m.vrServicio < 0) {
          errors.push({
            ruleId: 'RVG01',
            severity: 'R',
            field: `${mPrefix}.vrServicio`,
            message: 'Los valores monetarios deben ser positivos o cero',
            messageId: 'MSG042',
          });
        }
      }
    }
  }

  return errors;
}

// ============================================================================
// Layer 3 — Relationship validations
// ============================================================================

function validateRelationships(tx: RipsTransaccion): RipsValidationResult[] {
  const errors: RipsValidationResult[] = [];

  // Check consecutivo uniqueness across usuarios
  const consecutivos = new Set<number>();
  for (let i = 0; i < (tx.usuarios ?? []).length; i++) {
    const u = tx.usuarios[i];
    if (consecutivos.has(u.consecutivo)) {
      errors.push({
        ruleId: 'RVR01',
        severity: 'R',
        field: `usuarios[${i}].consecutivo`,
        message: `El consecutivo ${u.consecutivo} está duplicado entre usuarios`,
        messageId: 'MSG050',
      });
    }
    consecutivos.add(u.consecutivo);
  }

  for (let i = 0; i < (tx.usuarios ?? []).length; i++) {
    const u = tx.usuarios[i];
    if (u.servicios) {
      const totalServices =
        (u.servicios.consultas?.length ?? 0) +
        (u.servicios.procedimientos?.length ?? 0) +
        (u.servicios.urgencias?.length ?? 0) +
        (u.servicios.hospitalizacion?.length ?? 0) +
        (u.servicios.recienNacidos?.length ?? 0) +
        (u.servicios.medicamentos?.length ?? 0) +
        (u.servicios.otrosServicios?.length ?? 0);
      if (totalServices === 0) {
        errors.push({
          ruleId: 'RVR08',
          severity: 'N',
          field: `usuarios[${i}].servicios`,
          message: `El usuario ${i + 1} no tiene ningún servicio registrado`,
          messageId: 'MSG058',
        });
      }
    }
  }

  // U04 vs tipoDocumentoIdentificacion age-based rules
  for (let i = 0; i < (tx.usuarios ?? []).length; i++) {
    const u = tx.usuarios[i];
    const prefix = `usuarios[${i}]`;

    if (u.fechaNacimiento && DATE_REGEX.test(u.fechaNacimiento)) {
      const age = calculateAge(u.fechaNacimiento);

      // Children <= 6: should use RC
      if (age <= 6 && u.tipoDocumentoIdentificacion === 'CC') {
        errors.push({
          ruleId: 'RVR02',
          severity: 'N',
          field: `${prefix}.tipoDocumentoIdentificacion`,
          message: `Usuario de ${age} años debería tener tipo de documento RC (Registro Civil), no CC`,
          messageId: 'MSG051',
        });
      }

      // 7-17: should use TI
      if (age >= 7 && age <= 17 && u.tipoDocumentoIdentificacion === 'CC') {
        errors.push({
          ruleId: 'RVR03',
          severity: 'N',
          field: `${prefix}.tipoDocumentoIdentificacion`,
          message: `Usuario de ${age} años debería tener tipo de documento TI (Tarjeta de Identidad), no CC`,
          messageId: 'MSG052',
        });
      }

      // Recién nacidos: mother must be female
      if (u.servicios?.recienNacidos && u.servicios.recienNacidos.length > 0) {
        if (u.codSexo !== 'F') {
          errors.push({
            ruleId: 'RVR04',
            severity: 'R',
            field: `${prefix}.codSexo`,
            message: 'Cuando se informan datos de recién nacido, el usuario debe tener sexo Femenino',
            messageId: 'MSG053',
          });
        }

        if (age < 9 || age > 60) {
          errors.push({
            ruleId: 'RVR05',
            severity: 'N',
            field: `${prefix}.fechaNacimiento`,
            message: `Si se informan datos de recién nacido, la edad de la madre debe estar entre 9 y 60 años (tiene ${age})`,
            messageId: 'MSG054',
          });
        }
      }
    }

    // Validate consultation dates are not before birth date
    if (u.servicios?.consultas && u.fechaNacimiento) {
      for (let j = 0; j < u.servicios.consultas.length; j++) {
        const c = u.servicios.consultas[j];
        if (c.fechaInicioAtencion) {
          const atencionDate = c.fechaInicioAtencion.split(' ')[0];
          if (atencionDate < u.fechaNacimiento) {
            errors.push({
              ruleId: 'RVR06',
              severity: 'R',
              field: `${prefix}.servicios.consultas[${j}].fechaInicioAtencion`,
              message: 'La fecha de atención no puede ser anterior a la fecha de nacimiento del usuario',
              messageId: 'MSG055',
            });
          }
        }
      }
    }

    const allServices = [
      ...(u.servicios?.consultas ?? []),
      ...(u.servicios?.procedimientos ?? []),
      ...(u.servicios?.urgencias ?? []),
      ...(u.servicios?.hospitalizacion ?? []),
      ...(u.servicios?.recienNacidos ?? []),
      ...(u.servicios?.medicamentos ?? []),
      ...(u.servicios?.otrosServicios ?? []),
    ];
    for (const svc of allServices) {
      if ('consecutivo' in svc && (svc as { consecutivo: number }).consecutivo !== u.consecutivo) {
        errors.push({
          ruleId: 'RVR09',
          severity: 'R',
          field: `${prefix}.servicios`,
          message: `Consecutivo del servicio (${(svc as { consecutivo: number }).consecutivo}) no coincide con el consecutivo del usuario (${u.consecutivo})`,
          messageId: 'MSG059',
        });
        break;
      }
    }

    // CIE-10 codes cannot be external cause codes (V01-Y98) for diagnóstico principal
    if (u.servicios?.consultas) {
      for (let j = 0; j < u.servicios.consultas.length; j++) {
        const c = u.servicios.consultas[j];
        if (c.codDiagnosticoPrincipal) {
          const code = c.codDiagnosticoPrincipal.toUpperCase();
          if (/^[VWXY]\d{2}/.test(code)) {
            errors.push({
              ruleId: 'RVR07',
              severity: 'R',
              field: `${prefix}.servicios.consultas[${j}].codDiagnosticoPrincipal`,
              message: 'El diagnóstico principal no puede ser de causas externas de morbilidad/mortalidad (V01-Y98)',
              messageId: 'MSG056',
            });
          }
        }
      }
    }
  }

  return errors;
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
