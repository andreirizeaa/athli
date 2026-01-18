'use client';

import React from 'react';
import { Reply, FileText, Video, Mic, Play } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import type { AttachmentType } from '@/components/app/types';

interface ReplyToMessage {
    id: string;
    text: string;
    isSent: boolean;
    is_deleted?: boolean;
    pdf?: {
        name: string;
        data: string;
        type: string;
        size: number;
    };
    images?: Array<{
        name: string;
        data: string;
        type: string;
        size: number;
    }>;
    video?: {
        name: string;
        data: string;
        type: string;
        size: number;
    };
    attachments?: Array<{
        name: string;
        data: string;
        type: string;
        size: number;
        attachmentType: AttachmentType;
    }>;
}

interface MessageReplyPreviewProps {
    replyTo: ReplyToMessage;
    isSent: boolean;
    contactName: string;
    yourselfLabel: string;
    deletedMessageLabel: string;
    voiceNoteLabel: string;
    onScrollToMessage: (messageId: string) => void;
}

export function MessageReplyPreview({
    replyTo,
    isSent,
    contactName,
    yourselfLabel,
    deletedMessageLabel,
    voiceNoteLabel,
    onScrollToMessage,
}: MessageReplyPreviewProps) {
    // Build unified list of all visual attachments for thumbnail row
    // Use new attachments format if available, otherwise fall back to legacy fields
    const thumbnailItems: Array<{ type: 'image' | 'video' | 'pdf'; data?: string }> = [];
    const hasNewFormat = replyTo.attachments && replyTo.attachments.length > 0;
    let hasAudio = false;

    if (hasNewFormat) {
        // New format: use attachments array
        replyTo.attachments!.forEach(att => {
            if (att.attachmentType === 'image') {
                thumbnailItems.push({ type: 'image', data: att.data });
            } else if (att.attachmentType === 'video') {
                thumbnailItems.push({ type: 'video' });
            } else if (att.attachmentType === 'pdf') {
                thumbnailItems.push({ type: 'pdf' });
            } else if (att.attachmentType === 'audio') {
                hasAudio = true;
            }
        });
    } else {
        // Legacy format: use individual fields
        replyTo.images?.forEach(img => thumbnailItems.push({ type: 'image', data: img.data }));
        if (replyTo.video) thumbnailItems.push({ type: 'video' });
        if (replyTo.pdf) thumbnailItems.push({ type: 'pdf' });
    }

    // Check if we have any attachments to show
    const hasVisualAttachments = thumbnailItems.length > 0;
    const hasAttachments = hasVisualAttachments || hasAudio;

    // Show up to 4 thumbnails
    const displayedThumbnails = thumbnailItems.slice(0, 4);

    return (
        <div
            onClick={() => onScrollToMessage(replyTo.id)}
            className={cn(
                'mb-2 px-1.5 py-1.5 rounded-[10px] border-l-4 cursor-pointer transition-colors',
                isSent
                    ? replyTo.isSent
                        ? 'bg-primary-foreground/10 border-primary-foreground/50 hover:bg-primary-foreground/15'
                        : 'bg-primary-foreground/10 border-muted hover:bg-primary-foreground/15'
                    : 'bg-background/50 border-muted hover:bg-background/70'
            )}
        >
            {/* Header with reply icon and sender name */}
            <div className="flex items-center gap-1.5 mb-1">
                <Reply
                    className={cn(
                        'h-3 w-3 flex-shrink-0',
                        isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                />
                <span
                    className={cn(
                        'text-xs font-semibold',
                        isSent ? 'text-primary-foreground' : 'text-foreground'
                    )}
                >
                    {replyTo.isSent ? yourselfLabel : contactName}
                </span>
            </div>

            {/* Content */}
            {replyTo.is_deleted ? (
                <p
                    className={cn(
                        'text-xs italic opacity-70',
                        isSent ? 'text-primary-foreground/80' : 'text-foreground/80'
                    )}
                >
                    {deletedMessageLabel}
                </p>
            ) : (
                <>
                    {/* Thumbnails row - square thumbnails for images, videos, PDFs */}
                    {hasVisualAttachments && (
                        <div className="flex items-center gap-1 mb-1">
                            {displayedThumbnails.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        'w-7 h-7 flex-shrink-0 rounded overflow-hidden flex items-center justify-center',
                                        isSent ? 'bg-primary-foreground/20' : 'bg-muted'
                                    )}
                                >
                                    {item.type === 'image' && item.data && (
                                        <img
                                            src={item.data}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {item.type === 'image' && !item.data && (
                                        <div className={cn(
                                            'w-full h-full flex items-center justify-center',
                                            isSent ? 'bg-primary-foreground/30' : 'bg-muted'
                                        )}>
                                            <span className="text-[8px] opacity-50">IMG</span>
                                        </div>
                                    )}
                                    {item.type === 'video' && (
                                        <div className={cn(
                                            'w-full h-full flex items-center justify-center relative',
                                            isSent ? 'bg-slate-400/50' : 'bg-slate-300 dark:bg-slate-600'
                                        )}>
                                            {/* Subtle play overlay */}
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
                                                <Play className="h-2 w-2 ml-0.5 text-white fill-white" />
                                            </div>
                                        </div>
                                    )}
                                    {item.type === 'pdf' && (
                                        <div className="w-full h-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                                            <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Voice note indicator (separate row since it's audio) */}
                    {hasAudio && (
                        <div className="flex items-center gap-1 mb-1">
                            <Mic
                                className={cn(
                                    'h-3 w-3 flex-shrink-0',
                                    isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                )}
                            />
                            <span
                                className={cn(
                                    'text-xs',
                                    isSent ? 'text-primary-foreground/80' : 'text-foreground/80'
                                )}
                            >
                                {voiceNoteLabel}
                            </span>
                        </div>
                    )}

                    {/* Text row - single line with ellipsis */}
                    {replyTo.text && (
                        <p
                            className={cn(
                                'text-xs line-clamp-1',
                                isSent ? 'text-primary-foreground/80' : 'text-foreground/80'
                            )}
                        >
                            {replyTo.text}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
