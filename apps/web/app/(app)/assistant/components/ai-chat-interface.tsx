"use client";

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
    Paperclip,
    PanelLeftIcon,
    SquareIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
    UsersIcon,
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

import { useAIChat, ChatMessage, ToolCallStatus } from "@/hooks/use-ai-chat";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ToolStatus, ToolStatusList } from "./tool-status";
import { ActionCard } from "./action-card";
import { useCoachWorkouts } from "@/hooks/use-coach-workouts";
import { transformWorkoutPayload, transformSectionPayload } from "@/lib/ai-payload-transformer";
import { ActionType, getActionRedirectUrl } from "@/stores/ai-action-store";
import { assignWorkout } from "@/api/client/client-training-service";
import { assignMetric } from "@/api/client/client-metric-service";
import { createAthleteGoal, createAthleteInjury } from "@/api/client/client-service";
import { createMetric } from "@/api/coach/coach-metric-service";
import { addCheckIn } from "@/api/coach/coach-check-in-service";
import { useQueryClient } from "@tanstack/react-query";
import { useAssistantSidebar } from "../assistant-sidebar-context";

interface AIChatInterfaceProps {
    chatId?: string;
}

export default function AIChatInterface({ chatId }: AIChatInterfaceProps) {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [activeCategory, setActiveCategory] = useState("");

    const [hasStartedChat, setHasStartedChat] = useState(!!chatId);
    const [animationData, setAnimationData] = useState<object | null>(null);

    // If chatId is provided (loading existing chat), mark as started
    useEffect(() => {
        if (chatId) setHasStartedChat(true);
    }, [chatId]);

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { toggle, isOpen, isMobile } = useAssistantSidebar();

    // Use the AI chat hook with optional chatId for history persistence
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
    } = useAIChat({ chatId });

    // Use workout hook for creating workouts
    const { createWorkout } = useCoachWorkouts();

    // Get user profile for coach ID
    const { user } = useUserProfile();

    // Query client for cache invalidation
    const queryClient = useQueryClient();

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

        await sendMessage(messageToSend, {
            currentPage: window.location.pathname,
        });
    }, [prompt, isStreaming, sendMessage]);

    // Handle confirming an action
    const handleConfirmAction = useCallback(async (actionType: ActionType, payload: any, modifiedPayload?: any) => {
        // Use modified payload if provided (e.g., edited draft message)
        const finalPayload = modifiedPayload || payload;
        try {
            if (actionType === 'create_workout') {
                const apiPayload = transformWorkoutPayload(payload);
                await createWorkout(apiPayload as any);
                toast.success('Workout added to your library!');
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else if (actionType === 'create_section') {
                // TODO: Implement section creation
                const apiPayload = transformSectionPayload(payload);
                toast.info('Section creation coming soon');
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
                // Send message via messaging API
                const { default: axiosInstance } = await import('@/lib/axios');
                await axiosInstance.post('/coach/messaging/broadcast', {
                    clientIds: [finalPayload.clientId],
                    content: finalPayload.message,
                });
                toast.success(`Message sent to ${finalPayload.clientName}!`);
                setTimeout(() => {
                    router.push(`/inbox/${finalPayload.clientId}/overview`);
                }, 500);
            } else if (actionType === 'update_client_profile') {
                // TODO: Implement client profile update when API is available
                toast.info('Client profile updates are not yet supported via AI assistant');
            } else if (actionType === 'create_checkin_template') {
                // First create the check-in
                const checkIn = await addCheckIn({
                    name: payload.name,
                    description: payload.description || '',
                });
                // Then add questions one by one if any
                if (payload.questions && payload.questions.length > 0) {
                    const { addQuestion } = await import('@/api/coach/coach-check-in-service');
                    for (const q of payload.questions) {
                        // Normalize the type to handle variations from the AI model
                        // The model might return 'yes/no', 'Yes/No', 'multiple_choice', etc.
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
                // Invalidate check-ins cache
                queryClient.invalidateQueries({ queryKey: ['coach-check-ins'] });
                toast.success(`Check-in "${payload.name}" created!`);
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
                await createMetric({
                    name: payload.name,
                    value_kind: valueKindMap[payload.metricType] || 'number',
                    unit: payload.unit || '',
                    description: payload.description || '',
                });
                // Invalidate metrics cache so the new metric shows up without refresh
                queryClient.invalidateQueries({ queryKey: ['coach-metrics'] });
                toast.success(`Metric "${payload.name}" created!`);
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType, payload));
                }, 500);
            } else {
                toast.info('This action type is not yet supported');
            }
        } catch (error: any) {
            console.error('Failed to execute action:', error);
            toast.error(error.message || 'Failed to save');
            throw error; // Re-throw to keep the action card in non-confirmed state
        }
    }, [createWorkout, router, user?.id, queryClient]);

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
            {/* Header with sidebar toggle */}
            <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggle}
                    className="size-8"
                    title={isMobile ? "Open chats" : (isOpen ? "Hide sidebar" : "Show sidebar")}
                >
                    <PanelLeftIcon className="size-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                    Lyra
                </span>
            </div>

            {/* Main chat area */}
            <div className="mx-auto flex flex-1 w-full max-w-4xl flex-col items-center justify-center space-y-4 lg:p-4 overflow-hidden">
                <ChatContainer
                    className={cn("relative w-full flex-1 space-y-4 pe-2 pt-10 md:pt-0", {
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
                                className={message.role === "user" ? "justify-end" : "justify-start"}>
                                <div
                                    className={cn("max-w-[85%] flex-1 sm:max-w-[75%]", {
                                        "justify-end text-end": !isAssistant
                                    })}>
                                    {isAssistant ? (
                                        <div className="space-y-2">
                                            {/* Tool call status indicators */}
                                            {message.toolCalls && message.toolCalls.length > 0 && (
                                                <ToolStatusList toolCalls={message.toolCalls} />
                                            )}

                                            {/* Message content */}
                                            {message.content && (
                                                <div className="bg-muted text-foreground prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground max-w-none rounded-lg border p-4">
                                                    <Markdown className={"space-y-4"}>{message.content}</Markdown>
                                                </div>
                                            )}

                                            {/* Action card for executable actions */}
                                            {message.action && (
                                                <ActionCard
                                                    actionType={message.action.type as ActionType}
                                                    payload={message.action.payload}
                                                    onConfirm={(modifiedPayload) => handleConfirmAction(
                                                        message.action!.type as ActionType,
                                                        message.action!.payload,
                                                        modifiedPayload
                                                    )}
                                                />
                                            )}

                                            {/* Message actions */}
                                            {message.content && (
                                                <MessageActions
                                                    className={cn(
                                                        "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                        isLastMessage && "opacity-100"
                                                    )}>
                                                    <MessageAction tooltip="Copy" delayDuration={100}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-full"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(message.content);
                                                                toast.success('Copied to clipboard');
                                                            }}
                                                        >
                                                            <CopyIcon />
                                                        </Button>
                                                    </MessageAction>
                                                    <MessageAction tooltip="Upvote" delayDuration={100}>
                                                        <Button variant="ghost" size="icon" className="rounded-full">
                                                            <ThumbsUpIcon />
                                                        </Button>
                                                    </MessageAction>
                                                    <MessageAction tooltip="Downvote" delayDuration={100}>
                                                        <Button variant="ghost" size="icon" className="rounded-full">
                                                            <ThumbsDownIcon />
                                                        </Button>
                                                    </MessageAction>
                                                </MessageActions>
                                            )}
                                        </div>
                                    ) : (
                                        <MessageContent className="bg-primary text-primary-foreground inline-flex text-start">
                                            {message.content}
                                        </MessageContent>
                                    )}
                                </div>
                            </Message>
                        );
                    })}

                    {/* Current tool call indicator */}
                    {isStreaming && currentToolCall && (
                        <div className="ps-2">
                            <ToolStatus toolCall={currentToolCall} />
                        </div>
                    )}

                    {/* History loading indicator */}
                    {isLoadingHistory && (
                        <div className="ps-2 flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                                <PromptLoader variant="text-shimmer" text="Loading conversation..." size="sm" />
                            </div>
                        </div>
                    )}

                    {/* Loading indicator */}
                    {isStreaming && !currentToolCall && messages.length > 0 && (
                        <div className="ps-2 flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
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
                                    <li>Create workouts & sections</li>
                                    <li>Search exercises</li>
                                    <li>Assign to clients</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <UsersIcon className="h-3.5 w-3.5 text-blue-500" />
                                    <p className="font-medium text-foreground text-[11px]">Clients</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>View & search clients</li>
                                    <li>Profiles, goals & injuries</li>
                                    <li>Find inactive clients</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <BarChart3Icon className="h-3.5 w-3.5 text-green-500" />
                                    <p className="font-medium text-foreground text-[11px]">Analytics</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>Analyze progress</li>
                                    <li>Completion rates</li>
                                    <li>Metrics & check-ins</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <FolderOpenIcon className="h-3.5 w-3.5 text-orange-500" />
                                    <p className="font-medium text-foreground text-[11px]">Library</p>
                                </div>
                                <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                    <li>Browse workouts</li>
                                    <li>Check-in templates</li>
                                    <li>Tracked metrics</li>
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

                        <PromptInputTextarea placeholder="Ask me anything..." className="min-h-auto p-4" />

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
                                <PromptInputAction tooltip="Voice input">
                                    <Button variant="outline" size="icon" className="size-9 rounded-full">
                                        <MicIcon size={18} />
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
                    <div className="relative flex w-full flex-col items-center justify-center space-y-2">
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
