'use client';

import { useParams, useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import { mockPrograms } from '@/components/app/app-shell';

const ProgramDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const program = mockPrograms.find((p) => p.id === programId);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => router.push('/library')}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  Library
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => router.push('/library/programs')}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  Programs
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  {program?.program || 'Program'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-[22px] font-semibold">{program?.program || 'Program'}</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">{/* Program detail content */}</div>
    </div>
  );
};

export default ProgramDetailPage;
