"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/general/utils";
import {
    ArrowUpIcon,
    BarChart3Icon,
    BrainIcon,
    DumbbellIcon,
    FolderOpenIcon,
    GlobeIcon,
    MicIcon,
    MicOffIcon,
    Paperclip,
    SquareIcon,
    UsersIcon,
    Check,
    X
} from "lucide-react";
import { CodeIcon, CopyIcon } from "@radix-ui/react-icons";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
    Input,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea
} from "@/components/ui/custom/prompt/input";
import { Button } from "@/components/ui/button";
import { Suggestion } from "@/components/ui/custom/prompt/suggestion";
import { ChatContainer } from "@/components/ui/custom/prompt/chat-container";
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent
} from "@/components/ui/custom/prompt/message";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { PromptLoader } from "@/components/ui/custom/prompt/loader";
import { PromptScrollButton } from "@/components/ui/custom/prompt/scroll-button";

import { v4 as uuidv4 } from "uuid";
import { useAIChat, ChatMessage, ToolCallStatus } from "@/hooks/use-ai-chat";
import { useSpeechToText } from "@/hooks/use-speech-recognition";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ToolStatus, ToolStatusList } from "./tool-status";
import { ActionCard } from "./action-card";
import { AIChart } from "./ai-chart";
import { ClientSelectCards } from "./client-select-cards";
import { useCoachWorkouts } from "@/hooks/use-coach-workouts";
import { transformWorkoutPayload, transformSectionPayload } from "@/lib/ai-payload-transformer";
import { ActionType, getActionRedirectUrl } from "@/stores/ai-action-store";
import { assignWorkout } from "@/api/client/client-training-service";
import { assignMetric } from "@/api/client/client-metric-service";
import { createAthleteGoal, createAthleteInjury } from "@/api/client/client-service";
import { createMetric } from "@/api/coach/coach-metric-service";
import { addCheckIn } from "@/api/coach/coach-check-in-service";
import { useQueryClient } from "@tanstack/react-query";
interface AIChatInterfaceProps {
    chatId?: string;
}

