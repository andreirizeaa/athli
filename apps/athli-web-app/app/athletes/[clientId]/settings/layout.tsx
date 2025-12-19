'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

type AthleteSettingsLayoutProps = {
  children: React.ReactNode;
};

const AthleteSettingsLayout = ({ children }: AthleteSettingsLayoutProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const sections = [
    {
      id: 'danger',
      href: `/athletes/${clientId}/settings/danger`,
      icon: AlertTriangle,
      label: t('athletes.profile.settings.danger.title'),
    },
  ];

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar navigation */}
      <div className="w-64 border-r bg-background flex-shrink-0">
        <div className="p-4">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = pathname === section.href;

              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{section.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default AthleteSettingsLayout;
