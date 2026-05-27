'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataPreviewProps<T extends Record<string, unknown>> {
  data: T[];
  columns: string[];
  errors?: Array<{ row: number; message: string }>;
  warnings?: Array<{ row: number; message: string }>;
  sensitiveColumns?: string[];
  pageSize?: number;
}

export function DataPreview<T extends Record<string, unknown>>({
  data,
  columns,
  errors = [],
  warnings = [],
  sensitiveColumns = [],
  pageSize = 10,
}: DataPreviewProps<T>) {
  const { t, locale } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  const formatValue = (value: unknown, column?: string): string => {
    if (value === null || value === undefined) return '-';
    if (column && sensitiveColumns.includes(column)) {
      const str = String(value);
      if (str.length <= 4) return '****';
      return '****' + str.slice(-4);
    }
    if (typeof value === 'number') {
      return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(value);
    }
    return String(value);
  };

  const getRowStatus = (rowIndex: number): 'error' | 'warning' | 'valid' => {
    const actualIndex = startIndex + rowIndex;
    if (errors.some((e) => e.row === actualIndex)) return 'error';
    if (warnings.some((w) => w.row === actualIndex)) return 'warning';
    return 'valid';
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {data.length} {t('data.upload.rowsDetected')}
          </span>
          <span className="text-muted-foreground">
            {columns.length} {t('data.upload.columnsDetected')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="size-3" />
              {errors.length} {t('data.validation.errors')}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
              <AlertCircle className="size-3" />
              {warnings.length} {t('data.validation.warnings')}
            </Badge>
          )}
          {errors.length === 0 && warnings.length === 0 && (
            <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
              <CheckCircle2 className="size-3" />
              {t('data.validation.valid')}
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              {columns.map((column) => (
                <TableHead key={column} className="min-w-[120px]">
                  {column}
                </TableHead>
              ))}
              <TableHead className="w-[80px]">{t('common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row, index) => {
              const status = getRowStatus(index);
              return (
                <TableRow
                  key={index}
                  className={
                    status === 'error'
                      ? 'bg-destructive/10'
                      : status === 'warning'
                      ? 'bg-yellow-500/10'
                      : ''
                  }
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {startIndex + index + 1}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column} className="max-w-[200px] truncate">
                      {formatValue(row[column], column)}
                    </TableCell>
                  ))}
                  <TableCell>
                    {status === 'error' && (
                      <Badge variant="destructive" className="text-xs">
                        {t('data.validation.invalid')}
                      </Badge>
                    )}
                    {status === 'warning' && (
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                        {t('data.validation.warnings')}
                      </Badge>
                    )}
                    {status === 'valid' && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                        {t('data.validation.valid')}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('common.view')} {startIndex + 1}-{endIndex} / {data.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
