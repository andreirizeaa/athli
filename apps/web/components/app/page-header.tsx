'use client';

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/general/utils';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export const PageHeader = ({ title, subtitle, action, className }: PageHeaderProps) => {
    return (
        <div className={cn("w-full relative flex-shrink-0", className)}>
            <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
                <div className="flex flex-col">
                    <h1 className="text-[22px] font-semibold">{title}</h1>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                {action && <div className="flex items-center gap-2">{action}</div>}
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
    );
};
