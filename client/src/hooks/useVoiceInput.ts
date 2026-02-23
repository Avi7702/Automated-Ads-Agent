/**
 * useVoiceInput — Web Speech API voice-to-text hook
 *
 * Provides real-time speech recognition for the Studio prompt field.
 * Uses the browser's SpeechRecognition API (Chrome, Edge, Safari).
 *
 * Features:
 * - Continuous recognition with interim results
 * - Auto-stop after silence timeout
 * - Language detection (defaults to English)
 * - Graceful fallback when API unavailable
 */

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */

// Web Speech API type augmentation (not yet in standard TS DOM lib)
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseVoiceInputOptions {
  /** Language code (default: 'en-US') */
  lang?: string;
  /** Auto-stop after this many ms of silence (default: 3000) */
  silenceTimeoutMs?: number;
  /** Called with each interim/final transcript chunk */
  onTranscript?: (text: string, isFinal: boolean) => void;
}

export interface UseVoiceInputReturn {
  /** Whether speech recognition is available in this browser */
  isSupported: boolean;
  /** Whether currently listening */
  isListening: boolean;
  /** Current transcript (interim + final combined) */
  transcript: string;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
  /** Clear transcript */
  clearTranscript: () => void;
  /** Error message if recognition failed */
  error: string | null;
}

// Cross-browser SpeechRecognition
const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = 'en-US', silenceTimeoutMs = 3000, onTranscript } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef('');

  const isSupported = !!SpeechRecognition;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    }, silenceTimeoutMs);
  }, [silenceTimeoutMs, isListening]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscriptRef.current = '';
      resetSilenceTimer();
    };

    recognition.onresult = (event) => {
      resetSilenceTimer();

      let interimTranscript = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const firstAlt = result[0];
        if (!firstAlt) continue;
        if (result.isFinal) {
          finalText += firstAlt.transcript;
        } else {
          interimTranscript += firstAlt.transcript;
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
        onTranscript?.(finalText, true);
      }

      const combined = finalTranscriptRef.current + interimTranscript;
      setTranscript(combined);

      if (interimTranscript) {
        onTranscript?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are normal — don't treat as errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (_err) {
      setError('Failed to start speech recognition. Please check microphone permissions.');
    }
  }, [lang, onTranscript, resetSilenceTimer]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    error,
  };
}

/**
 * Speak text aloud using the browser's Speech Synthesis API.
 * Returns a promise that resolves when speech completes.
 */
export function speakText(text: string, options?: { rate?: number; pitch?: number; lang?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.lang = options?.lang ?? 'en-US';

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(`Speech synthesis error: ${e.error}`));

    window.speechSynthesis.speak(utterance);
  });
}
