'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { getFileTypeFromMime } from '@/api/coach/coach-file-service';

interface FilePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string;
    filename: string;
    mimeType: string | null;
    isLoading?: boolean;
}

export const FilePreviewDialog = ({
    open,
    onOpenChange,
    fileUrl,
    filename,
    mimeType,
    isLoading = false,
}: FilePreviewDialogProps) => {
    const fileType = getFileTypeFromMime(mimeType);

    const renderPreview = () => {
        if (isLoading) {
            return (
                <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-muted/20 rounded-lg">
                    <Loader2 className="size-10 animate-spin text-primary" />
                </div>
            );
        }

        switch (fileType) {
            case 'image':
                return (
                    <div className="flex items-center justify-center bg-muted/20 rounded-lg">
                        <img
                            src={fileUrl}
                            alt={filename}
                            className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
                            style={{ display: 'block' }}
                        />
                    </div>
                );

            case 'video':
                return (
                    <div className="flex items-center justify-center bg-muted/20 rounded-lg">
                        <video
                            src={fileUrl}
                            controls
                            className="max-w-full max-h-[80vh] w-auto h-auto"
                            style={{ display: 'block' }}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );

            case 'pdf':
                return (
                    <div className="w-full h-[85vh] bg-muted/20 rounded-lg overflow-hidden">
                        <iframe
                            src={fileUrl}
                            className="w-full h-full border-0"
                            title={filename}
                        />
                    </div>
                );

            default:
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <p className="text-muted-foreground mb-4">
                            Preview not available for this file type
                        </p>
                    </div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-fit max-h-[95vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold truncate pr-8">
                            {filename}
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <div className="px-6 pb-6">
                    {renderPreview()}
                </div>
            </DialogContent>
        </Dialog>
    );
};
