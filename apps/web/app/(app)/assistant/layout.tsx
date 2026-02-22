'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/general/utils';
import { AssistantSidebar } from './components/sidebar';
import { AssistantSidebarProvider, useAssistantSidebar } from './assistant-sidebar-context';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function AssistantLayoutContent({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const { isOpen, isMobile, isMobileOpen, setMobileOpen } = useAssistantSidebar();

  return (
    <div className="h-full w-full flex">
      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-80 p-0 [&>button]:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t('assistant.chats')}</SheetTitle>
              <SheetDescription>{t('assistant.chatHistory')}</SheetDescription>
            </SheetHeader>
            <AssistantSidebar onChatClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={cn(
            'border-r bg-background flex flex-col transition-[width] duration-200 ease-linear overflow-hidden',
            isOpen ? 'w-[320px]' : 'w-0 border-r-0'
          )}
        >
          <div className="min-w-[320px]">
            <AssistantSidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AssistantSidebarProvider>
      <AssistantLayoutContent>{children}</AssistantLayoutContent>
    </AssistantSidebarProvider>
  );
}
