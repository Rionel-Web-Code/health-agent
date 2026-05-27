'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ContractList } from '@/components/contracts/contract-list';

export default function ContractsPage() {
  return (
    <AppShell>
      <ContractList />
    </AppShell>
  );
}
