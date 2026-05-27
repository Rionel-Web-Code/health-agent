'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: 'nav.dashboard',
  contracts: 'nav.contracts',
  data: 'nav.data',
  rips: 'nav.rips',
  population: 'nav.population',
  tarifarios: 'nav.tarifarios',
  settings: 'nav.settings',
  help: 'nav.help',
  new: 'common.create',
};

export function Breadcrumbs() {
  const { t } = useTranslation();
  const pathname = usePathname();
  
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('nav.dashboard'), href: '/dashboard' },
  ];

  let currentPath = '';
  for (const segment of segments) {
    if (segment === 'dashboard') continue;
    
    currentPath += `/${segment}`;
    const labelKey = routeLabels[segment];
    const label = labelKey ? t(labelKey) : segment;
    
    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }

  // Last item shouldn't be a link
  if (breadcrumbs.length > 1) {
    breadcrumbs[breadcrumbs.length - 1].href = undefined;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5" />}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="size-3.5" />
                    <span className="sr-only md:not-sr-only">{crumb.label}</span>
                  </span>
                ) : (
                  crumb.label
                )}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
