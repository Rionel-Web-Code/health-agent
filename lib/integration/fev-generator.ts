/**
 * FEV (Factura Electrónica de Venta) XML generator — Articles 11-14 of
 * Resolution 00002275/2023 and Annex 2.
 *
 * Generates the XML extension with health-sector-specific fields that
 * accompany the DIAN-standard electronic invoice. The XML must be
 * consistent with the RIPS JSON per Article 13 Parágrafo 2.
 *
 * This MVP generates a valid XML structure. In production, the XML
 * would be signed and submitted to the DIAN for pre-validation before
 * being sent with the RIPS to MinSalud.
 */

import type { RipsTransaccion, RipsUsuario } from '@/lib/types/rips-legal';

export interface FevGenerationResult {
  xml: string;
  facturaNumber: string;
  nit: string;
  generatedAt: string;
  userCount: number;
  totalValue: number;
}

/**
 * Calculate total value from a RIPS transaction across all service types.
 * Note: urgencias, hospitalizacion, and recienNacidos don't carry direct
 * monetary values (vrServicio) per the resolution schema — they are
 * observation/event records, not individually billed line items.
 */
function calculateTotalValue(tx: RipsTransaccion): number {
  let total = 0;
  for (const u of tx.usuarios ?? []) {
    for (const c of u.servicios?.consultas ?? []) total += c.vrServicio;
    for (const p of u.servicios?.procedimientos ?? []) total += p.vrServicio;
    for (const m of u.servicios?.medicamentos ?? []) total += m.vrServicio;
    for (const o of u.servicios?.otrosServicios ?? []) total += o.vrServicio;
  }
  return total;
}

/**
 * Escape XML special characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate the health-sector extension XML (Annex 2) for a RIPS transaction.
 *
 * Article 11 defines the additional XML fields that must accompany the
 * DIAN electronic invoice. Article 13 Parágrafo 2 requires consistency
 * between the XML and the RIPS JSON.
 */
export function generateFevXml(tx: RipsTransaccion): FevGenerationResult {
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  const issueTime = now.toTimeString().split(' ')[0];
  const totalValue = calculateTotalValue(tx);

  const usuarios = tx.usuarios ?? [];

  const userElements = usuarios
    .map((u: RipsUsuario) => {
      const serviceCount =
        (u.servicios?.consultas?.length ?? 0) +
        (u.servicios?.procedimientos?.length ?? 0) +
        (u.servicios?.medicamentos?.length ?? 0) +
        (u.servicios?.urgencias?.length ?? 0) +
        (u.servicios?.hospitalizacion?.length ?? 0) +
        (u.servicios?.otrosServicios?.length ?? 0) +
        (u.servicios?.recienNacidos?.length ?? 0);

      return `
    <sts:Usuario>
      <sts:TipoDocumentoIdentificacion>${escapeXml(u.tipoDocumentoIdentificacion)}</sts:TipoDocumentoIdentificacion>
      <sts:NumDocumentoIdentificacion>${escapeXml(u.numDocumentoIdentificacion)}</sts:NumDocumentoIdentificacion>
      <sts:TipoUsuario>${escapeXml(u.tipoUsuario)}</sts:TipoUsuario>
      <sts:FechaNacimiento>${escapeXml(u.fechaNacimiento)}</sts:FechaNacimiento>
      <sts:CodSexo>${escapeXml(u.codSexo)}</sts:CodSexo>
      <sts:CodPaisResidencia>${escapeXml(u.codPaisResidencia)}</sts:CodPaisResidencia>
      <sts:CodMunicipioResidencia>${escapeXml(u.codMunicipioResidencia ?? '')}</sts:CodMunicipioResidencia>
      <sts:Consecutivo>${u.consecutivo}</sts:Consecutivo>
      <sts:CantidadServicios>${serviceCount}</sts:CantidadServicios>
    </sts:Usuario>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sts:ExtensionSalud
  xmlns:sts="urn:minsalud:nombres:especificaciones:documentos:electronica:salud"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <sts:InformacionGeneral>
    <sts:NumDocumentoIdObligado>${escapeXml(tx.numDocumentoIdObligado)}</sts:NumDocumentoIdObligado>
    <sts:NumFactura>${escapeXml(tx.numFactura ?? '')}</sts:NumFactura>
    <sts:FechaExpedicion>${issueDate}</sts:FechaExpedicion>
    <sts:HoraExpedicion>${issueTime}</sts:HoraExpedicion>
    <sts:TotalValorServicios>${totalValue}</sts:TotalValorServicios>
    <sts:CantidadUsuarios>${usuarios.length}</sts:CantidadUsuarios>
  </sts:InformacionGeneral>
  <sts:Usuarios>${userElements}
  </sts:Usuarios>
</sts:ExtensionSalud>`;

  return {
    xml,
    facturaNumber: tx.numFactura ?? 'SIN_FACTURA',
    nit: tx.numDocumentoIdObligado,
    generatedAt: now.toISOString(),
    userCount: usuarios.length,
    totalValue,
  };
}

/**
 * Calculate the deadline for filing with the responsible payment entity.
 * Article 14: 22 business days from FEV issuance with DIAN pre-validation.
 */
export function calculateFilingDeadline(issueDateStr: string): Date {
  const issueDate = new Date(issueDateStr);
  let businessDays = 0;
  const deadline = new Date(issueDate);

  while (businessDays < 22) {
    deadline.setDate(deadline.getDate() + 1);
    const day = deadline.getDay();
    if (day !== 0 && day !== 6) {
      businessDays++;
    }
  }

  return deadline;
}

/**
 * Check if a filing deadline has passed (Article 14 Parágrafo 1:
 * invoice must be annulled if not filed within the deadline).
 */
export function isFilingDeadlinePassed(issueDateStr: string): boolean {
  const deadline = calculateFilingDeadline(issueDateStr);
  return new Date() > deadline;
}
