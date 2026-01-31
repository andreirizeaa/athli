"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/general/utils";
import {
    ArrowUpIcon,
    BrainIcon,
    GlobeIcon,
    MicIcon,
    Paperclip,
    SquareIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
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

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Use the AI chat hook
    const {
        messages,
        isStreaming,
        currentToolCall,
        pendingAction,
        error,
        sendMessage,
        stopStreaming,
        clearChat,
    } = useAIChat();

    // Use workout hook for creating workouts
    const { createWorkout } = useCoachWorkouts();

    // Get user profile for coach ID
    const { user } = useUserProfile();

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
    const handleConfirmAction = useCallback(async (actionType: ActionType, payload: any) => {
        try {
            if (actionType === 'create_workout') {
                const apiPayload = transformWorkoutPayload(payload);
                await createWorkout(apiPayload as any);
                toast.success('Workout added to your library!');
                // Navigate after a brief delay to let the toast show
                setTimeout(() => {
                    router.push(getActionRedirectUrl(actionType));
                }, 500);
            } else if (actionType === 'create_section') {
                // TODO: Implement section creation
                const apiPayload = transformSectionPayload(payload);
                toast.info('Section creation coming soon');
            } else if (actionType === 'assign_workout') {
                // Assign workout to client's calendar
                await assignWorkout({
                    workoutId: payload.workoutId,
                    clientId: payload.clientId,
                    date: payload.date,
                    coachId: user?.id,
                });
                toast.success(`Workout assigned to ${payload.clientName || 'client'}!`);
                // Navigate to client's calendar
                setTimeout(() => {
                    router.push(`/client/${payload.clientId}/calendar`);
                }, 500);
            } else {
                toast.info('This action type is not yet supported');
            }
        } catch (error: any) {
            console.error('Failed to execute action:', error);
            toast.error(error.message || 'Failed to save');
            throw error; // Re-throw to keep the action card in non-confirmed state
        }
    }, [createWorkout, router, user?.id]);

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
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center space-y-4 lg:p-4">
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
                                                onConfirm={() => handleConfirmAction(
                                                    message.action!.type as ActionType,
                                                    message.action!.payload
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
                    <div className="mx-auto -mt-36 hidden w-72 mask-b-from-100% mask-radial-[50%_50%] mask-radial-from-0% md:block">
                        {animationData && <Lottie className="w-full" animationData={animationData} loop autoplay />}
                    </div>

                    <h1 className="text-center text-2xl leading-normal font-medium lg:text-4xl">
                        Hey Coach <br /> How Can I{" "}
                        <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                            Assist You Today?
                        </span>
                    </h1>
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
