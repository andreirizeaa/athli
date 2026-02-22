"use client";

import { useEffect, useCallback, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

interface UseSpeechToTextOptions {
    onTranscript?: (transcript: string) => void;
    onError?: (error: string) => void;
    continuous?: boolean;
    language?: string;
}

interface UseSpeechToTextReturn {
    isListening: boolean;
    transcript: string;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    toggleListening: () => void;
    resetTranscript: () => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
    const {
        onTranscript,
        onError,
        continuous = true,
        language = "en-US",
    } = options;

    const [isSupported, setIsSupported] = useState(true);

    const {
        transcript,
        listening: isListening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable,
    } = useSpeechRecognition();

    // Check browser support on mount
    useEffect(() => {
        if (!browserSupportsSpeechRecognition) {
            setIsSupported(false);
        }
    }, [browserSupportsSpeechRecognition]);

    // Call onTranscript callback when transcript changes
    useEffect(() => {
        if (transcript && onTranscript) {
            onTranscript(transcript);
        }
    }, [transcript, onTranscript]);

    const startListening = useCallback(async () => {
        if (!browserSupportsSpeechRecognition) {
            onError?.("Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.");
            return;
        }

        if (!isMicrophoneAvailable) {
            onError?.("Microphone access is required. Please allow microphone permissions and try again.");
            return;
        }

        try {
            await SpeechRecognition.startListening({
                continuous,
                language,
            });
        } catch (error) {
            onError?.("Failed to start speech recognition. Please check your microphone permissions.");
        }
    }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, continuous, language, onError]);

    const stopListening = useCallback(() => {
        SpeechRecognition.stopListening();
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        transcript,
        isSupported,
        startListening,
        stopListening,
        toggleListening,
        resetTranscript,
    };
}
