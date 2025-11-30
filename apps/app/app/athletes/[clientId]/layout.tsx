'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PageTabs } from '@/components/page-tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Archive, ChevronRight, MessageCircle, Users, X } from 'lucide-react';
import { mockAthletes } from '@/components/app/app-shell';
import { archiveUser } from '@/lib/athlete-service';

type ClientProfileLayoutProps = {
  children: React.ReactNode;
};

const ClientProfileLayout = ({ children }: ClientProfileLayoutProps) => {
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const athlete = mockAthletes.find((item) => item.id === clientId);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const tabs = [
    {
      value: 'overview',
      label: 'Overview',
    },
    {
      value: 'metrics',
      label: 'Metrics',
    },
    {
      value: 'appointment-sessions',
      label: 'Bookings',
    },
    {
      value: 'training-calendar',
      label: 'Training Calendar',
    },
    {
      value: 'app-settings',
      label: 'App Settings',
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const lastSegment = segments[segments.length - 1];
  const activeTab = lastSegment && validTabValues.includes(lastSegment) ? lastSegment : 'overview';

  const handleTabChange = (value: string) => {
    if (!clientId) {
      return;
    }

    if (value === activeTab) {
      return;
    }

    router.push(`/athletes/${clientId}/${value}`);
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    handleNavigateToAthletes();
  };

  const handleNavigateToMessages = (athleteId: string) => {
    router.push(`/messaging/${athleteId}`);
  };

  const handleArchive = async () => {
    if (!clientId) return;
    
    try {
      await archiveUser(clientId);
      setIsArchiveModalOpen(false);
      toast.success('Client archived successfully', {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
      handleNavigateToAthletes();
    } catch (error) {
      toast.error('Failed to archive client', {
        style: {
          background: 'rgb(254 242 242)',
          color: 'rgb(153 27 27)',
          border: '1px solid rgb(254 202 202)',
        },
      });
    }
  };

  const handleCancelArchive = () => {
    setIsArchiveModalOpen(false);
  };

  if (!athlete) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="w-full relative">
          <div className="px-4 flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">Client not found</h1>
            <Button
              onClick={handleNavigateToAthletes}
              className="gap-2"
              aria-label="View all clients"
            >
              <Users className="size-4" />
              <span>All Clients</span>
            </Button>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="w-full flex-1 overflow-auto px-4 py-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">We could not find a client with this id.</p>
        </div>
      </div>
    );
  }

  const initials = athlete.name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const firstName = athlete.name.split(' ')[0];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={handleNavigateToAthletes}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  Athletes
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  {athlete.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={athlete.avatar} alt={athlete.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <h1 className="text-[22px] font-semibold">{athlete.name}</h1>
            </div>
          </div>
        </div>
        <div className="absolute top-2 right-4 flex items-center gap-2">
          <Button
            onClick={() => handleNavigateToMessages(clientId)}
            variant="secondary"
            className="gap-2"
            aria-label="Open message with this client"
          >
            <MessageCircle className="size-4" />
            <span>Message</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="gap-2"
            aria-label="Archive client"
            onClick={() => setIsArchiveModalOpen(true)}
          >
            <Archive className="size-4" />
          </Button>
        </div>
        <div className="px-4">
          <PageTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={handleTabChange}
            className="mt-1"
          />
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto bg-background">{children}</div>
      <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
        <DialogContent
          className="w-full max-w-[500px] sm:max-w-[500px] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">Are you sure you want to archive {firstName}?</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4">
            <p className="text-sm text-muted-foreground">
              Archiving the user will remove their access to the app immediately. Archives can be restored which may incur charges depending on client limits.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCancelArchive}>
              No
            </Button>
            <Button type="button" onClick={handleArchive}>
              Yes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientProfileLayout;
