'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
    Reply,
    Trash2,
    FileText,
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
import { MessageReplyPreview } from './message-reply-preview';
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
    /** Callback ref to attach to load more trigger element */
    loadMoreTriggerRef?: (node: HTMLElement | null) => void;
    isLoadingMore?: boolean;
    hasMoreMessages?: boolean;
    /** Whether the client profile panel is open - affects bubble max width */
    isClientPanelOpen?: boolean;
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
    loadMoreTriggerRef,
    isLoadingMore = false,
    hasMoreMessages = true,
    isClientPanelOpen = false,
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

    // Check if a message can be deleted:
    // - Must be sent by the current user (isSent)
    // - Must NOT be read yet (!isRead)
    // - Must be within 5 minutes of being sent
    const canDeleteMessage = (message: Message): boolean => {
        if (!message.isSent) return false;
        if (message.isRead) return false;

        const sentAt = message.sentAt instanceof Date ? message.sentAt : new Date(message.sentAt || message.timestamp);
        const now = new Date();
        const fiveMinutesMs = 5 * 60 * 1000;
        const timeSinceSent = now.getTime() - sentAt.getTime();

        return timeSinceSent <= fiveMinutesMs;
    };


    const handleDownload = async (data: string, filename: string, mimeType: string) => {
        let blob: Blob;

        if (data.startsWith('data:')) {
            // Base64 data URL
            const byteString = atob(data.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ab], { type: mimeType });
        } else {
            // HTTP/HTTPS URL or blob URL - fetch the file
            const response = await fetch(data);
            blob = await response.blob();
        }

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

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash animation
            element.classList.add('animate-message-flash');
            setTimeout(() => element.classList.remove('animate-message-flash'), 500);
        }
    };

    // Check if a message has only audio attachments (no text, no other attachment types)
    const isAudioOnlyMessage = (message: Message): boolean => {
        const attachments = (message as any).attachments;
        if (!attachments || attachments.length === 0) return false;
        if (message.text?.trim()) return false;
        return attachments.every((a: any) =>
            a.attachmentType === 'audio' ||
            a.type?.startsWith('audio/') ||
            a.mime_type?.startsWith('audio/')
        );
    };

    return (
        <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col px-4 pt-2 pb-4">
                {/* Load more trigger element - at top for loading older messages */}
                {hasMoreMessages && (
                    <div
                        ref={loadMoreTriggerRef}
                        className="flex justify-center py-2"
                    >
                        {isLoadingMore && (
                            <span className="text-xs text-muted-foreground">
                                {t('general.loadingMore') || 'Loading...'}
                            </span>
                        )}
                    </div>
                )}
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

                    const audioOnly = isAudioOnlyMessage(message);

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
                                id={`message-${message.id}`}
                                className={cn(
                                    'flex flex-col relative',
                                    message.isSent ? 'items-end' : 'items-start',
                                    isLastInSequence ? 'mb-4' : 'mb-1'
                                )}
                            >
                            <div className={cn('flex items-center gap-2 group w-full', message.isSent && 'flex-row-reverse')}>
                                <div className={cn(
                                    'relative',
                                    // Audio-only messages use full width, others use w-fit
                                    audioOnly
                                        ? (isClientPanelOpen ? 'w-[60%]' : 'w-[50%]')
                                        : cn('w-fit', isClientPanelOpen ? 'max-w-[60%]' : 'max-w-[50%]')
                                )}>
                                    {/* WhatsApp-style dropdown button - positioned outside bubble to avoid overflow clipping */}
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
                                                onCloseAutoFocus={(e) => {
                                                    // Prevent dropdown from restoring focus to trigger
                                                    // This allows MessageInput to maintain focus after reply
                                                    e.preventDefault();
                                                }}
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

                                                {/* Download option for attachments - only show if there's a video, image, or file */}
                                                {((message as any).attachments?.length > 0 || message.pdf || message.video || (message.images && message.images.length > 0)) && (
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            // Download all attachments with a small delay between each to avoid browser blocking
                                                            const downloadWithDelay = (items: Array<{ data: string; name: string; type: string }>) => {
                                                                items.forEach((item, index) => {
                                                                    setTimeout(() => {
                                                                        handleDownload(item.data, item.name, item.type);
                                                                    }, index * 200);
                                                                });
                                                            };

                                                            // New format - attachments array
                                                            if ((message as any).attachments?.length > 0) {
                                                                downloadWithDelay((message as any).attachments);
                                                            } else {
                                                                // Legacy format - collect all attachments
                                                                const allAttachments: Array<{ data: string; name: string; type: string }> = [];
                                                                
                                                                if (message.images && message.images.length > 0) {
                                                                    allAttachments.push(...message.images);
                                                                }
                                                                if (message.pdf) {
                                                                    allAttachments.push(message.pdf);
                                                                }
                                                                if (message.video) {
                                                                    allAttachments.push(message.video);
                                                                }
                                                                
                                                                if (allAttachments.length > 0) {
                                                                    downloadWithDelay(allAttachments);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Download className="mr-2 h-4 w-4" />
                                                        {t('general.download')}
                                                    </DropdownMenuItem>
                                                )}

                                                {canDeleteMessage(message) && (
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

                                    {/* Main Message Bubble */}
                                    <div
                                        className={cn(
                                            'rounded-[11px] px-3 py-1.5 relative max-w-full',
                                            // Audio-only messages use full width, others use w-fit
                                            audioOnly ? 'w-full' : 'w-fit',
                                            message.isSent
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-sidebar text-foreground',
                                            isLastInSequence && message.isSent && 'rounded-br-[2px]',
                                            isLastInSequence && !message.isSent && 'rounded-bl-[2px]'
                                        )}
                                    >
                                    {/* Reply preview */}
                                    {message.replyTo && (
                                        <MessageReplyPreview
                                            replyTo={message.replyTo as any}
                                            isSent={message.isSent}
                                            contactName={selectedContact?.name || 'user'}
                                            yourselfLabel={t('messages.yourself')}
                                            deletedMessageLabel={t('messages.deletedMessage')}
                                            voiceNoteLabel={t('messages.voiceNote')}
                                            onScrollToMessage={scrollToMessage}
                                        />
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
                                            className="flex flex-col items-center justify-center gap-2 cursor-pointer w-32 aspect-square rounded-lg mb-2 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                        >
                                            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                                <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <p className="text-xs font-medium w-full text-center px-2 text-orange-900 dark:text-orange-100 line-clamp-2 break-all">
                                                {message.pdf.name}
                                            </p>
                                        </div>
                                    )}

                                    {/* Text message */}
                                    {message.text.trim() && (
                                        <p className="text-sm whitespace-pre-wrap break-words mb-1">
                                            {message.text}
                                        </p>
                                    )}

                                    {/* Timestamp and read receipt (always shown inside bubble) */}
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
