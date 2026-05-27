import type { Contract, RipsRecord, PopulationRecord, TarifarioRecord, TarifarioType } from '@/lib/types';

export interface NotaTecnicaCalculations {
  totalServiceValue: number;
  avgCostPerCapita: number;
  avgCostPerService: number;
  utilizationRate: number;
  servicesByType: Record<string, { count: number; value: number; avgValue: number }>;
  topDiagnoses: Array<{ code: string; count: number; totalValue: number }>;
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
}

export function computeNotaTecnica(
  contract: Contract,
  rips: RipsRecord[],
  population: PopulationRecord[],
): NotaTecnicaCalculations {
  const totalServiceValue = rips.reduce((sum, r) => sum + r.totalValue, 0);
  const popCount = population.length || contract.populationCount || 1;
  const avgCostPerCapita = totalServiceValue / popCount;
  const avgCostPerService = rips.length > 0 ? totalServiceValue / rips.length : 0;
  const uniqueUsers = new Set(rips.map((r) => r.beneficiaryId)).size;
  const utilizationRate = rips.length > 0 ? Math.min((uniqueUsers / popCount) * 100, 100) : 0;

  const servicesByType: NotaTecnicaCalculations['servicesByType'] = {};
  for (const r of rips) {
    if (!servicesByType[r.serviceType]) {
      servicesByType[r.serviceType] = { count: 0, value: 0, avgValue: 0 };
    }
    servicesByType[r.serviceType].count++;
    servicesByType[r.serviceType].value += r.totalValue;
  }
  for (const key of Object.keys(servicesByType)) {
    const s = servicesByType[key];
    s.avgValue = s.count > 0 ? s.value / s.count : 0;
  }

  const diagMap = new Map<string, { count: number; totalValue: number }>();
  for (const r of rips) {
    const existing = diagMap.get(r.diagnosisCode) || { count: 0, totalValue: 0 };
    existing.count++;
    existing.totalValue += r.totalValue;
    diagMap.set(r.diagnosisCode, existing);
  }
  const topDiagnoses = [...diagMap.entries()]
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const months = Math.max(
    1,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) + 1,
  );
  const estimatedMonthlyValue = rips.length > 0 ? totalServiceValue / months : 0;
  const estimatedAnnualValue = estimatedMonthlyValue * 12;

  return {
    totalServiceValue,
    avgCostPerCapita,
    avgCostPerService,
    utilizationRate,
    servicesByType,
    topDiagnoses,
    estimatedMonthlyValue,
    estimatedAnnualValue,
  };
}
