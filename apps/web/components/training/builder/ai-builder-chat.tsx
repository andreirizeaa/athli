'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowUpIcon,
  BrainCog,
  FileText,
  Loader2,
  Paperclip,
  Sparkles,
  SquareIcon,
  X,
} from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Build context message for the AI (only prepended to the first message)
  const buildContextPrefix = useCallback(() => {
    if (builderType === 'section' && sectionType) {
      const desc = SECTION_TYPE_DESCRIPTIONS[sectionType] || sectionType;
      return (
        `I am building a ${desc} section. ` +
        `Generate exercises formatted for a ${sectionType.toUpperCase()} section. ` +
        `Use the create_section tool with type="${sectionType}".\n\n`
      );
    }
    if (builderType === 'workout') {
      return 'I am building a workout. Use the create_workout tool.\n\n';
    }
    return '';
  }, [builderType, sectionType]);

  // Handle AI actions (workout/section created)
  const handleAction = useCallback(
    (action: ActionPayload) => {
      if (action.type === 'create_workout' && onWorkoutGenerated && action.payload) {
        try {
          const workout = convertPayloadToGeneratedWorkout(action.payload);
          onWorkoutGenerated(workout);
          onSwitchToManual?.();
        } catch (err) {
          console.error('[AIBuilderChat] Failed to convert workout payload:', err);
        }
      } else if (action.type === 'create_section' && onSectionGenerated && action.payload) {
        onSectionGenerated(action.payload);
        onSwitchToManual?.();
      }
    },
    [onWorkoutGenerated, onSectionGenerated, onSwitchToManual],
  );

  const {
    messages,
    isStreaming,
    error: chatError,
    sendMessage,
    stopStreaming,
  } = useAIChat({
    skipUrlUpdate: true,
    onAction: handleAction,
  });

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

    // Context prefix only on the first message
    const contextPrefix = messages.length === 0 ? buildContextPrefix() : '';
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
      {/* Messages area or empty state */}
      <div className="flex-1 overflow-y-auto min-h-0" ref={scrollContainerRef}>
        {!hasMessages ? (
          <div className="flex flex-col items-center gap-4 pt-8 pb-4 px-4">
            <div className="relative flex items-center justify-center py-6 px-6">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
              <div className="absolute inset-4 rounded-full bg-primary/20 blur-sm" />
              <div className="relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg shadow-primary/10">
                <BrainCog className="h-10 w-10" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-center">{t('library.athliAiBuilder')}</h2>
            <p className="text-sm text-foreground text-center max-w-md">
              {builderType === 'section' && sectionType
                ? t('library.dragDropPdf') + ` (${sectionType.toUpperCase()} section)`
                : t('library.dragDropPdf')}
            </p>
            {sectionType && sectionType !== 'regular' && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>
                  AI will generate exercises for <strong>{sectionType.toUpperCase()}</strong> format
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-4">
            {messages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted',
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="flex flex-col gap-2">
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <ToolStatusList toolCalls={message.toolCalls} />
                    )}
                    {message.content ? (
                      <Markdown>{message.content}</Markdown>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
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

      {/* Input area */}
      <div className="flex-shrink-0 border-t p-3 space-y-2">
        {/* PDF attachment preview */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
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

        {/* Input row */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasMessages
                  ? 'Refine your workout...'
                  : t('library.workoutPromptPlaceholder')
              }
              rows={hasMessages ? 1 : 4}
              className={cn(
                'w-full resize-none rounded-xl border bg-muted/30 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/50 transition-all',
                hasMessages ? 'min-h-[44px] max-h-[120px]' : 'min-h-[120px]',
              )}
            />
            {!hasMessages && !inputText.trim() && (
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

          {/* Send/Stop button */}
          {isStreaming ? (
            <Button
              onClick={stopStreaming}
              size="icon"
              variant="outline"
              className="h-11 w-11 rounded-xl shrink-0"
              aria-label="Stop generating"
            >
              <SquareIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!inputText.trim()}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              aria-label="Send message"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* PDF attach button in chat mode */}
        {hasMessages && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!selectedFile || isStreaming}
              className="h-7 px-2 text-xs gap-1"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach PDF
            </Button>
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
  type?: string;
  exercises?: RawExercise[];
}

interface RawPayload {
  name?: string;
  description?: string;
  type?: string;
  difficulty?: string;
  sections?: RawSection[];
}

/** Convert AI action payload to GeneratedWorkout format with validation */
function convertPayloadToGeneratedWorkout(payload: unknown): GeneratedWorkout {
  const p = payload as RawPayload;

  if (!p || typeof p !== 'object') {
    throw new Error('Invalid workout payload: expected an object');
  }

  return {
    title: p.name || 'Generated Workout',
    description: p.description || '',
    type: p.type || 'weightlifting',
    difficulty: p.difficulty || 'all_levels',
    sections: Array.isArray(p.sections)
      ? p.sections.map((section, index) => ({
          id: `sec_${section.type || 'regular'}_${index + 1}`,
          type: section.type || 'regular',
          exercises: Array.isArray(section.exercises)
            ? section.exercises
                .filter((ex) => ex.name) // Skip exercises without a name
                .map((ex) => ({
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
                }))
            : [],
        }))
      : [],
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
