'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
    Plus,
    Image as ImageIcon,
    FileText,
    Video,
    Mic,
    ArrowUp,
    X,
    Reply,
    Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/general/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMessageInput } from './message-input-context';
import { VoiceNoteRecorder } from '@/components/audio/voice-note-recorder';
import type { Contact } from '@/components/app/app-shell';

interface MessageInputProps {
    selectedContact: Contact | null;
}

export const MessageInput: React.FC<MessageInputProps> = React.memo(({ selectedContact }) => {
    const t = useTranslations();
    const {
        messageInput,
        setMessageInput,
        textareaHeight,
        setTextareaHeight,
        attachments,
        replyingToMessage,
        isRecordingVoiceNote,
        addAttachment,
        addAttachments,
        removeAttachment,
        setReplyingToMessage,
        setIsRecordingVoiceNote,
        sendMessage,
        sendVoiceNote,
        canAddMoreAttachments,
        textareaRef,
        imageInputRef,
        pdfInputRef,
        videoInputRef,
    } = useMessageInput();

    // Combined file input ref for images, videos, and PDFs
    const combinedInputRef = React.useRef<HTMLInputElement>(null);

    // Track maximum height reached to prevent flickering (WhatsApp-like behavior)
    const [maxHeightReached, setMaxHeightReached] = React.useState(36);

    // Reset height tracking when contact changes
    React.useEffect(() => {
        setMaxHeightReached(36);
    }, [selectedContact?.id]);

    // Reset textarea height when attachments are removed (text deletion is handled in handleTextareaInput)
    React.useEffect(() => {
        const hasAttachments = replyingToMessage || attachments.length > 0;
        const isEmpty = !messageInput.trim();

        // When all attachments are removed and input is empty, reset to minimum height
        if (!hasAttachments && isEmpty && textareaRef.current) {
            const minHeight = 36;
            textareaRef.current.style.height = `${minHeight}px`;
            setTextareaHeight(minHeight);
            setMaxHeightReached(minHeight);
        }
    }, [replyingToMessage, attachments.length, messageInput, textareaRef, setTextareaHeight]);

    // Auto-focus textarea when replying to a message
    // Track previous replyingToMessage to detect when it changes to non-null
    const prevReplyingToMessageRef = React.useRef<typeof replyingToMessage>(null);
    React.useEffect(() => {
        const wasNull = prevReplyingToMessageRef.current === null;
        prevReplyingToMessageRef.current = replyingToMessage;

        // Only focus when transitioning from null to a message (not on every render)
        if (wasNull && replyingToMessage && textareaRef.current) {
            // Focus after a short delay to ensure DOM is ready
            const timer = setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [replyingToMessage, textareaRef]);

    // Handle file inputs
    const handleImageInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // Excluded image types
            const excludedImageTypes = ['image/heic', 'image/heif', 'image/svg+xml'];
            const excludedExtensions = ['.heic', '.heif', '.svg'];

            const imageFiles = Array.from(files).filter(f => {
                const isExcluded = excludedImageTypes.includes(f.type) ||
                    excludedExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
                return f.type.startsWith('image/') && !isExcluded;
            });
            addAttachments(imageFiles, 'image');
        }
        if (imageInputRef.current) imageInputRef.current.value = '';
    }, [addAttachments, imageInputRef]);

    const handlePdfInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            addAttachment(file, 'pdf');
        }
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    }, [addAttachment, pdfInputRef]);

    const handleVideoInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'video/mp4' || file.name.endsWith('.mp4'))) {
            addAttachment(file, 'video');
        }
        if (videoInputRef.current) videoInputRef.current.value = '';
    }, [addAttachment, videoInputRef]);

    // Combined file input handler for images, videos, and PDFs
    const handleCombinedInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const imageFiles: File[] = [];
        // Excluded image types
        const excludedImageTypes = ['image/heic', 'image/heif', 'image/svg+xml'];
        const excludedExtensions = ['.heic', '.heif', '.svg'];

        Array.from(files).forEach((file) => {
            const isExcludedImage = excludedImageTypes.includes(file.type) ||
                excludedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

            if (file.type.startsWith('image/') && !isExcludedImage) {
                imageFiles.push(file);
            } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4')) {
                addAttachment(file, 'video');
            } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                addAttachment(file, 'pdf');
            }
        });

        // Add all images at once
        if (imageFiles.length > 0) {
            addAttachments(imageFiles, 'image');
        }

        if (combinedInputRef.current) combinedInputRef.current.value = '';
    }, [addAttachment, addAttachments]);

    // Handle textarea auto-resize (WhatsApp-like: grows but doesn't shrink, resets when empty)
    const handleTextareaInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const hasAttachments = replyingToMessage || attachments.length > 0;
        const isEmpty = !textarea.value.trim();

        // Synchronous measurement for immediate response (no requestAnimationFrame to avoid visible jump)
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;

        const minHeight = hasAttachments ? 60 : 36;
        const maxHeight = 120;
        const contentHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));

        // Reset to minimum when empty, otherwise use WhatsApp-like grow-only behavior
        if (isEmpty && !hasAttachments) {
            textarea.style.height = `${minHeight}px`;
            setTextareaHeight(minHeight);
            setMaxHeightReached(minHeight);
        } else {
            // Only grow if content needs more space (never shrink during typing)
            const newHeight = Math.max(maxHeightReached, contentHeight);
            textarea.style.height = `${newHeight}px`;
            setTextareaHeight(newHeight);
            setMaxHeightReached(newHeight);
        }
    }, [replyingToMessage, attachments.length, setTextareaHeight, maxHeightReached]);

    // Wrapper to send message and reset height tracking
    const handleSendMessage = React.useCallback(() => {
        sendMessage();
        setMaxHeightReached(36); // Reset to minimum height after sending
    }, [sendMessage]);

    // Handle keyboard shortcuts
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const isInputEmpty = !messageInput.trim() && attachments.length === 0;

    const showExpandedInput =
        textareaHeight > 36 ||
        replyingToMessage ||
        attachments.length > 0;

    // Handle voice note recording
    const handleStartVoiceNote = React.useCallback(() => {
        setIsRecordingVoiceNote(true);
    }, [setIsRecordingVoiceNote]);

    const handleCancelVoiceNote = React.useCallback(() => {
        setIsRecordingVoiceNote(false);
    }, [setIsRecordingVoiceNote]);

    const handleSendVoiceNote = React.useCallback((blob: Blob, url: string, durationMs: number) => {
        sendVoiceNote(blob, url, durationMs);
    }, [sendVoiceNote]);

    // Show voice note recorder instead of normal input when recording
    if (isRecordingVoiceNote) {
        return (
            <VoiceNoteRecorder
                onSend={handleSendVoiceNote}
                onCancel={handleCancelVoiceNote}
            />
        );
    }

    return (
        <>
            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                multiple
                onChange={handleImageInputChange}
                className="hidden"
            />
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfInputChange}
                className="hidden"
            />
            <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4"
                onChange={handleVideoInputChange}
                className="hidden"
            />
            {/* Combined file input for all attachment types */}
            <input
                ref={combinedInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/jpg,video/*,application/pdf"
                multiple
                onChange={handleCombinedInputChange}
                className="hidden"
            />

            <div className="px-4 py-2 flex-shrink-0 border-t border-border">
                <div
                    className={cn(
                        'relative flex bg-sidebar px-2 py-0.5 transition-all duration-700 ease-in-out rounded-lg border border-input',
                        'focus-within:border-ring',
                        showExpandedInput
                            ? 'flex-col'
                            : 'items-center min-h-[36px]'
                    )}
                >
                    {/* Unified Attachments Preview */}
                    {attachments.length > 0 && (
                        <div
                            className="mb-2 px-3 py-2 bg-background/50"
                            style={{ borderRadius: '18px' }}
                        >
                            <div className="flex overflow-x-auto gap-2">
                                {attachments.map((attachment, index) => (
                                    <div key={index} className="relative group flex-shrink-0">
                                        <div className="bg-muted rounded-lg p-1.5 relative">
                                            <div className="w-20 h-20 flex flex-col items-center justify-center overflow-hidden rounded-md relative">
                                                {attachment.type === 'image' ? (
                                                    <img
                                                        src={attachment.preview || URL.createObjectURL(attachment.file)}
                                                        alt={attachment.file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : attachment.type === 'video' ? (
                                                    <>
                                                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                                                            <Video className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                                                                <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-1 p-1">
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30">
                                                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                                        </div>
                                                        <p className="text-[9px] text-center text-muted-foreground line-clamp-2 w-full break-words px-0.5">
                                                            {attachment.file.name}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Overlay with blur and X icon */}
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                aria-label={t('messages.remove', { name: attachment.file.name })}
                                            >
                                                <X className="h-8 w-8 text-primary" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reply Preview */}
                    {replyingToMessage && (() => {
                        // Build unified thumbnail list for all visual attachments
                        // Use new attachments format if available, otherwise fall back to legacy fields
                        const thumbnailItems: Array<{ type: 'image' | 'video' | 'pdf'; data?: string }> = [];
                        const attachmentsArray = (replyingToMessage as any).attachments;
                        const hasNewFormat = attachmentsArray && attachmentsArray.length > 0;

                        if (hasNewFormat) {
                            // New format: use attachments array
                            attachmentsArray.forEach((att: any) => {
                                if (att.attachmentType === 'image') {
                                    thumbnailItems.push({ type: 'image', data: att.data });
                                } else if (att.attachmentType === 'video') {
                                    thumbnailItems.push({ type: 'video' });
                                } else if (att.attachmentType === 'pdf') {
                                    thumbnailItems.push({ type: 'pdf' });
                                }
                            });
                        } else {
                            // Legacy format: use individual fields
                            replyingToMessage.images?.forEach((img: any) => thumbnailItems.push({ type: 'image', data: img.data }));
                            if (replyingToMessage.video) thumbnailItems.push({ type: 'video' });
                            if (replyingToMessage.pdf) thumbnailItems.push({ type: 'pdf' });
                        }

                        // Check for audio (voice note)
                        const isVoiceNote = hasNewFormat
                            ? attachmentsArray.some((att: any) => att.attachmentType === 'audio')
                            : false;

                        const displayedThumbnails = thumbnailItems.slice(0, 4);
                        const hasVisualAttachments = thumbnailItems.length > 0;

                        return (
                            <div
                                className={cn(
                                    "mb-2 px-3 py-2 rounded-lg",
                                    replyingToMessage.isSent
                                        ? "bg-primary/20"
                                        : "bg-sidebar"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        {/* Header with reply icon and sender name */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <Reply className={cn(
                                                "h-3 w-3 flex-shrink-0",
                                                replyingToMessage.isSent ? "text-primary" : "text-muted-foreground"
                                            )} />
                                            <span className={cn(
                                                "text-xs font-semibold",
                                                replyingToMessage.isSent ? "text-primary" : "text-foreground"
                                            )}>
                                                {replyingToMessage.isSent
                                                    ? t('messages.yourself')
                                                    : selectedContact?.name || 'user'}
                                            </span>
                                        </div>

                                        {/* Square thumbnails row - images, videos, PDFs all same size */}
                                        {hasVisualAttachments && (
                                            <div className="flex gap-1 mb-1">
                                                {displayedThumbnails.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="w-7 h-7 flex-shrink-0 rounded overflow-hidden flex items-center justify-center bg-muted"
                                                    >
                                                        {item.type === 'image' && item.data && (
                                                            <img
                                                                src={item.data}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                        {item.type === 'image' && !item.data && (
                                                            <span className="text-[8px] opacity-50">IMG</span>
                                                        )}
                                                        {item.type === 'video' && (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-300 dark:bg-slate-600 relative">
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

                                        {/* Voice note indicator */}
                                        {isVoiceNote && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mic className="h-3 w-3 text-primary flex-shrink-0" />
                                                <span className="text-xs text-foreground">
                                                    {t('messages.voiceNote')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Text row - single line with ellipsis */}
                                        {replyingToMessage.text && (
                                            <p className="text-sm text-foreground line-clamp-1">
                                                {replyingToMessage.text}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={() => setReplyingToMessage(null)}
                                        aria-label={t('messages.cancelReply')}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Attachment buttons for collapsed mode */}
                    {!showExpandedInput && (
                        <div className="flex items-center gap-0.5 mr-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={!canAddMoreAttachments}
                                onClick={() => combinedInputRef.current?.click()}
                                className={cn(
                                    'h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10',
                                    !canAddMoreAttachments && 'opacity-50 cursor-not-allowed'
                                )}
                                aria-label={t('messages.attachFile')}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={attachments.length > 0 || messageInput.trim() !== ''}
                                            onClick={handleStartVoiceNote}
                                            className={cn(
                                                'h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10',
                                                (attachments.length > 0 || messageInput.trim() !== '') && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <Mic className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {attachments.length > 0 || messageInput.trim() !== ''
                                                ? 'Voice notes can only be sent on their own'
                                                : t('messages.voiceNote')}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    {/* Textarea */}
                    <Textarea
                        ref={textareaRef}
                        placeholder={t('messages.typeMessagePlaceholder')}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onInput={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            'flex-1 min-w-0 resize-none min-h-[36px] max-h-[120px] py-1.5 bg-sidebar dark:bg-sidebar border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus-visible:bg-sidebar dark:focus-visible:bg-sidebar',
                            textareaHeight > 36 && 'pr-10'
                        )}
                        aria-label={t('messages.typeMessage')}
                        rows={1}
                    />

                    {/* Expanded mode buttons */}
                    {showExpandedInput && (
                        <div className="flex items-center justify-between gap-2 mt-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={!canAddMoreAttachments}
                                onClick={() => combinedInputRef.current?.click()}
                                className={cn(
                                    'h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10',
                                    !canAddMoreAttachments && 'opacity-50 cursor-not-allowed'
                                )}
                                aria-label={t('messages.attachFile')}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={isInputEmpty}
                                            className={cn(
                                                'gap-2 !text-primary-foreground [&_svg]:!text-primary-foreground h-7 w-7 p-0 rounded-full transition-all duration-200',
                                                isInputEmpty
                                                    ? '!bg-muted-foreground/30'
                                                    : '!bg-primary hover:!bg-primary/90'
                                            )}
                                            aria-label={t('messages.sendMessage')}
                                        >
                                            <ArrowUp className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('messages.sendMessage')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    {/* Collapsed mode send button */}
                    {!showExpandedInput && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={isInputEmpty}
                                        className={cn(
                                            'gap-2 !text-primary-foreground [&_svg]:!text-primary-foreground h-7 w-7 p-0 rounded-full transition-all duration-200',
                                            isInputEmpty
                                                ? '!bg-muted-foreground/30'
                                                : '!bg-primary hover:!bg-primary/90'
                                        )}
                                        aria-label={t('messages.sendMessage')}
                                    >
                                        <ArrowUp className="size-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('messages.sendMessage')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        </>
    );
});

MessageInput.displayName = 'MessageInput';
