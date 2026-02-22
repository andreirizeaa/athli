"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/general/utils";
import { SquarePen, SearchIcon, MessageSquareIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatSession {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: string;
}

const mockChats: ChatSession[] = [
    {
        id: "1",
        title: "Training Plan Review",
        lastMessage: "Here's the updated workout...",
        timestamp: "2 hours ago"
    },
    {
        id: "2",
        title: "Client Progress Analysis",
        lastMessage: "Based on the data provided...",
        timestamp: "Yesterday"
    },
    {
        id: "3",
        title: "Nutrition Strategy",
        lastMessage: "For cutting phase, I recommend...",
        timestamp: "2 days ago"
    },
    {
        id: "4",
        title: "Recovery Protocol",
        lastMessage: "The optimal recovery window...",
        timestamp: "3 days ago"
    },
    {
        id: "5",
        title: "Periodization Planning",
        lastMessage: "Let me break down the mesocycle...",
        timestamp: "1 week ago"
    }
];

interface AssistantSidebarProps {
    onChatClick?: () => void;
}

export function AssistantSidebar({ onChatClick }: AssistantSidebarProps) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredChats = mockChats.filter(
        (chat) =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNewChat = () => {
        router.push("/assistant");
        onChatClick?.();
    };

    const handleChatClick = (id: string) => {
        router.push(`/assistant/${id}`);
        onChatClick?.();
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
                    title={t('assistant.newChat')}
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
                {filteredChats.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        No chats found
                    </div>
                ) : (
                    <div>
                        {filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => handleChatClick(chat.id)}
                                className={cn(
                                    "w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent cursor-pointer",
                                    isActiveChat(chat.id) && "bg-accent"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <MessageSquareIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-sm font-medium">
                                        {chat.title}
                                    </span>
                                </div>
                                <p className="line-clamp-1 text-xs text-muted-foreground pl-6">
                                    {chat.lastMessage}
                                </p>
                                <span className="text-xs text-muted-foreground/60 pl-6">
                                    {chat.timestamp}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
