'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVoiceToTextOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

interface UseVoiceToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => Promise<void>;
}

export const useVoiceToText = (options: UseVoiceToTextOptions = {}): UseVoiceToTextReturn => {
  const {
    onTranscript,
    onError,
    continuous = true,
    interimResults = false,
    lang = 'en-US',
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupportedRef = useRef<boolean>(false);

  // Check if browser supports Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    isSupportedRef.current = !!SpeechRecognition;

    if (!isSupportedRef.current) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        const errorMessage = getErrorMessage(event.error);
        setError(errorMessage);
        if (onError) {
          onError(new Error(errorMessage));
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (onTranscript) {
          onTranscript(transcript);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize speech recognition';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [continuous, interimResults, lang, onTranscript, onError]);

  const startListening = useCallback(async () => {
    if (!isSupportedRef.current) {
      const errorMessage = 'Speech recognition is not supported in this browser';
      setError(errorMessage);
      if (onError) {
        onError(new Error(errorMessage));
      }
      return;
    }

    if (!recognitionRef.current) {
      const errorMessage = 'Speech recognition not initialized';
      setError(errorMessage);
      if (onError) {
        onError(new Error(errorMessage));
      }
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately as we only needed it for permission
      stream.getTracks().forEach((track) => track.stop());

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Microphone permission denied';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported: isSupportedRef.current,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
};

const getErrorMessage = (error: string): string => {
  switch (error) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'audio-capture':
      return 'No microphone was found. Please ensure a microphone is connected.';
    case 'network':
      return 'Network error occurred. Please check your connection.';
    case 'not-allowed':
      return 'Microphone permission was denied. Please enable microphone access.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed.';
    default:
      return `Speech recognition error: ${error}`;
  }
};

// Utility function to check if browser supports speech recognition
export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
};

// Utility function to request microphone permission
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
};

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
