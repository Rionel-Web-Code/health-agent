import { NextResponse, type NextRequest } from 'next/server';
import { validateRips } from '@/lib/validation/rips-validator';
import { generateFevXml } from '@/lib/integration/fev-generator';
import { getMinSaludClient } from '@/lib/integration/minsalud-client';
import type { RipsTransaccion } from '@/lib/types/rips-legal';

/**
 * POST /api/rips/submit
 *
 * Articles 9.3-9.4 & Article 16 — Full submission pipeline:
 * 1. Validate locally (Article 9.2)
 * 2. Generate FEV XML extension (Article 11)
 * 3. Submit to MinSalud validation mechanism (Article 10/16)
 * 4. Return CUV on approval (Article 3.1)
 *
 * Idempotent: resubmitting the same factura returns the existing CUV
 * (in production, MinSalud enforces uniqueness by numFactura).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transaction = body as RipsTransaccion;

    if (!transaction || !transaction.numDocumentoIdObligado) {
      return NextResponse.json(
        { success: false, error: 'Invalid RIPS payload' },
        { status: 400 },
      );
    }

    // Step 1: Local validation
    const localResult = validateRips(transaction);
    if (localResult.status === 'RECHAZADO') {
      return NextResponse.json({
        success: false,
        status: 'RECHAZADO',
        cuv: null,
        message: 'RIPS rechazado por validación local (Article 9.2)',
        validationResults: localResult.results,
      });
    }

    // Step 2: Generate FEV XML
    const fevResult = generateFevXml(transaction);

    // Step 3: Submit to MinSalud
    const client = getMinSaludClient();
    const response = await client.submitForValidation({
      ripsJson: transaction,
      fevXml: fevResult.xml,
      nit: transaction.numDocumentoIdObligado,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: response.success,
      status: response.status,
      cuv: response.cuv,
      fevSummary: {
        facturaNumber: fevResult.facturaNumber,
        totalValue: fevResult.totalValue,
        userCount: fevResult.userCount,
      },
      validationMessages: response.messages,
      submittedAt: response.timestamp,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal submission error' },
      { status: 500 },
    );
  }
}