export default function AIChatInterface({ chatId }: AIChatInterfaceProps) {
    const router = useRouter();
    const t = useTranslations();
    const [prompt, setPrompt] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [activeCategory, setActiveCategory] = useState("");

    const [hasStartedChat, setHasStartedChat] = useState(!!chatId);

    // When navigating to an existing chat, mark as started
    useEffect(() => {
        if (chatId) setHasStartedChat(true);
    }, [chatId]);
    const [animationData, setAnimationData] = useState<object | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // Use the AI chat hook — pass chatId for history persistence
    const {
        messages,
        isStreaming,
        isLoadingHistory,
        currentToolCall,
        pendingAction,
        error,
        sendMessage,
        stopStreaming,
        clearChat,
        markClientSelected,
        markActionConfirmed,
    } = useAIChat({ chatId });

    // Use workout hook for creating workouts
    const { createWorkout } = useCoachWorkouts();

    // Get user profile for coach ID
    const { user } = useUserProfile();

    // Query client for cache invalidation
    const queryClient = useQueryClient();

    // Speech recognition
    const {
        isListening,
        transcript,
        isSupported: isSpeechSupported,
        toggleListening,
        resetTranscript,
    } = useSpeechToText({
        onError: (error) => toast.error(error),
        continuous: true,
    });

    // Update prompt when transcript changes during listening
    useEffect(() => {
        if (isListening && transcript) {
            setPrompt(transcript);
        }
    }, [transcript, isListening]);

    // Load animation
    useEffect(() => {
        fetch('/animations/ai-sphere-animation.json')
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error('Failed to load animation:', err));
    }, []);

    // Handle sending a message
    const handleSendMessage = useCallback(async () => {
        if (isStreaming || !prompt.trim()) return;

        const messageToSend = prompt.trim();

        // Clear input immediately for better UX
        setPrompt("");
        setFiles([]);
        setHasStartedChat(true);
        resetTranscript(); // Clear transcript after sending

        await sendMessage(messageToSend, {
            currentPage: window.location.pathname,
        });
    }, [prompt, isStreaming, sendMessage, resetTranscript]);

    // Handle confirming an action
    const handleConfirmAction = useCallback(async (actionType: ActionType, payload: any, modifiedPayload?: any) => {
        // Use modified payload if provided (e.g., edited draft message)
        const finalPayload = modifiedPayload || payload;
        try {
            if (actionType === 'create_workout') {
                const apiPayload = transformWorkoutPayload(payload);
                if (payload.clientId) {
                    // Client context: assign directly to client's training calendar
                    const { assignWorkout: assignClientWorkout } = await import('@/api/client/client-training-service');
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
                    // No client context: add to coach library
                    await createWorkout(apiPayload as any);
                    toast.success(t('toasts.workoutAddedToLibrary'));
                }
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else if (actionType === 'create_section') {
                // TODO: Implement section creation
                const apiPayload = transformSectionPayload(payload);
                toast.info(t('toasts.sectionCreationComingSoon'));
            } else if (actionType === 'assign_workout') {
                await assignWorkout({
                    workoutId: payload.workoutId,
                    clientId: payload.clientId,
                    date: payload.date,
                    coachId: user?.id,
                });
                toast.success(`Workout assigned to ${payload.clientName || 'client'}!`);
                setTimeout(() => {
                    router.push(`/athletes/${payload.clientId}/training`);
                }, 500);
            } else if (actionType === 'assign_metric_to_client') {
                await assignMetric({
                    clientId: payload.clientId,
                    coachId: user?.id!,
                    metricIds: [payload.metricId],
                    schedule_config: { type: 'metric', frequency: 'daily' },
                });
                toast.success(`${payload.metricName} assigned to ${payload.clientName}!`);
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else if (actionType === 'add_client_goal') {
                // Create new goal
                await createAthleteGoal(payload.clientId, user?.id!, {
                    goal: payload.goalType,
                    target_date: payload.targetDate || null,
                    achieved: false,
                    details: payload.description || '',
                });
                toast.success(`Goal added for ${payload.clientName}!`);
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else if (actionType === 'add_client_injury') {
                // Create new injury
                await createAthleteInjury(payload.clientId, user?.id!, {
                    injury: `${payload.injuryType} - ${payload.bodyPart}`,
                    date: payload.dateOccurred || null,
                    details: `Severity: ${payload.severity || 'moderate'}${payload.notes ? `. ${payload.notes}` : ''}`,
                });
                toast.success(`Injury recorded for ${payload.clientName}!`);
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else if (actionType === 'draft_message') {
                // Send message via broadcast API (supports attachments)
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

                // Upload attachments if present
                if (hasAttachments && broadcastResult.results.length > 0) {
                    const { uploadAttachments } = await import('@/lib/messaging/upload-attachments');
                    const { conversationId, messageId: realMessageId } = broadcastResult.results[0];

                    const convertToBase64 = (file: File): Promise<string> => {
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                    };

                    const getAttachmentType = (mimeType: string): 'image' | 'video' | 'pdf' | 'audio' => {
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
                        }))
                    );

                    const result = await uploadAttachments({
                        conversationId,
                        messageId: realMessageId,
                        attachments: attachmentsWithData,
                    });

                    if (result.failedCount > 0) {
                        console.warn('[draft_message] Some attachments failed to upload:', result.errors);
                    }
                }

                toast.success(`Message sent to ${finalPayload.clientName}!`);
                setTimeout(() => {
                    router.push(`/inbox/${finalPayload.clientId}/overview`);
                }, 500);
            } else if (actionType === 'update_client_profile') {
                // TODO: Implement client profile update when API is available
                toast.info(t('toasts.clientProfileNotSupported'));
            } else if (actionType === 'create_checkin_template') {
                // Normalize question type to handle variations from the AI model
                const normalizeType = (type: string): string => {
                    const lowered = type?.toLowerCase().replace(/[^a-z]/g, '') || '';
                    const typeMap: Record<string, string> = {
                        'text': 'text',
                        'number': 'number',
                        'rating': 'rating',
                        'yesno': 'yesNo',
                        'multiplechoice': 'multipleChoice',
                        'scale': 'scale',
                        'date': 'date',
                        'images': 'images',
                        'videos': 'videos',
                        'signature': 'signature',
                        'progressphoto': 'progressPhoto',
                        'metrics': 'metrics',
                    };
                    return typeMap[lowered] || 'text';
                };

                if (payload.clientId) {
                    // Client context: create check-in directly for client
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
                    toast.success(`Check-in "${payload.name}" created for ${payload.clientName || 'client'}!`);
                } else {
                    // No client context: add to coach library
                    const checkIn = await addCheckIn({
                        name: payload.name,
                        description: payload.description || '',
                    });
                    if (payload.questions && payload.questions.length > 0) {
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
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else if (actionType === 'create_metric') {
                // Map AI metric types to API value_kind
                const valueKindMap: Record<string, 'number' | 'percent' | 'duration' | 'score'> = {
                    'weight': 'number',
                    'measurement': 'number',
                    'percentage': 'percent',
                    'count': 'number',
                    'time': 'duration',
                    'custom': 'number',
                };
                const valueKind = valueKindMap[payload.metricType] || 'number';

                if (payload.clientId) {
                    // Client context: create metric directly for client
                    const { assignMetric: assignClientMetric } = await import('@/api/client/client-metric-service');
                    await assignClientMetric({
                        clientId: payload.clientId,
                        coachId: user?.id || '',
                        name: payload.name,
                        unit: payload.unit || '',
                        description: payload.description || '',
                        value_kind: valueKind,
                    });
                    queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
                    toast.success(`Metric "${payload.name}" assigned to ${payload.clientName || 'client'}!`);
                } else {
                    // No client context: add to coach library
                    await createMetric({
                        name: payload.name,
                        value_kind: valueKind,
                        unit: payload.unit || '',
                        description: payload.description || '',
                    });
                    queryClient.invalidateQueries({ queryKey: ['coach-metrics'] });
                    toast.success(`Metric "${payload.name}" created!`);
                }
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else {
                toast.info(t('toasts.actionNotSupported'));
            }

            // Persist confirmed state for all action types
            await markActionConfirmed(actionType);
        } catch (error: any) {
            console.error('Failed to execute action:', error);
            toast.error(error.message || 'Failed to save');
            throw error; // Re-throw to keep the action card in non-confirmed state
        }
    }, [createWorkout, router, user?.id, queryClient, markActionConfirmed]);

    // Handle file changes
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        if (uploadInputRef?.current) {
            uploadInputRef.current.value = "";
        }
    };

    const FileListItem = ({
        file,
        dismiss = true,
        index
    }: {
        file: File;
        dismiss?: boolean;
        index: number;
    }) => (
        <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <Paperclip className="size-4" />
            <span className="max-w-[120px] truncate">{file.name}</span>
            {dismiss && (
                <button
                    onClick={() => handleRemoveFile(index)}
                    className="hover:bg-secondary/50 rounded-full p-1">
                    <X className="size-4" />
                </button>
            )}
        </div>
    );

    const activeCategoryData = suggestionGroups.find((group) => group.label === activeCategory);
    const showCategorySuggestions = activeCategory !== "";

    // Show error toast
    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    return (
        <div className="flex h-full w-full flex-col">
            {/* Main chat area */}
            <div className="mx-auto flex flex-1 w-full max-w-4xl flex-col items-center justify-center px-4 pb-4 overflow-hidden">
                <ChatContainer
                    className={cn("relative w-full flex-1 space-y-4 pe-2", {
                        hidden: !hasStartedChat
                    })}
                    ref={containerRef}
                    scrollToRef={bottomRef}>
                    {messages.map((message, index) => {
                        const isAssistant = message.role === "assistant";
                        const isLastMessage = index === messages.length - 1;

                        return (
                            <Message
                                key={message.id}
                                className={message.role === "user" ? "justify-end mt-4 mb-4" : "justify-start"}>
                                {isAssistant ? (
                                    <div className="w-full space-y-2">
                                        {/* Tool call status indicators — only while response is pending */}
                                        {message.toolCalls && message.toolCalls.length > 0 && !message.content && (
                                            <ToolStatusList toolCalls={message.toolCalls} />
                                        )}

                                        {/* Message content */}
                                        {message.content && (
                                            <div className="text-foreground prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground max-w-none">
                                                <Markdown className={"space-y-4"}>{message.content}</Markdown>
                                            </div>
                                        )}

                                        {/* Client selection cards */}
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

                                        {/* Charts */}
                                        {message.charts?.map((chart, i) => (
                                            <AIChart key={i} chart={chart} />
                                        ))}

                                        {/* Action card for executable actions */}
                                        {message.action && (
                                            <ActionCard
                                                actionType={message.action.type as ActionType}
                                                payload={message.action.payload}
                                                initialConfirmed={message.action.confirmed}
                                                onConfirm={(modifiedPayload) => handleConfirmAction(
                                                    message.action!.type as ActionType,
                                                    message.action!.payload,
                                                    modifiedPayload
                                                )}
                                            />
                                        )}

                                        {/* Message actions — only for plain text messages (no tool renders) */}
                                        {message.content && !message.toolCalls?.length && !message.clientSelect && !message.charts?.length && !message.action && (
                                            <MessageActions
                                                className={cn(
                                                    "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                    isLastMessage && "opacity-100"
                                                )}>
                                                <MessageAction tooltip={copiedMessageId === message.id ? "Copied" : "Copy"} delayDuration={100}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-full"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(message.content);
                                                            setCopiedMessageId(message.id);
                                                            setTimeout(() => setCopiedMessageId(null), 2000);
                                                        }}
                                                    >
                                                        {copiedMessageId === message.id ? (
                                                            <Check className="size-4 text-green-500" />
                                                        ) : (
                                                            <CopyIcon />
                                                        )}
                                                    </Button>
                                                </MessageAction>
                                            </MessageActions>
                                        )}
                                    </div>
                                ) : (
                                    <div className="max-w-[85%] sm:max-w-[75%] justify-end text-end">
                                        <MessageContent className="bg-primary text-primary-foreground inline-flex text-start text-sm py-2 rounded-xl">
                                            {message.content}
                                        </MessageContent>
                                    </div>
                                )}
                            </Message>
                        );
                    })}

                    {/* Current tool call indicator */}
                    {isStreaming && currentToolCall && (
                        <div className="ps-2">
                            <ToolStatus toolCall={currentToolCall} />
                        </div>
                    )}

                    {/* Loading indicator */}
                    {isStreaming && !currentToolCall && messages.length > 0 && (
                        <div className="ps-2 flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                                </div>
                                <PromptLoader variant="text-shimmer" text="Thinking..." size="sm" />
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </ChatContainer>

                <div className="fixed right-4 bottom-4">
                    <PromptScrollButton
                        containerRef={containerRef}
                        scrollRef={bottomRef}
                        className="shadow-sm"
                    />
                </div>

                {/* Welcome message */}
                {!hasStartedChat && (
                    <div className="mb-10">
                        <div className="mx-auto -mt-20 hidden w-32 mask-b-from-100% mask-radial-[50%_50%] mask-radial-from-0% md:block">
                            {animationData && <Lottie className="w-full" animationData={animationData} loop autoplay />}
                        </div>

                        <h1 className="text-center text-2xl leading-normal font-medium lg:text-4xl">
                            Hey Coach <br /> How Can I{" "}
                            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                                Assist You Today?
                            </span>
                        </h1>

                        {/* Capabilities section */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl mx-auto px-4">
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <DumbbellIcon className="h-3.5 w-3.5 text-purple-500" />
                                    <p className="font-medium text-foreground text-[11px]">Training</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>{t('assistant.capabilities.training.createWorkouts')}</li>
                                    <li>{t('assistant.capabilities.training.searchExercises')}</li>
                                    <li>{t('assistant.capabilities.training.assignToClients')}</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <UsersIcon className="h-3.5 w-3.5 text-blue-500" />
                                    <p className="font-medium text-foreground text-[11px]">Clients</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>{t('assistant.capabilities.clients.viewSearch')}</li>
                                    <li>{t('assistant.capabilities.clients.profilesGoals')}</li>
                                    <li>{t('assistant.capabilities.clients.findInactive')}</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <BarChart3Icon className="h-3.5 w-3.5 text-green-500" />
                                    <p className="font-medium text-foreground text-[11px]">Analytics</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>{t('assistant.capabilities.analytics.analyzeProgress')}</li>
                                    <li>{t('assistant.capabilities.analytics.completionRates')}</li>
                                    <li>{t('assistant.capabilities.analytics.metricsCheckins')}</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <FolderOpenIcon className="h-3.5 w-3.5 text-orange-500" />
                                    <p className="font-medium text-foreground text-[11px]">Library</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>{t('assistant.capabilities.library.browseWorkouts')}</li>
                                    <li>{t('assistant.capabilities.library.checkinTemplates')}</li>
                                    <li>{t('assistant.capabilities.library.trackedMetrics')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className="bg-primary/10 w-full rounded-2xl p-1">
                    <Input
                        value={prompt}
                        onValueChange={setPrompt}
                        onSubmit={handleSendMessage}
                        className="w-full overflow-hidden border-0 p-0 shadow-none">
                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 pb-2">
                                {files.map((file, index) => (
                                    <FileListItem key={index} index={index} file={file} />
                                ))}
                            </div>
                        )}

                        <PromptInputTextarea placeholder={t('common.askMeAnything')} className="min-h-auto p-4" />

                        <PromptInputActions className="flex items-center justify-between gap-2 p-3">
                            <div className="flex items-center gap-2">
                                <PromptInputAction tooltip="Attach files">
                                    <label
                                        htmlFor="file-upload"
                                        className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <Paperclip className="text-primary size-5" />
                                    </label>
                                </PromptInputAction>
                            </div>

                            <div className="flex gap-2">
                                <PromptInputAction tooltip={isListening ? t('assistant.stopListening') : t('assistant.voiceInput')}>
                                    <Button
                                        variant={isListening ? "default" : "outline"}
                                        size="icon"
                                        className={cn(
                                            "size-9 rounded-full transition-all",
                                            isListening && "bg-red-500 hover:bg-red-600 animate-pulse"
                                        )}
                                        onClick={toggleListening}
                                        disabled={!isSpeechSupported}
                                    >
                                        {isListening ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
                                    </Button>
                                </PromptInputAction>
                                <PromptInputAction tooltip={isStreaming ? "Stop generation" : "Send message"}>
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="size-8 rounded-full"
                                        onClick={isStreaming ? stopStreaming : handleSendMessage}
                                        disabled={!isStreaming && !prompt.trim()}>
                                        {isStreaming ? <SquareIcon /> : <ArrowUpIcon />}
                                    </Button>
                                </PromptInputAction>
                            </div>
                        </PromptInputActions>
                    </Input>
                </div>

                {/* Suggestion chips */}
                {!hasStartedChat && (
                    <div className="relative flex w-full flex-col items-center justify-center space-y-2 mt-4">
                        <div className="absolute top-0 left-0 h-[70px] w-full">
                            {showCategorySuggestions ? (
                                <div className="flex w-full flex-col space-y-1">
                                    {activeCategoryData?.items.map((suggestion) => (
                                        <Suggestion
                                            key={suggestion}
                                            highlight={activeCategoryData.highlight}
                                            onClick={() => {
                                                setPrompt(suggestion);
                                                setActiveCategory("");
                                            }}>
                                            {suggestion}
                                        </Suggestion>
                                    ))}
                                </div>
                            ) : (
                                <div className="relative flex w-full flex-wrap items-stretch justify-start gap-2">
                                    {suggestionGroups.map((suggestion) => (
                                        <Suggestion
                                            key={suggestion.label}
                                            size="sm"
                                            onClick={() => {
                                                setActiveCategory(suggestion.label);
                                                setPrompt("");
                                            }}
                                            className="capitalize">
                                            {suggestion.icon && <suggestion.icon />}
                                            {suggestion.label}
                                        </Suggestion>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const suggestionGroups = [
    {
        icon: BrainIcon,
        label: "Training",
        highlight: "Create",
        items: [
            "Create a full body workout for beginners",
            "Create a push day workout",
            "Create a 10-minute warm-up routine",
            "What exercises can I substitute for bench press?"
        ]
    },
    {
        icon: CodeIcon,
        label: "Analytics",
        highlight: "Analyze",
        items: [
            "How is John progressing?",
            "Who hasn't trained in the last 7 days?",
            "What's John's training volume this week?",
            "Compare John and Sarah's progress"
        ]
    },
    {
        icon: GlobeIcon,
        label: "Research",
        highlight: "Research",
        items: [
            "What's the best rep range for hypertrophy?",
            "Explain progressive overload",
            "How should I program for a powerlifting meet?",
            "What's the difference between linear and undulating periodization?"
        ]
    }
];
