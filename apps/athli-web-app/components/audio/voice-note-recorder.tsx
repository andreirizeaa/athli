"use client";

import React, { useEffect, useState, useRef } from "react";
import { Trash2, Send, Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { computeWaveformPeaksFromBlob } from "@/lib/audio/compute-peaks";

interface VoiceNoteRecorderProps {
  onSend: (blob: Blob, url: string, durationMs: number) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSend, onCancel }) => {
  const { state, durationMs, start, stop, cancel, getAmplitude } = useVoiceRecorder();
  const [peaks, setPeaks] = useState<number[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<{ blob: Blob; url: string; durationMs: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0..1
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);

  // Real-time waveform for recording
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const smoothRef = useRef(0);
  const bucketMaxRef = useRef(0);
  const lastBarAtRef = useRef(0);

  const MAX_BARS = 50;
  const BAR_INTERVAL_MS = 100; // 10 bars/second

  // Store cancel in a ref for cleanup to avoid stale closures
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  // Start recording when component mounts
  useEffect(() => {
    start().catch((error) => {
      console.error('Failed to start recording:', error);
      onCancel();
    });

    // Cleanup on unmount - ensures microphone is released
    return () => {
      cancelRef.current();
    };
  }, []);

  // Format duration as M:SS
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Real-time waveform generation during recording
  useEffect(() => {
    if (state !== "recording") return;

    const interval = setInterval(() => {
      const amplitude = getAmplitude();

      // Smoothing (fast attack, slow decay) - matches mobile implementation
      const prev = smoothRef.current;
      const alpha = amplitude > prev ? 0.45 : 0.12; // Fast up, slow down
      const smoothed = prev + (amplitude - prev) * alpha;
      smoothRef.current = smoothed;

      // Bucket max over 100ms => 10 bars/sec
      bucketMaxRef.current = Math.max(bucketMaxRef.current, smoothed);

      const now = Date.now();
      if (now - lastBarAtRef.current >= BAR_INTERVAL_MS) {
        lastBarAtRef.current = now;
        const nextVal = bucketMaxRef.current;
        bucketMaxRef.current = 0;

        setWaveformBars((prev) => {
          const arr = [...prev, nextVal];
          if (arr.length > MAX_BARS) arr.shift(); // Remove oldest bar (conveyor effect)
          return arr;
        });
      }
    }, 50); // Poll every 50ms

    return () => clearInterval(interval);
  }, [state, getAmplitude]);

  // Handle stop recording
  const handleStop = async () => {
    const result = await stop();
    if (result) {
      setRecordedBlob(result);
      setIsLoadingWaveform(true);
      // Generate waveform peaks - use simple fallback if decode fails
      try {
        const waveformPeaks = await computeWaveformPeaksFromBlob(result.blob, 64);
        setPeaks(waveformPeaks);
      } catch (error) {
        console.error('Failed to generate waveform:', error);
        // Create a simple fallback waveform
        const fallbackPeaks = Array.from({ length: 64 }, () => Math.random() * 0.8 + 0.2);
        setPeaks(fallbackPeaks);
      } finally {
        setIsLoadingWaveform(false);
      }
    }
  };

  // Handle send
  const handleSend = () => {
    if (state === "recording") {
      // Stop and send immediately
      stop().then((result) => {
        if (result) {
          onSend(result.blob, result.url, result.durationMs);
        }
      });
    } else if (recordedBlob) {
      // Send the recorded blob
      onSend(recordedBlob.blob, recordedBlob.url, recordedBlob.durationMs);
    }
  };

  // Handle cancel/trash
  const handleCancel = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    cancel();
    onCancel();
  };

  // Handle playback toggle
  const handlePlaybackToggle = () => {
    if (!recordedBlob) return;

    if (!audioElement) {
      const audio = new Audio(recordedBlob.url);
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
      };

      // Track playback progress
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress(audio.currentTime / audio.duration);
        }
      };

      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="px-4 py-2 flex-shrink-0 border-t border-border">
      <div className="bg-sidebar rounded-lg border border-input p-2">
        {/* Top row: Time pill and Waveform */}
        <div className="relative mb-2 h-[32px] overflow-hidden">
          {/* Waveform - scrolls behind timer */}
          <div className="absolute inset-0 flex items-center">
            {state === "recording" ? (
              // Real-time waveform - conveyor belt from right to left
              <div className="flex items-center justify-end gap-0.5 w-full h-full overflow-hidden">
                {waveformBars.map((amplitude, i) => {
                  const isSilent = amplitude < 0.03;
                  if (isSilent) {
                    return (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full bg-primary/40 flex-shrink-0"
                      />
                    );
                  }
                  const height = 6 + amplitude * 20; // 6-26px range
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-primary flex-shrink-0"
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
            ) : isLoadingWaveform ? (
              // Loading spinner
              <div className="flex items-center justify-center w-full h-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : peaks.length > 0 ? (
              // Show waveform after recording with playback progress
              <div className="w-full h-full flex items-center relative">
                {/* Base waveform (visible gray) */}
                <div className="flex items-center gap-0.5 w-full h-full">
                  {peaks.map((peak, i) => {
                    const height = Math.max(3, peak * 20);
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-muted-foreground/30 rounded-full"
                        style={{
                          height: `${height}px`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Progress overlay (primary color, fills left to right) */}
                {playbackProgress > 0 && (
                  <div
                    className="absolute inset-0 overflow-hidden flex items-center"
                    style={{ width: `${playbackProgress * 100}%` }}
                  >
                    <div className="flex items-center gap-0.5 w-full h-full">
                      {peaks.map((peak, i) => {
                        const height = Math.max(3, peak * 20);
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-primary rounded-full"
                            style={{
                              height: `${height}px`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Time pill - sits on top with gradient fade on left */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
            <div
              className="px-3 py-1 rounded-full flex items-center"
              style={{
                background: 'linear-gradient(to right, hsl(var(--sidebar)) 70%, transparent)',
                minWidth: '80px',
              }}
            >
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {formatDuration(recordedBlob?.durationMs ?? durationMs)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom row: Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Trash/Delete button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
            aria-label="Cancel recording"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Middle: Stop/Play button */}
          <div className="flex-1 flex items-center justify-center">
            {state === "recording" ? (
              <button
                type="button"
                onClick={handleStop}
                className="h-5 w-5 bg-destructive hover:bg-destructive/90 rounded flex-shrink-0"
                aria-label="Stop recording"
              />
            ) : recordedBlob && !isLoadingWaveform ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePlaybackToggle}
                className="h-9 w-9 rounded-full flex-shrink-0"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>

          {/* Send button */}
          <Button
            type="button"
            onClick={handleSend}
            className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0 flex-shrink-0"
            aria-label="Send voice note"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
