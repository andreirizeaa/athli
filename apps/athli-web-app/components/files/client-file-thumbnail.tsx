'use client';

import { useState, useEffect } from 'react';
import { getClientFileUrl } from '@/api/client/client-file-service';
import { getFileTypeFromMime } from '@/api/coach/coach-file-service';
import { cn } from '@/lib/general/utils';
import { Loader2 } from 'lucide-react';

interface ClientFileThumbnailProps {
    file: {
        id: string;
        filename: string;
        mime_type?: string | null;
    };
    clientId: string;
    coachId: string;
    className?: string;
}

export const ClientFileThumbnail = ({ file, clientId, coachId, className }: ClientFileThumbnailProps) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileType = getFileTypeFromMime(file.mime_type || null);

    useEffect(() => {
        if (fileType === 'image' || fileType === 'video') {
            const fetchThumbnail = async () => {
                setIsLoading(true);
                try {
                    const { url } = await getClientFileUrl(file.id, clientId, coachId);
                    setThumbnailUrl(url);
                } catch (error) {
                    console.error('Failed to fetch thumbnail URL:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchThumbnail();
        }
    }, [file.id, fileType, clientId, coachId]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
            );
        }

        if (fileType === 'image' && thumbnailUrl) {
            return (
                <img
                    src={thumbnailUrl}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                />
            );
        }

        if (fileType === 'video' && thumbnailUrl) {
            return (
                <video
                    src={thumbnailUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                />
            );
        }

        const extension = file.filename.split('.').pop()?.toLowerCase();

        if (fileType === 'pdf') {
            return (
                <img
                    src="/icons/pdf.png"
                    alt="PDF"
                    className="w-full h-full object-contain p-1"
                />
            );
        }

        if (extension === 'docx' || file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return (
                <img
                    src="/icons/docx.png"
                    alt="DOCX"
                    className="w-full h-full object-contain p-1"
                />
            );
        }

        if (extension === 'xlsx' || extension === 'xls' || file.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mime_type === 'application/vnd.ms-excel') {
            return (
                <img
                    src="/icons/excel.png"
                    alt="Excel"
                    className="w-full h-full object-contain p-1"
                />
            );
        }

        return null;
    };

    const content = renderContent();
    if (!content) return null;

    return (
        <div className={cn(
            "w-10 h-10 flex-shrink-0 rounded-md border border-muted bg-background overflow-hidden",
            className
        )}>
            {content}
        </div>
    );
};
