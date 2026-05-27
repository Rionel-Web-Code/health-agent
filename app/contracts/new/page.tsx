'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ContractForm } from '@/components/contracts/contract-form';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function NewContractPage() {
  return (
    <AppShell>
      <Breadcrumbs />
      <ContractForm mode="create" />
    </AppShell>
  );
}
