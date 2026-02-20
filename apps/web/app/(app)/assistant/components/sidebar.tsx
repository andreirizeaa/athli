"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/general/utils";
import { SquarePen, SearchIcon, MessageSquareIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchChats, deleteChat as deleteChatApi, AiChat } from "@/api/ai/ai-chat-history-service";

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return new Date(dateStr).toLocaleDateString();
}

function getLastMessage(chat: AiChat): string {
    const messages = chat.data?.messages;
    if (!messages || messages.length === 0) return "No messages yet";
    const last = messages[messages.length - 1];
    return last.content?.slice(0, 80) || "No content";
}

interface AssistantSidebarProps {
    onChatClick?: () => void;
}

export function AssistantSidebar({ onChatClick }: AssistantSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch chats from API
    const { data: chats = [], isLoading } = useQuery({
        queryKey: ["ai-chats"],
        queryFn: fetchChats,
        refetchInterval: 30000, // refresh every 30s
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteChatApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-chats"] });
        },
    });

    const filteredChats = chats.filter(
        (chat) =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getLastMessage(chat).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNewChat = () => {
        router.push("/assistant");
        onChatClick?.();
    };

    const handleChatClick = (id: string) => {
        router.push(`/assistant/${id}`);
        onChatClick?.();
    };

    const handleDeleteChat = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteMutation.mutate(id);
        // If we're currently viewing this chat, go to new chat
        if (pathname === `/assistant/${id}`) {
            router.push("/assistant");
        }
    };

    const isActiveChat = (id: string) => {
        return pathname === `/assistant/${id}`;
    };

    return (
        <div className="flex h-full w-full flex-col">
            {/* Header */}
            <div className="px-4 my-2 flex items-center justify-between">
                <h2 className="text-[22px] font-semibold">Chats</h2>
                <Button
                    onClick={handleNewChat}
                    size="sm"
                    title="New chat"
                >
                    <SquarePen className="h-4 w-4 mr-1" />
                    New
                </Button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3 border-b">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        Loading chats...
                    </div>
                ) : filteredChats.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        {searchQuery ? "No chats found" : "No chats yet. Start a new one!"}
                    </div>
                ) : (
                    <div>
                        {filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => handleChatClick(chat.id)}
                                className={cn(
                                    "group w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent cursor-pointer",
                                    isActiveChat(chat.id) && "bg-accent"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <MessageSquareIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-sm font-medium flex-1">
                                        {chat.title}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteChat(e, chat.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                                        title="Delete chat"
                                    >
                                        <Trash2Icon className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                    </button>
                                </div>
                                <p className="line-clamp-1 text-xs text-muted-foreground pl-6">
                                    {getLastMessage(chat)}
                                </p>
                                <span className="text-xs text-muted-foreground/60 pl-6">
                                    {timeAgo(chat.updated_at)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
