import { create } from 'zustand';
import {
  getChats,
  getArchivedChats,
  archiveChat,
  unarchiveChat,
  deleteChat,
  markChatAsRead,
  readAllChats,
  getChatMessages,
  type Chat,
  type ChatMessage,
} from '@/services/chats-service';

type MessagesCache = {
  [chatId: string]: {
    messages: ChatMessage[];
    fetchedAt: number;
  };
};

// Cache messages for 5 minutes
const MESSAGES_CACHE_TTL_MS = 5 * 60 * 1000;

type ChatsStore = {
  // State
  chats: Chat[];
  archivedChats: Chat[];
  isLoading: boolean;
  error: string | null;
  messagesCache: MessagesCache;

  // Actions
  setChats: (chats: Chat[]) => void;
  loadChats: () => Promise<void>;
  loadArchivedChats: () => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updateChat: (chat: Chat) => void;
  addChat: (chat: Chat) => void;
  clearChats: () => void;
  // Messages cache actions
  getCachedMessages: (chatId: string) => ChatMessage[] | null;
  prefetchMessages: (chatId: string) => Promise<ChatMessage[]>;
  setCachedMessages: (chatId: string, messages: ChatMessage[]) => void;
  invalidateMessagesCache: (chatId: string) => void;
  prefetchTopMessages: (count?: number) => Promise<void>;
};

export const useChatsStore = create<ChatsStore>((set, get) => ({
  // Initial state
  chats: [],
  archivedChats: [],
  isLoading: false,
  error: null,
  messagesCache: {},

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

  // Archive a chat (optimistic update)
  archiveChat: async (chatId) => {
    const { chats } = get();
    const chatToArchive = chats.find((c) => c.id === chatId);

    // Optimistic update - remove from list immediately
    set({
      chats: chats.filter((c) => c.id !== chatId),
      archivedChats: chatToArchive
        ? [...get().archivedChats, chatToArchive]
        : get().archivedChats,
    });

    try {
      await archiveChat(chatId);
    } catch (error: any) {
      // Rollback on error
      console.error('[ChatsStore] Error archiving chat:', error);
      if (chatToArchive) {
        set({
          chats: [...get().chats, chatToArchive],
          archivedChats: get().archivedChats.filter((c) => c.id !== chatId),
        });
      }
      throw error;
    }
  },

  // Unarchive a chat (optimistic update)
  unarchiveChat: async (chatId) => {
    const { archivedChats, chats } = get();
    const chatToUnarchive = archivedChats.find((c) => c.id === chatId);

    // Optimistic update - move from archived to main list immediately
    set({
      archivedChats: archivedChats.filter((c) => c.id !== chatId),
      chats: chatToUnarchive ? [chatToUnarchive, ...chats] : chats,
    });

    try {
      await unarchiveChat(chatId);
    } catch (error: any) {
      // Rollback on error
      console.error('[ChatsStore] Error unarchiving chat:', error);
      if (chatToUnarchive) {
        set({
          archivedChats: [...get().archivedChats, chatToUnarchive],
          chats: get().chats.filter((c) => c.id !== chatId),
        });
      }
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
    set({ chats: [], archivedChats: [], error: null, isLoading: false, messagesCache: {} });
  },

  // Get cached messages if still valid
  getCachedMessages: (chatId) => {
    const { messagesCache } = get();
    const cached = messagesCache[chatId];
    if (!cached) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.fetchedAt > MESSAGES_CACHE_TTL_MS) {
      // Cache expired, remove it
      const { [chatId]: _, ...rest } = messagesCache;
      set({ messagesCache: rest });
      return null;
    }

    return cached.messages;
  },

  // Prefetch messages for a chat (returns cached if available, fetches if not)
  prefetchMessages: async (chatId) => {
    const cached = get().getCachedMessages(chatId);
    if (cached) {
      return cached;
    }

    try {
      const messages = await getChatMessages(chatId);
      get().setCachedMessages(chatId, messages);
      return messages;
    } catch (error) {
      console.error('[ChatsStore] Error prefetching messages:', error);
      return [];
    }
  },

  // Set cached messages
  setCachedMessages: (chatId, messages) => {
    set({
      messagesCache: {
        ...get().messagesCache,
        [chatId]: {
          messages,
          fetchedAt: Date.now(),
        },
      },
    });
  },

  // Invalidate messages cache for a chat (call after sending a message)
  invalidateMessagesCache: (chatId) => {
    const { messagesCache } = get();
    const { [chatId]: _, ...rest } = messagesCache;
    set({ messagesCache: rest });
  },

  // Prefetch messages for top N chats (call during app init for faster navigation)
  prefetchTopMessages: async (count = 10) => {
    const { chats, prefetchMessages } = get();
    if (chats.length === 0) return;

    // Sort by last message time and get top N
    const sortedChats = [...chats].sort((a, b) => {
      const aTime = a.last_message_at?.getTime() || 0;
      const bTime = b.last_message_at?.getTime() || 0;
      return bTime - aTime;
    });

    const topChats = sortedChats.slice(0, count);
    console.log(`[ChatsStore] Prefetching messages for top ${topChats.length} chats`);

    // Prefetch in parallel (don't block)
    await Promise.all(topChats.map((chat) => prefetchMessages(chat.id)));
    console.log('[ChatsStore] Message prefetching complete');
  },
}));
