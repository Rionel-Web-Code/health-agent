'use client';

import { use } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ContractDetail } from '@/components/contracts/contract-detail';

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { id } = use(params);
  
  return (
    <AppShell>
      <ContractDetail contractId={id} />
    </AppShell>
  );
}
