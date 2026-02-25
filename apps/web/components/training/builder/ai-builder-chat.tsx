'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowUpIcon,
  FileText,
  Loader2,
  Paperclip,
  Sparkles,
  SquareIcon,
  X,
} from 'lucide-react';
import Lottie from 'lottie-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';
import { useAIChat, type ChatMessage } from '@/hooks/use-ai-chat';
import { Markdown } from '@/components/ui/custom/prompt/markdown';
import { ToolStatusList } from '@/app/(app)/assistant/components/tool-status';
import type { ActionPayload } from '@/api/ai/ai-service';
import type { GeneratedWorkout } from '@/api/exercise/generate-exercise';

// ── Constants ──────────────────────────────────────────────────────

const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

const SECTION_TYPE_DESCRIPTIONS: Record<string, string> = {
  regular: 'Regular (standard sets with reps, weight, rest)',
  amrap: 'AMRAP (As Many Rounds/Reps As Possible within a time limit)',
  tabata: 'Tabata (20s work, 10s rest, 8 rounds)',
  hiit: 'HIIT (High-Intensity Interval Training with customizable work/rest)',
  emom: 'EMOM (Every Minute On the Minute)',
  circuits: 'Circuit training (multiple rounds)',
  auxiliary: 'Auxiliary (warm-up, cool-down, etc.)',
} as const;

// ── Props ──────────────────────────────────────────────────────────

interface AIBuilderChatProps {
  /** Section type for context (e.g., 'amrap', 'tabata'). Undefined for workout builder. */
  sectionType?: string;
  /** Callback when AI generates a workout payload */
  onWorkoutGenerated?: (workout: GeneratedWorkout) => void;
  /** Callback when AI generates a section payload */
  onSectionGenerated?: (payload: unknown) => void;
  /** Called when switching back to manual mode after generation */
  onSwitchToManual?: () => void;
  /** Current builder context — 'section' or 'workout' */
  builderType: 'section' | 'workout';
  /** Example prompt text */
  examplePrompt?: string;
  /** Returns the current workout/section state so the AI knows what the user has built so far */
  getCurrentPayload?: () => unknown;
}

// ── Component ──────────────────────────────────────────────────────

