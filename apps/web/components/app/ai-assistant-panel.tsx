'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Expand,
  Paperclip,
  SquarePen,
  SquareIcon,
  X,
} from 'lucide-react';
import { CopyIcon } from '@radix-ui/react-icons';
import Lottie from 'lottie-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Input,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/custom/prompt/input';
import { ChatContainer } from '@/components/ui/custom/prompt/chat-container';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@/components/ui/custom/prompt/message';
import { Markdown } from '@/components/ui/custom/prompt/markdown';
import { PromptLoader } from '@/components/ui/custom/prompt/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import { useAIPanel } from '@/lib/providers/ai-panel-provider';
import { useAiUsage } from '@/hooks/use-ai-usage';
import { useAIChat } from '@/hooks/use-ai-chat';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useCoachWorkouts } from '@/hooks/use-coach-workouts';
import { ToolStatus, ToolStatusList } from '@/app/(app)/assistant/components/tool-status';
import { ActionCard } from '@/app/(app)/assistant/components/action-card';
import { AIChart } from '@/app/(app)/assistant/components/ai-chart';
import { ClientSelectCards } from '@/app/(app)/assistant/components/client-select-cards';
import { transformWorkoutPayload, transformSectionPayload } from '@/lib/ai-payload-transformer';
import { ActionType, getActionRedirectUrl } from '@/stores/ai-action-store';
import { assignWorkout } from '@/api/client/client-training-service';
import { assignMetric } from '@/api/client/client-metric-service';
import { createAthleteGoal, createAthleteInjury } from '@/api/client/client-service';
import { createMetric } from '@/api/coach/coach-metric-service';
import { addCheckIn } from '@/api/coach/coach-check-in-service';
import { fetchChats } from '@/api/ai/ai-chat-history-service';

type AIAssistantPanelProps = {
  isOpen: boolean;
};

