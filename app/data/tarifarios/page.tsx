'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { writeAuditEntry } from '@/lib/security/audit-log';
import { AppShell } from '@/components/layout/app-shell';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import {
  getStoredTarifarios,
  generateTarifarioRecords,
  saveTarifarios,
} from '@/lib/mock-data/tarifarios';
import type { TarifarioRecord, TarifarioType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  FileText,
  Search,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

function TarifariosPageContent() {
  const { t, locale } = useTranslation();
  const { user, hasPermission } = useAuth();
  const [tarifarios, setTarifarios] = useState<Record<TarifarioType, TarifarioRecord[]>>({
    soat: [],
    iss: [],
    custom: [],
  });
  const [activeTab, setActiveTab] = useState<TarifarioType>('soat');
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustmentFactor, setAdjustmentFactor] = useState(1.0);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredTarifarios();
    setTarifarios(stored);
  }, []);

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);
  };

  const filteredRecords = tarifarios[activeTab].filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.serviceCode.toLowerCase().includes(query) ||
      record.serviceName.toLowerCase().includes(query)
    );
  });

  const handleApplyAdjustment = () => {
    const newRecords = generateTarifarioRecords(activeTab, adjustmentFactor);
    const updated = {
      ...tarifarios,
      [activeTab]: newRecords,
    };
    saveTarifarios(updated);
    setTarifarios(updated);
    setIsAdjustDialogOpen(false);
    writeAuditEntry('DATA_UPDATE', 'tarifario', `Applied adjustment factor ${adjustmentFactor}x to ${activeTab}`, user?.id || '', user?.name || '', user?.role || '');
    toast.success(t('data.tarifarios.adjustmentApplied', { factor: adjustmentFactor, type: activeTab.toUpperCase() }));
  };

  const handleResetTarifario = () => {
    const defaultFactor = activeTab === 'iss' ? 0.85 : 1.0;
    const newRecords = generateTarifarioRecords(activeTab, defaultFactor);
    const updated = {
      ...tarifarios,
      [activeTab]: newRecords,
    };
    saveTarifarios(updated);
    setTarifarios(updated);
    writeAuditEntry('DATA_UPDATE', 'tarifario', `Reset ${activeTab} tarifario to defaults`, user?.id || '', user?.name || '', user?.role || '');
    toast.success(t('data.tarifarios.resetSuccess', { type: activeTab.toUpperCase() }));
  };

  const tarifarioLabels: Record<TarifarioType, string> = {
    soat: t('data.tarifarios.types.soat'),
    iss: t('data.tarifarios.types.iss'),
    custom: t('data.tarifarios.types.custom'),
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('data.tarifarios.title')}</h1>
          <p className="text-muted-foreground">{t('data.tarifarios.subtitle')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(['soat', 'iss', 'custom'] as TarifarioType[]).map((type) => (
          <Card
            key={type}
            className={`cursor-pointer transition-colors ${
              activeTab === type ? 'border-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => setActiveTab(type)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{tarifarioLabels[type]}</CardTitle>
              <DollarSign className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(tarifarios[type].length)}</div>
              <p className="text-xs text-muted-foreground">{t('data.tarifarios.summary.totalServices')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline">{activeTab.toUpperCase()}</Badge>
                {tarifarioLabels[activeTab]}
              </CardTitle>
              <CardDescription>
                {t('data.tarifarios.servicesAvailable', { count: formatNumber(tarifarios[activeTab].length) })}
              </CardDescription>
            </div>
            {hasPermission(['admin', 'analyst']) && (
              <div className="flex gap-2">
                <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 size-4" />
                      {t('data.tarifarios.adjustFactor')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('data.tarifarios.adjustFactorTitle')}</DialogTitle>
                      <DialogDescription>
                        {t('data.tarifarios.adjustFactorDescription', { type: activeTab.toUpperCase() })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="factor">{t('data.tarifarios.fields.adjustmentFactor')}</Label>
                        <Input
                          id="factor"
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="5"
                          value={adjustmentFactor}
                          onChange={(e) => setAdjustmentFactor(parseFloat(e.target.value) || 1)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('data.tarifarios.factorExample')}
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleApplyAdjustment}>
                        {t('data.tarifarios.applyAdjustment')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={handleResetTarifario}>
                  <RefreshCw className="mr-2 size-4" />
                  {t('data.tarifarios.reset')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('data.tarifarios.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('data.tarifarios.fields.serviceCode')}</TableHead>
                  <TableHead>{t('data.tarifarios.fields.serviceName')}</TableHead>
                  <TableHead className="text-right">{t('data.tarifarios.fields.baseValue')}</TableHead>
                  <TableHead className="text-right">{t('data.tarifarios.fields.adjustmentFactor')}</TableHead>
                  <TableHead className="text-right">{t('data.tarifarios.fields.finalValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="size-8 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('common.noData')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.slice(0, 20).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">{record.serviceCode}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{record.serviceName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.baseValue)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{record.adjustmentFactor}x</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.finalValue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length > 20 && (
            <p className="text-sm text-muted-foreground text-center">
              {t('data.tarifarios.showingRecords', { total: formatNumber(filteredRecords.length) })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TarifariosPage() {
  return (
    <AppShell>
      <TarifariosPageContent />
    </AppShell>
  );
}
