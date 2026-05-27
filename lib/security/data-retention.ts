/**
 * Data retention policy enforcement per Ley 1581/2012 and Decreto 1377/2013.
 *
 * Personal health data must be kept only as long as necessary for the purpose
 * for which it was collected. This module enforces configurable retention
 * periods and provides data purge capabilities.
 */

export interface RetentionPolicy {
  entityType: 'rips' | 'population' | 'contracts' | 'audit';
  retentionDays: number;
  description: string;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    entityType: 'rips',
    retentionDays: 1825, // 5 years — aligns with Colombian tax record retention
    description: 'RIPS records retained per fiscal and health audit requirements',
  },
  {
    entityType: 'population',
    retentionDays: 365, // 1 year after contract period
    description: 'Population data retained for active contract period plus 1 year',
  },
  {
    entityType: 'contracts',
    retentionDays: 3650, // 10 years for contractual records
    description: 'Contract records retained per commercial law requirements',
  },
  {
    entityType: 'audit',
    retentionDays: 1825, // 5 years for audit trail
    description: 'Audit log retained for regulatory inspection period',
  },
];

const RETENTION_STORAGE_KEY = 'nota-tecnica-retention-meta';

interface RetentionMetadata {
  entityType: string;
  storageKey: string;
  lastPurge?: string;
  oldestRecord?: string;
}

export function getRetentionPolicies(): RetentionPolicy[] {
  return DEFAULT_RETENTION_POLICIES;
}

export function checkRetention(storageKey: string, entityType: string): {
  totalRecords: number;
  expiredRecords: number;
  oldestDate: string | null;
} {
  if (typeof window === 'undefined') {
    return { totalRecords: 0, expiredRecords: 0, oldestDate: null };
  }

  const policy = DEFAULT_RETENTION_POLICIES.find(p => p.entityType === entityType);
  if (!policy) return { totalRecords: 0, expiredRecords: 0, oldestDate: null };

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return { totalRecords: 0, expiredRecords: 0, oldestDate: null };

    const records: Array<Record<string, unknown>> = JSON.parse(stored);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.retentionDays);
    const cutoffStr = cutoff.toISOString();

    let expiredCount = 0;
    let oldest: string | null = null;

    for (const record of records) {
      const dateField =
        (record.createdAt as string) ??
        (record.serviceDate as string) ??
        (record.uploadedAt as string) ??
        (record.timestamp as string);

      if (dateField) {
        if (!oldest || dateField < oldest) oldest = dateField;
        if (dateField < cutoffStr) expiredCount++;
      }
    }

    return {
      totalRecords: records.length,
      expiredRecords: expiredCount,
      oldestDate: oldest,
    };
  } catch {
    return { totalRecords: 0, expiredRecords: 0, oldestDate: null };
  }
}

export function purgeExpiredRecords(
  storageKey: string,
  entityType: string,
  dateField: string,
): number {
  if (typeof window === 'undefined') return 0;

  const policy = DEFAULT_RETENTION_POLICIES.find(p => p.entityType === entityType);
  if (!policy) return 0;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;

    const records: Array<Record<string, unknown>> = JSON.parse(stored);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.retentionDays);
    const cutoffStr = cutoff.toISOString();

    const kept = records.filter(r => {
      const val = r[dateField] as string | undefined;
      return !val || val >= cutoffStr;
    });

    const purged = records.length - kept.length;
    localStorage.setItem(storageKey, JSON.stringify(kept));

    // Record purge metadata
    const metaStored = localStorage.getItem(RETENTION_STORAGE_KEY);
    const metas: RetentionMetadata[] = metaStored ? JSON.parse(metaStored) : [];
    const existing = metas.find(m => m.storageKey === storageKey);
    if (existing) {
      existing.lastPurge = new Date().toISOString();
    } else {
      metas.push({
        entityType,
        storageKey,
        lastPurge: new Date().toISOString(),
      });
    }
    localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(metas));

    return purged;
  } catch {
    return 0;
  }
}

/**
 * Habeas data right — complete erasure of a specific person's data across
 * all storage keys. Required by Ley 1581/2012 Art. 8 (right of suppression).
 */
export function erasePersonData(
  documentNumber: string,
): { erasedFrom: string[]; totalErased: number } {
  if (typeof window === 'undefined') {
    return { erasedFrom: [], totalErased: 0 };
  }

  const flatTargets = [
    { key: 'nota-tecnica-rips', idField: 'beneficiaryId' },
    { key: 'nota-tecnica-population', idField: 'documentNumber' },
  ];

  const erasedFrom: string[] = [];
  let totalErased = 0;

  for (const target of flatTargets) {
    try {
      const stored = localStorage.getItem(target.key);
      if (!stored) continue;
      const records: Array<Record<string, unknown>> = JSON.parse(stored);
      const filtered = records.filter(r => String(r[target.idField]) !== documentNumber);
      const removed = records.length - filtered.length;
      if (removed > 0) {
        localStorage.setItem(target.key, JSON.stringify(filtered));
        erasedFrom.push(target.key);
        totalErased += removed;
      }
    } catch { continue; }
  }

  // Legal RIPS: nested usuarios with numDocumentoIdentificacion
  try {
    const stored = localStorage.getItem('nota-tecnica-rips-legal');
    if (stored) {
      const transactions: Array<Record<string, unknown>> = JSON.parse(stored);
      let legalRemoved = 0;
      for (const tx of transactions) {
        const usuarios = tx.usuarios as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(usuarios)) continue;
        const before = usuarios.length;
        tx.usuarios = usuarios.filter(u => String(u.numDocumentoIdentificacion) !== documentNumber);
        legalRemoved += before - (tx.usuarios as unknown[]).length;
      }
      if (legalRemoved > 0) {
        localStorage.setItem('nota-tecnica-rips-legal', JSON.stringify(transactions));
        erasedFrom.push('nota-tecnica-rips-legal');
        totalErased += legalRemoved;
      }
    }
  } catch { /* continue */ }

  return { erasedFrom, totalErased };
}