export function AIAssistantPanel({ isOpen }: AIAssistantPanelProps) {
  const t = useTranslations();
  const router = useRouter();
  const { setIsOpen } = useAIPanel();
  const queryClient = useQueryClient();

  // Panel-local chat state
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { checkBeforePrompt, remaining, isLimited, hasReachedLimit } = useAiUsage();
  const { createWorkout } = useCoachWorkouts();
  const { user } = useUserProfile();

  // Fetch chat list for dropdown
  const { data: chats = [] } = useQuery({
    queryKey: ['ai-chats'],
    queryFn: fetchChats,
    refetchInterval: 30_000,
  });

  // AI chat hook — skipUrlUpdate since this is a side panel
  const {
    chatId: activeChatId,
    messages,
    isStreaming,
    isLoadingHistory,
    currentToolCall,
    error,
    sendMessage,
    stopStreaming,
    clearChat,
    markClientSelected,
    markActionConfirmed,
  } = useAIChat({ chatId: currentChatId, skipUrlUpdate: true });

  const hasStartedChat = messages.length > 0 || !!currentChatId;

  // Find current chat title from the list
  const currentChatTitle = chats.find((c) => c.id === activeChatId)?.title;

  // Load animation
  useEffect(() => {
    fetch('/animations/ai-sphere-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load animation:', err));
  }, []);

  // Show error toast
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure panel animation has started
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── File handling ──────────────────────────────────────────────────

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles((prev) => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  // ── Send message ───────────────────────────────────────────────────

  const handleSendMessage = useCallback(async () => {
    if (isStreaming || !prompt.trim()) return;

    if (isLimited) {
      const { allowed, message } = await checkBeforePrompt();
      if (!allowed) {
        toast.error(message || 'Daily AI prompt limit reached. Upgrade for unlimited access.');
        return;
      }
    }

    const messageToSend = prompt.trim();
    setPrompt('');
    setFiles([]);

    await sendMessage(messageToSend, { currentPage: window.location.pathname });
  }, [prompt, isStreaming, sendMessage, isLimited, checkBeforePrompt]);

  // ── Chat switching ─────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    clearChat();
    setCurrentChatId(undefined);
    setDropdownOpen(false);
  }, [clearChat]);

  const handleSwitchChat = useCallback(
    (id: string) => {
      clearChat();
      setCurrentChatId(id);
      setDropdownOpen(false);
    },
    [clearChat],
  );

  // ── Confirm action ─────────────────────────────────────────────────

  const handleConfirmAction = useCallback(
    async (actionType: ActionType, payload: any, modifiedPayload?: any) => {
      const finalPayload = modifiedPayload || payload;
      try {
        if (actionType === 'create_workout') {
          const apiPayload = transformWorkoutPayload(payload);
          if (payload.clientId) {
            const { assignWorkout: assignClientWorkout } = await import(
              '@/api/client/client-training-service'
            );
            const date = payload.date || new Date().toISOString().split('T')[0];
            await assignClientWorkout({
              clientId: payload.clientId,
              coachId: user?.id || '',
              date,
              workoutPayload: apiPayload,
              isNew: true,
            });
            toast.success(`Workout assigned to ${payload.clientName || 'client'}!`);
          } else {
            await createWorkout(apiPayload as any);
            toast.success(t('toasts.workoutAddedToLibrary'));
          }
          setTimeout(() => router.push(getActionRedirectUrl(actionType, payload)), 500);
        } else if (actionType === 'create_section') {
          transformSectionPayload(payload);
          toast.info(t('toasts.sectionCreationComingSoon'));
        } else if (actionType === 'assign_workout') {
          await assignWorkout({
            workoutId: payload.workoutId,
            clientId: payload.clientId,
            date: payload.date,
            coachId: user?.id,
          });
          toast.success(`Workout assigned to ${payload.clientName || 'client'}!`);
          setTimeout(() => router.push(`/athletes/${payload.clientId}/training`), 500);
        } else if (actionType === 'assign_metric_to_client') {
          await assignMetric({
            clientId: payload.clientId,
            coachId: user?.id!,
            metricIds: [payload.metricId],
            schedule_config: { type: 'metric', frequency: 'daily' },
          });
          toast.success(`${payload.metricName} assigned to ${payload.clientName}!`);
          setTimeout(() => router.push(getActionRedirectUrl(actionType, payload)), 500);
        } else if (actionType === 'add_client_goal') {
          await createAthleteGoal(payload.clientId, user?.id!, {
            goal: payload.goalType,
            target_date: payload.targetDate || null,
            achieved: false,
            details: payload.description || '',
          });
          toast.success(`Goal added for ${payload.clientName}!`);
          setTimeout(() => router.push(getActionRedirectUrl(actionType, payload)), 500);
        } else if (actionType === 'add_client_injury') {
          await createAthleteInjury(payload.clientId, user?.id!, {
            injury: `${payload.injuryType} - ${payload.bodyPart}`,
            date: payload.dateOccurred || null,
            details: `Severity: ${payload.severity || 'moderate'}${payload.notes ? `. ${payload.notes}` : ''}`,
          });
          toast.success(`Injury recorded for ${payload.clientName}!`);
          setTimeout(() => router.push(getActionRedirectUrl(actionType, payload)), 500);
        } else if (actionType === 'draft_message') {
          const { broadcastMessage } = await import('@/lib/messaging/messaging-api-client');
          const messageId = uuidv4();
          const idempotencyKey = uuidv4();
          const hasAttachments = (finalPayload.attachments?.length ?? 0) > 0;

          const broadcastResult = await broadcastMessage({
            clientIds: [finalPayload.clientId],
            content: finalPayload.message,
            attachmentCount: hasAttachments ? finalPayload.attachments.length : 0,
            messageIds: [messageId],
            idempotencyKeys: [idempotencyKey],
          });

          if (hasAttachments && broadcastResult.results.length > 0) {
            const { uploadAttachments } = await import('@/lib/messaging/upload-attachments');
            const { conversationId, messageId: realMessageId } = broadcastResult.results[0];
            const convertToBase64 = (file: File): Promise<string> =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            const getAttachmentType = (
              mimeType: string,
            ): 'image' | 'video' | 'pdf' | 'audio' => {
              if (mimeType.startsWith('image/')) return 'image';
              if (mimeType.startsWith('video/')) return 'video';
              if (mimeType === 'application/pdf') return 'pdf';
              if (mimeType.startsWith('audio/')) return 'audio';
              return 'image';
            };
            const attachmentsWithData = await Promise.all(
              finalPayload.attachments.map(async (file: File) => ({
                name: file.name,
                data: await convertToBase64(file),
                type: file.type,
                size: file.size,
                attachmentType: getAttachmentType(file.type),
              })),
            );
            const result = await uploadAttachments({
              conversationId,
              messageId: realMessageId,
              attachments: attachmentsWithData,
            });
            if (result.failedCount > 0) {
              console.warn('[draft_message] Some attachments failed:', result.errors);
            }
          }
          toast.success(`Message sent to ${finalPayload.clientName}!`);
          setTimeout(() => router.push(`/inbox/${finalPayload.clientId}/overview`), 500);
        } else if (actionType === 'update_client_profile') {
          toast.info(t('toasts.clientProfileNotSupported'));
        } else if (actionType === 'create_checkin_template') {
          const normalizeType = (type: string): string => {
            const lowered = type?.toLowerCase().replace(/[^a-z]/g, '') || '';
            const typeMap: Record<string, string> = {
              text: 'text',
              number: 'number',
              rating: 'rating',
              yesno: 'yesNo',
              multiplechoice: 'multipleChoice',
              scale: 'scale',
              date: 'date',
              images: 'images',
              videos: 'videos',
              signature: 'signature',
              progressphoto: 'progressPhoto',
              metrics: 'metrics',
            };
            return typeMap[lowered] || 'text';
          };
          if (payload.clientId) {
            const { createClientCheckIn } = await import('@/api/client/client-form-service');
            const questions = (payload.questions || []).map((q: any) => ({
              question: q.question,
              required: q.required || false,
              format: normalizeType(q.type),
              options: q.options || [],
              scaleFrom: q.scaleFrom,
              scaleTo: q.scaleTo,
            }));
            await createClientCheckIn({
              clientId: payload.clientId,
              coachId: user?.id || '',
              name: payload.name,
              description: payload.description || '',
              questions,
              scheduleConfig: payload.scheduleConfig || { type: 'check-in' },
              cronExpression: payload.cronExpression || '',
              status: 'live',
            });
            queryClient.invalidateQueries({ queryKey: ['client-check-ins'] });
            toast.success(
              `Check-in "${payload.name}" created for ${payload.clientName || 'client'}!`,
            );
          } else {
            const checkIn = await addCheckIn({
              name: payload.name,
              description: payload.description || '',
            });
            if (payload.questions?.length > 0) {
              const { addQuestion } = await import('@/api/coach/coach-check-in-service');
              for (const q of payload.questions) {
                await addQuestion({
                  formId: checkIn.id,
                  question: q.question,
                  required: q.required || false,
                  format: normalizeType(q.type),
                  options: q.options || [],
                  scaleFrom: q.scaleFrom,
                  scaleTo: q.scaleTo,
                });
              }
            }
            queryClient.invalidateQueries({ queryKey: ['coach-check-ins'] });
            toast.success(`Check-in "${payload.name}" created!`);
          }
          setTimeout(() => router.push(getActionRedirectUrl(actionType, payload)), 500);
        } else if (actionType === 'create_metric') {
          const valueKindMap: Record<string, 'number' | 'percent' | 'duration' | 'score'> = {
            weight: 'number',
            measurement: 'number',
            percentage: 'percent',
            count: 'number',
            time: 'duration',
            custom: 'number',
          };
          const valueKind = valueKindMap[payload.metricType] || 'number';
          if (payload.clientId) {
            const { assignMetric: assignClientMetric } = await import(
              '@/api/client/client-metric-service'
            );
            await assignClientMetric({
              clientId: payload.clientId,
              coachId: user?.id || '',
              name: payload.name,
              unit: payload.unit || '',
              description: payload.description || '',
              value_kind: valueKind,
            });
            queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
            toast.success(
              `Metric "${payload.name}" assigned to ${payload.clientName || 'client'}!`,
            );
          } else {
            await createMetric({
              name: payload.name,
              value_kind: valueKind,
              unit: payload.unit || '',
              description: payload.description || '',
            });
            queryClient.invalidateQueries({ queryKey: ['coach-metrics'] });
            toast.success(`Metric "${payload.name}" created!`);
          }
          setTimeout(() => router.push(getActionRedirectUrl(actionType, payload)), 500);
        } else {
          toast.info(t('toasts.actionNotSupported'));
        }

        await markActionConfirmed(actionType);
      } catch (err: any) {
        console.error('Failed to execute action:', err);
        toast.error(err.message || 'Failed to save');
        throw err;
      }
    },
    [createWorkout, router, user?.id, queryClient, markActionConfirmed, t],
  );

  // ── Input box (shared between welcome and chat states) ─────────────

  const InputBox = (
    <div className="bg-primary/10 w-full rounded-2xl p-1">
      <Input
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={handleSendMessage}
        className="w-full overflow-hidden border-0 p-0"
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pb-2 pt-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
              >
                <Paperclip className="size-3.5" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="hover:bg-secondary/50 rounded-full p-0.5"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <PromptInputTextarea ref={textareaRef} placeholder="Ask me anything..." className="min-h-auto p-3 text-xs" />

        <PromptInputActions className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-2">
            <PromptInputAction tooltip="Attach files">
              <label
                htmlFor="ai-panel-file-upload"
                className="hover:bg-secondary-foreground/10 flex size-7 cursor-pointer items-center justify-center rounded-2xl"
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="ai-panel-file-upload"
                />
                <Paperclip className="text-primary size-4" />
              </label>
            </PromptInputAction>
          </div>

          <div className="flex items-center gap-2">
            {isLimited && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px]',
                  hasReachedLimit
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {remaining} left
              </span>
            )}
            <PromptInputAction tooltip={isStreaming ? 'Stop generation' : 'Send message'}>
              <Button
                variant="default"
                size="icon"
                className="size-7 rounded-full"
                onClick={isStreaming ? stopStreaming : handleSendMessage}
                disabled={!isStreaming && (!prompt.trim() || hasReachedLimit)}
              >
                {isStreaming ? (
                  <SquareIcon className="size-3.5" />
                ) : (
                  <ArrowUpIcon className="size-3.5" />
                )}
              </Button>
            </PromptInputAction>
          </div>
        </PromptInputActions>
      </Input>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'border-sidebar-border bg-background h-full flex-shrink-0 overflow-hidden border-l',
        isOpen ? 'w-full md:w-[28rem]' : 'w-0 border-l-0',
      )}
    >
      <div className="flex h-full w-full md:w-[28rem] flex-col">
        {/* Header */}
        <div className="relative border-sidebar-border border-b flex-shrink-0 py-[2px]" ref={dropdownRef}>
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            {/* Title + chat switcher trigger */}
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-2 text-sm font-semibold transition-colors',
                dropdownOpen ? 'bg-accent' : 'hover:bg-accent',
              )}
            >
              <span className="max-w-[200px] truncate">
                {hasStartedChat && currentChatTitle ? currentChatTitle : 'Lyra'}
              </span>
              <span className="flex flex-col -space-y-1.5">
                <ChevronUp className="size-3 text-muted-foreground" />
                <ChevronDown className="size-3 text-muted-foreground" />
              </span>
            </button>

            {/* Header actions */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    aria-label="Expand Lyra"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link href={activeChatId ? `/assistant/${activeChatId}` : '/assistant'}>
                      <Expand className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Expand</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close Lyra"
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Chat switcher dropdown — floating popover */}
          {dropdownOpen && (
            <div className="absolute left-3 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-1 shadow-lg">
              <button
                onClick={handleNewChat}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <SquarePen className="size-3.5 shrink-0" />
                <span>New Chat</span>
              </button>

              {chats.length > 0 && (
                <>
                  <div className="-mx-1 my-1 border-t" />
                  <div className="max-h-64 overflow-y-auto">
                    {chats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleSwitchChat(chat.id)}
                        className={cn(
                          'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors',
                          chat.id === activeChatId
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent',
                        )}
                      >
                        <span className="truncate">{chat.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {hasStartedChat ? (
          <>
            {/* Messages area */}
            <ChatContainer
              className="relative w-full flex-1 space-y-3 p-3 pe-2"
              ref={containerRef}
              scrollToRef={bottomRef}
            >
              {isLoadingHistory && (
                <div className="flex items-center justify-center py-8">
                  <PromptLoader variant="text-shimmer" text="Loading..." size="sm" />
                </div>
              )}

              {messages.map((message, index) => {
                const isAssistant = message.role === 'assistant';
                const isLastMessage = index === messages.length - 1;

                return (
                  <Message
                    key={message.id}
                    className={message.role === 'user' ? 'mt-3 mb-3 justify-end' : 'justify-start'}
                  >
                    {isAssistant ? (
                      <div className="w-full space-y-2">
                        {message.toolCalls && message.toolCalls.length > 0 && !message.content && (
                          <ToolStatusList toolCalls={message.toolCalls} compact />
                        )}

                        {message.content && (
                          <div className="prose prose-xs dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground text-foreground max-w-none text-xs">
                            <Markdown className="space-y-3">{message.content}</Markdown>
                          </div>
                        )}

                        {message.clientSelect && (
                          <ClientSelectCards
                            clients={message.clientSelect}
                            selectedClientId={message.selectedClientId}
                            onSelect={({ id, name }) => {
                              setPrompt('');
                              markClientSelected(id);
                              sendMessage(
                                `I select the client "${name}" (client ID: ${id})`,
                                { currentPage: window.location.pathname },
                                name,
                              );
                            }}
                          />
                        )}

                        {message.charts?.map((chart, i) => (
                          <AIChart key={i} chart={chart} />
                        ))}

                        {message.action && (
                          <ActionCard
                            actionType={message.action.type as ActionType}
                            payload={message.action.payload}
                            initialConfirmed={message.action.confirmed}
                            onConfirm={(modifiedPayload) =>
                              handleConfirmAction(
                                message.action!.type as ActionType,
                                message.action!.payload,
                                modifiedPayload,
                              )
                            }
                          />
                        )}

                        {message.content && (
                          <MessageActions
                            className={cn(
                              'flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                              isLastMessage && 'opacity-100',
                            )}
                          >
                            <MessageAction
                              tooltip={copiedMessageId === message.id ? 'Copied' : 'Copy'}
                              delayDuration={100}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 rounded-full"
                                onClick={() => {
                                  navigator.clipboard.writeText(message.content);
                                  setCopiedMessageId(message.id);
                                  setTimeout(() => setCopiedMessageId(null), 2000);
                                }}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="size-3 text-green-500" />
                                ) : (
                                  <CopyIcon className="size-3" />
                                )}
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-[85%] justify-end text-end">
                        <MessageContent className="bg-primary text-primary-foreground inline-flex rounded-xl py-1.5 px-3 text-start text-xs">
                          {message.content}
                        </MessageContent>
                      </div>
                    )}
                  </Message>
                );
              })}

              {isStreaming && currentToolCall && (
                <div className="ps-1">
                  <ToolStatus toolCall={currentToolCall} compact />
                </div>
              )}

              {isStreaming && !currentToolCall && messages.length > 0 && (
                <div className="flex items-center gap-2 ps-1">
                  <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-500" />
                    </div>
                    <PromptLoader variant="text-shimmer" text="Thinking..." size="sm" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </ChatContainer>

            {/* Input at bottom */}
            <div className="flex-shrink-0 p-3">{InputBox}</div>
          </>
        ) : (
          /* Welcome state */
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <div className="mask-b-from-100% mask-radial-[50%_50%] mask-radial-from-0% -mt-8 mb-2 w-32">
              {animationData && (
                <Lottie className="w-full" animationData={animationData} loop autoplay />
              )}
            </div>
            <h3 className="mb-6 text-center text-base font-medium">
              Ask{' '}
              <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                Lyra
              </span>
            </h3>
            <div className="w-full">{InputBox}</div>
          </div>
        )}
      </div>
    </div>
  );
}
