'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    Search,
    X,
    PanelLeftClose,
    PanelLeftOpen,
    Megaphone,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';
import { type Contact } from '@/components/app/app-shell';
import { ContactListItem } from './contact-list-item';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InboxSidebarProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (value: boolean) => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    filteredContacts: Contact[];
    selectedContactId: string | undefined;
    hasDraft: (contactId: string) => boolean;
    onOpenBroadcast: () => void;
}

export function InboxSidebar({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    searchQuery,
    setSearchQuery,
    filteredContacts,
    selectedContactId,
    hasDraft,
    onOpenBroadcast,
}: InboxSidebarProps) {
    const t = useTranslations();
    const router = useRouter();

    return (
        <div
            className={cn(
                'bg-muted/30 h-full overflow-hidden flex flex-col border-r transition-all duration-300 ease-in-out',
                isSidebarCollapsed ? 'w-[64px]' : 'w-[320px]'
            )}
        >
            <div className="flex flex-col h-full grow min-w-0">
                <div className="px-4 pt-2 flex flex-col gap-2">
                    {/* Header Row: Title + Toggle Button (Fixed Height) */}
                    <div className="h-8 relative">
                        {/* Expanded: Title + Close Button */}
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center justify-between transition-all duration-300',
                                isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
                            )}
                        >
                            <h2 className="text-xl font-semibold whitespace-nowrap">
                                {t('messages.title')}
                            </h2>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={() => setIsSidebarCollapsed(true)}
                                        >
                                            <PanelLeftClose className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>{t('sidebar.actions.closeSidebar')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Collapsed: Open Button (Same Position) */}
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center transition-all duration-300',
                                isSidebarCollapsed ? 'opacity-100 visible' : 'opacity-0 invisible'
                            )}
                        >
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={() => setIsSidebarCollapsed(false)}
                                        >
                                            <PanelLeftOpen className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>{t('sidebar.actions.openSidebar')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Broadcast Button Row (Fixed Height) */}
                    <div className="h-9 relative">
                        {/* Expanded: Full Button */}
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center transition-all duration-300',
                                isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
                            )}
                        >
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 pl-[7px] text-muted-foreground hover:text-foreground"
                                onClick={onOpenBroadcast}
                            >
                                <Megaphone className="size-4 -ml-[5px]" />
                                <span className="ml-[0.3]">{t('messages.broadcast')}</span>
                            </Button>
                        </div>

                        {/* Collapsed: Icon Button */}
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center transition-all duration-300',
                                isSidebarCollapsed ? 'opacity-100 visible' : 'opacity-0 invisible'
                            )}
                        >
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={onOpenBroadcast}
                                        >
                                            <Megaphone className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{t('messages.broadcast')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Search Row: Input or Icon (Fixed Height) */}
                    <div className="h-12 relative -mt-[4px]">
                        {/* Expanded: Search Input */}
                        <div
                            className={cn(
                                'absolute inset-0 transition-all duration-300 flex items-center',
                                isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
                            )}
                        >
                            <div className="relative w-full">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder={t('messages.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-8 h-9"
                                    aria-label={t('messages.searchPlaceholder')}
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Collapsed: Search Icon (Same Position) */}
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center transition-all duration-300',
                                isSidebarCollapsed ? 'opacity-100 visible' : 'opacity-0 invisible'
                            )}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                onClick={() => setIsSidebarCollapsed(false)}
                            >
                                <Search className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <div className="block min-w-0 border-t border-border">
                        {filteredContacts.length ? (
                            filteredContacts.map((contact) => (
                                <ContactListItem
                                    contact={contact}
                                    key={contact.id}
                                    active={selectedContactId === contact.id}
                                    isCollapsed={isSidebarCollapsed}
                                    hasDraft={hasDraft(contact.id)}
                                    onClick={() => {
                                        setIsSidebarCollapsed(true);
                                        router.push(`/inbox/${contact.id}/overview`);
                                    }}
                                    onViewProfile={() => router.push(`/athletes/${contact.id}/overview`)}
                                />
                            ))
                        ) : (
                            <div className="text-muted-foreground mt-4 text-center text-sm">
                                {t('messages.noContactsFound')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
