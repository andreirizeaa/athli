'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';
import { AlertTriangle } from 'lucide-react';

type AthleteSettingsLayoutProps = {
  children: React.ReactNode;
};

const AthleteSettingsLayout = ({ children }: AthleteSettingsLayoutProps) => {
  return (
    <div className="flex h-full w-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default AthleteSettingsLayout;
