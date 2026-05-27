import { describe, it, expect } from 'vitest';
import { computeNotaTecnica } from '../calculations';
import type { Contract, RipsRecord, PopulationRecord } from '@/lib/types';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    code: 'CTR-001',
    name: 'Test',
    epsName: 'EPS',
    ipsName: 'IPS',
    contractType: 'capitacion',
    status: 'approved',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    populationCount: 1000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '1',
    ...overrides,
  };
}

function makeRips(overrides: Partial<RipsRecord> = {}): RipsRecord {
  return {
    id: 'r-1',
    serviceType: 'AC',
    beneficiaryId: 'BEN-001',
    serviceDate: '2024-03-15',
    serviceCode: '890201',
    diagnosisCode: 'J00',
    quantity: 1,
    unitValue: 50000,
    totalValue: 50000,
    ...overrides,
  };
}

function makePop(overrides: Partial<PopulationRecord> = {}): PopulationRecord {
  return {
    id: 'p-1',
    beneficiaryId: 'BEN-001',
    documentType: 'CC',
    documentNumber: '123',
    firstName: 'Test',
    lastName: 'User',
    birthDate: '1990-01-01',
    gender: 'M',
    ageGroup: '25-34',
    riskCategory: 'healthy',
    ...overrides,
  };
}

describe('computeNotaTecnica', () => {
  it('returns zeros when no RIPS', () => {
    const result = computeNotaTecnica(makeContract(), [], []);
    expect(result.totalServiceValue).toBe(0);
    expect(result.avgCostPerService).toBe(0);
    expect(result.utilizationRate).toBe(0);
    expect(result.estimatedMonthlyValue).toBe(0);
    expect(result.estimatedAnnualValue).toBe(0);
    expect(result.topDiagnoses).toHaveLength(0);
  });

  it('calculates total service value', () => {
    const rips = [
      makeRips({ totalValue: 100000 }),
      makeRips({ id: 'r-2', totalValue: 200000 }),
    ];
    const result = computeNotaTecnica(makeContract(), rips, []);
    expect(result.totalServiceValue).toBe(300000);
  });

  it('calculates cost per capita using population array length', () => {
    const rips = [makeRips({ totalValue: 100000 })];
    const pop = [makePop(), makePop({ id: 'p-2', beneficiaryId: 'BEN-002' })];
    const result = computeNotaTecnica(makeContract(), rips, pop);
    expect(result.avgCostPerCapita).toBe(50000);
  });

  it('falls back to contract.populationCount when no population records', () => {
    const rips = [makeRips({ totalValue: 100000 })];
    const result = computeNotaTecnica(makeContract({ populationCount: 500 }), rips, []);
    expect(result.avgCostPerCapita).toBe(200);
  });

  it('calculates utilization rate correctly', () => {
    const pop = Array.from({ length: 100 }, (_, i) =>
      makePop({ id: `p-${i}`, beneficiaryId: `BEN-${i}` }),
    );
    const rips = [
      makeRips({ beneficiaryId: 'BEN-0' }),
      makeRips({ id: 'r-2', beneficiaryId: 'BEN-0' }),
      makeRips({ id: 'r-3', beneficiaryId: 'BEN-1' }),
    ];
    const result = computeNotaTecnica(makeContract(), rips, pop);
    expect(result.utilizationRate).toBe(2);
  });

  it('caps utilization rate at 100%', () => {
    const pop = [makePop()];
    const rips = [
      makeRips({ beneficiaryId: 'BEN-001' }),
      makeRips({ id: 'r-2', beneficiaryId: 'BEN-002' }),
    ];
    const result = computeNotaTecnica(makeContract({ populationCount: 1 }), rips, pop);
    expect(result.utilizationRate).toBe(100);
  });

  it('groups services by type', () => {
    const rips = [
      makeRips({ serviceType: 'AC', totalValue: 50000 }),
      makeRips({ id: 'r-2', serviceType: 'AC', totalValue: 30000 }),
      makeRips({ id: 'r-3', serviceType: 'AP', totalValue: 100000 }),
    ];
    const result = computeNotaTecnica(makeContract(), rips, []);
    expect(result.servicesByType['AC'].count).toBe(2);
    expect(result.servicesByType['AC'].value).toBe(80000);
    expect(result.servicesByType['AC'].avgValue).toBe(40000);
    expect(result.servicesByType['AP'].count).toBe(1);
    expect(result.servicesByType['AP'].value).toBe(100000);
  });

  it('ranks top diagnoses by total value', () => {
    const rips = [
      makeRips({ diagnosisCode: 'J00', totalValue: 10000 }),
      makeRips({ id: 'r-2', diagnosisCode: 'I10', totalValue: 50000 }),
      makeRips({ id: 'r-3', diagnosisCode: 'J00', totalValue: 20000 }),
    ];
    const result = computeNotaTecnica(makeContract(), rips, []);
    expect(result.topDiagnoses[0].code).toBe('I10');
    expect(result.topDiagnoses[0].totalValue).toBe(50000);
    expect(result.topDiagnoses[1].code).toBe('J00');
    expect(result.topDiagnoses[1].count).toBe(2);
    expect(result.topDiagnoses[1].totalValue).toBe(30000);
  });

  it('limits top diagnoses to 10', () => {
    const rips = Array.from({ length: 15 }, (_, i) =>
      makeRips({ id: `r-${i}`, diagnosisCode: `D${i}`, totalValue: (15 - i) * 1000 }),
    );
    const result = computeNotaTecnica(makeContract(), rips, []);
    expect(result.topDiagnoses).toHaveLength(10);
    expect(result.topDiagnoses[0].code).toBe('D0');
  });

  it('estimates monthly/annual values based on contract duration', () => {
    const contract = makeContract({ startDate: '2024-01-01', endDate: '2024-06-30' });
    const rips = [makeRips({ totalValue: 600000 })];
    const result = computeNotaTecnica(contract, rips, []);
    expect(result.estimatedMonthlyValue).toBe(100000);
    expect(result.estimatedAnnualValue).toBe(1200000);
  });

  it('handles single-month contract', () => {
    const contract = makeContract({ startDate: '2024-03-01', endDate: '2024-03-31' });
    const rips = [makeRips({ totalValue: 120000 })];
    const result = computeNotaTecnica(contract, rips, []);
    expect(result.estimatedMonthlyValue).toBe(120000);
    expect(result.estimatedAnnualValue).toBe(1440000);
  });
});
