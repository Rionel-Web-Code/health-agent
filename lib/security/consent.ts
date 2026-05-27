/**
 * Consent management for Ley Estatutaria 1581/2012 compliance.
 *
 * Health data is classified as "dato sensible" under Colombian law. Processing
 * requires prior, express, and informed consent. This module tracks consent
 * state per authenticated user-session and blocks data operations when consent
 * has not been granted.
 */

export interface ConsentRecord {
  userId: string;
  grantedAt: string;
  version: string;
  purposes: ConsentPurpose[];
  revokedAt?: string;
}

export type ConsentPurpose =
  | 'RIPS_PROCESSING'
  | 'POPULATION_PROCESSING'
  | 'CONTRACT_MANAGEMENT'
  | 'DATA_ANALYTICS'
  | 'DATA_TRANSFER_MINSALUD';

export const CURRENT_CONSENT_VERSION = '1.0.0';

const CONSENT_STORAGE_KEY = 'nota-tecnica-consent';

export const CONSENT_POLICY_TEXT = {
  es: {
    title: 'Política de Tratamiento de Datos Personales',
    intro:
      'En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, le informamos que sus datos personales y datos sensibles de salud serán tratados conforme a la presente política.',
    purposes: [
      'Procesamiento de Registros Individuales de Prestación de Servicios de Salud (RIPS) según la Resolución 00002275 de 2023.',
      'Gestión de datos de población beneficiaria para notas técnicas de contratos de salud.',
      'Administración de contratos entre EPS e IPS conforme al Decreto 441 de 2022.',
      'Análisis estadístico y generación de informes para la gestión de servicios de salud.',
      'Transmisión de datos al Ministerio de Salud y Protección Social a través del mecanismo único de validación.',
    ],
    rights:
      'Usted tiene derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos personales. Para ejercer estos derechos puede comunicarse a través de los canales habilitados.',
    acceptance: 'Al hacer clic en "Aceptar", usted otorga su consentimiento previo, expreso e informado para el tratamiento de datos personales y datos sensibles de salud conforme a los fines descritos.',
  },
  en: {
    title: 'Personal Data Processing Policy',
    intro:
      'In compliance with Statutory Law 1581 of 2012 and Decree 1377 of 2013, we inform you that your personal data and sensitive health data will be processed in accordance with this policy.',
    purposes: [
      'Processing of Individual Health Service Delivery Records (RIPS) per Resolution 00002275 of 2023.',
      'Management of beneficiary population data for health contract technical notes.',
      'Administration of contracts between EPS and IPS per Decree 441 of 2022.',
      'Statistical analysis and report generation for health service management.',
      'Data transmission to the Ministry of Health and Social Protection through the single validation mechanism.',
    ],
    rights:
      'You have the right to know, update, rectify, and request deletion of your personal data. To exercise these rights, you may contact us through the enabled channels.',
    acceptance: 'By clicking "Accept", you grant your prior, express, and informed consent for the processing of personal data and sensitive health data for the purposes described.',
  },
};

export function getConsentRecord(userId: string): ConsentRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const records: ConsentRecord[] = JSON.parse(stored);
    const record = records.find(r => r.userId === userId && !r.revokedAt);
    return record ?? null;
  } catch {
    return null;
  }
}

export function hasValidConsent(userId: string): boolean {
  const record = getConsentRecord(userId);
  if (!record) return false;
  return record.version === CURRENT_CONSENT_VERSION && !record.revokedAt;
}

export function grantConsent(
  userId: string,
  purposes: ConsentPurpose[] = [
    'RIPS_PROCESSING',
    'POPULATION_PROCESSING',
    'CONTRACT_MANAGEMENT',
    'DATA_ANALYTICS',
    'DATA_TRANSFER_MINSALUD',
  ],
): ConsentRecord {
  const record: ConsentRecord = {
    userId,
    grantedAt: new Date().toISOString(),
    version: CURRENT_CONSENT_VERSION,
    purposes,
  };

  if (typeof window === 'undefined') return record;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    const records: ConsentRecord[] = stored ? JSON.parse(stored) : [];

    // Revoke previous consents for this user
    for (const r of records) {
      if (r.userId === userId && !r.revokedAt) {
        r.revokedAt = new Date().toISOString();
      }
    }

    records.push(record);
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // fail silently in MVP
  }

  return record;
}

export function revokeConsent(userId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return;
    const records: ConsentRecord[] = JSON.parse(stored);
    for (const r of records) {
      if (r.userId === userId && !r.revokedAt) {
        r.revokedAt = new Date().toISOString();
      }
    }
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // fail silently in MVP
  }
}
