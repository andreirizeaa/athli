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
    Settings,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
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
    showArchivedConversations: boolean;
    setShowArchivedConversations: (value: boolean) => void;
    isLoading?: boolean;
    isMobile?: boolean;

    onOpenBroadcast: () => void;
    onContactClick: (contactId: string) => void;
}

export const InboxSidebar = React.memo(function InboxSidebar({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    searchQuery,
    setSearchQuery,
    filteredContacts,
    selectedContactId,
    showArchivedConversations,
    setShowArchivedConversations,
    isLoading,
    isMobile,

    onOpenBroadcast,
    onContactClick,
}: InboxSidebarProps) {
    const t = useTranslations();
    const router = useRouter();

    // On mobile, sidebar is always full-width and never collapsed
    const effectiveCollapsed = isMobile ? false : isSidebarCollapsed;

    return (
        <div
            className={cn(
                'bg-background h-full overflow-hidden flex flex-col transition-all duration-300 ease-in-out',
                isMobile ? 'w-full' : 'border-r',
                !isMobile && (effectiveCollapsed ? 'w-[64px]' : 'w-[320px]')
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
                                effectiveCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
                            )}
                        >
                            <h2 className="text-xl font-semibold whitespace-nowrap">
                                {t('messages.title')}
                            </h2>
                            {!isMobile && (
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
                                        <TooltipContent side="right">
                                            <p>Close inbox panel</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>

                        {/* Collapsed: Open Button (Same Position) - hidden on mobile */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    'absolute inset-0 flex items-center transition-all duration-300',
                                    effectiveCollapsed ? 'opacity-100 visible' : 'opacity-0 invisible'
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
                                        <TooltipContent side="right">
                                            <p>Open inbox panel</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}
                    </div>

                    {/* Broadcast Button Row (Fixed Height) */}
                    <div className="h-9 relative">
                        {/* Expanded: Full Button */}
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center transition-all duration-300',
                                effectiveCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
                            )}
                        >
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 pl-[7px]"
                                onClick={onOpenBroadcast}
                            >
                                <Megaphone className="size-4 -ml-[5px]" />
                                <span className="ml-[0.3]">{t('messages.broadcast')}</span>
                            </Button>
                        </div>

                        {/* Collapsed: Icon Button - hidden on mobile */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    'absolute inset-0 flex items-center transition-all duration-300',
                                    effectiveCollapsed ? 'opacity-100 visible' : 'opacity-0 invisible'
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
                        )}
                    </div>

                    {/* Search Row: Input or Icon (Fixed Height) */}
                    <div className="h-12 relative -mt-[4px]">
                        {/* Expanded: Search Input + Settings */}
                        <div
                            className={cn(
                                'absolute inset-0 transition-all duration-300 flex items-center gap-1',
                                effectiveCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
                            )}
                        >
                            <div className="relative flex-1">
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
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-9 shrink-0 relative">
                                        <Settings className="size-4" />
                                        {showArchivedConversations && (
                                            <span className="absolute -top-0.5 -right-0.5 size-[18px] bg-primary text-primary-foreground rounded-full text-[9px] flex items-center justify-center font-medium">1</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-64">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="show-archived-inbox" className="text-sm font-normal">
                                            Show archived conversations
                                        </Label>
                                        <Switch
                                            id="show-archived-inbox"
                                            checked={showArchivedConversations}
                                            onCheckedChange={setShowArchivedConversations}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Collapsed: Search Icon (Same Position) - hidden on mobile */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    'absolute inset-0 flex items-center transition-all duration-300',
                                    effectiveCollapsed ? 'opacity-100 visible' : 'opacity-0 invisible'
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
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-auto pt-2">
                    <div className="block min-w-0 border-border">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Spinner className="size-6" />
                            </div>
                        ) : filteredContacts.length ? (
                            filteredContacts.map((contact) => (
                                <ContactListItem
                                    contact={contact}
                                    key={contact.id}
                                    active={selectedContactId === contact.id}
                                    isCollapsed={effectiveCollapsed}

                                    onClick={() => {
                                        onContactClick(contact.id);
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
});
