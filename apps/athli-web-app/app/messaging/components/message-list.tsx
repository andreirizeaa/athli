'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Reply, Trash2, FileText, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import { type Message, type Contact } from '@/components/app/app-shell';

interface MessageListProps {
    messages: Message[];
    selectedContact: Contact | null;
    onReply: (message: Message) => void;
    onDeleteMessage: (messageId: string) => void;
    onDeleteMessageImage: (messageId: string, imageIndex: number) => void;
    onDeleteMessagePdf: (messageId: string) => void;
    onDeleteMessageVideo: (messageId: string) => void;
    onDeleteAllImages: (messageId: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
    messages,
    selectedContact,
    onReply,
    onDeleteMessage,
    onDeleteMessageImage,
    onDeleteMessagePdf,
    onDeleteMessageVideo,
    onDeleteAllImages,
    messagesEndRef,
}: MessageListProps) {
    const t = useTranslations();
    const [openDeleteMenuId, setOpenDeleteMenuId] = React.useState<string | null>(null);

    const formatTime = (timestamp: string) => {
        return timestamp;
    };

    const parseTimeToMinutes = (timeString: string): number => {
        // Parse time string like "2:30 PM" or "14:30"
        const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return 0;

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = match[3]?.toUpperCase();

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        return hours * 60 + minutes;
    };

    const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
        const minutes1 = parseTimeToMinutes(time1);
        const minutes2 = parseTimeToMinutes(time2);
        // Handle day rollover (e.g., 11:59 PM to 12:01 AM)
        if (minutes2 < minutes1) {
            return 24 * 60 - minutes1 + minutes2;
        }
        return minutes2 - minutes1;
    };

    const shouldShowTimestamp = (message: Message, index: number, messages: Message[]): boolean => {
        // Always show timestamp on the last message
        if (index === messages.length - 1) {
            return true;
        }

        const nextMessage = messages[index + 1];
        if (!nextMessage) {
            return true;
        }

        // Show timestamp if next message is from different sender
        if (nextMessage.isSent !== message.isSent) {
            return true;
        }

        // Show timestamp if next message is more than 2 minutes away
        const timeDiff = getTimeDifferenceInMinutes(message.timestamp, nextMessage.timestamp);
        if (timeDiff > 2) {
            return true;
        }

        // Don't show timestamp if next message is from same sender and within 2 minutes
        // (The timestamp will show on the last message of the group)
        return false;
    };

    const isInSameGroup = (message: Message, index: number, messages: Message[]): boolean => {
        // Check if this message is part of the same group as the next message
        if (index === messages.length - 1) {
            return false;
        }

        const nextMessage = messages[index + 1];
        if (!nextMessage) {
            return false;
        }

        // Same group if same sender and within 2 minutes
        if (nextMessage.isSent !== message.isSent) {
            return false;
        }

        const timeDiff = getTimeDifferenceInMinutes(message.timestamp, nextMessage.timestamp);
        return timeDiff <= 2;
    };

    const handleDownloadMessagePdf = (pdf: Message['pdf']) => {
        if (!pdf || !pdf.data) return;

        // Convert base64 to blob and download
        const byteString = atob(pdf.data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: pdf.type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdf.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleMessagePdfPreviewKeyDown = (
        event: React.KeyboardEvent<HTMLDivElement>,
        pdf: Message['pdf']
    ) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleDownloadMessagePdf(pdf);
        }
    };

    const handleDownloadMessageVideo = (
        video: { name: string; data: string; type: string; size: number } | undefined
    ) => {
        if (!video) return;
        const byteString = atob(video.data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: video.type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = video.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleMessageVideoPreviewKeyDown = (
        event: React.KeyboardEvent<HTMLDivElement>,
        video: { name: string; data: string; type: string; size: number } | undefined
    ) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleDownloadMessageVideo(video);
        }
    };

    return (
        <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col px-4 pt-2">
                {messages.map((message, index) => {
                    const isLastInSequence =
                        index === messages.length - 1 ||
                        messages[index + 1]?.isSent !== message.isSent;

                    const showTimestamp = shouldShowTimestamp(message, index, messages);
                    const inSameGroup = isInSameGroup(message, index, messages);

                    return (
                        <div
                            key={message.id}
                            className={cn(
                                'flex flex-col relative',
                                message.isSent ? 'items-end' : 'items-start',
                                inSameGroup ? 'mb-1' : 'mb-4'
                            )}
                        >
                            {/* Images Preview */}
                            {message.images && message.images.length > 0 && (
                                <div
                                    className={cn(
                                        'mb-2 max-w-[80%] px-2 bg-background/50 rounded-lg relative group',
                                        message.isSent ? 'items-end' : 'items-start'
                                    )}
                                    style={{ borderRadius: '18px' }}
                                >
                                    <div className="flex gap-2 overflow-x-auto">
                                        {message.images.map((image, imageIndex) => (
                                            <div key={imageIndex} className="relative flex-shrink-0">
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        // Download image
                                                        const byteString = atob(image.data.split(',')[1]);
                                                        const ab = new ArrayBuffer(byteString.length);
                                                        const ia = new Uint8Array(ab);
                                                        for (let i = 0; i < byteString.length; i++) {
                                                            ia[i] = byteString.charCodeAt(i);
                                                        }
                                                        const blob = new Blob([ab], { type: image.type });
                                                        const url = URL.createObjectURL(blob);
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.download = image.name;
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={t('messages.download', { name: image.name })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            // Download image
                                                            const byteString = atob(image.data.split(',')[1]);
                                                            const ab = new ArrayBuffer(byteString.length);
                                                            const ia = new Uint8Array(ab);
                                                            for (let i = 0; i < byteString.length; i++) {
                                                                ia[i] = byteString.charCodeAt(i);
                                                            }
                                                            const blob = new Blob([ab], { type: image.type });
                                                            const url = URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = image.name;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            URL.revokeObjectURL(url);
                                                        }
                                                    }}
                                                >
                                                    <div className="bg-muted rounded-lg p-1.5 hover:bg-muted/80 transition-colors">
                                                        <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md">
                                                            <img
                                                                src={image.data}
                                                                alt={image.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                                            message.isSent
                                                ? 'right-full mr-2 flex-row-reverse'
                                                : 'left-full ml-2'
                                        )}
                                    >
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.reply')}
                                                        onClick={() => onReply(message)}
                                                    >
                                                        <Reply className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('messages.reply')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {message.isSent && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.deleteImages')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={message.isSent ? 'end' : 'start'}>
                                                    <DropdownMenuItem
                                                        onClick={() => onDeleteAllImages(message.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t('messages.deleteAllImages')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* PDF Preview */}
                            {message.pdf && (
                                <div
                                    className={cn(
                                        'mb-2 max-w-[80%] px-3 py-2 bg-background/50 rounded-lg border relative group',
                                        message.isSent ? 'items-end' : 'items-start'
                                    )}
                                    style={{ borderRadius: '18px' }}
                                >
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-label={t('messages.download', { name: message.pdf.name })}
                                        onClick={() => handleDownloadMessagePdf(message.pdf)}
                                        onKeyDown={(e) => handleMessagePdfPreviewKeyDown(e, message.pdf)}
                                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {message.pdf.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{t('messages.pdf')}</p>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                                            message.isSent
                                                ? 'right-full mr-2 flex-row-reverse'
                                                : 'left-full ml-2'
                                        )}
                                    >
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.reply')}
                                                        onClick={() => onReply(message)}
                                                    >
                                                        <Reply className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('messages.reply')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {message.isSent && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.deletePdf')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={message.isSent ? 'end' : 'start'}>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            onDeleteMessagePdf(message.id);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t('general.delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Video Preview */}
                            {message.video && (
                                <div
                                    className={cn(
                                        'mb-2 max-w-[80%] px-3 py-2 bg-background/50 rounded-lg border relative group',
                                        message.isSent ? 'items-end' : 'items-start'
                                    )}
                                    style={{ borderRadius: '18px' }}
                                >
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-label={t('messages.download', {
                                            name: message.video?.name || t('messages.video'),
                                        })}
                                        onClick={() =>
                                            message.video && handleDownloadMessageVideo(message.video)
                                        }
                                        onKeyDown={(e) =>
                                            message.video &&
                                            handleMessageVideoPreviewKeyDown(e, message.video)
                                        }
                                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                            <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {message.video?.name || t('messages.video')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{t('messages.mp4')}</p>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                                            message.isSent
                                                ? 'right-full mr-2 flex-row-reverse'
                                                : 'left-full ml-2'
                                        )}
                                    >
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.reply')}
                                                        onClick={() => onReply(message)}
                                                    >
                                                        <Reply className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('messages.reply')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {message.isSent && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.deleteVideo')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={message.isSent ? 'end' : 'start'}>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            onDeleteMessageVideo(message.id);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t('general.delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Message Bubble - show if there's text */}
                            {message.text.trim() && (
                                <div
                                    className={cn(
                                        'max-w-[80%] rounded-xl px-2 py-2 relative group',
                                        message.isSent
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-sidebar text-foreground',
                                        isLastInSequence && message.isSent && 'rounded-br-sm',
                                        isLastInSequence && !message.isSent && 'rounded-bl-sm'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                                            message.isSent
                                                ? 'right-full mr-2 flex-row-reverse'
                                                : 'left-full ml-2',
                                            openDeleteMenuId === message.id && 'opacity-100'
                                        )}
                                    >
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                                        aria-label={t('messages.reply')}
                                                        onClick={() => onReply(message)}
                                                    >
                                                        <Reply className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('messages.reply')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {message.isSent && (
                                            <DropdownMenu
                                                open={openDeleteMenuId === message.id}
                                                onOpenChange={(open) => {
                                                    setOpenDeleteMenuId(open ? message.id : null);
                                                }}
                                            >
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-white/10"
                                                        aria-label={t('messages.deleteMessage')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={message.isSent ? 'end' : 'start'}>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            onDeleteMessage(message.id);
                                                            setOpenDeleteMenuId(null);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t('general.delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                    {message.replyTo && (
                                        <div
                                            className={cn(
                                                'mb-2 px-1.5 py-1.5 rounded-[10px] border-l-4',
                                                message.isSent
                                                    ? message.replyTo.isSent
                                                        ? 'bg-primary/15 border-primary'
                                                        : 'bg-primary/15 border-muted'
                                                    : 'bg-background/50 border-muted'
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Reply
                                                    className={cn(
                                                        'h-3 w-3 flex-shrink-0',
                                                        'text-muted-foreground'
                                                    )}
                                                />
                                                <span
                                                    className={cn('text-xs font-semibold', 'text-foreground')}
                                                >
                                                    {message.replyTo.isSent
                                                        ? t('messages.yourself')
                                                        : selectedContact?.name || 'user'}
                                                </span>
                                            </div>
                                            {message.replyTo.images &&
                                                message.replyTo.images.length > 0 && (
                                                    <div className="flex gap-1 mb-1 overflow-x-auto">
                                                        {message.replyTo.images
                                                            .slice(0, 3)
                                                            .map((image, index) => (
                                                                <div key={index} className="flex-shrink-0">
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
                                                    <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                                    <span className="text-xs text-foreground/80 truncate">
                                                        {message.replyTo.pdf.name}
                                                    </span>
                                                </div>
                                            )}
                                            {message.replyTo.video && (
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Video className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                                    <span className="text-xs text-foreground/80 truncate">
                                                        {message.replyTo.video.name}
                                                    </span>
                                                </div>
                                            )}
                                            {message.replyTo.text && (
                                                <p
                                                    className={cn(
                                                        'text-xs line-clamp-2 truncate',
                                                        'text-foreground/80'
                                                    )}
                                                >
                                                    {message.replyTo.text}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {message.text.trim() && (
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {message.text}
                                        </p>
                                    )}
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
                            )}
                            {showTimestamp && (
                                <p
                                    className={cn(
                                        'text-xs mt-1 text-muted-foreground',
                                        message.isSent ? 'text-right' : 'text-left'
                                    )}
                                >
                                    {formatTime(message.timestamp)}
                                </p>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
