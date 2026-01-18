'use client';

import React from 'react';
import { Reply, FileText, Video, Mic } from 'lucide-react';
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
    // Get all images from both legacy and new format
    const images = replyTo.attachments?.filter(a => a.attachmentType === 'image') || replyTo.images || [];

    // Get audio attachments
    const audioAttachments = replyTo.attachments?.filter(a => a.attachmentType === 'audio') || [];
    const hasAudio = audioAttachments.length > 0;

    // Get PDF from both formats
    const pdf = replyTo.attachments?.find(a => a.attachmentType === 'pdf') || replyTo.pdf;

    // Get video from both formats
    const video = replyTo.attachments?.find(a => a.attachmentType === 'video') || replyTo.video;

    // Check if we have any attachments to show in the thumbnails row
    const hasAttachments = images.length > 0 || hasAudio || pdf || video;

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
                    {/* Attachments row (thumbnails/icons) */}
                    {hasAttachments && (
                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                            {/* Image thumbnails - 24x24 */}
                            {images.length > 0 && (
                                <>
                                    {images.slice(0, 3).map((image, idx) => (
                                        <div key={idx} className="flex-shrink-0">
                                            <div className="w-6 h-6 flex items-center justify-center overflow-hidden rounded bg-muted">
                                                <img
                                                    src={image.data}
                                                    alt={image.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {images.length > 3 && (
                                        <div className="w-6 h-6 flex items-center justify-center rounded bg-muted text-[8px] text-muted-foreground">
                                            +{images.length - 3}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Voice note indicator */}
                            {hasAudio && (
                                <div className="flex items-center gap-1">
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

                            {/* PDF indicator */}
                            {pdf && (
                                <div className="flex items-center gap-1">
                                    <FileText
                                        className={cn(
                                            'h-3 w-3 flex-shrink-0',
                                            'text-orange-600 dark:text-orange-400'
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'text-xs truncate max-w-[100px]',
                                            isSent ? 'text-primary-foreground/80' : 'text-foreground/80'
                                        )}
                                    >
                                        {pdf.name}
                                    </span>
                                </div>
                            )}

                            {/* Video indicator */}
                            {video && (
                                <div className="flex items-center gap-1">
                                    <Video
                                        className={cn(
                                            'h-3 w-3 flex-shrink-0',
                                            'text-orange-600 dark:text-orange-400'
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'text-xs truncate max-w-[100px]',
                                            isSent ? 'text-primary-foreground/80' : 'text-foreground/80'
                                        )}
                                    >
                                        {video.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text row */}
                    {replyTo.text && (
                        <p
                            className={cn(
                                'text-xs line-clamp-2',
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