export function AIBuilderChat({
  sectionType,
  onWorkoutGenerated,
  onSectionGenerated,
  onSwitchToManual,
  builderType,
  examplePrompt,
  getCurrentPayload,
}: AIBuilderChatProps) {
  const t = useTranslations();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [aiAnimationData, setAiAnimationData] = useState<object | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load sphere animation
  useEffect(() => {
    fetch('/animations/ai-sphere-animation.json')
      .then((res) => res.json())
      .then(setAiAnimationData)
      .catch(() => {});
  }, []);

  // Build context message for the AI (prepended to every message)
  const buildContextPrefix = useCallback((isFollowUp: boolean) => {
    if (builderType === 'section' && sectionType) {
      const desc = SECTION_TYPE_DESCRIPTIONS[sectionType] || sectionType;
      if (isFollowUp) {
        return (
          `[IMPORTANT: You MUST use the create_section tool with type="${sectionType}" to apply changes. ` +
          `Do NOT output raw JSON. Always use the tool and always provide a text response.]\n\n`
        );
      }
      return (
        `I am building a ${desc} section. ` +
        `Generate exercises formatted for a ${sectionType.toUpperCase()} section. ` +
        `Use the create_section tool with type="${sectionType}".\n\n`
      );
    }
    if (builderType === 'workout') {
      if (isFollowUp) {
        return (
          `[IMPORTANT: You MUST use the create_workout tool to apply changes. ` +
          `Do NOT output raw JSON. Always use the tool and always provide a text response.]\n\n`
        );
      }
      return 'I am building a workout. Use the create_workout tool.\n\n';
    }
    return '';
  }, [builderType, sectionType]);

  // Use refs for callbacks to avoid stale closures in the SSE stream handler.
  // The useAIChat hook captures onAction at sendMessage-call time, but the
  // parent's onWorkoutGenerated/onSectionGenerated may have changed by the
  // time the SSE action event arrives (inline arrow props are recreated each render).
  const onWorkoutGeneratedRef = useRef(onWorkoutGenerated);
  const onSectionGeneratedRef = useRef(onSectionGenerated);
  useEffect(() => { onWorkoutGeneratedRef.current = onWorkoutGenerated; }, [onWorkoutGenerated]);
  useEffect(() => { onSectionGeneratedRef.current = onSectionGenerated; }, [onSectionGenerated]);

  // Handle AI actions (workout/section created)
  // Note: we intentionally do NOT call onSwitchToManual here so the user
  // stays on the chat screen while exercises load into the builder area.
  const handleAction = useCallback(
    (action: ActionPayload) => {
      console.log('[AIBuilderChat] handleAction received:', action.type, JSON.stringify(action.payload).slice(0, 500));

      if (action.type === 'create_workout' && action.payload) {
        const cb = onWorkoutGeneratedRef.current;
        if (!cb) {
          console.warn('[AIBuilderChat] create_workout action but no onWorkoutGenerated callback');
          return;
        }
        try {
          const workout = convertPayloadToGeneratedWorkout(action.payload);
          console.log('[AIBuilderChat] Converted workout:', workout.title, 'sections:', workout.sections.length,
            'exercises:', workout.sections.reduce((sum: number, s: any) => sum + (s.exercises?.length || 0), 0));
          cb(workout);
        } catch (err) {
          console.error('[AIBuilderChat] Failed to convert workout payload:', err);
        }
      } else if (action.type === 'create_section' && action.payload) {
        const sectionCb = onSectionGeneratedRef.current;
        const workoutCb = onWorkoutGeneratedRef.current;
        if (sectionCb) {
          sectionCb(action.payload);
        } else if (workoutCb) {
          // Fallback: wrap the section payload as a single-section workout
          // so the builder's processGeneratedWorkout can handle it
          try {
            const workout = convertSectionPayloadToGeneratedWorkout(action.payload);
            console.log('[AIBuilderChat] Converted section→workout:', workout.title, 'exercises:', workout.sections[0]?.exercises?.length || 0);
            workoutCb(workout);
          } catch (err) {
            console.error('[AIBuilderChat] Failed to convert section payload:', err);
          }
        } else {
          console.warn('[AIBuilderChat] create_section action but no callbacks available');
        }
      }
    },
    [], // stable — uses refs for callbacks
  );

  // Memoize options so useAIChat's sendMessage isn't recreated every render.
  // handleAction is already stable (empty deps, uses refs).
  const chatOptions = useMemo(() => ({
    skipUrlUpdate: true,
    onAction: handleAction,
  }), [handleAction]);

  const {
    messages,
    isStreaming,
    error: chatError,
    sendMessage,
    stopStreaming,
  } = useAIChat(chatOptions);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use requestAnimationFrame to ensure the DOM has updated before scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [messages, isStreaming]);

  // ── File handling ────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setFileError('Only PDF files are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setFileError(`PDF must be under ${MAX_PDF_SIZE_MB}MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const arrayBuffer = ev.target?.result;
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        setFileError('Failed to read file.');
        setSelectedFile(null);
        return;
      }
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      setPdfBase64(btoa(binary));
    };
    reader.onerror = () => {
      setFileError('Failed to read PDF file.');
      setSelectedFile(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPdfBase64(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Send ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    // Context prefix on every message (full on first, reminder on follow-ups)
    const isFollowUp = messages.length > 0;
    const contextPrefix = buildContextPrefix(isFollowUp);
    const pdfSuffix = pdfBase64 ? `\n\nPDF Content (base64):\n${pdfBase64}` : '';

    // After the first message, include the current builder state so the AI
    // knows what the user has built/edited manually since the last message.
    let payloadSuffix = '';
    if (messages.length > 0 && getCurrentPayload) {
      try {
        const currentState = getCurrentPayload();
        if (currentState) {
          payloadSuffix = `\n\n[Current ${builderType} state]:\n${JSON.stringify(currentState)}`;
        }
      } catch {
        // Silently ignore serialization errors
      }
    }

    const fullMessage = contextPrefix + text + pdfSuffix + payloadSuffix;

    // Show just the user's text in the UI, not the context prefix
    const displayText = text + (selectedFile ? ` 📎 ${selectedFile.name}` : '');

    setInputText('');
    if (pdfBase64) {
      setSelectedFile(null);
      setPdfBase64(null);
    }

    try {
      await sendMessage(
        fullMessage,
        {
          currentPage: builderType === 'section'
            ? '/library/training/sections/new'
            : '/library/training/workouts/new',
        },
        displayText,
      );
    } catch (err) {
      // Error is already captured in useAIChat's error state
      console.error('[AIBuilderChat] sendMessage failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUseExample = () => {
    if (examplePrompt) {
      setInputText(examplePrompt);
      textareaRef.current?.focus();
    }
  };

  const hasMessages = messages.length > 0;
  const displayError = fileError || chatError;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {hasMessages ? (
        /* ── Chat mode ─────────────────────────────────────────── */
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0" ref={scrollContainerRef}>
            <div className="flex flex-col space-y-3 px-3 py-3 pe-2">
              {messages.map((message: ChatMessage) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <div
                    key={message.id}
                    className={cn(
                      message.role === 'user' ? 'flex justify-end' : 'flex justify-start',
                    )}
                  >
                    {isAssistant ? (
                      <div className="w-full space-y-2">
                        {message.toolCalls && message.toolCalls.length > 0 && !message.content && (
                          <ToolStatusList toolCalls={message.toolCalls} compact />
                        )}
                        {message.content ? (
                          <div className="prose prose-xs dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground text-foreground max-w-none text-xs">
                            <Markdown className="space-y-3">{message.content}</Markdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Generating...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-[85%] text-end">
                        <span className="bg-primary text-primary-foreground inline-flex rounded-xl py-1.5 px-3 text-start text-xs whitespace-pre-wrap">
                          {message.content}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error display */}
          {displayError && (
            <div className="flex items-center gap-2 mx-3 mb-1 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{displayError}</span>
              <button
                onClick={() => setFileError(null)}
                className="ml-auto shrink-0 hover:bg-destructive/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Chat input */}
          <div className="flex-shrink-0 px-3 pb-1 pt-2">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-background mb-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-transparent flex-shrink-0">
                  <Image src="/icons/pdf.png" alt="PDF" width={24} height={24} className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    PDF · {(selectedFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-1 rounded-md"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="bg-primary/10 w-full rounded-2xl p-1">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={builderType === 'section' ? t('library.refineSection') : t('library.refineWorkout')}
                rows={1}
                className="w-full resize-none bg-transparent px-3 py-2.5 text-xs outline-none min-h-[40px] max-h-[120px]"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!selectedFile || isStreaming}
                    className="hover:bg-secondary-foreground/10 flex size-7 items-center justify-center rounded-2xl disabled:opacity-50"
                  >
                    <Paperclip className="text-primary h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {isStreaming ? (
                    <Button
                      onClick={stopStreaming}
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full shrink-0"
                      aria-label="Stop generating"
                    >
                      <SquareIcon className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      size="icon"
                      className="h-7 w-7 rounded-full shrink-0"
                      aria-label="Send message"
                    >
                      <ArrowUpIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── Initial state (before first message) ──────────────── */
        <div className="flex flex-col h-full">
          {/* Sphere animation + title */}
          <div className="flex flex-col items-center gap-4 flex-shrink-0 pb-4 px-4">
            <div className="relative flex items-center justify-center w-36 h-36 -mb-4">
              {aiAnimationData && (
                <Lottie
                  className="w-full h-full"
                  animationData={aiAnimationData}
                  loop
                  autoplay
                />
              )}
            </div>
            <h2 className="text-xl font-semibold text-center">{t('library.athliAiBuilder')}</h2>
            <p className="text-sm text-foreground text-center max-w-md">
              {t('library.dragDropPdf')}
            </p>
          </div>

          {/* Prompt input area */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 px-4">
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">
                  {builderType === 'section' ? t('library.letsBuildSection') : t('library.letsBuildWorkout')}
                </h3>
              </div>

              {/* Error display */}
              {displayError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{displayError}</span>
                  <button
                    onClick={() => setFileError(null)}
                    className="ml-auto shrink-0 hover:bg-destructive/20 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="relative flex-1 min-h-0 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={builderType === 'section' ? t('library.sectionPromptPlaceholder') : t('library.workoutPromptPlaceholder')}
                  className="resize-none text-sm flex-1 min-h-[200px] pb-12 bg-muted/30 w-full rounded-xl border px-4 py-3 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
                {!inputText.trim() && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    {examplePrompt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseExample}
                        className="h-7 px-3 text-xs"
                      >
                        {t('library.useExample')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!selectedFile}
                      className="h-7 px-3 text-xs gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                  </div>
                )}
              </div>

              {/* PDF attachment */}
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-background mt-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-transparent flex-shrink-0">
                    <Image src="/icons/pdf.png" alt="PDF" width={24} height={24} className="object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      PDF · {(selectedFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-1 rounded-md"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Send button */}
              <div className="pt-2 mt-auto pb-1">
                <Button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isStreaming}
                  className="w-full gap-2 h-11 font-bold shadow-lg"
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t('library.generate')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {t('library.generate')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

// ── Payload conversion ─────────────────────────────────────────────

interface RawExercise {
  prescribedExerciseId?: string;
  id?: string;
  name?: string;
  column1Label?: string;
  column1Value?: string;
  column2Label?: string;
  column2Value?: string;
  category?: string;
  sets?: number;
  rest?: number;
}

interface RawSection {
  name?: string;
  type?: string;
  exercises?: RawExercise[];
  // Section-type-specific config fields
  roundDurationSec?: number;
  workSec?: number;
  restSec?: number;
  rounds?: number;
  intervalSec?: number;
  durationMin?: number;
}

interface RawPayload {
  name?: string;
  description?: string;
  type?: string;
  difficulty?: string;
  sections?: RawSection[];
}

/** Convert a flat exercise from the AI payload into the grouped format expected by processGeneratedWorkout */
function convertRawExercise(ex: RawExercise) {
  return {
    isSuperset: false,
    exercises: [
      {
        id: ex.prescribedExerciseId || ex.id || '',
        name: ex.name || 'Unknown exercise',
        exerciseType: determineExerciseType(ex),
        equipment: ex.category ? [ex.category] : [],
        sets: generateSetsFromExercise(ex),
      },
    ],
  };
}

/** Convert AI action payload to GeneratedWorkout format with validation */
function convertPayloadToGeneratedWorkout(payload: unknown): GeneratedWorkout {
  const p = payload as RawPayload;

  if (!p || typeof p !== 'object') {
    throw new Error('Invalid workout payload: expected an object');
  }

  const sections = Array.isArray(p.sections)
    ? p.sections.map((section, index) => ({
        id: `sec_${section.type || 'regular'}_${index + 1}`,
        name: section.name || '',
        type: section.type || 'regular',
        exercises: Array.isArray(section.exercises)
          ? section.exercises.map((ex) => convertRawExercise(ex))
          : [],
        ...(section.roundDurationSec != null && { roundDurationSec: section.roundDurationSec }),
        ...(section.workSec != null && { workSec: section.workSec }),
        ...(section.restSec != null && { restSec: section.restSec }),
        ...(section.rounds != null && { rounds: section.rounds }),
        ...(section.intervalSec != null && { intervalSec: section.intervalSec }),
        ...(section.durationMin != null && { durationMin: section.durationMin }),
      }))
    : [];

  const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0);
  console.log('[convertPayloadToGeneratedWorkout]', p.name, '→', sections.length, 'sections,', totalExercises, 'exercises');

  return {
    title: p.name || 'Generated Workout',
    description: p.description || '',
    type: p.type || 'weightlifting',
    difficulty: p.difficulty || 'all_levels',
    sections,
  };
}

/** Convert a single AI section payload to GeneratedWorkout format (wraps as one-section workout) */
function convertSectionPayloadToGeneratedWorkout(payload: unknown): GeneratedWorkout {
  const p = payload as RawSection & { description?: string };

  if (!p || typeof p !== 'object') {
    throw new Error('Invalid section payload: expected an object');
  }

  const sectionType = p.type || 'regular';
  const exercises = Array.isArray(p.exercises)
    ? p.exercises.map((ex) => convertRawExercise(ex))
    : [];

  console.log('[convertSectionPayloadToGeneratedWorkout]', p.name, '→', exercises.length, 'exercises');

  return {
    title: p.name || 'Generated Section',
    description: p.description || '',
    type: 'strength',
    difficulty: 'all_levels',
    sections: [
      {
        id: `sec_${sectionType}_1`,
        name: p.name || '',
        type: sectionType,
        exercises,
        ...(p.roundDurationSec != null && { roundDurationSec: p.roundDurationSec }),
        ...(p.workSec != null && { workSec: p.workSec }),
        ...(p.restSec != null && { restSec: p.restSec }),
        ...(p.rounds != null && { rounds: p.rounds }),
        ...(p.intervalSec != null && { intervalSec: p.intervalSec }),
        ...(p.durationMin != null && { durationMin: p.durationMin }),
      },
    ],
  };
}

function determineExerciseType(ex: RawExercise): string {
  const col1 = (ex.column1Label || '').toLowerCase();
  const col2 = (ex.column2Label || '').toLowerCase();
  if (['minutes', 'seconds', 'km', 'm'].includes(col1)) return 'distance_duration';
  if (['kg', 'lbs'].includes(col2)) return 'weight_reps';
  return 'reps';
}

function generateSetsFromExercise(ex: RawExercise): Array<{
  setNumber: number;
  isDropset: boolean;
  weight: number | null;
  reps: number | null;
  distance: number | null;
  durationSec: number | null;
  restSec: number;
}> {
  const numSets = Math.max(1, Math.min(ex.sets || 3, 20)); // Clamp between 1–20
  const reps = ex.column1Value ? parseInt(ex.column1Value, 10) || 10 : 10;
  const weight = ex.column2Value ? parseFloat(ex.column2Value) : null;
  const rest = Math.max(0, ex.rest || 60);

  return Array.from({ length: numSets }, (_, i) => ({
    setNumber: i + 1,
    isDropset: false,
    weight: weight && !isNaN(weight) ? weight : null,
    reps,
    distance: null,
    durationSec: null,
    restSec: rest,
  }));
}
