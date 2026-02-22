"use client";
import { useTranslations } from "next-intl";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  Loader2,
  Dumbbell,
  Calendar,
  LayoutList,
  Target,
  AlertTriangle,
  MessageSquare,
  User,
  ClipboardList,
  BarChart3,
  ArrowUp,
  Plus,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { ActionType, getActionDisplayName } from '@/stores/ai-action-store';
import { AIWorkoutPayload, AISection, getWorkoutSummary } from '@/lib/ai-payload-transformer';

interface ActionCardProps {
  actionType: ActionType;
  payload: any;
  onConfirm: (modifiedPayload?: any) => Promise<void>;
  initialConfirmed?: boolean;
  className?: string;
}

export function ActionCard({ actionType, payload, onConfirm, initialConfirmed, className }: ActionCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const t = useTranslations();
  const [isConfirmed, setIsConfirmed] = useState(initialConfirmed ?? false);

  const handleConfirm = async () => {
    if (isConfirming || isConfirmed) return;

    setIsConfirming(true);
    try {
      await onConfirm();
      setIsConfirmed(true);
    } catch (error) {
      console.error('Failed to confirm action:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const buttonLabel = getActionDisplayName(actionType, payload);
  const Icon = getActionIcon(actionType);
  const isDraftMessage = actionType === 'draft_message';

  // Draft message has its own UI with editable textarea
  if (isDraftMessage) {
    return (
      <Card className={cn('mt-3 border-primary/20 bg-primary/5', className)}>
        <CardContent className="pt-2 pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DraftMessageCard
                payload={payload}
                onConfirm={onConfirm}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                setIsConfirming={setIsConfirming}
                setIsConfirmed={setIsConfirmed}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('mt-3 border-primary/20 bg-primary/5', className)}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <ActionSummary actionType={actionType} payload={payload} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 justify-end">
        <Button
          onClick={handleConfirm}
          disabled={isConfirming || isConfirmed}
          className={cn(
            isConfirmed && 'bg-green-600 hover:bg-green-600'
          )}
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isConfirmed ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Done
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function getActionIcon(actionType: ActionType) {
  switch (actionType) {
    case 'create_workout':
      return Dumbbell;
    case 'create_program':
      return Calendar;
    case 'create_section':
      return LayoutList;
    case 'assign_workout':
      return Calendar;
    case 'assign_metric_to_client':
      return BarChart3;
    case 'add_client_goal':
      return Target;
    case 'add_client_injury':
      return AlertTriangle;
    case 'draft_message':
      return MessageSquare;
    case 'update_client_profile':
      return User;
    case 'create_checkin_template':
      return ClipboardList;
    case 'create_metric':
      return BarChart3;
    default:
      return Dumbbell;
  }
}

// Generate letter label from index (A, B, C, ... Z, AA, AB, ...)
function getLetterLabel(index: number): string {
  let label = '';
  let num = index;
  do {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);
  return label;
}

// Exercise preview list for workout/section action cards
function ExercisePreviewList({ sections }: { sections: AISection[] }) {
  const items: { label: string; name: string; isLinkedToPrev: boolean }[] = [];
  let letterIndex = 0;

  sections.forEach((section) => {
    const isSuperset = section.type === 'superset';

    section.exercises.forEach((exercise, exIdx) => {
      if (isSuperset) {
        const letter = getLetterLabel(letterIndex);
        items.push({
          label: `${letter}${exIdx + 1}`,
          name: exercise.name,
          isLinkedToPrev: exIdx > 0,
        });
      } else {
        items.push({
          label: getLetterLabel(letterIndex),
          name: exercise.name,
          isLinkedToPrev: false,
        });
        if (exIdx < section.exercises.length - 1) {
          letterIndex++;
        }
      }
    });

    letterIndex++;
  });

  if (items.length === 0) return null;

  return (
    <div className="mt-2 pl-0.5">
      {items.map((item, index) => (
        <div key={index}>
          {item.isLinkedToPrev && (
            <div className="ml-[9px] h-1.5 w-0.5 bg-primary" />
          )}
          <div className="flex items-center gap-2.5 py-[3px]">
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
              <span className="text-[9px] font-bold leading-none text-primary-foreground">
                {item.label}
              </span>
            </div>
            <span className="text-xs text-foreground font-medium truncate">
              {item.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Question preview list for check-in template action cards
function QuestionPreviewList({ questions }: { questions: { question: string; type?: string }[] }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-2 pl-0.5">
      {questions.map((q, index) => (
        <div key={index} className="flex items-center gap-2.5 py-[3px]">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
            <span className="text-[9px] font-bold leading-none text-primary-foreground">
              {index + 1}
            </span>
          </div>
          <span className="text-xs text-foreground font-medium truncate">
            {q.question}
          </span>
        </div>
      ))}
    </div>
  );
}

// Draft message component with editable textarea - calls onConfirm with edited message
interface DraftMessageCardProps {
  payload: any;
  onConfirm: (modifiedPayload?: any) => Promise<void>;
  isConfirming: boolean;
  isConfirmed: boolean;
  setIsConfirming: (v: boolean) => void;
  setIsConfirmed: (v: boolean) => void;
}

function DraftMessageCard({
  payload,
  onConfirm,
  isConfirming,
  isConfirmed,
  setIsConfirming,
  setIsConfirmed,
}: DraftMessageCardProps) {
  const t = useTranslations();
  const [editedMessage, setEditedMessage] = useState(payload.message || '');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [textareaHeight, setTextareaHeight] = useState(36);
  const [maxHeightReached, setMaxHeightReached] = useState(36);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = useCallback(async () => {
    if (isConfirming || isConfirmed) return;
    if (!editedMessage.trim() && attachments.length === 0) return;

    setIsConfirming(true);
    try {
      await onConfirm({ ...payload, message: editedMessage, attachments });
      setIsConfirmed(true);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, isConfirmed, editedMessage, attachments, payload, onConfirm, setIsConfirming, setIsConfirmed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const canAddMoreAttachments = attachments.length < 4;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAttachments((prev) => {
      const remainingSlots = 4 - prev.length;
      if (remainingSlots === 0) return prev;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      return [...prev, ...filesToAdd];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // WhatsApp-like auto-resize: grows but doesn't shrink, resets when empty
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const hasAttach = attachments.length > 0;
    const isEmpty = !textarea.value.trim();

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;

    const minHeight = hasAttach ? 60 : 36;
    const maxHeight = 120;
    const contentHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));

    if (isEmpty && !hasAttach) {
      textarea.style.height = `${minHeight}px`;
      setTextareaHeight(minHeight);
      setMaxHeightReached(minHeight);
    } else {
      const newHeight = Math.max(maxHeightReached, contentHeight);
      textarea.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
      setMaxHeightReached(newHeight);
    }
  }, [attachments.length, maxHeightReached]);

  const isInputEmpty = !editedMessage.trim() && attachments.length === 0;

  const showExpandedInput =
    textareaHeight > 36 ||
    attachments.length > 0;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-foreground">
        Message for {payload.clientName}
      </h4>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/*,application/pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Inbox-style input bar */}
      <div
        className={cn(
          'relative flex flex-col bg-background px-2 py-0.5 transition-all duration-700 ease-in-out rounded-lg border border-input',
          !isConfirmed && 'focus-within:border-ring',
          isConfirmed && 'opacity-80',
        )}
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div
            className="mb-2 px-3 py-2 bg-background/50"
            style={{ borderRadius: '18px' }}
          >
            <div className="flex overflow-x-auto gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="relative group flex-shrink-0">
                  <div className="bg-muted rounded-lg p-1.5 relative">
                    <div className="w-20 h-20 flex flex-col items-center justify-center overflow-hidden rounded-md relative">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 p-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30">
                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <p className="text-[9px] text-center text-muted-foreground line-clamp-2 w-full break-words px-0.5">
                            {file.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Overlay with blur and X icon — hidden when confirmed */}
                    {!isConfirmed && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="h-8 w-8 text-primary" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Textarea — full width above the icon row */}
        <Textarea
          ref={textareaRef}
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder={t('common.editMessage')}
          disabled={isConfirming || isConfirmed}
          className="w-full resize-none min-h-[60px] max-h-[120px] py-1.5 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none text-sm"
          rows={3}
        />

        {/* Bottom row: + on left, send/check on right */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isConfirming || isConfirmed || !canAddMoreAttachments}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10',
              (isConfirmed || !canAddMoreAttachments) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {isConfirmed ? (
            <div className="h-7 w-7 p-0 rounded-full flex-shrink-0 flex items-center justify-center !bg-green-600" style={{ backgroundColor: 'rgb(22 163 74)' }}>
              <Check className="size-3.5 text-white" />
            </div>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={isInputEmpty || isConfirming}
              className={cn(
                'gap-2 !text-primary-foreground [&_svg]:!text-primary-foreground h-7 w-7 p-0 rounded-full transition-all duration-200',
                isInputEmpty || isConfirming
                  ? '!bg-muted-foreground/30'
                  : '!bg-primary hover:!bg-primary/90'
              )}
            >
              {isConfirming ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUp className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActionSummaryProps {
  actionType: ActionType;
  payload: any;
}

function ActionSummary({ actionType, payload }: ActionSummaryProps) {
  if (actionType === 'create_workout') {
    const workoutPayload = payload as AIWorkoutPayload;
    const summary = getWorkoutSummary(workoutPayload);

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{workoutPayload.name}</h4>
        {workoutPayload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {workoutPayload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {summary.exerciseCount} exercises
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {summary.sectionCount} sections
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
            {summary.difficulty}
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
            {summary.type}
          </span>
        </div>
        {workoutPayload.sections?.length > 0 && (
          <ExercisePreviewList sections={workoutPayload.sections} />
        )}
      </div>
    );
  }

  if (actionType === 'create_section') {
    const sectionPayload = payload as any;
    const exerciseCount = sectionPayload.exercises?.length || 0;

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{sectionPayload.name}</h4>
        {sectionPayload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {sectionPayload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {exerciseCount} exercises
          </span>
          {sectionPayload.type && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
              {sectionPayload.type}
            </span>
          )}
        </div>
        {sectionPayload.exercises?.length > 0 && (
          <ExercisePreviewList sections={[{ name: sectionPayload.name, type: sectionPayload.type, exercises: sectionPayload.exercises }]} />
        )}
      </div>
    );
  }

  if (actionType === 'assign_workout') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Assign &quot;{payload.workoutName}&quot; to {payload.clientName}
        </h4>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {new Date(payload.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {payload.time && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              {payload.time}
            </span>
          )}
          {payload.isRecurring && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              Recurring
            </span>
          )}
        </div>
      </div>
    );
  }

  if (actionType === 'assign_metric_to_client') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Assign &quot;{payload.metricName}&quot; to {payload.clientName}
        </h4>
        <p className="text-sm text-muted-foreground">
          Client will be able to track this metric in their app
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
            {payload.metricType}
          </span>
          {payload.metricUnit && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              Unit: {payload.metricUnit}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (actionType === 'add_client_goal') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Add goal for {payload.clientName}
        </h4>
        <p className="text-sm text-muted-foreground">
          {payload.goalType}{payload.targetValue ? `: ${payload.targetValue}` : ''}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {payload.targetDate && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Target: {new Date(payload.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (actionType === 'add_client_injury') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Record injury for {payload.clientName}
        </h4>
        <p className="text-sm text-muted-foreground">
          {payload.injuryType} - {payload.bodyPart}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize",
            payload.severity === 'severe' ? 'bg-red-100 text-red-700' :
            payload.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          )}>
            {payload.severity || 'moderate'}
          </span>
        </div>
        {payload.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {payload.notes}
          </p>
        )}
      </div>
    );
  }

  // draft_message is handled by DraftMessageCard directly in ActionCard
  if (actionType === 'draft_message') {
    return null; // Handled separately
  }

  if (actionType === 'update_client_profile') {
    const updates = payload.updates || {};
    const updateEntries = Object.entries(updates).filter(([_, v]) => v !== undefined && v !== null);

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">
          Update {payload.clientName}&apos;s profile
        </h4>
        <div className="flex flex-wrap gap-2 pt-1">
          {updateEntries.map(([key, value]) => (
            <span key={key} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
              {key}: {String(value)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (actionType === 'create_checkin_template') {
    const questionCount = payload.questions?.length || 0;

    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{payload.name}</h4>
        {payload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {payload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {questionCount} question{questionCount !== 1 ? 's' : ''}
          </span>
        </div>
        {payload.questions?.length > 0 && (
          <QuestionPreviewList questions={payload.questions} />
        )}
      </div>
    );
  }

  if (actionType === 'create_metric') {
    return (
      <div className="space-y-1">
        <h4 className="font-medium text-foreground">{payload.name}</h4>
        {payload.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {payload.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
            {payload.metricType}
          </span>
          {payload.unit && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              Unit: {payload.unit}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default for other action types
  return (
    <div className="space-y-1">
      <h4 className="font-medium text-foreground">{payload.name || 'Unnamed'}</h4>
      {payload.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {payload.description}
        </p>
      )}
    </div>
  );
}
