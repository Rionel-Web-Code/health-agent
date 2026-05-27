import { NextResponse, type NextRequest } from 'next/server';
import { validateRips } from '@/lib/validation/rips-validator';
import type { RipsTransaccion } from '@/lib/types/rips-legal';

/**
 * POST /api/rips/validate
 *
 * Article 9.2 — Local validation endpoint. Accepts a RIPS JSON payload
 * and returns structure, content, and relationship validation results.
 *
 * Idempotent: identical payloads always produce the same validation result.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transaction = body as RipsTransaccion;

    if (!transaction || !transaction.numDocumentoIdObligado) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid RIPS payload: missing numDocumentoIdObligado',
        },
        { status: 400 },
      );
    }

    const result = validateRips(transaction);

    return NextResponse.json({
      success: result.status !== 'RECHAZADO',
      status: result.status,
      totalRules: result.results.length,
      rejections: result.results.filter(r => r.severity === 'R').length,
      notifications: result.results.filter(r => r.severity === 'N').length,
      results: result.results,
      validatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to parse RIPS JSON' },
      { status: 400 },
    );
  }
}
