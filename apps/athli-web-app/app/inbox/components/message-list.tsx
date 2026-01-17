'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
    Reply,
    Trash2,
    FileText,
    Video,
    ChevronDown,
    Smile,
    Send,
    CheckCircle,
    Copy,
    Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/general/utils';
import { type Message, type Contact } from '@/components/app/app-shell';
import { MessageReactionsDisplay } from './message-reactions-display';
import { ReactionPicker } from './reaction-picker';
import { MessageImageGrid } from './message-image-grid';
import { MessageVideoPreview } from './message-video-preview';
import { MessageAudioPreview } from './message-audio-preview';
import { MessageAttachmentGrid } from './message-attachment-grid';
import type { AttachmentType } from './message-input-context';
import { REACTION_EMOJIS } from '@athli/shared-types';

interface MessageListProps {
    messages: Message[];
    selectedContact: Contact | null;
    onReply: (message: Message) => void;
    onDeleteMessage: (messageId: string) => void;
    onDeleteMessageImage: (messageId: string, imageIndex: number) => void;
    onDeleteMessagePdf: (messageId: string) => void;
    onDeleteMessageVideo: (messageId: string) => void;
    onDeleteAllImages: (messageId: string) => void;
    onReaction?: (messageId: string, emoji: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList = React.memo(function MessageList({
    messages,
    selectedContact,
    onReply,
    onDeleteMessage,
    onDeleteMessageImage,
    onDeleteMessagePdf,
    onDeleteMessageVideo,
    onDeleteAllImages,
    onReaction,
    messagesEndRef,
}: MessageListProps) {
    const t = useTranslations();
    const [emojiPickerMessageId, setEmojiPickerMessageId] = React.useState<string | null>(null);

    const formatTime = (timestamp: string) => {
        // Extract just the time portion (HH:MM)
        const match = timestamp.match(/(\d+:\d+)/);
        return match ? match[1] : timestamp;
    };

    // Helper functions for date pills
    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const getDatePillLabel = (date: Date) => {
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round(
            (startOfDay(now).getTime() - startOfDay(date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 0) return t('general.today');
        if (diffDays === 1) return t('general.yesterday');

        return date
            .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
            .replace(',', '');
    };


    const handleDownload = (data: string, filename: string, mimeType: string) => {
        const byteString = atob(data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleReactionSelect = (messageId: string, emoji: string) => {
        onReaction?.(messageId, emoji);
    };

    const handleCopyText = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col px-4 pt-2 pb-4">
                {messages.map((message, index) => {
                    const nextMessage = messages[index + 1];

                    // Check if this is the last message before sender changes or day changes
                    const isLastInSequence =
                        index === messages.length - 1 ||
                        nextMessage?.isSent !== message.isSent ||
                        (message.sentAt && nextMessage?.sentAt && !isSameDay(message.sentAt, nextMessage.sentAt));

                    // Check if we need to show a date pill
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const showDatePill = message.sentAt && (
                        !previousMessage?.sentAt ||
                        !isSameDay(previousMessage.sentAt, message.sentAt)
                    );

                    return (
                        <React.Fragment key={message.id}>
                            {/* Date Divider Pill */}
                            {showDatePill && message.sentAt && (
                                <div className="flex justify-center w-full my-3">
                                    <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                        {getDatePillLabel(message.sentAt)}
                                    </div>
                                </div>
                            )}
                            <div
                                className={cn(
                                    'flex flex-col relative',
                                    message.isSent ? 'items-end' : 'items-start',
                                    isLastInSequence ? 'mb-4' : 'mb-1'
                                )}
                            >
                            <div className={cn('flex items-center gap-2 group max-w-full', message.isSent && 'flex-row-reverse')}>
                                <div className="max-w-[80%] min-w-0 relative">
                                    {/* Main Message Bubble */}
                                <div
                                    className={cn(
                                        'rounded-[11px] px-3 py-1.5 relative',
                                        message.isSent
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-sidebar text-foreground',
                                        isLastInSequence && message.isSent && 'rounded-br-[2px]',
                                        isLastInSequence && !message.isSent && 'rounded-bl-[2px]'
                                    )}
                                >
                                    {/* WhatsApp-style dropdown button */}
                                    <div
                                        className={cn(
                                            'absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity z-50',
                                            message.isSent ? '-right-1' : '-left-1'
                                        )}
                                    >
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        'h-5 w-5 rounded-sm p-0',
                                                        'bg-background border border-border shadow-sm',
                                                        'hover:border-primary',
                                                        'backdrop-blur-sm'
                                                    )}
                                                >
                                                    <ChevronDown className="h-2.5 w-2.5 text-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align={message.isSent ? 'end' : 'start'}
                                                className="w-48"
                                            >
                                                <DropdownMenuItem onClick={() => onReply(message)}>
                                                    <Reply className="mr-2 h-4 w-4" />
                                                    {t('messages.reply')}
                                                </DropdownMenuItem>

                                                {/* React menu item - opens dialog on click */}
                                                <DropdownMenuItem onClick={() => setEmojiPickerMessageId(message.id)}>
                                                    <Smile className="mr-2 h-4 w-4" />
                                                    React
                                                </DropdownMenuItem>

                                                {message.text && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleCopyText(message.text)}
                                                    >
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        {t('general.copy')}
                                                    </DropdownMenuItem>
                                                )}

                                                {/* Download option for attachments */}
                                                {((message as any).attachments?.length > 0 || message.pdf || message.video || message.images) && (
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            // New format - attachments array
                                                            if ((message as any).attachments?.length > 0) {
                                                                const firstAttachment = (message as any).attachments[0];
                                                                handleDownload(
                                                                    firstAttachment.data,
                                                                    firstAttachment.name,
                                                                    firstAttachment.type
                                                                );
                                                            }
                                                            // Legacy format fallbacks
                                                            else if (message.pdf) {
                                                                handleDownload(
                                                                    message.pdf.data,
                                                                    message.pdf.name,
                                                                    message.pdf.type
                                                                );
                                                            } else if (message.video) {
                                                                handleDownload(
                                                                    message.video.data,
                                                                    message.video.name,
                                                                    message.video.type
                                                                );
                                                            } else if (message.images && message.images[0]) {
                                                                handleDownload(
                                                                    message.images[0].data,
                                                                    message.images[0].name,
                                                                    message.images[0].type
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download
                                                    </DropdownMenuItem>
                                                )}

                                                {message.isSent && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => onDeleteMessage(message.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('general.delete')}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Reply preview */}
                                    {message.replyTo && (
                                        <div
                                            className={cn(
                                                'mb-2 px-1.5 py-1.5 rounded-[10px] border-l-4',
                                                message.isSent
                                                    ? message.replyTo.isSent
                                                        ? 'bg-primary-foreground/10 border-primary-foreground/50'
                                                        : 'bg-primary-foreground/10 border-muted'
                                                    : 'bg-background/50 border-muted'
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Reply
                                                    className={cn(
                                                        'h-3 w-3 flex-shrink-0',
                                                        message.isSent
                                                            ? 'text-primary-foreground/70'
                                                            : 'text-muted-foreground'
                                                    )}
                                                />
                                                <span
                                                    className={cn(
                                                        'text-xs font-semibold',
                                                        message.isSent
                                                            ? 'text-primary-foreground'
                                                            : 'text-foreground'
                                                    )}
                                                >
                                                    {message.replyTo.isSent
                                                        ? t('messages.yourself')
                                                        : selectedContact?.name || 'user'}
                                                </span>
                                            </div>
                                            {message.replyTo.images && message.replyTo.images.length > 0 && (
                                                <div className="flex gap-1 mb-1 overflow-x-auto">
                                                    {message.replyTo.images.slice(0, 3).map((image, idx) => (
                                                        <div key={idx} className="flex-shrink-0">
                                                            <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-md bg-muted">
                                                                <img
                                                                    src={image.data}
                                                                    alt={image.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {message.replyTo.images.length > 3 && (
                                                        <div className="w-10 h-10 flex items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                                                            +{message.replyTo.images.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {message.replyTo.pdf && (
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <FileText
                                                        className={cn(
                                                            'h-3 w-3 flex-shrink-0',
                                                            'text-orange-600 dark:text-orange-400'
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            'text-xs truncate',
                                                            message.isSent
                                                                ? 'text-primary-foreground/80'
                                                                : 'text-foreground/80'
                                                        )}
                                                    >
                                                        {message.replyTo.pdf.name}
                                                    </span>
                                                </div>
                                            )}
                                            {message.replyTo.video && (
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Video
                                                        className={cn(
                                                            'h-3 w-3 flex-shrink-0',
                                                            'text-orange-600 dark:text-orange-400'
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            'text-xs truncate',
                                                            message.isSent
                                                                ? 'text-primary-foreground/80'
                                                                : 'text-foreground/80'
                                                        )}
                                                    >
                                                        {message.replyTo.video.name}
                                                    </span>
                                                </div>
                                            )}
                                            {message.replyTo.text && (
                                                <p
                                                    className={cn(
                                                        'text-xs line-clamp-2',
                                                        message.isSent
                                                            ? 'text-primary-foreground/80'
                                                            : 'text-foreground/80'
                                                    )}
                                                >
                                                    {message.replyTo.text}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Unified Attachments Grid */}
                                    {(message as any).attachments && (message as any).attachments.length > 0 && (
                                        <MessageAttachmentGrid
                                            attachments={(message as any).attachments}
                                            isSent={message.isSent}
                                            onImageClick={(images, index) => {
                                                // Open image viewer/lightbox
                                                const image = images[index];
                                                handleDownload(image.data, image.name, image.type);
                                            }}
                                            onVideoClick={(video) => {
                                                // Open video in dialog box
                                                const overlay = document.createElement('div');
                                                overlay.className =
                                                    'fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer p-8';
                                                overlay.onclick = (e) => {
                                                    if (e.target === overlay) overlay.remove();
                                                };

                                                const dialogBox = document.createElement('div');
                                                dialogBox.className = 'bg-black rounded-lg overflow-hidden shadow-2xl max-w-3xl w-full aspect-video';
                                                dialogBox.onclick = (e) => e.stopPropagation();

                                                const videoElement = document.createElement('video');
                                                videoElement.src = video.data;
                                                videoElement.controls = true;
                                                videoElement.autoplay = true;
                                                videoElement.className = 'w-full h-full object-contain';
                                                videoElement.style.outline = 'none';

                                                dialogBox.appendChild(videoElement);
                                                overlay.appendChild(dialogBox);
                                                document.body.appendChild(overlay);
                                            }}
                                            onPdfClick={(pdf) => {
                                                handleDownload(pdf.data, pdf.name, pdf.type);
                                            }}
                                        />
                                    )}

                                    {/* PDF Document (legacy - for backward compatibility) */}
                                    {message.pdf && !(message as any).attachments && (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                handleDownload(
                                                    message.pdf!.data,
                                                    message.pdf!.name,
                                                    message.pdf!.type
                                                )
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleDownload(
                                                        message.pdf!.data,
                                                        message.pdf!.name,
                                                        message.pdf!.type
                                                    );
                                                }
                                            }}
                                            className={cn(
                                                'flex items-center gap-3 cursor-pointer p-2 rounded-lg mb-2',
                                                'hover:opacity-80 transition-opacity',
                                                message.isSent
                                                    ? 'bg-primary-foreground/10'
                                                    : 'bg-background/50'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'flex items-center justify-center h-10 w-10 rounded-md flex-shrink-0',
                                                    'bg-orange-100 dark:bg-orange-900/30'
                                                )}
                                            >
                                                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={cn(
                                                        'text-sm font-medium truncate',
                                                        message.isSent
                                                            ? 'text-primary-foreground'
                                                            : 'text-foreground'
                                                    )}
                                                >
                                                    {message.pdf.name}
                                                </p>
                                                <p
                                                    className={cn(
                                                        'text-xs',
                                                        message.isSent
                                                            ? 'text-primary-foreground/70'
                                                            : 'text-muted-foreground'
                                                    )}
                                                >
                                                    {t('messages.pdf')}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Text message */}
                                    {message.text.trim() && (
                                        <p className="text-sm whitespace-pre-wrap break-words mb-1"
                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            {message.text}
                                        </p>
                                    )}

                                    {/* Timestamp and read receipt (always shown) */}
                                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                                        <span
                                            className={cn(
                                                'text-[9px] leading-none',
                                                message.isSent
                                                    ? 'text-primary-foreground/70'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {formatTime(message.timestamp)}
                                        </span>
                                        {message.isSent && (
                                            <div className="flex-shrink-0">
                                                {message.isRead ? (
                                                    <CheckCircle
                                                        className={cn(
                                                            'h-[9px] w-[9px]',
                                                            'text-primary-foreground/70'
                                                        )}
                                                    />
                                                ) : (
                                                    <Send
                                                        className={cn(
                                                            'h-[9px] w-[9px]',
                                                            'text-primary-foreground/70'
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tail for last message in sequence */}
                                    {isLastInSequence && (
                                        <>
                                            {message.isSent ? (
                                                <div
                                                    className="absolute -bottom-1 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-0"
                                                    style={{
                                                        borderTop: '8px solid hsl(var(--primary))',
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="absolute -bottom-1 left-0 w-0 h-0"
                                                    style={{
                                                        borderRight: '8px solid transparent',
                                                        borderTop: '8px solid hsl(var(--sidebar))',
                                                        borderLeft: '0 solid transparent',
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                    </div>
                                </div>

                                {/* Emoji quick reaction button - outside bubble with gap */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <ReactionPicker
                                        trigger={
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-7 w-7 rounded-full',
                                                    'bg-background border border-border shadow-sm',
                                                    'hover:bg-muted'
                                                )}
                                            >
                                                <Smile className="h-3.5 w-3.5" />
                                            </Button>
                                        }
                                        onSelectReaction={(emoji) =>
                                            handleReactionSelect(message.id, emoji)
                                        }
                                        currentReaction={message.reaction}
                                        align={message.isSent ? 'end' : 'start'}
                                        side="top"
                                    />
                                </div>
                            </div>

                            {/* Reactions display */}
                            {message.reaction && (
                                <MessageReactionsDisplay
                                    reaction={{
                                        senderReaction: message.isSent ? message.reaction : undefined,
                                        recipientReaction: !message.isSent
                                            ? message.reaction
                                            : undefined,
                                    }}
                                    isSent={message.isSent}
                                    onPress={() => {
                                        // Open reaction details or remove reaction
                                        handleReactionSelect(message.id, '');
                                    }}
                                />
                            )}
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker Dialog */}
            <Dialog open={emojiPickerMessageId !== null} onOpenChange={(open) => !open && setEmojiPickerMessageId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Choose a Reaction</DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-2 justify-center flex-wrap py-4">
                        {REACTION_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    if (emojiPickerMessageId) {
                                        handleReactionSelect(emojiPickerMessageId, emoji);
                                        setEmojiPickerMessageId(null);
                                    }
                                }}
                                className="flex items-center justify-center h-12 w-12 rounded-lg hover:bg-muted transition-colors active:scale-95 transition-transform text-3xl"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </ScrollArea>
    );
});
