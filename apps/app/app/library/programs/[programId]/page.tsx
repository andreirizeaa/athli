'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ChevronRight, Edit, Trash2, X } from 'lucide-react';
import { mockPrograms } from '@/components/app/app-shell';

const ProgramDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const program = mockPrograms.find((p) => p.id === programId);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleEdit = () => {
    if (!program) return;
    router.push(`/library/programs/${programId}/edit`);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(false);
    toast.success('Program deleted successfully', {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });
    router.push('/library/programs');
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsDeleteModalOpen(true);
    }
  };


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
        <div className="absolute top-2 right-4 flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleEdit}
            aria-label="Edit program"
            className="gap-2"
          >
            <Edit className="size-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsDeleteModalOpen(true)}
            onKeyDown={handleDeleteKeyDown}
            aria-label="Delete program"
            tabIndex={0}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">{/* Program detail content */}</div>
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className="w-full max-w-[500px] sm:max-w-[500px] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">Delete</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this program? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramDetailPage;
