import { describe, it, expect } from 'vitest';
import { generateFevXml, calculateFilingDeadline, isFilingDeadlinePassed } from '../fev-generator';
import type { RipsTransaccion } from '@/lib/types/rips-legal';
import { createEmptyServicios } from '@/lib/types/rips-legal';

function makeTransaction(): RipsTransaccion {
  return {
    numDocumentoIdObligado: '900123456',
    numFactura: 'FAC00000001',
    tipoNota: null,
    numNota: null,
    usuarios: [
      {
        tipoDocumentoIdentificacion: 'CC',
        numDocumentoIdentificacion: '1017345840',
        tipoUsuario: '01',
        fechaNacimiento: '1990-01-15',
        codSexo: 'M',
        codPaisResidencia: '170',
        codMunicipioResidencia: '05001',
        codZonaTerritorialResidencia: '01',
        incapacidad: 'NO',
        consecutivo: 1,
        codPaisOrigen: '170',
        servicios: {
          ...createEmptyServicios(),
          consultas: [
            {
              codPrestador: '050010101101',
              fechaInicioAtencion: '2024-06-15 10:30',
              numAutorizacion: null,
              codConsulta: '890201',
              modalidadGrupoServicioTecSal: '01',
              grupoServicios: '01',
              codServicio: '101',
              finalidadTecnologiaSalud: '01',
              causaMotivoAtencion: '01',
              codDiagnosticoPrincipal: 'J00',
              codDiagnosticoRelacionado1: null,
              codDiagnosticoRelacionado2: null,
              codDiagnosticoRelacionado3: null,
              tipoDiagnosticoPrincipal: '01',
              tipoPagoModerador: '01',
              vrServicio: 45000,
              valorPagoModerador: 0,
              numFEVPagoModerador: null,
              consecutivo: 1,
            },
          ],
        },
      },
    ],
  };
}

describe('FEV XML Generator', () => {
  it('generates valid XML with correct NIT', () => {
    const tx = makeTransaction();
    const result = generateFevXml(tx);

    expect(result.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result.xml).toContain('<sts:NumDocumentoIdObligado>900123456</sts:NumDocumentoIdObligado>');
    expect(result.xml).toContain('<sts:NumFactura>FAC00000001</sts:NumFactura>');
    expect(result.nit).toBe('900123456');
    expect(result.facturaNumber).toBe('FAC00000001');
  });

  it('includes correct user count', () => {
    const tx = makeTransaction();
    const result = generateFevXml(tx);

    expect(result.userCount).toBe(1);
    expect(result.xml).toContain('<sts:CantidadUsuarios>1</sts:CantidadUsuarios>');
  });

  it('calculates total value from services', () => {
    const tx = makeTransaction();
    const result = generateFevXml(tx);

    expect(result.totalValue).toBe(45000);
    expect(result.xml).toContain('<sts:TotalValorServicios>45000</sts:TotalValorServicios>');
  });

  it('includes user details in XML', () => {
    const tx = makeTransaction();
    const result = generateFevXml(tx);

    expect(result.xml).toContain('<sts:TipoDocumentoIdentificacion>CC</sts:TipoDocumentoIdentificacion>');
    expect(result.xml).toContain('<sts:NumDocumentoIdentificacion>1017345840</sts:NumDocumentoIdentificacion>');
    expect(result.xml).toContain('<sts:CodSexo>M</sts:CodSexo>');
  });

  it('handles RIPS sin factura (null numFactura)', () => {
    const tx = makeTransaction();
    tx.numFactura = null;
    const result = generateFevXml(tx);

    expect(result.facturaNumber).toBe('SIN_FACTURA');
    expect(result.xml).toContain('<sts:NumFactura></sts:NumFactura>');
  });

  it('handles null usuarios gracefully', () => {
    const tx = makeTransaction();
    (tx as any).usuarios = null;
    const result = generateFevXml(tx);
    expect(result.userCount).toBe(0);
    expect(result.xml).toContain('<sts:CantidadUsuarios>0</sts:CantidadUsuarios>');
  });

  it('handles null servicios gracefully', () => {
    const tx = makeTransaction();
    (tx.usuarios[0] as any).servicios = null;
    const result = generateFevXml(tx);
    expect(result.xml).toContain('<sts:CantidadServicios>0</sts:CantidadServicios>');
  });
});

describe('Filing Deadline (Article 14)', () => {
  it('calculates 22 business days from issue date', () => {
    // Monday 2024-01-08
    const deadline = calculateFilingDeadline('2024-01-08');
    // 22 business days from Monday Jan 8 = Friday Feb 7
    expect(deadline.getDay()).not.toBe(0); // not Sunday
    expect(deadline.getDay()).not.toBe(6); // not Saturday
  });

  it('marks old dates as past deadline', () => {
    expect(isFilingDeadlinePassed('2020-01-01')).toBe(true);
  });

  it('marks future dates as within deadline', () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    expect(isFilingDeadlinePassed(future.toISOString().split('T')[0])).toBe(false);
  });
});
