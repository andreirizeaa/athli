import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
    subtitle?: string;
}

export function FullScreenLoader({ subtitle }: FullScreenLoaderProps = {}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                {subtitle && (
                    <p className="text-base font-medium text-muted-foreground">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
