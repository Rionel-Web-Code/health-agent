'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { writeAuditEntry } from '@/lib/security/audit-log';
import { AppShell } from '@/components/layout/app-shell';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { getContractById } from '@/lib/mock-data/contracts';
import { getStoredRipsRecords } from '@/lib/mock-data/rips';
import { getStoredPopulationRecords, calculatePopulationSummary } from '@/lib/mock-data/population';
import { getStoredTarifarios } from '@/lib/mock-data/tarifarios';
import { computeNotaTecnica, type NotaTecnicaCalculations } from '@/lib/nota-tecnica/calculations';
import type { Contract, RipsRecord, PopulationRecord, TarifarioRecord, TarifarioType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Printer, FileText, Users, Activity, DollarSign,
  AlertTriangle, CheckCircle2, TrendingUp, Building2, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface NotaTecnicaData {
  contract: Contract;
  rips: RipsRecord[];
  population: PopulationRecord[];
  tarifarios: Record<TarifarioType, TarifarioRecord[]>;
  calculations: NotaTecnicaCalculations;
  populationSummary: { total: number; byGender: Record<string, number>; byRiskCategory: Record<string, number>; byAgeGroup: Record<string, number> } | null;
}

function NotaTecnicaContent({ contractId }: { contractId: string }) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<NotaTecnicaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const contract = getContractById(contractId);
    if (!contract) {
      setIsLoading(false);
      return;
    }

    const rips = getStoredRipsRecords();
    const population = getStoredPopulationRecords();
    const tarifarios = getStoredTarifarios();
    const calculations = computeNotaTecnica(contract, rips, population);
    const populationSummary = population.length > 0 ? calculatePopulationSummary(population) : null;

    setData({ contract, rips, population, tarifarios, calculations, populationSummary });
    setIsLoading(false);

    writeAuditEntry(
      'DATA_ACCESS', 'contract',
      `Generated technical note for ${contract.code}`,
      user?.id || '', user?.name || '', user?.role || '', contract.id,
    );
  }, [contractId, user]);

  const fmt = (num: number) =>
    new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(num);

  const fmtN = (num: number) =>
    new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);

  const fmtP = (num: number) => `${num.toFixed(1)}%`;

  const fmtDate = (d: string) =>
    format(new Date(d), 'dd MMMM yyyy', { locale: locale === 'es' ? es : enUS });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileText className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t('errors.notFound')}</p>
        <Button asChild>
          <Link href="/contracts">
            <ArrowLeft className="mr-2 size-4" />
            {t('common.back')}
          </Link>
        </Button>
      </div>
    );
  }

  const { contract, calculations, populationSummary } = data;
  const hasData = data.rips.length > 0 || data.population.length > 0;

  const serviceTypeLabels: Record<string, string> = {
    AC: t('data.rips.serviceTypes.AC'),
    AP: t('data.rips.serviceTypes.AP'),
    AM: t('data.rips.serviceTypes.AM'),
    AH: t('data.rips.serviceTypes.AH'),
    AU: t('data.rips.serviceTypes.AU'),
    AN: t('data.rips.serviceTypes.AN'),
  };

  const totalTarifs =
    (data.tarifarios.soat?.length || 0) +
    (data.tarifarios.iss?.length || 0) +
    (data.tarifarios.custom?.length || 0);

  return (
    <div className="space-y-6 print:space-y-4">
      <Breadcrumbs />

      {/* Header (hidden in print) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('notaTecnica.title')}</h1>
          <p className="text-muted-foreground">{contract.code} — {contract.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/contracts/${contract.id}`}>
              <ArrowLeft className="mr-2 size-4" />
              {t('common.back')}
            </Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">{t('notaTecnica.title')}</h1>
        <p className="text-sm">{contract.code} — {contract.name}</p>
        <p className="text-xs text-muted-foreground">
          {t('notaTecnica.generatedAt')}: {new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US')}
        </p>
      </div>

      {/* No Data Warning */}
      {!hasData && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="size-5 text-yellow-600" />
            <div>
              <p className="font-medium">{t('notaTecnica.noData')}</p>
              <p className="text-sm text-muted-foreground">{t('notaTecnica.noDataDescription')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Contract Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4" />
            {t('notaTecnica.sections.contractInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.contractCode')}</p>
              <p className="font-medium">{contract.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.contractType')}</p>
              <Badge variant="outline">{t(`contracts.types.${contract.contractType}`)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.epsName')}</p>
              <p className="font-medium">{contract.epsName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.ipsName')}</p>
              <p className="font-medium">{contract.ipsName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.startDate')} — {t('contracts.endDate')}</p>
              <p className="font-medium">{fmtDate(contract.startDate)} — {fmtDate(contract.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.populationCount')}</p>
              <p className="font-medium">{fmtN(contract.populationCount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Key Indicators */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t('notaTecnica.indicators.totalValue')}
              <DollarSign className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(calculations.totalServiceValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t('notaTecnica.indicators.costPerCapita')}
              <TrendingUp className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(calculations.avgCostPerCapita)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t('notaTecnica.indicators.utilizationRate')}
              <Users className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtP(calculations.utilizationRate)}</div>
            <Progress value={calculations.utilizationRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t('notaTecnica.indicators.estimatedAnnual')}
              <Calendar className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(calculations.estimatedAnnualValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Services Breakdown */}
      {Object.keys(calculations.servicesByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" />
              {t('notaTecnica.sections.servicesBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead className="text-right">{t('data.rips.fields.quantity')}</TableHead>
                  <TableHead className="text-right">{t('data.rips.summary.totalValue')}</TableHead>
                  <TableHead className="text-right">{t('notaTecnica.indicators.avgCostPerService')}</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(calculations.servicesByType).map(([type, stats]) => (
                  <TableRow key={type}>
                    <TableCell>
                      <Badge variant="outline" className="mr-2">{type}</Badge>
                      {serviceTypeLabels[type] || type}
                    </TableCell>
                    <TableCell className="text-right">{fmtN(stats.count)}</TableCell>
                    <TableCell className="text-right">{fmt(stats.value)}</TableCell>
                    <TableCell className="text-right">{fmt(stats.avgValue)}</TableCell>
                    <TableCell className="text-right">
                      {fmtP(calculations.totalServiceValue > 0 ? (stats.value / calculations.totalServiceValue) * 100 : 0)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>{t('common.total')}</TableCell>
                  <TableCell className="text-right">{fmtN(data.rips.length)}</TableCell>
                  <TableCell className="text-right">{fmt(calculations.totalServiceValue)}</TableCell>
                  <TableCell className="text-right">{fmt(calculations.avgCostPerService)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Top Diagnoses */}
      {calculations.topDiagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('notaTecnica.sections.topDiagnoses')}</CardTitle>
            <CardDescription>{t('notaTecnica.sections.topDiagnosesDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('data.rips.fields.diagnosisCode')}</TableHead>
                  <TableHead className="text-right">{t('data.rips.fields.quantity')}</TableHead>
                  <TableHead className="text-right">{t('data.rips.summary.totalValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.topDiagnoses.map((d, i) => (
                  <TableRow key={d.code}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono">{d.code}</TableCell>
                    <TableCell className="text-right">{fmtN(d.count)}</TableCell>
                    <TableCell className="text-right">{fmt(d.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Population Summary */}
      {populationSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              {t('notaTecnica.sections.populationSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('data.population.summary.totalPopulation')}</p>
                <p className="text-xl font-bold">{fmtN(populationSummary.total)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('data.population.genders.M')}</p>
                <p className="text-xl font-bold">{fmtN(populationSummary.byGender.M || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('data.population.genders.F')}</p>
                <p className="text-xl font-bold">{fmtN(populationSummary.byGender.F || 0)}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div>
              <p className="text-sm font-medium mb-2">{t('data.population.summary.riskDistribution')}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(populationSummary.byRiskCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{t(`data.population.riskCategories.${cat}`)}</span>
                    <span className="font-medium">{fmtN(count as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('notaTecnica.sections.readiness')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: t('nav.rips'), ready: data.rips.length > 0, count: data.rips.length },
              { label: t('nav.population'), ready: data.population.length > 0, count: data.population.length },
              { label: t('nav.tarifarios'), ready: totalTarifs > 0, count: totalTarifs },
            ].map(({ label, ready, count }) => (
              <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {ready ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="size-4 text-yellow-600" />
                  )}
                  <span className="text-sm">{label}</span>
                </div>
                <Badge variant={ready ? 'default' : 'outline'}>
                  {ready ? `${fmtN(count)} ${t('data.upload.rowsDetected')}` : t('common.noData')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NotaTecnicaPageProps {
  params: Promise<{ id: string }>;
}

export default function NotaTecnicaPage({ params }: NotaTecnicaPageProps) {
  const { id } = use(params);
  return (
    <AppShell>
      <NotaTecnicaContent contractId={id} />
    </AppShell>
  );
}
