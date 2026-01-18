import React from 'react';
import { FileText, Video as VideoIcon, Play, Mic } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import type { AttachmentType } from './message-input-context';
import { MessageAudioPreview } from './message-audio-preview';

interface AttachmentItem {
    name: string;
    data: string; // base64, URL, or blob URL
    type: string; // MIME type
    size: number;
    attachmentType: AttachmentType;
    duration?: number; // For audio - duration in milliseconds
}

interface MessageAttachmentGridProps {
    attachments: AttachmentItem[];
    isSent: boolean;
    onImageClick?: (images: AttachmentItem[], index: number) => void;
    onVideoClick?: (video: AttachmentItem) => void;
    onPdfClick?: (pdf: AttachmentItem) => void;
    onAudioClick?: (audio: AttachmentItem) => void;
}

// Hook to generate video thumbnail from video URL
const useVideoThumbnail = (videoUrl: string, isVideo: boolean): string | null => {
    const [thumbnail, setThumbnail] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!isVideo || !videoUrl) return;

        const videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        // Only set crossOrigin for storage URLs, not blob URLs
        if (!videoUrl.startsWith('blob:')) {
            videoElement.crossOrigin = 'anonymous';
        }
        videoElement.muted = true;
        videoElement.playsInline = true;

        const handleLoadedData = () => {
            videoElement.currentTime = 0.5; // Seek to 0.5 second
        };

        const handleSeeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 320;
            canvas.height = videoElement.videoHeight || 180;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                setThumbnail(canvas.toDataURL());
            }
        };

        videoElement.addEventListener('loadeddata', handleLoadedData);
        videoElement.addEventListener('seeked', handleSeeked);

        return () => {
            videoElement.removeEventListener('loadeddata', handleLoadedData);
            videoElement.removeEventListener('seeked', handleSeeked);
            videoElement.remove();
        };
    }, [videoUrl, isVideo]);

    return thumbnail;
};

// Component for video attachment with thumbnail
const VideoAttachmentThumbnail: React.FC<{
    attachment: AttachmentItem;
    onVideoClick?: (video: AttachmentItem) => void;
    className?: string;
}> = ({ attachment, onVideoClick, className = "w-full h-48" }) => {
    const thumbnail = useVideoThumbnail(attachment.data, attachment.attachmentType === 'video');

    return (
        <button
            onClick={() => onVideoClick?.(attachment)}
            className={cn("relative block rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-black", className)}
        >
            {thumbnail ? (
                <img
                    src={thumbnail}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <VideoIcon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm">
                    <Play className="h-6 w-6 text-white ml-0.5" />
                </div>
            </div>
        </button>
    );
};

// Helper component for audio attachments
const AudioAttachment: React.FC<{
    attachment: AttachmentItem;
}> = ({ attachment }) => {
    return (
        <div className="mb-2 w-full">
            <MessageAudioPreview
                audio={{
                    name: attachment.name,
                    data: attachment.data,
                    type: attachment.type,
                    size: attachment.size,
                    duration: attachment.duration,
                }}
            />
        </div>
    );
};

// Helper component for PDF attachments - square format for grid
const PdfSquareThumbnail: React.FC<{
    attachment: AttachmentItem;
    onPdfClick?: (pdf: AttachmentItem) => void;
    className?: string;
}> = ({ attachment, onPdfClick, className = "w-full aspect-square" }) => {
    return (
        <button
            onClick={() => onPdfClick?.(attachment)}
            className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg",
                "bg-orange-50 dark:bg-orange-900/20",
                "hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors",
                className
            )}
        >
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs font-medium w-full text-center px-2 text-orange-900 dark:text-orange-100 line-clamp-2 break-all">
                {attachment.name}
            </p>
        </button>
    );
};

