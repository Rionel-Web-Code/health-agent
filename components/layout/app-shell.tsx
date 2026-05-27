'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { LocaleProvider, useTranslation } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/auth/context';
import { ThemeProvider } from 'next-themes';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';
import { ConsentDialog } from '@/components/auth/consent-dialog';
import { hasValidConsent } from '@/lib/security/consent';
import { writeAuditEntry } from '@/lib/security/audit-log';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      if (!hasValidConsent(user.id)) {
        setShowConsent(true);
      } else {
        setConsentGranted(true);
      }
    }
  }, [mounted, isAuthenticated, user]);

  const handleConsent = useCallback(() => {
    setShowConsent(false);
    setConsentGranted(true);
  }, []);

  const handleDecline = useCallback(() => {
    setShowConsent(false);
    if (user) {
      writeAuditEntry('CONSENT_REVOKED', 'consent', `User ${user.name} declined data processing consent`, user.id, user.name, user.role);
    }
    logout();
    router.push('/login');
  }, [logout, router, user]);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ConsentDialog
        open={showConsent}
        onConsent={handleConsent}
        onDecline={handleDecline}
      />
      {consentGranted && (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      )}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LocaleProvider>
        <AuthProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
          <Toaster />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LocaleProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
