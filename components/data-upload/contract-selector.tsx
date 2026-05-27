'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getStoredContracts } from '@/lib/mock-data/contracts';
import type { Contract } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText } from 'lucide-react';

interface ContractSelectorProps {
  value: string | null;
  onChange: (contractId: string | null) => void;
  className?: string;
}

export function ContractSelector({ value, onChange, className }: ContractSelectorProps) {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    setContracts(getStoredContracts());
  }, []);

  return (
    <div className={className}>
      <Select value={value ?? 'all'} onValueChange={(v) => onChange(v === 'all' ? null : v)}>
        <SelectTrigger className="w-[280px]">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <SelectValue placeholder={t('contracts.contractCode')} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')} {t('nav.contracts')}</SelectItem>
          {contracts.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.code} — {c.epsName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
