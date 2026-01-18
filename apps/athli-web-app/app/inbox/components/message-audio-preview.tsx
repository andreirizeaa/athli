'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import WaveSurfer from 'wavesurfer.js';

interface AudioAttachment {
  name: string;
  data: string;
  type: string;
  size: number;
  duration?: number; // Duration in milliseconds (from backend)
}

interface MessageAudioPreviewProps {
  audio: AudioAttachment;
  isSent: boolean;
}

export function MessageAudioPreview({ audio, isSent }: MessageAudioPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  // Colors based on message sender
  const waveColor = isSent
    ? 'hsla(var(--primary-foreground) / 0.35)'
    : 'hsla(var(--muted-foreground) / 0.4)';
  const progressColor = isSent
    ? 'hsl(var(--primary-foreground))'
    : 'hsl(var(--primary))';

  // Initialize wavesurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: audio.data,
      waveColor: waveColor,
      progressColor: progressColor,
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      height: 32,
    });

    ws.on('ready', () => {
      setIsLoading(false);
      // Use backend duration if available, otherwise use wavesurfer duration
      const wsDuration = ws.getDuration();
      const backendDuration = audio.duration ? audio.duration / 1000 : 0;
      setDuration(backendDuration > 0 ? backendDuration : wsDuration);
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('seeking', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => {
      setIsPlaying(true);
    });

    ws.on('pause', () => {
      setIsPlaying(false);
    });

    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audio.data, audio.duration, waveColor, progressColor]);

  const handlePlayPause = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (isPlaying) {
      ws.pause();
    } else {
      ws.play();
    }
  }, [isPlaying]);

  const togglePlaybackRate = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    const rates = [1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    ws.setPlaybackRate(nextRate);
  }, [playbackRate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      'w-full max-w-sm rounded-2xl border px-2 py-1',
      isSent
        ? 'border-primary-foreground/30'
        : 'border-border'
    )}>
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            'hover:opacity-80 transition-opacity',
            isSent
              ? 'text-primary-foreground'
              : 'text-primary'
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Waveform visualization */}
        <div
          ref={containerRef}
          className="flex-1 relative h-8 cursor-pointer overflow-hidden"
          role="slider"
          tabIndex={0}
          aria-label="Audio progress"
          aria-valuenow={duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {isLoading && (
            <div className="w-full h-full flex items-center">
              <div className={cn(
                'w-full h-1 rounded-full',
                isSent ? 'bg-primary-foreground/20' : 'bg-muted'
              )} />
            </div>
          )}
        </div>

        {/* Speed button */}
        <button
          onClick={togglePlaybackRate}
          className={cn(
            'h-6 min-w-[32px] px-1.5 rounded-full text-xs font-semibold',
            'hover:opacity-80 transition-opacity',
            isSent
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
          aria-label={`Playback speed: ${playbackRate}x`}
        >
          {playbackRate}x
        </button>

        {/* Duration display */}
        <div className={cn(
          'min-w-[36px] text-xs font-mono tabular-nums',
          isSent ? 'text-primary-foreground' : 'text-muted-foreground'
        )}>
          {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
        </div>
      </div>
    </div>
  );
}
