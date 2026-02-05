import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';

interface CardLoaderOverlayProps {
    className?: string;
}

/**
 * A small loader overlay for cards - covers the parent element with a spinner.
 * The parent element should have position: relative.
 */
export function CardLoaderOverlay({ className }: CardLoaderOverlayProps) {
    return (
        <div className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-lg",
            className
        )}>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
    );
}
