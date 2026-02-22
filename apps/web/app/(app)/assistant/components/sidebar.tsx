"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/general/utils";
import {
    SquarePen,
    SearchIcon,
    MessageSquareIcon,
    Trash2Icon,
    PanelLeftClose,
    PanelLeftOpen,
    X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAssistantSidebar } from "../assistant-sidebar-context";

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
    const { chats, isLoadingChats, deleteChat, isOpen, setIsOpen, isMobile } = useAssistantSidebar();
    const [searchQuery, setSearchQuery] = useState("");

    const collapsed = isMobile ? false : !isOpen;

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
        deleteChat(id);
        if (pathname === `/assistant/${id}`) router.push("/assistant");
    };

    const isActive = (id: string) => pathname === `/assistant/${id}`;

    return (
        <div className="bg-background h-full overflow-hidden flex flex-col">
            <div className="flex flex-col h-full grow min-w-0">
                <div className="px-4 pt-2 flex flex-col gap-2">
                    {/* Row 1 — Header: Title + Collapse / Expand icon */}
                    <div className="h-8 relative">
                        {/* Expanded: Title + Close */}
                        <div
                            className={cn(
                                "absolute inset-0 flex items-center justify-between transition-all duration-300",
                                collapsed ? "opacity-0 invisible" : "opacity-100 visible",
                            )}
                        >
                            <h2 className="text-xl font-semibold whitespace-nowrap">Chats</h2>
                            {!isMobile && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <PanelLeftClose className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Collapse sidebar</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        {/* Collapsed: Open icon */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center transition-all duration-300",
                                    collapsed ? "opacity-100 visible" : "opacity-0 invisible",
                                )}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={() => setIsOpen(true)}
                                        >
                                            <PanelLeftOpen className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Expand sidebar</TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    {/* Row 2 — New Chat: text link / plus icon */}
                    <div className="h-9 relative">
                        {/* Expanded: text link */}
                        <div
                            className={cn(
                                "absolute inset-0 flex items-center transition-all duration-300",
                                collapsed ? "opacity-0 invisible" : "opacity-100 visible",
                            )}
                        >
                            <button
                                onClick={handleNewChat}
                                className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md px-2 py-1 hover:bg-accent text-left"
                            >
                                <SquarePen className="size-4 shrink-0" />
                                <span>New Chat</span>
                            </button>
                        </div>

                        {/* Collapsed: plus icon */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center transition-all duration-300",
                                    collapsed ? "opacity-100 visible" : "opacity-0 invisible",
                                )}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={handleNewChat}
                                        >
                                            <SquarePen className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">New chat</TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    {/* Row 3 — Search: input / search icon */}
                    <div className="h-12 relative -mt-[4px]">
                        {/* Expanded: Search input */}
                        <div
                            className={cn(
                                "absolute inset-0 transition-all duration-300 flex items-center",
                                collapsed ? "opacity-0 invisible" : "opacity-100 visible",
                            )}
                        >
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder={t("assistant.searchChats")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-8 h-9"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => setSearchQuery("")}
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Collapsed: search icon */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center transition-all duration-300",
                                    collapsed ? "opacity-100 visible" : "opacity-0 invisible",
                                )}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                                            onClick={() => setIsOpen(true)}
                                        >
                                            <SearchIcon className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Search chats</TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat List — hidden when collapsed */}
                <div
                    className={cn(
                        "flex-1 overflow-y-auto pt-2 transition-opacity duration-300",
                        collapsed ? "opacity-0 invisible" : "opacity-100 visible",
                    )}
                >
                    {isLoadingChats ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            {searchQuery ? "No chats found" : "No chats yet — start a new one!"}
                        </div>
                    ) : (
                        <div>
                            {filtered.map((chat) => (
                                <div
                                    key={chat.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleChatClick(chat.id)}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleChatClick(chat.id); }}
                                    className={cn(
                                        "group w-full text-left px-4 py-3 text-sm transition-colors cursor-pointer border-b",
                                        isActive(chat.id)
                                            ? "bg-accent/50 border-l-2 border-l-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <MessageSquareIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate text-[11px] font-medium flex-1">
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
