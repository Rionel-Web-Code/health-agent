import { describe, it, expect } from 'vitest';
import { validateRips } from '../rips-validator';
import type { RipsTransaccion } from '@/lib/types/rips-legal';
import { createEmptyServicios } from '@/lib/types/rips-legal';

function makeValidTransaction(): RipsTransaccion {
  return {
    numDocumentoIdObligado: '900000000',
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

describe('RIPS Validator', () => {
  describe('Layer 1 — Structure', () => {
    it('approves a valid transaction', () => {
      const tx = makeValidTransaction();
      const result = validateRips(tx);
      expect(result.status).toBe('APROBADO');
      expect(result.results.filter(r => r.severity === 'R')).toHaveLength(0);
    });

    it('rejects missing numDocumentoIdObligado', () => {
      const tx = makeValidTransaction();
      (tx as Record<string, unknown>).numDocumentoIdObligado = undefined;
      const result = validateRips(tx);
      expect(result.status).toBe('RECHAZADO');
      expect(result.results.some(r => r.ruleId === 'RVE01')).toBe(true);
    });

    it('rejects empty usuarios array', () => {
      const tx = makeValidTransaction();
      tx.usuarios = [];
      const result = validateRips(tx);
      expect(result.status).toBe('RECHAZADO');
      expect(result.results.some(r => r.ruleId === 'RVE02')).toBe(true);
    });

    it('rejects missing required user fields', () => {
      const tx = makeValidTransaction();
      (tx.usuarios[0] as Record<string, unknown>).tipoDocumentoIdentificacion = '';
      const result = validateRips(tx);
      expect(result.status).toBe('RECHAZADO');
      expect(result.results.some(r => r.ruleId === 'RVE03')).toBe(true);
    });

    it('rejects empty string NIT', () => {
      const tx = makeValidTransaction();
      tx.numDocumentoIdObligado = '';
      const result = validateRips(tx);
      expect(result.status).toBe('RECHAZADO');
      expect(result.results.some(r => r.ruleId === 'RVE01')).toBe(true);
    });
  });

  describe('Layer 2 — Content', () => {
    it('rejects invalid NIT format', () => {
      const tx = makeValidTransaction();
      tx.numDocumentoIdObligado = '12345'; // not 9 digits
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC01')).toBe(true);
    });

    it('rejects invalid document type', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].tipoDocumentoIdentificacion = 'XX';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC02')).toBe(true);
    });

    it('rejects document number too short', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].numDocumentoIdentificacion = '12'; // < 4 chars
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC03')).toBe(true);
    });

    it('rejects future birth date', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].fechaNacimiento = '2099-01-01';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC06')).toBe(true);
    });

    it('rejects invalid sex code', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].codSexo = 'X';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC07')).toBe(true);
    });

    it('rejects missing municipality for Colombia', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].codPaisResidencia = '170';
      tx.usuarios[0].codMunicipioResidencia = null;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC09')).toBe(true);
    });

    it('rejects negative monetary values (RVG01)', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].servicios.consultas[0].vrServicio = -1000;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVG01')).toBe(true);
    });

    it('rejects invalid codPrestador length', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].servicios.consultas[0].codPrestador = '123'; // not 12 chars
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC14')).toBe(true);
    });

    it('rejects NaN consecutivo', () => {
      const tx = makeValidTransaction();
      (tx.usuarios[0] as any).consecutivo = NaN;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC13')).toBe(true);
    });

    it('rejects Infinity consecutivo', () => {
      const tx = makeValidTransaction();
      (tx.usuarios[0] as any).consecutivo = Infinity;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC13')).toBe(true);
    });

    it('rejects non-integer consecutivo', () => {
      const tx = makeValidTransaction();
      (tx.usuarios[0] as any).consecutivo = 1.5;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC13')).toBe(true);
    });

    it('rejects invalid calendar date like Feb 30', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].fechaNacimiento = '2024-02-30';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC05B')).toBe(true);
    });

    it('rejects Colombia without zona territorial', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].codPaisResidencia = '170';
      tx.usuarios[0].codZonaTerritorialResidencia = null;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVC11B')).toBe(true);
    });
  });

  describe('Layer 3 — Relationships', () => {
    it('rejects duplicate consecutivo among usuarios', () => {
      const tx = makeValidTransaction();
      const user2 = { ...tx.usuarios[0], consecutivo: 1 };
      tx.usuarios.push(user2);
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR01')).toBe(true);
    });

    it('notifies CC used for child <= 6', () => {
      const tx = makeValidTransaction();
      const childYear = new Date().getFullYear() - 3;
      tx.usuarios[0].fechaNacimiento = `${childYear}-06-15`;
      tx.usuarios[0].tipoDocumentoIdentificacion = 'CC';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR02')).toBe(true);
    });

    it('notifies CC used for teenager 7-17', () => {
      const tx = makeValidTransaction();
      const teenYear = new Date().getFullYear() - 12;
      tx.usuarios[0].fechaNacimiento = `${teenYear}-06-15`;
      tx.usuarios[0].tipoDocumentoIdentificacion = 'CC';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR03')).toBe(true);
    });

    it('rejects external cause CIE-10 code as principal diagnosis', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].servicios.consultas[0].codDiagnosticoPrincipal = 'V01';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR07')).toBe(true);
    });

    it('rejects consultation date before birth date', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].fechaNacimiento = '2025-01-01';
      tx.usuarios[0].servicios.consultas[0].fechaInicioAtencion = '2024-06-15 10:30';
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR06')).toBe(true);
    });

    it('notifies when usuario has no services', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].servicios = {
        consultas: [], procedimientos: [], urgencias: [],
        hospitalizacion: [], recienNacidos: [], medicamentos: [], otrosServicios: [],
      };
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR08')).toBe(true);
    });

    it('rejects service consecutivo mismatch with usuario', () => {
      const tx = makeValidTransaction();
      tx.usuarios[0].consecutivo = 1;
      tx.usuarios[0].servicios.consultas[0].consecutivo = 99;
      const result = validateRips(tx);
      expect(result.results.some(r => r.ruleId === 'RVR09')).toBe(true);
    });
  });
});
