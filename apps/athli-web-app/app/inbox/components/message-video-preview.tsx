import React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/general/utils';

interface VideoAttachment {
  name: string;
  data: string;
  type: string;
  size: number;
}

interface MessageVideoPreviewProps {
  video: VideoAttachment;
  isSent: boolean;
  onPlay?: () => void;
}

export function MessageVideoPreview({ video, isSent, onPlay }: MessageVideoPreviewProps) {
  const [thumbnail, setThumbnail] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Generate thumbnail from video
    const videoElement = document.createElement('video');
    videoElement.src = video.data;
    videoElement.crossOrigin = 'anonymous';

    videoElement.addEventListener('loadeddata', () => {
      videoElement.currentTime = 1; // Seek to 1 second
    });

    videoElement.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL());
      }
    });

    return () => {
      videoElement.remove();
    };
  }, [video.data]);

  return (
    <div className="w-56">
      <button
        onClick={onPlay}
        className={cn(
          'relative w-full aspect-video overflow-hidden rounded-lg',
          'hover:opacity-90 transition-opacity group'
        )}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="h-6 w-6 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </button>
    </div>
  );
}
