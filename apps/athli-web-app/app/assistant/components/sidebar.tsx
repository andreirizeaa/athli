"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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

export function AssistantSidebar() {
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
    };

    const handleChatClick = (id: string) => {
        router.push(`/assistant/${id}`);
    };

    const isActiveChat = (id: string) => {
        return pathname === `/assistant/${id}`;
    };

    const isNewChat = pathname === "/assistant";

    return (
        <div className="flex h-full w-full flex-col border-r bg-background">
            <div className="flex items-center gap-2 p-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button
                    onClick={handleNewChat}
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    title="New chat"
                >
                    <SquarePen className="size-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
                <div className="flex flex-col gap-1">
                    {filteredChats.map((chat) => (
                        <button
                            key={chat.id}
                            onClick={() => handleChatClick(chat.id)}
                            className={cn(
                                "flex w-full flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors hover:bg-muted",
                                isActiveChat(chat.id) && "bg-primary/10"
                            )}
                        >
                            <div className="flex w-full items-center gap-2">
                                <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
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

                    {filteredChats.length === 0 && (
                        <p className="p-4 text-center text-sm text-muted-foreground">
                            No chats found
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
