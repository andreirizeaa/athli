"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Trash2, ArrowUp, Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { computeWaveformPeaksFromBlob } from "@/lib/audio/compute-peaks";

interface VoiceNoteRecorderProps {
  onSend: (blob: Blob, url: string, durationMs: number) => void;
  onCancel: () => void;
}

// Constants for conveyor-belt waveform
const BAR_INTERVAL_MS = 100;
const MAX_BARS = 60;
const MAX_DURATION_MS = 120000; // 2 minutes

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSend, onCancel }) => {
  const { state, durationMs, start, stop, cancel, mediaRecorder, stream } = useVoiceRecorder();
  const [peaks, setPeaks] = useState<number[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<{ blob: Blob; url: string; durationMs: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0..1
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);

  // Conveyor-belt waveform state
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const smoothedRef = useRef(0);
  const bucketMaxRef = useRef(0);
  const lastBarTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

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

  // Conveyor-belt waveform audio analysis
  useEffect(() => {
    if (!stream || state !== "recording") {
      // Reset waveform state when not recording
      setWaveformBars([]);
      smoothedRef.current = 0;
      bucketMaxRef.current = 0;
      lastBarTimeRef.current = 0;
      return;
    }

    const audioContext = new AudioContext();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    audioContextRef.current = audioContext;
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.fftSize);

    const analyze = () => {
      if (!analyzerRef.current) return;

      // Use time domain data for amplitude (not frequency spectrum)
      analyzerRef.current.getByteTimeDomainData(dataArray);

      // Calculate RMS (root mean square) amplitude
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128; // Center around 0, normalize to -1..1
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Apply smoothing (fast attack, slow decay)
      const alpha = rms > smoothedRef.current ? 0.45 : 0.12;
      smoothedRef.current += (rms - smoothedRef.current) * alpha;
      bucketMaxRef.current = Math.max(bucketMaxRef.current, smoothedRef.current);

      // Emit a bar every BAR_INTERVAL_MS
      const now = Date.now();
      if (now - lastBarTimeRef.current >= BAR_INTERVAL_MS) {
        setWaveformBars(prev => {
          const next = [...prev, bucketMaxRef.current];
          if (next.length > MAX_BARS) {
            next.splice(0, next.length - MAX_BARS);
          }
          return next;
        });
        bucketMaxRef.current = 0;
        lastBarTimeRef.current = now;
      }

      animationRef.current = requestAnimationFrame(analyze);
    };

    analyze();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stream, state]);

  // Format duration as M:SS
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
        <div className="flex items-center h-[32px] gap-2">
          {/* Time pill - always visible */}
          <div className="flex-shrink-0 px-2 py-1 rounded-full flex items-center bg-muted/50">
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {formatDuration(recordedBlob?.durationMs ?? durationMs)}/{formatDuration(MAX_DURATION_MS)}
            </span>
          </div>

          {/* Waveform container - takes remaining space */}
          <div className="flex-1 h-full overflow-hidden">
            {state === "recording" && stream ? (
              // Real-time conveyor-belt waveform - bars flow from right to left
              <div className="h-full flex flex-row-reverse items-center gap-[2px]">
                {[...waveformBars].reverse().map((amp, idx) => {
                  const isSilent = amp < 0.03;
                  if (isSilent) {
                    return (
                      <div
                        key={idx}
                        className="w-[3px] h-[3px] rounded-full bg-primary flex-shrink-0"
                      />
                    );
                  }
                  // Scale amplitude: min height 6px, max height 28px
                  const height = 6 + Math.round(amp * 22);
                  return (
                    <div
                      key={idx}
                      className="w-[3px] rounded-sm bg-primary flex-shrink-0"
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
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
