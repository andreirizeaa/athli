import { create } from 'zustand';
import {
  getChats,
  getArchivedChats,
  archiveChat,
  deleteChat,
  markChatAsRead,
  readAllChats,
  type Chat,
} from '@/services/chats-service';

type ChatsStore = {
  // State
  chats: Chat[];
  archivedChats: Chat[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setChats: (chats: Chat[]) => void;
  loadChats: () => Promise<void>;
  loadArchivedChats: () => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updateChat: (chat: Chat) => void;
  addChat: (chat: Chat) => void;
  clearChats: () => void;
};

export const useChatsStore = create<ChatsStore>((set, get) => ({
  // Initial state
  chats: [],
  archivedChats: [],
  isLoading: false,
  error: null,

  // Set chats directly
  setChats: (chats) => {
    set({ chats, error: null });
  },

  // Load chats from API
  loadChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const chats = await getChats();
      set({ chats, isLoading: false });
      console.log('[ChatsStore] Chats loaded:', chats.length);
    } catch (error: any) {
      console.error('[ChatsStore] Error loading chats:', error);
      set({
        error: error.message || 'Failed to load chats',
        isLoading: false,
      });
    }
  },

  // Load archived chats
  loadArchivedChats: async () => {
    try {
      const archivedChats = await getArchivedChats();
      set({ archivedChats });
      console.log('[ChatsStore] Archived chats loaded:', archivedChats.length);
    } catch (error: any) {
      console.error('[ChatsStore] Error loading archived chats:', error);
    }
  },

  // Archive a chat
  archiveChat: async (chatId) => {
    try {
      await archiveChat(chatId);
      const { chats } = get();
      const chatToArchive = chats.find((c) => c.id === chatId);
      set({
        chats: chats.filter((c) => c.id !== chatId),
        archivedChats: chatToArchive
          ? [...get().archivedChats, chatToArchive]
          : get().archivedChats,
      });
    } catch (error: any) {
      console.error('[ChatsStore] Error archiving chat:', error);
      throw error;
    }
  },

  // Delete a chat
  deleteChat: async (chatId) => {
    try {
      await deleteChat(chatId);
      set({
        chats: get().chats.filter((c) => c.id !== chatId),
        archivedChats: get().archivedChats.filter((c) => c.id !== chatId),
      });
    } catch (error: any) {
      console.error('[ChatsStore] Error deleting chat:', error);
      throw error;
    }
  },

  // Mark a chat as read
  markAsRead: async (chatId) => {
    try {
      await markChatAsRead(chatId);
      set({
        chats: get().chats.map((c) =>
          c.id === chatId ? { ...c, unread_count: 0 } : c
        ),
      });
    } catch (error: any) {
      console.error('[ChatsStore] Error marking chat as read:', error);
      throw error;
    }
  },

  // Mark all chats as read
  markAllAsRead: async () => {
    try {
      await readAllChats();
      set({
        chats: get().chats.map((c) => ({ ...c, unread_count: 0 })),
      });
    } catch (error: any) {
      console.error('[ChatsStore] Error marking all chats as read:', error);
      throw error;
    }
  },

  // Update a single chat (for realtime updates)
  updateChat: (chat) => {
    const { chats } = get();
    const exists = chats.find((c) => c.id === chat.id);
    if (exists) {
      set({ chats: chats.map((c) => (c.id === chat.id ? chat : c)) });
    } else {
      set({ chats: [chat, ...chats] });
    }
  },

  // Add a new chat
  addChat: (chat) => {
    set({ chats: [chat, ...get().chats] });
  },

  // Clear chats (on logout)
  clearChats: () => {
    set({ chats: [], archivedChats: [], error: null, isLoading: false });
  },
}));
