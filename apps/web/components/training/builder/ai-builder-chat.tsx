'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
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

interface AIBuilderChatProps {
  /** Section type for context (e.g., 'amrap', 'tabata'). Undefined for workout builder. */
  sectionType?: string;
  /** Callback when AI generates a workout payload */
  onWorkoutGenerated?: (workout: GeneratedWorkout) => void;
  /** Callback when AI generates a section payload */
  onSectionGenerated?: (payload: any) => void;
  /** Called when switching back to manual mode after generation */
  onSwitchToManual?: () => void;
  /** Current builder context — 'section' or 'workout' */
  builderType: 'section' | 'workout';
  /** Example prompt text */
  examplePrompt?: string;
}

export function AIBuilderChat({
  sectionType,
  onWorkoutGenerated,
  onSectionGenerated,
  onSwitchToManual,
  builderType,
  examplePrompt,
}: AIBuilderChatProps) {
  const t = useTranslations();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build context message for the AI
  const buildContextPrefix = useCallback(() => {
    const parts: string[] = [];

    if (builderType === 'section' && sectionType) {
      const typeDescriptions: Record<string, string> = {
        regular: 'Regular (standard sets with reps, weight, rest)',
        amrap: 'AMRAP (As Many Rounds/Reps As Possible within a time limit)',
        tabata: 'Tabata (20s work, 10s rest, 8 rounds)',
        hiit: 'HIIT (High-Intensity Interval Training with customizable work/rest)',
        emom: 'EMOM (Every Minute On the Minute)',
        circuits: 'Circuit training (multiple rounds)',
        auxiliary: 'Auxiliary (warm-up, cool-down, etc.)',
      };
      parts.push(
        `I am building a ${typeDescriptions[sectionType] || sectionType} section. ` +
        `Generate exercises formatted for a ${sectionType.toUpperCase()} section. ` +
        `Use the create_section tool with type="${sectionType}".`
      );
    } else if (builderType === 'workout') {
      parts.push('I am building a workout. Use the create_workout tool.');
    }

    return parts.length > 0 ? parts.join('\n') + '\n\n' : '';
  }, [builderType, sectionType]);

  // Handle AI actions (workout/section created)
  const handleAction = useCallback(
    (action: ActionPayload) => {
      if (action.type === 'create_workout' && onWorkoutGenerated && action.payload) {
        const workout = convertPayloadToGeneratedWorkout(action.payload);
        onWorkoutGenerated(workout);
        onSwitchToManual?.();
      } else if (action.type === 'create_section' && onSectionGenerated && action.payload) {
        onSectionGenerated(action.payload);
        onSwitchToManual?.();
      }
    },
    [onWorkoutGenerated, onSectionGenerated, onSwitchToManual]
  );

  const {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
  } = useAIChat({
    skipUrlUpdate: true,
    onAction: handleAction,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        setPdfBase64(btoa(binary));
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPdfBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    // Build the full message with context
    const contextPrefix = messages.length === 0 ? buildContextPrefix() : '';
    const pdfSuffix = pdfBase64 ? `\n\nPDF Content (base64):\n${pdfBase64}` : '';
    const fullMessage = contextPrefix + text + pdfSuffix;

    setInputText('');
    // Clear PDF after first send
    if (pdfBase64) {
      setSelectedFile(null);
      setPdfBase64(null);
    }

    await sendMessage(fullMessage, {
      currentPage: builderType === 'section'
        ? '/library/training/sections/new'
        : '/library/training/workouts/new',
    });
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages area or empty state */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasMessages ? (
          /* Empty state */
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
          /* Chat messages */
          <div className="flex flex-col gap-3 px-4 py-4">
            {messages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted'
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="flex flex-col gap-2">
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <ToolStatusList toolCalls={message.toolCalls} />
                    )}
                    <Markdown>{message.content}</Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <div className="mr-auto max-w-[85%] rounded-2xl bg-muted px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t p-3 space-y-2">
        {/* PDF attachment */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-transparent flex-shrink-0">
              <Image src="/icons/pdf.png" alt="PDF" width={24} height={24} className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-muted-foreground">PDF</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-1 rounded-md"
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
                hasMessages ? 'min-h-[44px] max-h-[120px]' : 'min-h-[120px]'
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
            <Button onClick={stopStreaming} size="icon" variant="outline" className="h-11 w-11 rounded-xl shrink-0">
              <SquareIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!inputText.trim()}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Actions row */}
        {hasMessages && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!selectedFile}
              className="h-7 px-2 text-xs gap-1"
            >
              <Paperclip className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

/** Convert AI action payload to GeneratedWorkout format */
function convertPayloadToGeneratedWorkout(payload: any): GeneratedWorkout {
  return {
    title: payload.name || 'Generated Workout',
    description: payload.description || '',
    type: payload.type || 'weightlifting',
    difficulty: payload.difficulty || 'all_levels',
    sections: (payload.sections || []).map((section: any, index: number) => ({
      id: `sec_${section.type || 'regular'}_${index + 1}`,
      type: section.type || 'regular',
      exercises: (section.exercises || []).map((ex: any) => ({
        isSuperset: false,
        exercises: [{
          id: ex.prescribedExerciseId || ex.id,
          name: ex.name,
          exerciseType: determineExerciseType(ex),
          equipment: ex.category ? [ex.category] : [],
          sets: generateSetsFromExercise(ex),
        }],
      })),
    })),
  };
}

function determineExerciseType(ex: any): string {
  const col1 = ex.column1Label?.toLowerCase() || '';
  const col2 = ex.column2Label?.toLowerCase() || '';
  if (col1 === 'minutes' || col1 === 'seconds' || col1 === 'km' || col1 === 'm') return 'distance_duration';
  if (col2 === 'kg' || col2 === 'lbs') return 'weight_reps';
  return 'reps';
}

function generateSetsFromExercise(ex: any): any[] {
  const sets = [];
  const numSets = ex.sets || 3;
  const reps = parseInt(ex.column1Value) || 10;
  const weight = ex.column2Value ? parseFloat(ex.column2Value) : null;
  const rest = ex.rest || 60;
  for (let i = 1; i <= numSets; i++) {
    sets.push({ setNumber: i, isDropset: false, weight, reps, distance: null, durationSec: null, restSec: rest });
  }
  return sets;
}
