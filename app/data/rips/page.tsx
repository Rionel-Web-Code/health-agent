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
  getStoredRipsRecords,
  saveRipsRecords,
  clearRipsRecords,
  calculateRipsSummary,
  MOCK_RIPS_RECORDS,
} from '@/lib/mock-data/rips';
import type { RipsRecord, RipsSummary, RipsServiceType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Upload,
  Trash2,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

function RipsPageContent() {
  const { t, locale } = useTranslation();
  const { user, hasPermission } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [parsedData, setParsedData] = useState<ParseResult<Record<string, unknown>> | null>(null);
  const [storedRecords, setStoredRecords] = useState<RipsRecord[]>([]);
  const [summary, setSummary] = useState<RipsSummary | null>(null);

  useEffect(() => {
    const records = getStoredRipsRecords();
    setStoredRecords(records);
    if (records.length > 0) {
      setSummary(calculateRipsSummary(records));
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File, type: FileType) => {
    setUploadStatus('uploading');
    
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setUploadStatus('processing');

    // Parse the file
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

    // Transform parsed data to RipsRecord format
    const newRecords: RipsRecord[] = parsedData.data.map((row, index) => ({
      id: `RIPS-UPLOAD-${Date.now()}-${index}`,
      serviceType: (row.serviceType as RipsServiceType) || 'AC',
      beneficiaryId: String(row.beneficiaryId || row.beneficiary_id || `BEN-${index}`),
      serviceDate: String(row.serviceDate || row.service_date || new Date().toISOString().split('T')[0]),
      serviceCode: String(row.serviceCode || row.service_code || '890201'),
      diagnosisCode: String(row.diagnosisCode || row.diagnosis_code || 'Z00'),
      quantity: Number(row.quantity) || 1,
      unitValue: Number(row.unitValue || row.unit_value) || 0,
      totalValue: Number(row.totalValue || row.total_value) || 0,
    }));

    // Save to storage
    const existing = getStoredRipsRecords();
    const combined = [...existing, ...newRecords];
    saveRipsRecords(combined);
    setStoredRecords(combined);
    setSummary(calculateRipsSummary(combined));

    writeAuditEntry('DATA_UPLOAD', 'rips', `Uploaded ${newRecords.length} RIPS records`, user?.id || '', user?.name || '', user?.role || '', undefined, { count: newRecords.length });

    toast.success(t('data.rips.messages.uploadSuccess', { count: newRecords.length }));
    setParsedData(null);
    setUploadStatus('idle');
  }, [parsedData, user, t]);

  const handleLoadMockData = useCallback(() => {
    saveRipsRecords(MOCK_RIPS_RECORDS);
    setStoredRecords(MOCK_RIPS_RECORDS);
    setSummary(calculateRipsSummary(MOCK_RIPS_RECORDS));
    writeAuditEntry('DATA_CREATE', 'rips', `Loaded ${MOCK_RIPS_RECORDS.length} mock RIPS records`, user?.id || '', user?.name || '', user?.role || '');
    toast.success(t('data.rips.messages.mockLoaded', { count: MOCK_RIPS_RECORDS.length }));
  }, [user, t]);

  const handleClearData = useCallback(() => {
    clearRipsRecords();
    setStoredRecords([]);
    setSummary(null);
    writeAuditEntry('DATA_DELETE', 'rips', 'Cleared all RIPS records', user?.id || '', user?.name || '', user?.role || '');
    toast.success(t('data.rips.messages.cleared'));
  }, [user, t]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const serviceTypeLabels: Record<RipsServiceType, string> = {
    AC: t('data.rips.serviceTypes.AC'),
    AP: t('data.rips.serviceTypes.AP'),
    AM: t('data.rips.serviceTypes.AM'),
    AH: t('data.rips.serviceTypes.AH'),
    AU: t('data.rips.serviceTypes.AU'),
    AN: t('data.rips.serviceTypes.AN'),
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('data.rips.title')}</h1>
          <p className="text-muted-foreground">{t('data.rips.subtitle')}</p>
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
                    {t('data.rips.summary.totalRecords')}
                  </CardTitle>
                  <Activity className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.totalRecords)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('data.rips.summary.uniqueBeneficiaries')}
                  </CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.uniqueBeneficiaries)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('data.rips.summary.totalValue')}
                  </CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('data.rips.summary.dateRange')}
                  </CardTitle>
                  <Calendar className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {summary.dateRange.start} - {summary.dateRange.end}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Service Type Breakdown */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('data.rips.messages.byServiceType')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.entries(summary.byServiceType) as [RipsServiceType, number][]).map(
                    ([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{type}</Badge>
                          <span className="text-sm">{serviceTypeLabels[type]}</span>
                        </div>
                        <span className="font-medium">{formatNumber(count)}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('data.rips.uploadTitle')}</CardTitle>
              <CardDescription>{t('data.rips.uploadDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                isProcessing={uploadStatus !== 'idle' && uploadStatus !== 'complete' && uploadStatus !== 'error'}
                uploadStatus={uploadStatus}
              />

              {/* Preview */}
              {parsedData && parsedData.data.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">{t('data.upload.preview')}</h3>
                  <DataPreview
                    data={parsedData.data}
                    columns={parsedData.meta.columns}
                    errors={parsedData.errors.map((e) => ({ row: e.row || 0, message: e.message }))}
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
                <Activity className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('data.rips.title')}</CardTitle>
                <CardDescription>
                  {formatNumber(storedRecords.length)} {t('data.upload.rowsDetected')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreview
                  data={storedRecords as unknown as Record<string, unknown>[]}
                  columns={['serviceType', 'beneficiaryId', 'serviceDate', 'serviceCode', 'diagnosisCode', 'quantity', 'totalValue']}
                  sensitiveColumns={['beneficiaryId']}
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

export default function RipsPage() {
  return (
    <AppShell>
      <RipsPageContent />
    </AppShell>
  );
}
