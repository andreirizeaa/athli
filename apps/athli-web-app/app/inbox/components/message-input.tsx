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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/general/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMessageInput } from './message-input-context';
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
        attachedImages,
        attachedPdf,
        attachedVideo,
        replyingToMessage,
        addImages,
        removeImage,
        setPdf,
        removePdf,
        setVideo,
        removeVideo,
        setReplyingToMessage,
        sendMessage,
        textareaRef,
        imageInputRef,
        pdfInputRef,
        videoInputRef,
    } = useMessageInput();

    // Image preview URLs management
    const imageUrlsMapRef = React.useRef<Map<File, string>>(new Map());

    const imagePreviewUrls = React.useMemo(() => {
        const urlsMap = imageUrlsMapRef.current;
        const currentFiles = new Set(attachedImages);

        // Revoke URLs for removed images
        for (const [file, url] of urlsMap.entries()) {
            if (!currentFiles.has(file)) {
                URL.revokeObjectURL(url);
                urlsMap.delete(file);
            }
        }

        // Create URLs for new images
        return attachedImages.map((image) => {
            if (!urlsMap.has(image)) {
                urlsMap.set(image, URL.createObjectURL(image));
            }
            return urlsMap.get(image)!;
        });
    }, [attachedImages]);

    // Cleanup URLs on unmount
    React.useEffect(() => {
        return () => {
            const urlsMap = imageUrlsMapRef.current;
            for (const url of urlsMap.values()) {
                URL.revokeObjectURL(url);
            }
            urlsMap.clear();
        };
    }, []);

    // Handle file inputs
    const handleImageInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            addImages(Array.from(files).filter(f => f.type.startsWith('image/')));
        }
        if (imageInputRef.current) imageInputRef.current.value = '';
    }, [addImages, imageInputRef]);

    const handlePdfInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            setPdf(file);
        }
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    }, [setPdf, pdfInputRef]);

    const handleVideoInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'video/mp4' || file.name.endsWith('.mp4'))) {
            setVideo(file);
        }
        if (videoInputRef.current) videoInputRef.current.value = '';
    }, [setVideo, videoInputRef]);

    // Handle textarea auto-resize
    const handleTextareaInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const hasAttachments = replyingToMessage || attachedPdf || attachedVideo || attachedImages.length > 0;

        requestAnimationFrame(() => {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const minHeight = hasAttachments ? 60 : 36;
            const maxHeight = 120;
            const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
            textarea.style.height = `${newHeight}px`;
            setTextareaHeight(newHeight);
        });
    }, [replyingToMessage, attachedPdf, attachedVideo, attachedImages.length, setTextareaHeight]);

    // Handle keyboard shortcuts
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // Download handlers
    const handleDownloadImage = React.useCallback((image: File) => {
        const url = URL.createObjectURL(image);
        const link = document.createElement('a');
        link.href = url;
        link.download = image.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const handleDownloadPdf = React.useCallback(() => {
        if (!attachedPdf) return;
        const url = URL.createObjectURL(attachedPdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachedPdf.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [attachedPdf]);

    const handleDownloadVideo = React.useCallback(() => {
        if (!attachedVideo) return;
        const url = URL.createObjectURL(attachedVideo);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachedVideo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [attachedVideo]);

    const isInputEmpty =
        !messageInput.trim() &&
        !attachedPdf &&
        !attachedVideo &&
        attachedImages.length === 0;

    const showExpandedInput =
        textareaHeight > 36 ||
        replyingToMessage ||
        attachedPdf ||
        attachedVideo ||
        attachedImages.length > 0;

    return (
        <>
            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
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

            <div className="px-4 py-2 flex-shrink-0 border-t border-border">
                <div
                    className={cn(
                        'relative flex bg-sidebar px-2 py-0.5 transition-all duration-700 ease-in-out rounded-lg border border-input',
                        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
                        showExpandedInput
                            ? 'flex-col'
                            : 'items-center min-h-[36px]'
                    )}
                >
                    {/* Images Preview */}
                    {attachedImages.length > 0 && (
                        <div
                            className="mb-2 px-3 py-2 bg-background/50"
                            style={{ borderRadius: '18px' }}
                        >
                            <div className="flex gap-2 overflow-x-auto">
                                {attachedImages.map((image, index) => (
                                    <div key={index} className="relative group flex-shrink-0">
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            aria-label={t('messages.download', { name: image.name })}
                                            onClick={() => handleDownloadImage(image)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleDownloadImage(image);
                                                }
                                            }}
                                            className="bg-muted rounded-lg p-1.5 cursor-pointer hover:bg-muted/80 transition-colors"
                                        >
                                            <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md">
                                                <img
                                                    src={imagePreviewUrls[index]}
                                                    alt={image.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute -top-1 -right-1 h-5 w-5 bg-background border border-border hover:bg-destructive hover:text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(index);
                                            }}
                                            aria-label={t('messages.remove', { name: image.name })}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PDF Preview */}
                    {attachedPdf && (
                        <div
                            className="mb-2 px-3 py-2 bg-background/50"
                            style={{ borderRadius: '18px' }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t('messages.download', { name: attachedPdf.name })}
                                    onClick={handleDownloadPdf}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleDownloadPdf();
                                        }
                                    }}
                                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                        <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {attachedPdf.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">PDF</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={removePdf}
                                    aria-label={t('messages.removePdf')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Video Preview */}
                    {attachedVideo && (
                        <div
                            className="mb-2 px-3 py-2 bg-background/50"
                            style={{ borderRadius: '18px' }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t('messages.download', { name: attachedVideo.name })}
                                    onClick={handleDownloadVideo}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleDownloadVideo();
                                        }
                                    }}
                                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                        <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {attachedVideo.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{t('messages.mp4')}</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={removeVideo}
                                    aria-label={t('messages.removeVideo')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Reply Preview */}
                    {replyingToMessage && (
                        <div
                            className="mb-2 px-3 py-2 bg-background/50"
                            style={{ borderRadius: '18px' }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Reply className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs font-semibold text-foreground">
                                            {replyingToMessage.isSent
                                                ? t('messages.yourself')
                                                : selectedContact?.name || 'user'}
                                        </span>
                                    </div>
                                    {replyingToMessage.images && replyingToMessage.images.length > 0 && (
                                        <div className="flex gap-1.5 mb-1.5 overflow-x-auto">
                                            {replyingToMessage.images.slice(0, 3).map((image, index) => (
                                                <div key={index} className="flex-shrink-0">
                                                    <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-md bg-muted">
                                                        <img
                                                            src={image.data}
                                                            alt={image.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {replyingToMessage.images.length > 3 && (
                                                <div className="w-12 h-12 flex items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                                    +{replyingToMessage.images.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {replyingToMessage.pdf && (
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                            <span className="text-xs text-foreground truncate">
                                                {replyingToMessage.pdf.name}
                                            </span>
                                        </div>
                                    )}
                                    {replyingToMessage.video && (
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Video className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                            <span className="text-xs text-foreground truncate">
                                                {replyingToMessage.video.name}
                                            </span>
                                        </div>
                                    )}
                                    {replyingToMessage.text && (
                                        <p className="text-sm text-foreground line-clamp-2 truncate">
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
                    )}

                    {/* Attachment buttons for collapsed mode */}
                    {!showExpandedInput && (
                        <div className="flex items-center gap-0.5 mr-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <DropdownMenu>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                    aria-label={t('messages.attachFile')}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                                                <ImageIcon className="mr-2 size-4" />
                                                {t('messages.images')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                                                <FileText className="mr-2 size-4" />
                                                {t('messages.pdfs')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                                                <Video className="mr-2 size-4" />
                                                {t('messages.videos')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <TooltipContent>
                                        <p>{t('messages.attachFiles')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                        >
                                            <Mic className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('messages.voiceNote')}</p>
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
                            <TooltipProvider>
                                <Tooltip>
                                    <DropdownMenu>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                    aria-label={t('messages.attachFile')}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                                                <ImageIcon className="mr-2 size-4" />
                                                {t('messages.images')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                                                <FileText className="mr-2 size-4" />
                                                {t('messages.pdfs')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                                                <Video className="mr-2 size-4" />
                                                {t('messages.videos')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <TooltipContent>
                                        <p>{t('messages.attachFiles')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={sendMessage}
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
                                        onClick={sendMessage}
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
