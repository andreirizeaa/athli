"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/general/utils";
import { SquarePen, SearchIcon, MessageSquareIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchChats,
    deleteChat as deleteChatApi,
    AiChatListItem,
} from "@/api/ai/ai-chat-history-service";

function relativeDate(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

interface AssistantSidebarProps {
    onChatClick?: () => void;
}

export function AssistantSidebar({ onChatClick }: AssistantSidebarProps) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: chats = [], isLoading } = useQuery({
        queryKey: ["ai-chats"],
        queryFn: fetchChats,
        refetchInterval: 30_000,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteChatApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-chats"] }),
    });

    const filtered = chats.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleNewChat = () => {
        router.push("/assistant");
        onChatClick?.();
    };

    const handleChatClick = (id: string) => {
        router.push(`/assistant/${id}`);
        onChatClick?.();
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteMutation.mutate(id);
        if (pathname === `/assistant/${id}`) router.push("/assistant");
    };

    const isActive = (id: string) => pathname === `/assistant/${id}`;

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
                        placeholder={t('assistant.searchChats')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        {searchQuery ? "No chats found" : "No chats yet — start a new one!"}
                    </div>
                ) : (
                    <div>
                        {filtered.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => handleChatClick(chat.id)}
                                className={cn(
                                    "group w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent cursor-pointer",
                                    isActive(chat.id) && "bg-accent",
                                )}
                            >
                                <div className="flex items-center gap-2 mb-0.5">
                                    <MessageSquareIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-sm font-medium flex-1">
                                        {chat.title}
                                    </span>
                                    <button
                                        onClick={(e) => handleDelete(e, chat.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                                        title="Delete chat"
                                    >
                                        <Trash2Icon className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                    </button>
                                </div>
                                <span className="text-[11px] text-muted-foreground/60 pl-6">
                                    {relativeDate(chat.updated_at)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
