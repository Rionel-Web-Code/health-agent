'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Upload,
  Users,
  Activity,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { getAuditEntries, type AuditEntry } from '@/lib/security/audit-log';
import { getStoredContracts } from '@/lib/mock-data/contracts';
import { getStoredRipsRecords } from '@/lib/mock-data/rips';
import { getStoredPopulationRecords } from '@/lib/mock-data/population';
import type { Contract, DashboardStats } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp
              className={`size-3 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}
            />
            <span
              className={`text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend.positive ? '+' : '-'}{trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <Link href={href}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-sm mt-1">{description}</CardDescription>
        </CardContent>
      </Link>
    </Card>
  );
}

function RecentContractRow({ contract, locale }: { contract: Contract; locale: string }) {
  const { t } = useTranslation();
  
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-1">
        <Link
          href={`/contracts/${contract.id}`}
          className="font-medium text-sm hover:underline"
        >
          {contract.code}
        </Link>
        <p className="text-xs text-muted-foreground">{contract.epsName}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={statusColors[contract.status]}>
          {t(`contracts.status.${contract.status}`)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(contract.updatedAt), {
            addSuffix: true,
            locale: locale === 'es' ? es : enUS,
          })}
        </span>
      </div>
    </div>
  );
}

export function DashboardContent() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeContracts: 0,
    pendingReviews: 0,
    totalPopulation: 0,
    ripsRecords: 0,
    recentUploads: 0,
  });
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [recentAuditEntries, setRecentAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const contracts = getStoredContracts();
    const ripsRecords = getStoredRipsRecords();
    const populationRecords = getStoredPopulationRecords();
    const auditEntries = getAuditEntries(undefined, 10);

    setStats({
      activeContracts: contracts.filter(c => c.status === 'approved' || c.status === 'in_progress').length,
      pendingReviews: contracts.filter(c => c.status === 'review').length,
      totalPopulation: populationRecords.length || contracts.reduce((acc, c) => acc + c.populationCount, 0),
      ripsRecords: ripsRecords.length,
      recentUploads: 0,
    });

    setRecentContracts(
      contracts
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
    );

    setRecentAuditEntries(auditEntries);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('auth.welcomeBack')}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.activeContracts')}
          value={stats.activeContracts}
          icon={FileText}
        />
        <StatCard
          title={t('dashboard.pendingReviews')}
          value={stats.pendingReviews}
          icon={Clock}
        />
        <StatCard
          title={t('dashboard.totalPopulation')}
          value={formatNumber(stats.totalPopulation)}
          icon={Users}
        />
        <StatCard
          title={t('dashboard.ripsRecords')}
          value={formatNumber(stats.ripsRecords)}
          description={stats.ripsRecords === 0 ? t('common.noData') : undefined}
          icon={Activity}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title={t('dashboard.newContract')}
            description={t('contracts.form.basicInfo')}
            href="/contracts/new"
            icon={FileText}
          />
          <QuickActionCard
            title={t('dashboard.uploadRips')}
            description={t('data.rips.subtitle')}
            href="/data/rips"
            icon={Upload}
          />
          <QuickActionCard
            title={t('dashboard.uploadPopulation')}
            description={t('data.population.subtitle')}
            href="/data/population"
            icon={Users}
          />
          <QuickActionCard
            title={t('nav.tarifarios')}
            description={t('data.tarifarios.subtitle')}
            href="/data/tarifarios"
            icon={Activity}
          />
        </div>
      </div>

      {/* Recent Contracts & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Contracts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('contracts.contractList')}</CardTitle>
              <CardDescription>{t('dashboard.recentActivity')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contracts">
                {t('common.view')}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('contracts.messages.noContracts')}
              </p>
            ) : (
              <div className="space-y-1">
                {recentContracts.map((contract) => (
                  <RecentContractRow
                    key={contract.id}
                    contract={contract}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
            <CardDescription>{t('dashboard.systemStatus')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAuditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('dashboard.noRecentActivity')}
              </p>
            ) : (
              <div className="space-y-1">
                {recentAuditEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 py-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Activity className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">{entry.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.userName}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(entry.timestamp), {
                            addSuffix: true,
                            locale: locale === 'es' ? es : enUS,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
