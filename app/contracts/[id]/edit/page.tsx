'use client';

import { use, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ContractForm } from '@/components/contracts/contract-form';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { useTranslation } from '@/lib/i18n/context';
import { getContractById } from '@/lib/mock-data/contracts';
import type { Contract } from '@/lib/types';

interface EditContractPageProps {
  params: Promise<{ id: string }>;
}

export default function EditContractPage({ params }: EditContractPageProps) {
  const { id } = use(params);
  const { t } = useTranslation();
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const found = getContractById(id);
    setContract(found || null);
    setIsLoading(false);
  }, [id]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </div>
      </AppShell>
    );
  }

  if (!contract) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('errors.notFound')}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Breadcrumbs />
      <ContractForm existingContract={contract} mode="edit" />
    </AppShell>
  );
}
