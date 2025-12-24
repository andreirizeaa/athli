'use client';

import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';

const CheckInsPage = () => {
  const t = useTranslations();

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-baseline gap-2">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">Check Ins</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 px-4 py-4">
        {/* Content will be added here */}
      </div>
    </div>
  );
};

export default CheckInsPage;

