/**
 * MinSalud Validation Platform client — Article 10 & 16 of Resolution 00002275/2023.
 *
 * Implements the Type B (API RESTful) integration pattern for transmitting
 * RIPS JSON + FEV XML to the Ministry's single validation mechanism.
 *
 * In production, the base URL would be configured from the MinSalud micrositio:
 * https://www.sispro.gov.co/central-financiamiento/Pages/facturacion-electronica.aspx
 *
 * This MVP provides the integration contract (interfaces, methods, error handling)
 * with a stub implementation that can be swapped for real HTTP calls.
 */

import type { RipsTransaccion } from '@/lib/types/rips-legal';
import { validateRips } from '@/lib/validation/rips-validator';

// ============================================================================
// Types for MinSalud API responses
// ============================================================================

export interface MinSaludValidationRequest {
  /** RIPS JSON payload per Annex 1 */
  ripsJson: RipsTransaccion;
  /** FEV XML string (DIAN-prevalidated) — null for RIPS sin factura */
  fevXml: string | null;
  /** Facturador NIT */
  nit: string;
  /** Timestamp of submission */
  submittedAt: string;
}

export interface MinSaludValidationResponse {
  /** Whether the RIPS passed validation */
  success: boolean;
  /** Código Único de Validación — Article 3.1 */
  cuv: string | null;
  /** Overall status */
  status: 'APROBADO' | 'RECHAZADO' | 'NOTIFICADO';
  /** Validation messages */
  messages: Array<{
    ruleId: string;
    severity: 'R' | 'N';
    message: string;
  }>;
  /** Server timestamp */
  timestamp: string;
}

export interface MinSaludRegistrationData {
  nit: string;
  razonSocial: string;
  tipoEntidad: 'PRESTADOR' | 'PROVEEDOR' | 'OTRA';
  codHabilitacion: string;
  email: string;
}

export interface MinSaludRegistrationResponse {
  success: boolean;
  userId?: string;
  message: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface MinSaludConfig {
  /** API base URL — set from env or MinSalud micrositio */
  baseUrl: string;
  /** Authentication credentials obtained from SISPRO registration (Article 17) */
  username: string;
  password: string;
  /** Request timeout in ms */
  timeoutMs: number;
}

const DEFAULT_CONFIG: MinSaludConfig = {
  baseUrl: process.env.NEXT_PUBLIC_MINSALUD_API_URL || 'https://api.sispro.gov.co/rips/v1',
  username: process.env.MINSALUD_API_USER || '',
  password: process.env.MINSALUD_API_PASSWORD || '',
  timeoutMs: 30_000,
};

// ============================================================================
// Client
// ============================================================================

export class MinSaludClient {
  private config: MinSaludConfig;

  constructor(config?: Partial<MinSaludConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Article 17 — Register or update entity in SISPRO for validation mechanism access.
   */
  async registerEntity(
    data: MinSaludRegistrationData,
  ): Promise<MinSaludRegistrationResponse> {
    // MVP stub: In production, POST to ${baseUrl}/entidades/registro
    console.info('[MinSalud] Entity registration requested for NIT:', data.nit);

    return {
      success: true,
      userId: `USR-${data.nit}`,
      message: 'Registro exitoso en el mecanismo único de validación (stub)',
    };
  }

  /**
   * Article 9.2-4 & Article 16 — Submit RIPS for validation.
   *
   * Flow:
   * 1. Local validation (Article 9.2)
   * 2. Transfer to MinSalud (Article 9.3)
   * 3. Receive CUV on approval (Article 9.4)
   */
  async submitForValidation(
    request: MinSaludValidationRequest,
  ): Promise<MinSaludValidationResponse> {
    // Step 1: Local validation per Article 9.2
    const localResult = validateRips(request.ripsJson);

    if (localResult.status === 'RECHAZADO') {
      return {
        success: false,
        cuv: null,
        status: 'RECHAZADO',
        messages: localResult.results.map(r => ({
          ruleId: r.ruleId,
          severity: r.severity,
          message: r.message,
        })),
        timestamp: new Date().toISOString(),
      };
    }

    // Step 2: In production, POST to ${baseUrl}/validacion/rips
    // with JSON body = request.ripsJson and XML attachment = request.fevXml
    console.info('[MinSalud] RIPS submitted for validation, NIT:', request.nit);

    // Step 3: Stub — generate CUV for approved RIPS
    const cuv = localResult.status === 'APROBADO'
      ? generateCUV(request.nit, request.ripsJson.numFactura)
      : null;

    return {
      success: localResult.status === 'APROBADO',
      cuv,
      status: localResult.status,
      messages: localResult.results.map(r => ({
        ruleId: r.ruleId,
        severity: r.severity,
        message: r.message,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Query validation status for a previously submitted RIPS by CUV.
   */
  async queryStatus(cuv: string): Promise<MinSaludValidationResponse | null> {
    // MVP stub: In production, GET ${baseUrl}/validacion/estado/${cuv}
    console.info('[MinSalud] Status query for CUV:', cuv);
    return null;
  }
}

/**
 * Generate a Código Único de Validación (Article 3.1).
 * In production this is generated server-side by MinSalud.
 */
function generateCUV(nit: string, numFactura: string | null): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `CUV-${nit}-${numFactura ?? 'SF'}-${ts}-${rand}`.toUpperCase();
}

/** Singleton instance */
let _client: MinSaludClient | null = null;

export function getMinSaludClient(): MinSaludClient {
  if (!_client) {
    _client = new MinSaludClient();
  }
  return _client;
}
