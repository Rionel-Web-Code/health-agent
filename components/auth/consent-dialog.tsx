'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import {
  hasValidConsent,
  grantConsent,
  CONSENT_POLICY_TEXT,
  CURRENT_CONSENT_VERSION,
  type ConsentPurpose,
} from '@/lib/security/consent';
import { writeAuditEntry } from '@/lib/security/audit-log';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';

interface ConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export function ConsentDialog({ open, onConsent, onDecline }: ConsentDialogProps) {
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  const policy = locale === 'es' ? CONSENT_POLICY_TEXT.es : CONSENT_POLICY_TEXT.en;

  const handleAccept = () => {
    if (!user || !accepted) return;

    const purposes: ConsentPurpose[] = [
      'RIPS_PROCESSING',
      'POPULATION_PROCESSING',
      'CONTRACT_MANAGEMENT',
      'DATA_ANALYTICS',
      'DATA_TRANSFER_MINSALUD',
    ];

    grantConsent(user.id, purposes);
    if (!hasValidConsent(user.id)) {
      return;
    }
    writeAuditEntry(
      'CONSENT_GRANTED',
      'consent',
      `User ${user.name} granted data processing consent ${CURRENT_CONSENT_VERSION}`,
      user.id,
      user.name,
      user.role,
    );
    onConsent();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <DialogTitle>{policy.title}</DialogTitle>
          </div>
          <DialogDescription>{policy.intro}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] rounded-md border p-4">
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-2">
                {t('consent.purposesTitle')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {policy.purposes.map((purpose, i) => (
                  <li key={i}>{purpose}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-medium mb-1">
                {t('consent.rightsTitle')}
              </p>
              <p className="text-muted-foreground">{policy.rights}</p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="consent-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label htmlFor="consent-accept" className="text-sm leading-snug cursor-pointer">
            {policy.acceptance}
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDecline}>
            {t('common.decline')}
          </Button>
          <Button onClick={handleAccept} disabled={!accepted}>
            {t('common.accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check and enforce consent before rendering protected content.
 */
export function useConsentCheck(): {
  needsConsent: boolean;
} {
  const { user } = useAuth();
  if (!user) return { needsConsent: false };
  return { needsConsent: !hasValidConsent(user.id) };
}
