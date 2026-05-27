'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { writeAuditEntry } from '@/lib/security/audit-log';
import { getContractById, deleteContract, updateContract } from '@/lib/mock-data/contracts';
import type { Contract, ContractStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Users,
  Building2,
  FileText,
  Activity,
  Clock,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface ContractDetailProps {
  contractId: string;
}

export function ContractDetail({ contractId }: ContractDetailProps) {
  const { t, locale } = useTranslation();
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const found = getContractById(contractId);
    setContract(found || null);
    setIsLoading(false);
  }, [contractId]);

  const handleDelete = () => {
    if (contract) {
      deleteContract(contract.id);
      writeAuditEntry('DATA_DELETE', 'contract', `Deleted contract ${contract.code}`, user?.id || '', user?.name || '', user?.role || '', contract.id);
      toast.success(t('contracts.messages.deleted'));
      router.push('/contracts');
    }
  };

  const handleStatusChange = (newStatus: ContractStatus) => {
    if (contract) {
      const updated = updateContract(contract.id, { status: newStatus });
      if (updated) {
        setContract(updated);
        writeAuditEntry('DATA_UPDATE', 'contract', `Changed status of ${contract.code} to ${newStatus}`, user?.id || '', user?.name || '', user?.role || '', contract.id);
        toast.success(t('contracts.messages.updated'));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', {
      locale: locale === 'es' ? es : enUS,
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!contract) {
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

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{contract.code}</h1>
            <Badge className={statusColors[contract.status]}>
              {t(`contracts.status.${contract.status}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground">{contract.name}</p>
        </div>
        {hasPermission(['admin', 'analyst']) && (
          <div className="flex gap-2">
            <Select value={contract.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('contracts.status.draft')}</SelectItem>
                <SelectItem value="in_progress">{t('contracts.status.in_progress')}</SelectItem>
                <SelectItem value="review">{t('contracts.status.review')}</SelectItem>
                <SelectItem value="approved">{t('contracts.status.approved')}</SelectItem>
                <SelectItem value="rejected">{t('contracts.status.rejected')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link href={`/contracts/${contract.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                {t('common.edit')}
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 size-4" />
              {t('common.delete')}
            </Button>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('contracts.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="data">{t('contracts.tabs.data')}</TabsTrigger>
          <TabsTrigger value="history">{t('contracts.tabs.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4" />
                  {t('contracts.contractDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.contractCode')}</span>
                  <span className="font-medium">{contract.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.contractType')}</span>
                  <Badge variant="outline">
                    {t(`contracts.types.${contract.contractType}`)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.populationCount')}</span>
                  <span className="font-medium">{formatNumber(contract.populationCount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="size-4" />
                  {t('contracts.form.step2')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t('contracts.epsName')}</span>
                  <p className="font-medium">{contract.epsName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('contracts.ipsName')}</span>
                  <p className="font-medium">{contract.ipsName}</p>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="size-4" />
                  {t('contracts.form.step3')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.startDate')}</span>
                  <span className="font-medium">{formatDate(contract.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.endDate')}</span>
                  <span className="font-medium">{formatDate(contract.endDate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4" />
                  {t('common.details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.createdAt')}</span>
                  <span className="font-medium">{formatDate(contract.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.updatedAt')}</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(contract.updatedAt), {
                      addSuffix: true,
                      locale: locale === 'es' ? es : enUS,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href="/data/rips">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Activity className="size-5" />
                  </div>
                  <CardTitle className="text-base">{t('nav.rips')}</CardTitle>
                  <CardDescription>{t('data.rips.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 size-4" />
                    {t('data.rips.uploadTitle')}
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href="/data/population">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Users className="size-5" />
                  </div>
                  <CardTitle className="text-base">{t('nav.population')}</CardTitle>
                  <CardDescription>{t('data.population.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 size-4" />
                    {t('data.population.uploadTitle')}
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href="/data/tarifarios">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <FileText className="size-5" />
                  </div>
                  <CardTitle className="text-base">{t('nav.tarifarios')}</CardTitle>
                  <CardDescription>{t('data.tarifarios.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 size-4" />
                    {t('data.tarifarios.uploadTitle')}
                  </Button>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
              <CardDescription>
                {t('contracts.tabs.history')} - {contract.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <FileText className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm">{t('contracts.history.created')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(contract.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Pencil className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm">{t('contracts.history.lastModified')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(contract.updatedAt), {
                        addSuffix: true,
                        locale: locale === 'es' ? es : enUS,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contracts.messages.deleteConfirm')}
              <span className="font-medium"> ({contract.code})</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
