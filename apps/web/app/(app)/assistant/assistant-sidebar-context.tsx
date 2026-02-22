'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchChats,
  deleteChat as deleteChatApi,
  AiChatListItem,
} from '@/api/ai/ai-chat-history-service';

interface AssistantSidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  isMobile: boolean;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  hasChats: boolean;
  chats: AiChatListItem[];
  isLoadingChats: boolean;
  deleteChat: (id: string) => void;
}

const AssistantSidebarContext = createContext<AssistantSidebarContextType | undefined>(undefined);

export function AssistantSidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const { data: chats = [], isLoading: isLoadingChats } = useQuery({
    queryKey: ['ai-chats'],
    queryFn: fetchChats,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChatApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-chats'] }),
  });

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <AssistantSidebarContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle,
        isMobile,
        isMobileOpen,
        setMobileOpen,
        hasChats: chats.length > 0,
        chats,
        isLoadingChats,
        deleteChat: deleteMutation.mutate,
      }}
    >
      {children}
    </AssistantSidebarContext.Provider>
  );
}

export function useAssistantSidebar() {
  const context = useContext(AssistantSidebarContext);
  if (!context) {
    throw new Error('useAssistantSidebar must be used within AssistantSidebarProvider');
  }
  return context;
}
