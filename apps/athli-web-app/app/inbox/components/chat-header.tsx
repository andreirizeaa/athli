'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type Contact } from '@/components/app/app-shell';

interface ChatHeaderProps {
    selectedContact: Contact;
    isPowerViewOpen: boolean;
    onTogglePowerView: () => void;
}

export function ChatHeader({ selectedContact, isPowerViewOpen, onTogglePowerView }: ChatHeaderProps) {
    const t = useTranslations();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    };

    return (
        <div className="flex items-center justify-between px-4 h-[48px] flex-shrink-0 border-b border-border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0 rounded-full">
                    <AvatarImage src={selectedContact.avatar} alt={selectedContact.name} className="rounded-full" />
                    <AvatarFallback className="rounded-full">{getInitials(selectedContact.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate mb-[1px]">
                        {selectedContact.name}
                    </h3>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    onClick={onTogglePowerView}
                    className="h-9 gap-2 w-[180px] border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                    {isPowerViewOpen ? (
                        <>
                            <ZapOff className="h-4 w-4" />
                            <span>{t('messages.closePowerView')}</span>
                        </>
                    ) : (
                        <>
                            <Zap className="h-4 w-4" />
                            <span>{t('messages.enablePowerMode')}</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
