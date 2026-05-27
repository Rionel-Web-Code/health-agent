'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { writeAuditEntry } from '@/lib/security/audit-log';
import { AppShell } from '@/components/layout/app-shell';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { FileUploader, type FileType, type UploadStatus } from '@/components/data-upload/file-uploader';
import { DataPreview } from '@/components/data-upload/data-preview';
import { parseFile, type ParseResult } from '@/lib/utils/file-parser';
import {
  getStoredPopulationRecords,
  savePopulationRecords,
  clearPopulationRecords,
  calculatePopulationSummary,
  MOCK_POPULATION_RECORDS,
} from '@/lib/mock-data/population';
import type { PopulationRecord, PopulationSummary, AgeGroup, Gender, RiskCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Upload,
  Trash2,
  FileText,
  Database,
  Heart,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

function PopulationPageContent() {
  const { t, locale } = useTranslation();
  const { user, hasPermission } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [parsedData, setParsedData] = useState<ParseResult<Record<string, unknown>> | null>(null);
  const [storedRecords, setStoredRecords] = useState<PopulationRecord[]>([]);
  const [summary, setSummary] = useState<PopulationSummary | null>(null);

  useEffect(() => {
    const records = getStoredPopulationRecords();
    setStoredRecords(records);
    if (records.length > 0) {
      setSummary(calculatePopulationSummary(records));
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File, type: FileType) => {
    setUploadStatus('uploading');
    await new Promise((resolve) => setTimeout(resolve, 500));
    setUploadStatus('processing');

    const result = await parseFile<Record<string, unknown>>(file, type);
    
    setUploadStatus('validating');
    await new Promise((resolve) => setTimeout(resolve, 500));

    setParsedData(result);
    setUploadStatus(result.errors.length > 0 ? 'error' : 'complete');
  }, []);

  const handleFileRemove = useCallback(() => {
    setParsedData(null);
    setUploadStatus('idle');
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (!parsedData) return;

    const newRecords: PopulationRecord[] = parsedData.data.map((row, index) => ({
      id: `POP-UPLOAD-${Date.now()}-${index}`,
      beneficiaryId: String(row.beneficiaryId || row.beneficiary_id || `BEN-${index}`),
      documentType: String(row.documentType || row.document_type || 'CC'),
      documentNumber: String(row.documentNumber || row.document_number || ''),
      firstName: String(row.firstName || row.first_name || ''),
      lastName: String(row.lastName || row.last_name || ''),
      birthDate: String(row.birthDate || row.birth_date || ''),
      gender: (row.gender as Gender) || 'M',
      ageGroup: (row.ageGroup as AgeGroup) || '25-34',
      riskCategory: (row.riskCategory || row.risk_category) as RiskCategory || 'healthy',
      municipality: String(row.municipality || ''),
      zone: String(row.zone || 'Urbana'),
    }));

    const existing = getStoredPopulationRecords();
    const combined = [...existing, ...newRecords];
    savePopulationRecords(combined);
    setStoredRecords(combined);
    setSummary(calculatePopulationSummary(combined));

    writeAuditEntry('DATA_UPLOAD', 'population', `Uploaded ${newRecords.length} population records`, user?.id || '', user?.name || '', user?.role || '', undefined, { count: newRecords.length });

    toast.success(t('data.population.messages.uploadSuccess', { count: newRecords.length }));
    setParsedData(null);
    setUploadStatus('idle');
  }, [parsedData, user, t]);

  const handleLoadMockData = useCallback(() => {
    savePopulationRecords(MOCK_POPULATION_RECORDS);
    setStoredRecords(MOCK_POPULATION_RECORDS);
    setSummary(calculatePopulationSummary(MOCK_POPULATION_RECORDS));
    writeAuditEntry('DATA_CREATE', 'population', `Loaded ${MOCK_POPULATION_RECORDS.length} mock population records`, user?.id || '', user?.name || '', user?.role || '');
    toast.success(t('data.population.messages.mockLoaded', { count: MOCK_POPULATION_RECORDS.length }));
  }, [user, t]);

  const handleClearData = useCallback(() => {
    clearPopulationRecords();
    setStoredRecords([]);
    setSummary(null);
    writeAuditEntry('DATA_DELETE', 'population', 'Cleared all population records', user?.id || '', user?.name || '', user?.role || '');
    toast.success(t('data.population.messages.cleared'));
  }, [user, t]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  };

  const riskCategoryConfig: Record<RiskCategory, { label: string; color: string; icon: React.ElementType }> = {
    healthy: { label: t('data.population.riskCategories.healthy'), color: 'bg-green-500', icon: Heart },
    chronic: { label: t('data.population.riskCategories.chronic'), color: 'bg-yellow-500', icon: Activity },
    highCost: { label: t('data.population.riskCategories.highCost'), color: 'bg-red-500', icon: AlertTriangle },
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('data.population.title')}</h1>
          <p className="text-muted-foreground">{t('data.population.subtitle')}</p>
        </div>
        {hasPermission(['admin', 'analyst']) && (
          <div className="flex gap-2">
            {storedRecords.length === 0 && (
              <Button variant="outline" onClick={handleLoadMockData}>
                <Database className="mr-2 size-4" />
                {t('common.loadSampleData')}
              </Button>
            )}
            {storedRecords.length > 0 && (
              <Button variant="outline" onClick={handleClearData}>
                <Trash2 className="mr-2 size-4" />
                {t('common.delete')}
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="mr-2 size-4" />
            {t('common.upload')}
          </TabsTrigger>
          <TabsTrigger value="data">
            <FileText className="mr-2 size-4" />
            {t('common.view')} ({formatNumber(storedRecords.length)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6 mt-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('data.population.summary.totalPopulation')}
                  </CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.total)}</div>
                </CardContent>
              </Card>

              {/* Gender Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('data.population.summary.genderDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('data.population.genders.M')}</span>
                    <span className="font-medium">{getPercentage(summary.byGender.M, summary.total)}%</span>
                  </div>
                  <Progress value={(summary.byGender.M / summary.total) * 100} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('data.population.genders.F')}</span>
                    <span className="font-medium">{getPercentage(summary.byGender.F, summary.total)}%</span>
                  </div>
                  <Progress value={(summary.byGender.F / summary.total) * 100} className="h-2" />
                </CardContent>
              </Card>

              {/* Risk Distribution - takes 2 columns */}
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('data.population.summary.riskDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.entries(summary.byRiskCategory) as [RiskCategory, number][]).map(
                      ([category, count]) => {
                        const config = riskCategoryConfig[category];
                        const Icon = config.icon;
                        return (
                          <div key={category} className="flex items-center gap-3 rounded-lg border p-3">
                            <div className={`flex size-8 items-center justify-center rounded-full ${config.color} text-white`}>
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{config.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(count)} ({getPercentage(count, summary.total)}%)
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Age Distribution */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('data.population.summary.ageDistribution')}</CardTitle>
                <CardDescription>{t('data.population.messages.agePyramidDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(Object.entries(summary.byAgeGroup) as [AgeGroup, number][]).map(([ageGroup, count]) => (
                    <div key={ageGroup} className="flex items-center gap-4">
                      <span className="w-16 text-sm font-medium">{ageGroup}</span>
                      <div className="flex-1">
                        <Progress value={(count / summary.total) * 100} className="h-6" />
                      </div>
                      <span className="w-20 text-right text-sm text-muted-foreground">
                        {formatNumber(count)} ({getPercentage(count, summary.total)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('data.population.uploadTitle')}</CardTitle>
              <CardDescription>{t('data.population.uploadDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                isProcessing={uploadStatus !== 'idle' && uploadStatus !== 'complete' && uploadStatus !== 'error'}
                uploadStatus={uploadStatus}
              />

              {parsedData && parsedData.data.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">{t('data.upload.preview')}</h3>
                  <DataPreview
                    data={parsedData.data}
                    columns={parsedData.meta.columns}
                    errors={parsedData.errors.map((e) => ({ row: e.row || 0, message: e.message }))}
                    sensitiveColumns={['documentNumber', 'firstName', 'lastName']}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleFileRemove}>
                      {t('data.upload.cancelUpload')}
                    </Button>
                    <Button onClick={handleConfirmUpload} disabled={parsedData.errors.length > 0}>
                      {t('data.upload.confirmUpload')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          {storedRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('data.population.title')}</CardTitle>
                <CardDescription>
                  {formatNumber(storedRecords.length)} {t('data.upload.rowsDetected')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreview
                  data={storedRecords as unknown as Record<string, unknown>[]}
                  columns={['beneficiaryId', 'firstName', 'lastName', 'gender', 'ageGroup', 'riskCategory', 'municipality']}
                  sensitiveColumns={['documentNumber', 'firstName', 'lastName']}
                  pageSize={15}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PopulationPage() {
  return (
    <AppShell>
      <PopulationPageContent />
    </AppShell>
  );
}
