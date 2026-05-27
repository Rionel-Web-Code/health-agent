'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { writeAuditEntry } from '@/lib/security/audit-log';
import { getStoredContracts, deleteContract } from '@/lib/mock-data/contracts';
import type { Contract, ContractStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2,
  FileText,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function ContractList() {
  const { t, locale } = useTranslation();
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  useEffect(() => {
    const storedContracts = getStoredContracts();
    setContracts(storedContracts);
    setFilteredContracts(storedContracts);
  }, []);

  useEffect(() => {
    let result = contracts;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.epsName.toLowerCase().includes(query) ||
          c.ipsName.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.contractType === typeFilter);
    }

    setFilteredContracts(result);
  }, [contracts, searchQuery, statusFilter, typeFilter]);

  const handleDelete = (contract: Contract) => {
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contractToDelete) {
      deleteContract(contractToDelete.id);
      writeAuditEntry('DATA_DELETE', 'contract', `Deleted contract ${contractToDelete.code}`, user?.id || '', user?.name || '', user?.role || '', contractToDelete.id);
      setContracts(contracts.filter((c) => c.id !== contractToDelete.id));
      toast.success(t('contracts.messages.deleted'));
    }
    setDeleteDialogOpen(false);
    setContractToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', {
      locale: locale === 'es' ? es : enUS,
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('contracts.title')}</h1>
          <p className="text-muted-foreground">{t('contracts.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/contracts/new">
            <Plus className="mr-2 size-4" />
            {t('contracts.newContract')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 size-4" />
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="draft">{t('contracts.status.draft')}</SelectItem>
              <SelectItem value="in_progress">{t('contracts.status.in_progress')}</SelectItem>
              <SelectItem value="review">{t('contracts.status.review')}</SelectItem>
              <SelectItem value="approved">{t('contracts.status.approved')}</SelectItem>
              <SelectItem value="rejected">{t('contracts.status.rejected')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('common.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="capitacion">{t('contracts.types.capitacion')}</SelectItem>
              <SelectItem value="evento">{t('contracts.types.evento')}</SelectItem>
              <SelectItem value="mixto">{t('contracts.types.mixto')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('contracts.contractCode')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('contracts.epsName')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('contracts.contractType')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('contracts.populationCount')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('contracts.endDate')}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="size-8 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('contracts.messages.noContracts')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="font-medium hover:underline"
                      >
                        {contract.code}
                      </Link>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {contract.epsName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>
                      <p className="font-medium">{contract.epsName}</p>
                      <p className="text-xs text-muted-foreground">{contract.ipsName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">
                      {t(`contracts.types.${contract.contractType}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[contract.status]}>
                      {t(`contracts.status.${contract.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatNumber(contract.populationCount)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(contract.endDate)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">{t('common.actions')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/contracts/${contract.id}`)}>
                          <Eye className="mr-2 size-4" />
                          {t('common.view')}
                        </DropdownMenuItem>
                        {hasPermission(['admin', 'analyst']) && (
                          <DropdownMenuItem onClick={() => router.push(`/contracts/${contract.id}/edit`)}>
                            <Pencil className="mr-2 size-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                        )}
                        {hasPermission(['admin', 'analyst']) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(contract)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredContracts.length} {t('common.total')}
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contracts.messages.deleteConfirm')}
              {contractToDelete && (
                <span className="font-medium"> ({contractToDelete.code})</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
