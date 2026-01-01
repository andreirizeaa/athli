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
import { type Message, type Contact } from '@/components/app/app-shell';

interface MessageInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    textareaHeight: number;
    setTextareaHeight: React.Dispatch<React.SetStateAction<number>>; // Allow updating height if needed logic is here
    attachedImages: File[];
    attachedPdf: File | null;
    attachedVideo: File | null;
    replyingToMessage: Message | null;
    selectedContact: Contact | null;

    // Handlers
    onFileButtonClick: () => void; // General attach
    onImageInputClick: () => void;
    onPdfInputClick: () => void;
    onVideoInputClick: () => void;

    onRemoveImage: (index: number) => void;
    onRemovePdf: () => void;
    onRemoveVideo: () => void;
    onCancelReply: () => void;

    onDownloadImage: (image: File) => void;
    onDownloadPdf: () => void;
    onDownloadVideo: () => void;

    // Refs for hidden inputs (passed from parent or handled internally if refactoring allows, but parent holds refs usually)
    // Cleaner to just expose click handlers above that parent connects to refs
}

export function MessageInput({
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    textareaRef,
    textareaHeight,
    attachedImages,
    attachedPdf,
    attachedVideo,
    replyingToMessage,
    selectedContact,
    onImageInputClick,
    onPdfInputClick,
    onVideoInputClick,
    onRemoveImage,
    onRemovePdf,
    onRemoveVideo,
    onCancelReply,
    onDownloadImage,
    onDownloadPdf,
    onDownloadVideo,
}: MessageInputProps) {
    const t = useTranslations();

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
        <div className="px-4 py-2 flex-shrink-0 border-t border-border">
            <div
                className={cn(
                    'relative flex bg-sidebar px-3 py-1 transition-all duration-700 ease-in-out rounded-lg',
                    showExpandedInput
                        ? 'flex-col'
                        : 'items-center min-h-[40px]'
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
                                        onClick={() => onDownloadImage(image)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onDownloadImage(image);
                                            }
                                        }}
                                        className="bg-muted rounded-lg p-1.5 cursor-pointer hover:bg-muted/80 transition-colors"
                                    >
                                        <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md">
                                            <img
                                                src={URL.createObjectURL(image)}
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
                                            onRemoveImage(index);
                                        }}
                                        aria-label={t('messages.remove', { name: image.name })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onRemoveImage(index);
                                            }
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                                onClick={onDownloadPdf}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onDownloadPdf();
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
                                onClick={onRemovePdf}
                                aria-label={t('messages.removePdf')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
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
                                onClick={onDownloadVideo}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onDownloadVideo();
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
                                onClick={onRemoveVideo}
                                aria-label={t('messages.removeVideo')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
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
                                onClick={onCancelReply}
                                aria-label={t('messages.cancelReply')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Use a generic input trigger for file inputs which are hosted in parent */}
                {(!textareaHeight || textareaHeight <= 36) &&
                    !replyingToMessage &&
                    !attachedPdf &&
                    !attachedVideo &&
                    attachedImages.length === 0 ? (
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
                                        <DropdownMenuItem onClick={onImageInputClick}>
                                            <ImageIcon className="mr-2 size-4" />
                                            {t('messages.images')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onPdfInputClick}>
                                            <FileText className="mr-2 size-4" />
                                            {t('messages.pdfs')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onVideoInputClick}>
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

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                        >
                            <Mic className="h-4 w-4" />
                        </Button>
                    </div>
                ) : null}
                <Textarea
                    ref={textareaRef}
                    placeholder={t('messages.typeMessagePlaceholder')}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        'flex-1 min-w-0 resize-none min-h-[36px] max-h-[120px] py-1.5 bg-sidebar dark:bg-sidebar border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus-visible:bg-sidebar dark:focus-visible:bg-sidebar',
                        textareaHeight > 36 && 'pr-10'
                    )}
                    aria-label={t('messages.typeMessage')}
                    rows={1}
                />
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
                                        <DropdownMenuItem onClick={onImageInputClick}>
                                            <ImageIcon className="mr-2 size-4" />
                                            {t('messages.images')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onPdfInputClick}>
                                            <FileText className="mr-2 size-4" />
                                            {t('messages.pdfs')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onVideoInputClick}>
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
                                        onClick={handleSendMessage}
                                        disabled={isInputEmpty}
                                        className={cn(
                                            'gap-2 !text-background [&_svg]:!text-background h-8 w-8 p-0 rounded-full transition-all duration-200',
                                            isInputEmpty
                                                ? '!bg-muted-foreground/30'
                                                : '!bg-[#3f3c39] dark:!bg-foreground hover:!bg-[#4a4642] dark:hover:!bg-foreground/90'
                                        )}
                                        aria-label={t('messages.sendMessage')}
                                    >
                                        <ArrowUp className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('messages.sendMessage')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}

                {/* Small send button when not expanded */}
                {!showExpandedInput && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={isInputEmpty}
                                    className={cn(
                                        'gap-2 !text-background [&_svg]:!text-background h-8 w-8 p-0 rounded-full transition-all duration-200',
                                        isInputEmpty
                                            ? '!bg-muted-foreground/30'
                                            : '!bg-[#3f3c39] dark:!bg-foreground hover:!bg-[#4a4642] dark:hover:!bg-foreground/90'
                                    )}
                                    aria-label={t('messages.sendMessage')}
                                >
                                    <ArrowUp className="size-4" />
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
    );
}
