import React from 'react';
import { FileText, Video as VideoIcon, Play } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import type { AttachmentType } from './message-input-context';

interface AttachmentItem {
    name: string;
    data: string; // base64 or URL
    type: string; // MIME type
    size: number;
    attachmentType: AttachmentType;
}

interface MessageAttachmentGridProps {
    attachments: AttachmentItem[];
    isSent: boolean;
    onImageClick?: (images: AttachmentItem[], index: number) => void;
    onVideoClick?: (video: AttachmentItem) => void;
    onPdfClick?: (pdf: AttachmentItem) => void;
}

export const MessageAttachmentGrid: React.FC<MessageAttachmentGridProps> = ({
    attachments,
    isSent,
    onImageClick,
    onVideoClick,
    onPdfClick,
}) => {
    const count = attachments.length;

    // 1 attachment: Single large thumbnail
    if (count === 1) {
        const attachment = attachments[0];

        if (attachment.attachmentType === 'image') {
            return (
                <div className={cn("mb-2", isSent && "flex justify-end")}>
                    <button
                        onClick={() => onImageClick?.(attachments, 0)}
                        className="block w-full max-w-sm rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                    >
                        <img
                            src={attachment.data}
                            alt={attachment.name}
                            className="w-full h-auto max-h-[300px] object-cover"
                        />
                    </button>
                </div>
            );
        }

        if (attachment.attachmentType === 'video') {
            return (
                <div className={cn("mb-2", isSent && "flex justify-end")}>
                    <button
                        onClick={() => onVideoClick?.(attachment)}
                        className="relative block w-full max-w-sm rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-black"
                    >
                        <div className="w-full h-48 flex items-center justify-center bg-gray-900">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm">
                                <Play className="h-8 w-8 text-white ml-1" />
                            </div>
                        </div>
                    </button>
                </div>
            );
        }

        // PDF
        return (
            <div className={cn("mb-2", isSent && "flex justify-end")}>
                <button
                    onClick={() => onPdfClick?.(attachment)}
                    className="flex items-center gap-3 w-full max-w-sm px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                        <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-xs opacity-70">PDF</p>
                    </div>
                </button>
            </div>
        );
    }

    // 2 attachments: Stacked vertically
    if (count === 2) {
        return (
            <div className={cn("mb-2 space-y-2", isSent && "flex flex-col items-end")}>
                {attachments.map((attachment, index) => (
                    <div key={index}>
                        {attachment.attachmentType === 'image' ? (
                            <button
                                onClick={() => onImageClick?.(attachments, index)}
                                className="block w-full max-w-sm rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                            >
                                <img
                                    src={attachment.data}
                                    alt={attachment.name}
                                    className="w-full h-32 object-cover"
                                />
                            </button>
                        ) : attachment.attachmentType === 'video' ? (
                            <button
                                onClick={() => onVideoClick?.(attachment)}
                                className="relative block w-full max-w-sm h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-black"
                            >
                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm">
                                        <Play className="h-6 w-6 text-white ml-0.5" />
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={() => onPdfClick?.(attachment)}
                                className="flex items-center gap-3 w-full max-w-sm px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                            >
                                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                                    <p className="text-xs opacity-70">PDF</p>
                                </div>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // 3 attachments: Top row 2 items, bottom row 1 item full width
    if (count === 3) {
        return (
            <div className={cn("mb-2 max-w-sm", isSent && "ml-auto")}>
                {/* Top row: 2 items */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {attachments.slice(0, 2).map((attachment, index) => (
                        <div key={index}>
                            {attachment.attachmentType === 'image' ? (
                                <button
                                    onClick={() => onImageClick?.(attachments, index)}
                                    className="block w-full rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                >
                                    <img
                                        src={attachment.data}
                                        alt={attachment.name}
                                        className="w-full h-32 object-cover"
                                    />
                                </button>
                            ) : attachment.attachmentType === 'video' ? (
                                <button
                                    onClick={() => onVideoClick?.(attachment)}
                                    className="relative block w-full h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-black"
                                >
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
                                            <Play className="h-5 w-5 text-white ml-0.5" />
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={() => onPdfClick?.(attachment)}
                                    className="flex flex-col items-center gap-2 w-full h-32 px-2 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                >
                                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30">
                                        <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <p className="text-xs font-medium truncate w-full text-center">{attachment.name}</p>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Bottom row: 1 item full width */}
                {(() => {
                    const attachment = attachments[2];
                    return attachment.attachmentType === 'image' ? (
                        <button
                            onClick={() => onImageClick?.(attachments, 2)}
                            className="block w-full rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                        >
                            <img
                                src={attachment.data}
                                alt={attachment.name}
                                className="w-full h-32 object-cover"
                            />
                        </button>
                    ) : attachment.attachmentType === 'video' ? (
                        <button
                            onClick={() => onVideoClick?.(attachment)}
                            className="relative block w-full h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-black"
                        >
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm">
                                    <Play className="h-6 w-6 text-white ml-0.5" />
                                </div>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => onPdfClick?.(attachment)}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        >
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium truncate">{attachment.name}</p>
                                <p className="text-xs opacity-70">PDF</p>
                            </div>
                        </button>
                    );
                })()}
            </div>
        );
    }

    // 4 attachments: 2x2 grid
    if (count === 4) {
        return (
            <div className={cn("mb-2 max-w-sm", isSent && "ml-auto")}>
                <div className="grid grid-cols-2 gap-2">
                    {attachments.map((attachment, index) => (
                        <div key={index}>
                            {attachment.attachmentType === 'image' ? (
                                <button
                                    onClick={() => onImageClick?.(attachments, index)}
                                    className="block w-full rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                >
                                    <img
                                        src={attachment.data}
                                        alt={attachment.name}
                                        className="w-full h-32 object-cover"
                                    />
                                </button>
                            ) : attachment.attachmentType === 'video' ? (
                                <button
                                    onClick={() => onVideoClick?.(attachment)}
                                    className="relative block w-full h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-black"
                                >
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
                                            <Play className="h-5 w-5 text-white ml-0.5" />
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={() => onPdfClick?.(attachment)}
                                    className="flex flex-col items-center gap-2 w-full h-32 px-2 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                >
                                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30">
                                        <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <p className="text-xs font-medium truncate w-full text-center">{attachment.name}</p>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};
