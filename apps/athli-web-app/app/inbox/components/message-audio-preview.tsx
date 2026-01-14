import React from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/general/utils';

interface AudioAttachment {
  name: string;
  data: string;
  type: string;
  size: number;
}

interface MessageAudioPreviewProps {
  audio: AudioAttachment;
  isSent: boolean;
}

export function MessageAudioPreview({ audio, isSent }: MessageAudioPreviewProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1.0);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = Number(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      'w-full max-w-sm rounded-lg border',
      isSent ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-border'
    )}>
      <audio
        ref={audioRef}
        src={audio.data}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              'hover:opacity-80 transition-opacity',
              isSent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            )}
          </button>

          {/* Waveform simulation (progress bar) */}
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className={cn(
                'w-full h-1 rounded-full appearance-none cursor-pointer',
                isSent
                  ? 'bg-primary/20 [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:bg-primary'
                  : 'bg-muted [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:bg-primary',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full',
                '[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0'
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(currentTime)}
              </span>
              <button
                onClick={togglePlaybackRate}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                {playbackRate}x
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
