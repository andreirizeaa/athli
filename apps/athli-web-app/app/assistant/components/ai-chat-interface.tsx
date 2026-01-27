"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/general/utils";
import {
    ArrowUpIcon,
    BrainIcon,
    ChevronsUpDownIcon,
    DribbbleIcon,
    GlobeIcon,
    MicIcon,
    Paperclip,
    SquareIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
    UserIcon,
    X
} from "lucide-react";
import { CodeIcon, CopyIcon } from "@radix-ui/react-icons";
import Lottie from "lottie-react";

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
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCoachClients } from "@/hooks/use-coach-clients";
import { type Athlete } from "@/api/coach/coach-client-service";

interface AIChatInterfaceProps {
    chatId?: string;
}

export default function AIChatInterface({ chatId }: AIChatInterfaceProps) {
    const [prompt, setPrompt] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [activeCategory, setActiveCategory] = useState("");
    const [selectedClient, setSelectedClient] = useState<Athlete | null>(null);
    const [clientSelectorOpen, setClientSelectorOpen] = useState(false);

    const { clients, isLoading: isLoadingClients } = useCoachClients();

    const [isFirstResponse, setIsFirstResponse] = useState(!!chatId);
    const [animationData, setAnimationData] = useState<object | null>(null);

    const getClientInitials = (name: string) => {
        return (name?.trim() || "")
            .split(" ")
            .map((part) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join("") || "?";
    };

    useEffect(() => {
        fetch('/animations/ai-sphere-animation.json')
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error('Failed to load animation:', err));
    }, []);

    const [isStreaming, setIsStreaming] = useState(false);
    const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const streamContentRef = useRef("");
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = React.useState<
        { id: number | string; role: string; content: string; files?: File[] }[]
    >(() => {
        if (chatId) {
            return [
                {
                    id: 1,
                    role: "user",
                    content: "Previous conversation loaded"
                },
                {
                    id: 2,
                    role: "assistant",
                    content: `This is chat session **${chatId}**. Your previous conversation has been loaded. How can I continue to help you?`
                }
            ];
        }
        return [];
    });

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const streamResponse = async () => {
        if (isStreaming) return;

        if (prompt.trim() || files.length > 0) {
            setIsFirstResponse(true);
            setIsStreaming(true);

            const newMessageId = messages.length + 1;
            setMessages((prev) => [
                ...prev,
                {
                    id: newMessageId,
                    role: "user",
                    content: prompt,
                    files: files
                }
            ]);

            setPrompt("");
            setFiles([]);

            await delay(2000);

            const fullResponse =
                "I'm here to help you with your training and coaching needs! Here's a quick example of what I can do:\n\n```ts\n// Example workout plan\nconst workout = {\n  name: 'Full Body Strength',\n  exercises: [\n    { name: 'Squats', sets: 4, reps: 8 },\n    { name: 'Bench Press', sets: 4, reps: 8 },\n    { name: 'Deadlifts', sets: 3, reps: 6 }\n  ]\n};\n```\n\nWould you like me to help you create a training plan, analyze client progress, or something else?";

            setMessages((prev) => [
                ...prev,
                {
                    id: newMessageId + 1,
                    role: "assistant",
                    content: ""
                }
            ]);

            let charIndex = 0;
            streamContentRef.current = "";

            streamIntervalRef.current = setInterval(() => {
                if (charIndex < fullResponse.length) {
                    streamContentRef.current += fullResponse[charIndex];
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessageId + 1 ? { ...msg, content: streamContentRef.current } : msg
                        )
                    );
                    charIndex++;
                } else {
                    clearInterval(streamIntervalRef.current!);
                    setIsStreaming(false);
                }
            }, 5);
        }
    };

    React.useEffect(() => {
        return () => {
            if (streamIntervalRef.current) {
                clearInterval(streamIntervalRef.current);
            }
        };
    }, []);

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

    return (
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center space-y-4 lg:p-4">
            <ChatContainer
                className={cn("relative w-full flex-1 space-y-4 pe-2 pt-10 md:pt-0", {
                    hidden: !isFirstResponse
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
                                        <div className="bg-muted text-foreground prose rounded-lg border p-4">
                                            <Markdown className={"space-y-4"}>{message.content}</Markdown>
                                        </div>
                                        <MessageActions
                                            className={cn(
                                                "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                isLastMessage && "opacity-100"
                                            )}>
                                            <MessageAction tooltip="Copy" delayDuration={100}>
                                                <Button variant="ghost" size="icon" className="rounded-full">
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
                                    </div>
                                ) : message?.files && message.files.length > 0 ? (
                                    <div className="flex flex-col items-end space-y-2">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {message.files.map((file, index) => (
                                                <FileListItem key={index} index={index} file={file} dismiss={false} />
                                            ))}
                                        </div>
                                        {message.content ? (
                                            <>
                                                <MessageContent className="bg-primary text-primary-foreground inline-flex">
                                                    {message.content}
                                                </MessageContent>
                                            </>
                                        ) : null}
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

                {isStreaming && (
                    <div className="ps-2">
                        <PromptLoader variant="pulse-dot" />
                    </div>
                )}
            </ChatContainer>

            <div className="fixed right-4 bottom-4">
                <PromptScrollButton
                    containerRef={containerRef}
                    scrollRef={bottomRef}
                    className="shadow-sm"
                />
            </div>

            {/* Welcome message */}
            {!isFirstResponse && (
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
            {/* Welcome message */}

            <div className="bg-primary/10 w-full rounded-2xl p-1">
                <Input
                    value={prompt}
                    onValueChange={setPrompt}
                    onSubmit={streamResponse}
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

                            {selectedClient ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full gap-2 pr-2"
                                    asChild
                                >
                                    <div>
                                        <Avatar className="size-4">
                                            <AvatarImage src={selectedClient.avatarUrl} alt={selectedClient.name} />
                                            <AvatarFallback className="text-[10px]">
                                                {getClientInitials(selectedClient.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{selectedClient.name}</span>
                                        <button
                                            onClick={() => setSelectedClient(null)}
                                            className="hover:bg-muted rounded-full p-0.5"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                </Button>
                            ) : (
                                <Popover open={clientSelectorOpen} onOpenChange={setClientSelectorOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            role="combobox"
                                            aria-expanded={clientSelectorOpen}
                                            className="rounded-full gap-2"
                                        >
                                            <UserIcon className="size-4" />
                                            <span className="hidden lg:inline">Generic</span>
                                            <ChevronsUpDownIcon className="size-3.5 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[250px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search clients..." />
                                            <CommandList>
                                                <CommandEmpty>
                                                    {isLoadingClients ? "Loading..." : "No clients found."}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {clients.map((client) => (
                                                        <CommandItem
                                                            key={client.id}
                                                            value={client.name}
                                                            onSelect={() => {
                                                                setSelectedClient(client);
                                                                setClientSelectorOpen(false);
                                                            }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Avatar className="size-6">
                                                                <AvatarImage src={client.avatarUrl} alt={client.name} />
                                                                <AvatarFallback className="text-xs">
                                                                    {getClientInitials(client.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="truncate">{client.name}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
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
                                    onClick={streamResponse}
                                    disabled={!prompt.trim()}>
                                    {isStreaming ? <SquareIcon /> : <ArrowUpIcon />}
                                </Button>
                            </PromptInputAction>
                        </div>
                    </PromptInputActions>
                </Input>
            </div>

            {!isFirstResponse && (
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
        items: ["Create a workout plan", "Create a training program", "Create exercise variations", "Create a warm-up routine"]
    },
    {
        icon: CodeIcon,
        label: "Analytics",
        highlight: "Analyze",
        items: [
            "Analyze client progress",
            "Analyze training load",
            "Analyze recovery metrics",
            "Analyze performance trends"
        ]
    },
    {
        icon: DribbbleIcon,
        label: "Nutrition",
        highlight: "Plan",
        items: [
            "Plan a meal prep",
            "Plan macros for cutting",
            "Plan supplements stack",
            "Plan hydration strategy"
        ]
    },
    {
        icon: GlobeIcon,
        label: "Research",
        highlight: "Research",
        items: [
            "Research best practices for hypertrophy",
            "Research injury prevention",
            "Research periodization models",
            "Research recovery protocols"
        ]
    }
];
