'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Dumbbell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type Contact } from '@/components/app/app-shell';

interface ChatHeaderProps {
    selectedContact: Contact;
    onViewTraining: () => void;
    onViewProfile: () => void;
}

export function ChatHeader({ selectedContact, onViewTraining, onViewProfile }: ChatHeaderProps) {
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
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                onClick={onViewTraining}
                                className="h-9 w-9 rounded-full p-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                aria-label={t('messages.viewTrainingCalendar')}
                            >
                                <Dumbbell className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('messages.viewTrainingCalendar')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                onClick={onViewProfile}
                                className="h-9 w-9 rounded-full p-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                aria-label={t('general.profile')}
                            >
                                <User className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>
                                {t('messages.viewProfile', {
                                    name:
                                        selectedContact.name.split(' ')[0] || selectedContact.name,
                                })}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
