"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Trash2, ArrowUp, RotateCcw, Loader2, CircleStop } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceNoteRecorderProps {
  onSend: (blob: Blob, url: string, durationMs: number) => void;
  onCancel: () => void;
}

type RecorderState = "idle" | "starting" | "recording" | "converting" | "stopped";

const MAX_DURATION_MS = 120000;
const UPDATE_INTERVAL_MS = 50;

/**
 * Convert WebM blob to WAV using Web Audio API
 * WAV is universally supported including iOS
 * Returns both the WAV blob and the actual audio duration in milliseconds
 */
async function convertToWav(webmBlob: Blob): Promise<{ blob: Blob; durationMs: number }> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get actual audio duration from the decoded buffer (in seconds)
    const actualDurationMs = Math.round(audioBuffer.duration * 1000);

    // Create WAV file
    const numChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitsPerSample = 16;

    // Get mono audio data
    let samples: Float32Array;
    if (audioBuffer.numberOfChannels === 1) {
      samples = audioBuffer.getChannelData(0);
    } else {
      // Mix to mono
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      samples = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        samples[i] = (left[i] + right[i]) / 2;
      }
    }

    const dataLength = samples.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return {
      blob: new Blob([buffer], { type: "audio/wav" }),
      durationMs: actualDurationMs,
    };
  } finally {
    await audioContext.close();
  }
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSend, onCancel }) => {
  const [state, setState] = useState<RecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalDurationRef = useRef<number>(0);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setState("idle");
    setDurationMs(0);
  }, [audioUrl, cleanup]);

  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstart = () => resolve();
      mediaRecorder.start();
    });
  }, []);

  const stopRecording = useCallback((): Promise<{ blob: Blob; durationMs: number }> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No recorder"));
        return;
      }

      mediaRecorder.ondataavailable = async (e) => {
        cleanup();

        // Convert WebM to WAV for iOS compatibility
        setState("converting");
        try {
          const result = await convertToWav(e.data);
          console.log('[VoiceNoteRecorder] Converted WAV, actual duration (ms):', result.durationMs);
          resolve(result);
        } catch (err) {
          console.error("WAV conversion failed, using original:", err);
          // Fallback - use wall clock time as estimate
          resolve({ blob: e.data, durationMs: finalDurationRef.current });
        }
      };

      mediaRecorder.stop();
    });
  }, [cleanup]);

  useEffect(() => {
    const start = async () => {
      setState("starting");
      try {
        await startRecording();
        startTimeRef.current = Date.now();
        setState("recording");

        timerRef.current = setInterval(async () => {
          const elapsed = Date.now() - startTimeRef.current;
          setDurationMs(elapsed);

          if (elapsed >= MAX_DURATION_MS) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            const result = await stopRecording();
            setAudioBlob(result.blob);
            setAudioUrl(URL.createObjectURL(result.blob));
            finalDurationRef.current = result.durationMs; // Use actual audio duration
            setDurationMs(result.durationMs);
            setState("stopped");
          }
        }, UPDATE_INTERVAL_MS);
      } catch (error) {
        console.error("Failed to start recording:", error);
        onCancel();
      }
    };

    start();
    return () => cancelRef.current();
  }, [startRecording, stopRecording, onCancel]);

  const handleStop = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const result = await stopRecording();
    setAudioBlob(result.blob);
    setAudioUrl(URL.createObjectURL(result.blob));
    finalDurationRef.current = result.durationMs; // Use actual audio duration
    setDurationMs(result.durationMs);
    setState("stopped");
  };

  const handleSend = async () => {
    if (state === "recording") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const result = await stopRecording();
      const url = URL.createObjectURL(result.blob);
      console.log('[VoiceNoteRecorder] Sending with actual duration (ms):', result.durationMs, 'which is', result.durationMs / 1000, 'seconds');
      onSend(result.blob, url, result.durationMs);
    } else if (audioBlob && audioUrl) {
      console.log('[VoiceNoteRecorder] Sending stopped recording with finalDuration (ms):', finalDurationRef.current, 'which is', finalDurationRef.current / 1000, 'seconds');
      onSend(audioBlob, audioUrl, finalDurationRef.current);
    }
  };

  const handleCancel = () => {
    cancel();
    onCancel();
  };

  const handleRedo = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setDurationMs(0);
    setState("starting");

    try {
      await startRecording();
      startTimeRef.current = Date.now();
      setState("recording");

      timerRef.current = setInterval(async () => {
        const elapsed = Date.now() - startTimeRef.current;
        setDurationMs(elapsed);

        if (elapsed >= MAX_DURATION_MS) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          const result = await stopRecording();
          setAudioBlob(result.blob);
          setAudioUrl(URL.createObjectURL(result.blob));
          finalDurationRef.current = result.durationMs; // Use actual audio duration
          setDurationMs(result.durationMs);
          setState("stopped");
        }
      }, UPDATE_INTERVAL_MS);
    } catch (error) {
      console.error("Failed to restart recording:", error);
    }
  };

  const progressPercentage = Math.min(100, (durationMs / MAX_DURATION_MS) * 100);

  return (
    <div className="px-4 py-2 flex-shrink-0 border-t border-border">
      <div className="bg-sidebar rounded-lg border border-input p-2">
        <div className={`${state === "stopped" ? "" : "flex items-center gap-3 h-[32px]"}`}>
          {state === "starting" || state === "converting" ? (
            <div className="flex items-center justify-center w-full gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              {state === "converting" && (
                <span className="text-xs text-muted-foreground">Converting...</span>
              )}
            </div>
          ) : state === "recording" ? (
            <>
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatDuration(durationMs)} / {formatDuration(MAX_DURATION_MS)}
              </span>
              <div className="flex-1 h-full overflow-hidden relative">
                <div className="flex items-center h-full">
                  <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-75"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : audioUrl ? (
            <audio controls src={audioUrl} className="w-full h-10" style={{ colorScheme: "dark" }} />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 h-9 mt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={state === "starting" || state === "converting"}
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
            aria-label="Cancel recording"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center justify-center">
            {state === "recording" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleStop}
                className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Stop recording"
              >
                <CircleStop className="h-7 w-7" />
              </Button>
            ) : state === "stopped" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                className="h-8 w-8 rounded-full"
                aria-label="Re-record"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleSend}
            disabled={state === "starting" || state === "converting"}
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
