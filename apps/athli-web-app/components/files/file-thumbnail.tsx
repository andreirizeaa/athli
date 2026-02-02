'use client';

import { useState, useEffect } from 'react';
import { getFileUrl, type CoachFile, getFileTypeFromMime, isExternalLink, isYouTubeUrl, isVimeoUrl, getYouTubeThumbnail } from '@/api/coach/coach-file-service';
import { cn } from '@/lib/general/utils';
import { Loader2, Link, Play } from 'lucide-react';

interface FileThumbnailProps {
    file: CoachFile;
    className?: string;
}

export const FileThumbnail = ({ file, className }: FileThumbnailProps) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isLink = isExternalLink(file.file_path);
    const fileType = getFileTypeFromMime(file.mime_type);

    useEffect(() => {
        // Don't fetch URL for external links
        if (isLink) return;

        if (fileType === 'image' || fileType === 'video') {
            const fetchThumbnail = async () => {
                setIsLoading(true);
                try {
                    const { url } = await getFileUrl(file.id);
                    setThumbnailUrl(url);
                } catch (error) {
                    console.error('Failed to fetch thumbnail URL:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchThumbnail();
        }
    }, [file.id, fileType, isLink]);

    const renderContent = () => {
        // Handle external links first
        if (isLink) {
            const linkUrl = file.file_path;

            // YouTube thumbnail
            if (isYouTubeUrl(linkUrl)) {
                const ytThumbnail = getYouTubeThumbnail(linkUrl);
                if (ytThumbnail) {
                    return (
                        <div className="relative w-full h-full">
                            <img
                                src={ytThumbnail}
                                alt={file.filename}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="size-4 text-white fill-white" />
                            </div>
                        </div>
                    );
                }
            }

            // Vimeo icon
            if (isVimeoUrl(linkUrl)) {
                return (
                    <div className="w-full h-full flex items-center justify-center bg-[#1ab7ea]/10">
                        <svg className="size-5 text-[#1ab7ea]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
                        </svg>
                    </div>
                );
            }

            // Generic link icon
            return (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <Link className="size-5 text-primary" />
                </div>
            );
        }

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
