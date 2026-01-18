"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Trash2, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceNoteRecorderProps {
  onSend: (blob: Blob, url: string, durationMs: number) => void;
  onCancel: () => void;
}

type RecorderState = "idle" | "recording" | "stopped";

const MAX_DURATION_MS = 120000; // 2 minutes
const UPDATE_INTERVAL_MS = 50; // Update every 50ms for smooth progress

function pickMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSend, onCancel }) => {
  const [state, setState] = useState<RecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalDurationRef = useRef<number>(0);

  const mimeType = useMemo(() => pickMimeType(), []);

  // Format duration as M:SS
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Cancel function
  const cancel = useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop recorder
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    recorderRef.current = null;

    // Stop all tracks (releases microphone)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Revoke URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    chunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    setState("idle");
    setDurationMs(0);
  }, [audioUrl]);

  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  // Start recording on mount
  useEffect(() => {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        chunksRef.current = [];

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || mimeType || "audio/webm"
          });
          setAudioBlob(blob);

          const url = URL.createObjectURL(blob);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });

          // Stop mic
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          setState("stopped");
        };

        recorder.start();
        startTimeRef.current = Date.now();
        setState("recording");

        // Duration timer
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          setDurationMs(elapsed);
          finalDurationRef.current = elapsed;

          if (elapsed >= MAX_DURATION_MS) {
            recorder.stop();
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
        }, UPDATE_INTERVAL_MS);
      } catch (error) {
        console.error("Failed to start recording:", error);
        onCancel();
      }
    };

    startRecording();

    return () => {
      cancelRef.current();
    };
  }, [mimeType, onCancel]);

  // Handle stop recording
  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    finalDurationRef.current = Date.now() - startTimeRef.current;
    setDurationMs(finalDurationRef.current);

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  // Handle send
  const handleSend = () => {
    if (state === "recording") {
      // Stop and send immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const duration = Date.now() - startTimeRef.current;

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        const recorder = recorderRef.current;

        // Override onstop to send immediately
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || mimeType || "audio/webm"
          });
          const url = URL.createObjectURL(blob);

          // Stop mic
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          onSend(blob, url, duration);
        };

        recorder.stop();
      }
    } else if (audioBlob && audioUrl) {
      onSend(audioBlob, audioUrl, finalDurationRef.current);
    }
  };

  // Handle cancel/trash
  const handleCancel = () => {
    cancel();
    onCancel();
  };

  const progressPercentage = Math.min(100, (durationMs / MAX_DURATION_MS) * 100);

  return (
    <div className="px-4 py-2 flex-shrink-0 border-t border-border">
      <div className="bg-sidebar rounded-lg border border-input p-2">
        {/* Top row: Timer and Progress (recording) or Native Audio Controls (stopped) */}
        <div className={`${state === "stopped" ? "" : "flex items-center gap-3 h-[32px]"}`}>
          {state === "recording" ? (
            <>
              {/* Time display */}
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatDuration(durationMs)} / {formatDuration(MAX_DURATION_MS)}
              </span>

              {/* Progress bar */}
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
            <audio
              controls
              src={audioUrl}
              className="w-full h-10"
              style={{ colorScheme: "dark" }}
            />
          ) : null}
        </div>

        {/* Bottom row: Controls */}
        <div className="flex items-center justify-between gap-2 h-9 mt-1">
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

          {/* Middle: Stop button (only during recording) */}
          <div className="flex-1 flex items-center justify-center">
            {state === "recording" && (
              <button
                type="button"
                onClick={handleStop}
                className="h-5 w-5 bg-destructive hover:bg-destructive/90 rounded flex-shrink-0"
                aria-label="Stop recording"
              />
            )}
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
