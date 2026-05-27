'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { LoginForm } from '@/components/auth/login-form';
import { PublicShell } from '@/components/layout/app-shell';

function LoginPageContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <PublicShell>
      <LoginPageContent />
    </PublicShell>
  );
}
