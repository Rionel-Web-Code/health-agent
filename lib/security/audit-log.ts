/**
 * Audit logging system for compliance with Article 9.1.3 and Article 14 (Parágrafo 3)
 * of Resolution 00002275/2023, and Ley 527/1999 traceability requirements.
 *
 * Every access, creation, modification, or deletion of health data (RIPS, population,
 * contracts) must be recorded with actor identity, timestamp, action, and affected entity.
 */

export type AuditAction =
  | 'DATA_ACCESS'
  | 'DATA_CREATE'
  | 'DATA_UPDATE'
  | 'DATA_DELETE'
  | 'DATA_UPLOAD'
  | 'DATA_EXPORT'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED_LOGIN'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'RIPS_VALIDATED'
  | 'RIPS_REJECTED';

export type AuditEntityType =
  | 'rips'
  | 'population'
  | 'contract'
  | 'tarifario'
  | 'user'
  | 'consent'
  | 'system';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const AUDIT_STORAGE_KEY = 'nota-tecnica-audit-log';
const MAX_AUDIT_ENTRIES = 10000;

function generateAuditId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function writeAuditEntry(
  action: AuditAction,
  entityType: AuditEntityType,
  description: string,
  userId: string,
  userName: string,
  userRole: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): AuditEntry | null {
  const entry: AuditEntry = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    action,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    description,
    metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  if (typeof window === 'undefined') return entry;

  try {
    const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
    const entries: AuditEntry[] = stored ? JSON.parse(stored) : [];
    entries.unshift(entry);
    if (entries.length > MAX_AUDIT_ENTRIES) {
      entries.length = MAX_AUDIT_ENTRIES;
    }
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      try {
        const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
        const entries: AuditEntry[] = stored ? JSON.parse(stored) : [];
        const trimCount = Math.ceil(entries.length * 0.2);
        entries.splice(entries.length - trimCount, trimCount);
        entries.unshift(entry);
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  return entry;
}

export function getAuditEntries(
  filters?: Partial<{
    action: AuditAction;
    entityType: AuditEntityType;
    userId: string;
    startDate: string;
    endDate: string;
  }>,
  limit = 100,
  offset = 0,
): AuditEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!stored) return [];

    let entries: AuditEntry[] = JSON.parse(stored);

    if (filters) {
      if (filters.action) entries = entries.filter(e => e.action === filters.action);
      if (filters.entityType) entries = entries.filter(e => e.entityType === filters.entityType);
      if (filters.userId) entries = entries.filter(e => e.userId === filters.userId);
      if (filters.startDate) entries = entries.filter(e => e.timestamp >= filters.startDate!);
      if (filters.endDate) entries = entries.filter(e => e.timestamp <= filters.endDate!);
    }

    return entries.slice(offset, offset + limit);
  } catch {
    return [];
  }
}

export function getAuditEntryCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!stored) return 0;
    return JSON.parse(stored).length;
  } catch {
    return 0;
  }
}