export const MessageAttachmentGrid: React.FC<MessageAttachmentGridProps> = ({
    attachments,
    isSent,
    onImageClick,
    onVideoClick,
    onPdfClick,
    onAudioClick,
}) => {
    const count = attachments.length;
    
    // Separate audio attachments from others (audio always renders full-width)
    const audioAttachments = attachments.filter(a => a.attachmentType === 'audio');
    const otherAttachments = attachments.filter(a => a.attachmentType !== 'audio');
    
    // If all attachments are audio, render them
    if (otherAttachments.length === 0 && audioAttachments.length > 0) {
        return (
            <div className="w-full space-y-2">
                {audioAttachments.map((attachment, index) => (
                    <AudioAttachment key={index} attachment={attachment} />
                ))}
            </div>
        );
    }

    // If there are audio attachments mixed with others, render audio first
    if (audioAttachments.length > 0) {
        return (
            <div className="w-full">
                {audioAttachments.map((attachment, index) => (
                    <AudioAttachment key={`audio-${index}`} attachment={attachment} />
                ))}
                <MessageAttachmentGrid
                    attachments={otherAttachments}
                    isSent={isSent}
                    onImageClick={onImageClick}
                    onVideoClick={onVideoClick}
                    onPdfClick={onPdfClick}
                    onAudioClick={onAudioClick}
                />
            </div>
        );
    }

    // 1 attachment: Single large thumbnail
    if (count === 1) {
        const attachment = attachments[0];

        if (attachment.attachmentType === 'image') {
            return (
                <div className="mb-2 w-full">
                    <button
                        onClick={() => onImageClick?.(attachments, 0)}
                        className="block w-full rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
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
                <div className="mb-2 w-full">
                    <VideoAttachmentThumbnail
                        attachment={attachment}
                        onVideoClick={onVideoClick}
                        className="w-full h-48"
                    />
                </div>
            );
        }

        // PDF - square format for consistency with grid
        return (
            <div className="mb-2 w-full max-w-[200px]">
                <PdfSquareThumbnail
                    attachment={attachment}
                    onPdfClick={onPdfClick}
                    className="w-full aspect-square"
                />
            </div>
        );
    }

    // 2 attachments: Side by side grid
    if (count === 2) {
        return (
            <div className="mb-2 w-full">
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
                                        className="w-full aspect-square object-cover"
                                    />
                                </button>
                            ) : attachment.attachmentType === 'video' ? (
                                <VideoAttachmentThumbnail
                                    attachment={attachment}
                                    onVideoClick={onVideoClick}
                                    className="w-full aspect-square"
                                />
                            ) : (
                                <PdfSquareThumbnail
                                    attachment={attachment}
                                    onPdfClick={onPdfClick}
                                    className="w-full aspect-square"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 3 attachments: 2x2 grid with last item spanning or 3 squares
    if (count === 3) {
        return (
            <div className="mb-2 w-full">
                <div className="grid grid-cols-3 gap-2">
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
                                        className="w-full aspect-square object-cover"
                                    />
                                </button>
                            ) : attachment.attachmentType === 'video' ? (
                                <VideoAttachmentThumbnail
                                    attachment={attachment}
                                    onVideoClick={onVideoClick}
                                    className="w-full aspect-square"
                                />
                            ) : (
                                <PdfSquareThumbnail
                                    attachment={attachment}
                                    onPdfClick={onPdfClick}
                                    className="w-full aspect-square"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 4 attachments: 2x2 grid
    if (count === 4) {
        return (
            <div className="mb-2 w-full">
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
                                        className="w-full aspect-square object-cover"
                                    />
                                </button>
                            ) : attachment.attachmentType === 'video' ? (
                                <VideoAttachmentThumbnail
                                    attachment={attachment}
                                    onVideoClick={onVideoClick}
                                    className="w-full aspect-square"
                                />
                            ) : (
                                <PdfSquareThumbnail
                                    attachment={attachment}
                                    onPdfClick={onPdfClick}
                                    className="w-full aspect-square"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};
