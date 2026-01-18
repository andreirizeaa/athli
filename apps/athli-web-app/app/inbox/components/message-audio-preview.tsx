'use client';

import React from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/general/utils';

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

// Custom waveform component using canvas
const AudioWaveform = React.memo(({ 
  peaks, 
  progress, 
  activeColor, 
  inactiveColor,
  height = 32,
}: { 
  peaks: number[]; 
  progress: number; 
  activeColor: string;
  inactiveColor: string;
  height?: number;
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(200);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const barWidth = 2;
    const gap = 1;
    const totalBarWidth = barWidth + gap;
    const numBars = Math.floor(width / totalBarWidth);
    const progressIndex = Math.floor(progress * numBars);

    for (let i = 0; i < numBars; i++) {
      const peakIndex = Math.floor((i / numBars) * peaks.length);
      const amplitude = peaks[peakIndex] || 0;
      const barHeight = Math.max(2, amplitude * (height - 4));
      const x = i * totalBarWidth;
      const y = (height - barHeight) / 2;
      
      ctx.fillStyle = i < progressIndex ? activeColor : inactiveColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }
  }, [peaks, progress, activeColor, inactiveColor, width, height]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
});

AudioWaveform.displayName = 'AudioWaveform';

// Generate waveform peaks from audio blob
const generateWaveformPeaks = async (audioData: string): Promise<number[]> => {
  try {
    const response = await fetch(audioData);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const numSamples = 50; // Number of peaks to generate
    const samplesPerPeak = Math.floor(channelData.length / numSamples);
    const peaks: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      let sum = 0;
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      
      peaks.push(sum / (end - start));
    }

    // Normalize peaks to 0-1 range
    const maxPeak = Math.max(...peaks, 0.01);
    const normalizedPeaks = peaks.map(p => p / maxPeak);
    
    await audioContext.close();
    return normalizedPeaks;
  } catch {
    // Return default peaks if audio processing fails
    return Array(50).fill(0).map(() => 0.3 + Math.random() * 0.4);
  }
};

export function MessageAudioPreview({ audio, isSent }: MessageAudioPreviewProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1.0);
  const [peaks, setPeaks] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Generate waveform peaks from audio
  React.useEffect(() => {
    const loadPeaks = async () => {
      setIsLoading(true);
      const generatedPeaks = await generateWaveformPeaks(audio.data);
      setPeaks(generatedPeaks);
      setIsLoading(false);
    };
    loadPeaks();
  }, [audio.data]);

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
    // Use backend duration if available, otherwise use audio element duration
    const audioDuration = audio.duration 
      ? audio.duration / 1000 // Convert ms to seconds
      : audioRef.current.duration;
    setDuration(audioDuration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
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

  // Calculate progress percentage for the waveform overlay
  const progressPercentage = duration > 0 ? currentTime / duration : 0;

  // Colors based on message sender
  const activeColor = isSent 
    ? 'hsl(var(--primary-foreground))' 
    : 'hsl(var(--primary))';
  const inactiveColor = isSent 
    ? 'hsla(var(--primary-foreground) / 0.35)' 
    : 'hsla(var(--muted-foreground) / 0.4)';

  return (
    <div className={cn(
      'w-full max-w-sm rounded-2xl border px-2 py-1',
      isSent 
        ? 'border-primary-foreground/30' 
        : 'border-border'
    )}>
      <audio
        ref={audioRef}
        src={audio.data}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

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

        {/* Waveform visualization with progress */}
        <div 
          className="flex-1 relative h-8 cursor-pointer overflow-hidden"
          onClick={handleSeek}
          role="slider"
          tabIndex={0}
          aria-label="Audio progress"
          aria-valuenow={Math.round(progressPercentage * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {peaks.length > 0 && !isLoading ? (
            <AudioWaveform
              peaks={peaks}
              progress={progressPercentage}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
            />
          ) : (
            // Fallback: Simple progress bar while loading
            <div className="w-full h-full flex items-center">
              <div className={cn(
                'w-full h-1 rounded-full',
                isSent ? 'bg-primary-foreground/20' : 'bg-muted'
              )}>
                <div 
                  className={cn(
                    'h-full rounded-full transition-all',
                    isSent ? 'bg-primary-foreground' : 'bg-primary'
                  )}
                  style={{ width: `${progressPercentage * 100}%` }}
                />
              </div>
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
