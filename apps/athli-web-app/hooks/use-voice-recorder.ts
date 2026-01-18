"use client";

import { useCallback, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "stopped";

interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

function pickMimeType() {
  // Prefer Opus in WebM (best quality/size, widely supported)
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of candidates) {
    if (typeof window !== 'undefined' && window.MediaRecorder?.isTypeSupported?.(t)) return t;
  }
  return ""; // let browser decide
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTsRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio API for real-time amplitude
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const start = useCallback(async () => {
    if (state === "recording") return;

    try {
      // Use better audio constraints for clearer recording
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        }
      });
      streamRef.current = stream;

      // Create Web Audio API analyzer for real-time amplitude
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256; // Small FFT for fast updates
      analyzer.smoothingTimeConstant = 0.3;

      source.connect(analyzer);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);

      const mimeType = pickMimeType();
      // Use higher bitrate for better quality
      const options: MediaRecorderOptions = mimeType
        ? { mimeType, audioBitsPerSecond: 128000 }
        : { audioBitsPerSecond: 128000 };
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;

      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      startTsRef.current = performance.now();
      mr.start(250); // chunk every 250ms
      setDurationMs(0);
      setState("recording");

      // Update duration every 100ms
      timerRef.current = setInterval(() => {
        const elapsed = Math.max(0, Math.round(performance.now() - startTsRef.current));
        setDurationMs(elapsed);
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [state]);

  // Get real-time amplitude (0..1) from analyzer
  const getAmplitude = useCallback(() => {
    const analyzer = analyzerRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyzer || !dataArray) return 0;

    analyzer.getByteFrequencyData(dataArray);

    // Calculate RMS of frequency bins
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Apply noise gate (ignore very quiet sounds)
    const noiseFloor = 0.02;
    if (rms < noiseFloor) return 0;

    // Normalize above noise floor
    return Math.min(1, (rms - noiseFloor) / (1 - noiseFloor));
  }, []);

  const stop = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || state !== "recording") return null;

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const stopped = new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
    });

    mr.stop();
    await stopped;

    const duration = Math.max(0, Math.round(performance.now() - startTsRef.current));
    setDurationMs(duration);

    // Stop mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Clean up audio analyzer
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyzerRef.current = null;
    dataArrayRef.current = null;

    // Wait a bit for blob to stabilize (prevents decode errors)
    await new Promise(resolve => setTimeout(resolve, 100));

    const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });

    // Validate blob size
    if (blob.size < 1024) {
      console.warn('Recording too short or empty');
      mediaRecorderRef.current = null;
      setState("idle");
      return null;
    }

    const url = URL.createObjectURL(blob);

    mediaRecorderRef.current = null;
    setState("stopped");

    return { blob, url, durationMs: duration, mimeType: blob.type };
  }, [state]);

  const cancel = useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder if active
    const mr = mediaRecorderRef.current;
    if (mr) {
      try {
        if (mr.state !== 'inactive') {
          mr.stop();
        }
      } catch (e) {
        // Ignore errors when stopping already stopped recorder
      }
    }
    mediaRecorderRef.current = null;

    // Stop all tracks - this is the key to releasing the microphone
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Reset chunks
    chunksRef.current = [];

    // Clean up audio analyzer
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore errors when closing
      }
      audioContextRef.current = null;
    }
    analyzerRef.current = null;
    dataArrayRef.current = null;

    setState("idle");
    setDurationMs(0);
  }, []);

  const reset = useCallback(() => {
    cancel();
  }, [cancel]);

  return { 
    state, 
    durationMs, 
    start, 
    stop, 
    cancel, 
    reset, 
    getAmplitude,
    // Expose MediaRecorder for external visualizers
    mediaRecorder: mediaRecorderRef.current,
    // Expose MediaStream for live waveform visualization
    stream: streamRef.current,
  };
}
