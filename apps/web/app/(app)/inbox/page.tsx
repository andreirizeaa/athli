'use client';

import React from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Image as ImageIcon,
  FileText,
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/general/utils';
import { messageDraftStorage } from '@/lib/general/message-draft-storage';
import { sendMessage } from '@/api/coach/coach-message-service';
import { searchNotes } from '@/api/coach/coach-client-service';
import { useCoachClients } from '@/hooks/use-coach-clients';
import type { Athlete } from '@/api/coach/coach-client-service';
import {
  type Contact,
  type Message,
} from '@/components/app/app-shell';
import { useQueryClient } from '@tanstack/react-query';
import { useConversations } from '@/hooks/use-conversations';
import { useInfiniteMessages } from '@/hooks/use-infinite-messages';
import { useRealtimeConversations, useRealtimeMessages, useSyncReadReceipt, useMessageMerging, useRealtimeReadReceiptsForUser, useRealtimeReadReceipts } from '@/hooks/use-realtime-messaging';
import { sendMessage as sendMessageAPI, markConversationAsRead, addReaction, removeReaction, deleteMessage as deleteMessageAPI } from '@/lib/messaging/messaging-api-client';
import type { Conversation, OptimisticMessage, ReadReceipt } from '@athli/shared-types';
import { createOptimisticMessage } from '@athli/shared-types';
import { ContactListItem } from './components/contact-list-item';
import { format } from 'date-fns';
import { SidePanel } from '@/components/app/side-panel';
import { AssignAthletesList } from '@/components/app/assign-athletes-list';
import { BroadcastSidePanel } from '@/app/(app)/inbox/components/broadcast-side-panel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InboxSidebar } from './components/inbox-sidebar';
import { ChatHeader } from './components/chat-header';
import { MessageList } from './components/message-list';
import { MessageInput } from './components/message-input';
import { MessageInputProvider, useMessageInput } from './components/message-input-context';
import { ClientProfileProvider, useClientProfileContext } from '@/app/(app)/athletes/[clientId]/client-profile-context';
import { ClientProfileLayoutContent } from '@/app/(app)/athletes/[clientId]/layout';
import { ClientProfileContent } from './components/client-profile-content';
import { SectionLoader } from '@/components/ui/section-loader';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAttachmentUrls } from '@/hooks/use-attachment-urls';
import { useFeatureAccess } from '@/lib/permissions/feature-gate';
import {
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';


type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number | null; // timestamp in milliseconds
};

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Training Progress Update',
    body: "Client has shown significant improvement in their squat form. We've increased the weight by 10kg and they're maintaining proper technique. Next session we'll focus on deadlift variations.",
    createdAt: new Date('2025-08-21T17:50:00').getTime(),
    updatedAt: new Date('2025-08-21T18:30:00').getTime(),
  },
  {
    id: '2',
    title: 'Nutrition Consultation',
    body: 'Discussed meal timing and protein intake. Client is tracking macros well. Recommended increasing water intake before workouts.',
    createdAt: new Date('2025-08-20T14:15:00').getTime(),
    updatedAt: null,
  },
  {
    id: '3',
    title: 'Injury Prevention Notes',
    body: "Client mentioned slight discomfort in left shoulder during overhead movements. We've adjusted the program to focus on mobility work and reduced overhead load. Will monitor closely in next session.",
    createdAt: new Date('2025-08-19T10:00:00').getTime(),
    updatedAt: new Date('2025-08-19T16:45:00').getTime(),
  },
  {
    id: '4',
    title: 'Weekly Check-in',
    body: '',
    createdAt: new Date('2025-08-18T09:30:00').getTime(),
    updatedAt: null,
  },
  {
    id: '5',
    title: 'Goal Setting Session',
    body: "Client wants to focus on building muscle mass over the next 3 months. We've set specific targets and created a progressive overload plan. They're motivated and committed to the program.",
    createdAt: new Date('2025-08-17T15:20:00').getTime(),
    updatedAt: null,
  },
];

const formatNoteDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const formatted = format(date, 'd MMM, yyyy - h:mma');
  // Capitalize the month abbreviation (e.g., "aug" -> "Aug")
  // Format: "21 aug, 2025 - 5:50pm" -> "21 Aug, 2025 - 5:50pm"
  const parts = formatted.split(' ');
  if (parts.length >= 2) {
    // Capitalize the month (second part, e.g., "aug," -> "Aug,")
    parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
  }
  return parts.join(' ');
};

// Wrapper component to access context and expose it via ref
const MessageInputWrapper: React.FC<{
  contextRef: React.MutableRefObject<{
    setReplyingToMessage: (message: Message | null) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    addAttachment: (file: File, type: import('@/components/app/types').AttachmentType) => void;
    addAttachments: (files: File[], type: import('@/components/app/types').AttachmentType) => void;
    canAddMoreAttachments: boolean;
  } | null>;
  selectedContact: Contact | null;
}> = ({ contextRef, selectedContact }) => {
  const { setReplyingToMessage, textareaRef, addAttachment, addAttachments, canAddMoreAttachments } = useMessageInput();

  // Expose context methods via ref
  React.useEffect(() => {
    contextRef.current = { setReplyingToMessage, textareaRef, addAttachment, addAttachments, canAddMoreAttachments };
  }, [contextRef, setReplyingToMessage, textareaRef, addAttachment, addAttachments, canAddMoreAttachments]);

  return <MessageInput selectedContact={selectedContact} />;
};

// Helper component to show a unified loading overlay for the inbox areas
const InboxUnifiedLoader = ({ isNavigating }: { isNavigating: boolean }) => {
  const t = useTranslations();
  const { isLoading } = useClientProfileContext();
  if (!isLoading && !isNavigating) return null;
  return <SectionLoader subtitle={t('messages.loadingConversation')} />;
};

const InboxPage = () => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();
  const contactIdFromPath = params?.contactId as string | undefined;
  const { user } = useUserProfile();
  const isMobile = useIsMobile();

  // State-based tab management (no URL routing for tabs to avoid flicker)
  const [activeClientTab, setActiveClientTab] = React.useState('overview');

  // Archived conversations toggle (moved up for useConversations dependency)
  const [showArchivedConversations, setShowArchivedConversations] = React.useState(false);

  // Fetch real conversations from backend API
  const { conversations, isLoading: isLoadingConversations, refetch: refetchConversations } = useConversations({ includeArchived: showArchivedConversations });

  // Keep athletes list for client profile view
  const { clients: athletes, isLoading: isLoadingClients } = useCoachClients();

  const [selectedContactId, setSelectedContactId] = React.useState<string | undefined>(undefined);

  // Get conversation for selected contact
  const selectedConversation = React.useMemo(() =>
    conversations.find((c) => c.other_user_id === selectedContactId),
    [conversations, selectedContactId]
  );

  // Fetch messages for selected conversation with infinite scroll
  const {
    messages: apiMessages,
    isLoadingInitial: isLoadingMessages,
    isLoadingMore: isLoadingMoreMessages,
    hasMore: hasMoreMessages,
    refetch: refetchMessages,
    removeMessage: removeApiMessage,
    triggerRef: loadMoreTriggerRef,
  } = useInfiniteMessages({
    conversationId: selectedConversation?.id || null,
    enabled: !!selectedConversation?.id,
  });

  // Ref to access latest apiMessages in polling callbacks (avoids stale closure)
  const apiMessagesRef = React.useRef(apiMessages);
  React.useEffect(() => {
    apiMessagesRef.current = apiMessages;
  }, [apiMessages]);

  // Optimistic messages state for instant UI feedback when sending
  // IMPORTANT: Declared BEFORE useRealtimeMessages so the ref can access it
  const [optimisticMessages, setOptimisticMessages] = React.useState<OptimisticMessage[]>([]);

  // Ref to access latest optimistic messages in realtime callbacks (avoids stale closure)
  const optimisticMessagesRef = React.useRef(optimisticMessages);
  React.useEffect(() => {
    optimisticMessagesRef.current = optimisticMessages;
  }, [optimisticMessages]);

  // Realtime subscriptions
  const { realtimeMessages } = useRealtimeMessages({
    conversationId: selectedConversation?.id || '',
    userId: user?.id,
    // Only skip insert for ATTACHMENT messages that aren't ready yet
    // For text-only messages, let the realtime message be added - deduplication handles it
    shouldSkipInsert: React.useCallback((message: { id?: string; attachments_ready?: boolean }) => {
      const currentOptimistic = optimisticMessagesRef.current;
      if (currentOptimistic.length === 0) return false;

      const optimisticMatch = currentOptimistic.find((opt) => opt.id === message.id);
      if (!optimisticMatch) return false;

      // For text-only messages, DON'T skip - let realtime be added, then remove optimistic
      const hasAttachments = optimisticMatch.attachments && optimisticMatch.attachments.length > 0;
      if (!hasAttachments) return false;

      // For attachment messages, only skip if NOT ready yet (waiting for uploads)
      const isReady = message.attachments_ready !== false;
      return !isReady; // Skip only if attachments are NOT ready
    }, []),
    onMessageReceived: (message) => {
      // Remove matching optimistic message now that real message is in state
      setOptimisticMessages((prev) => {
        const optimisticMatch = prev.find((opt) => opt.id === message.id);
        
        if (!optimisticMatch) {
          // No matching optimistic message - nothing to remove
          return prev;
        }

        // For messages with attachments, only remove if the real message 
        // has attachments_ready=true (all attachments uploaded)
        const hasAttachments = optimisticMatch.attachments && optimisticMatch.attachments.length > 0;
        const isReady = (message as any).attachments_ready !== false;

        if (hasAttachments && !isReady) {
          // Keep optimistic - wait for attachments to be ready
          return prev;
        }

        // Safe to remove - revoke blob URLs to prevent memory leaks
        if (optimisticMatch.attachments) {
          optimisticMatch.attachments.forEach((att) => {
            if (att.local_uri?.startsWith('blob:')) {
              URL.revokeObjectURL(att.local_uri);
            }
          });
        }

        return prev.filter((opt) => opt.id !== message.id);
      });
    },
    onMessageUpdated: (message) => {
      // If a message is soft-deleted (is_deleted=true), remove it optimistically
      // Use explicit true check to handle any type coercion issues
      if (message.is_deleted === true || (message as any).is_deleted === true) {
        removeApiMessage(message.id);
      }
      // NOTE: We intentionally do NOT refetch here for regular updates (e.g., attachments added)
      // The polling mechanism handles cleanup for messages with attachments to prevent
      // race conditions that cause flicker. The polling ensures the real message has
      // signed_url on attachments before removing the optimistic message.
    },
    onMessageDeleted: (messageId) => {
      // Remove the deleted message from local state
      removeApiMessage(messageId);
    },
  });

  const { conversations: realtimeConversations } = useRealtimeConversations({
    userId: user?.id || '',
    onConversationUpdated: React.useCallback((conversation: Conversation) => {
      console.log('[Inbox Realtime] Conversation updated:', conversation.id, 'preview:', conversation.last_message_preview);
      // Invalidate the conversations query to refetch with fresh data (including joined fields)
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }, [queryClient]),
  });

  // Get conversation IDs for read receipt subscription
  const conversationIds = React.useMemo(() => conversations.map((c) => c.id), [conversations]);

  // Debounce timer ref to prevent excessive API calls
  const readReceiptDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to read receipt changes to update "read" status in chat list
  // When a client reads a message, this triggers and refreshes the conversations list
  useRealtimeReadReceiptsForUser({
    userId: user?.id || '',
    conversationIds,
    onReadReceiptUpdated: React.useCallback(() => {
      console.log('[Inbox] Read receipt updated, debouncing refetch');
      // Debounce: wait 1 second before refetching to batch multiple updates
      if (readReceiptDebounceRef.current) {
        clearTimeout(readReceiptDebounceRef.current);
      }
      readReceiptDebounceRef.current = setTimeout(() => {
        console.log('[Inbox] Refetching conversations after debounce');
        refetchConversations();
        readReceiptDebounceRef.current = null;
      }, 1000);
    }, [refetchConversations]),
  });

  // Optimistic reactions state for instant UI feedback when reacting
  // Maps messageId -> { senderReaction, recipientReaction }
  const [optimisticReactions, setOptimisticReactions] = React.useState<
    Record<string, { senderReaction?: string; recipientReaction?: string }>
  >({});

  // Clear optimistic messages and reactions when switching conversations
  React.useEffect(() => {
    setOptimisticMessages([]);
    setOptimisticReactions({});
  }, [selectedConversation?.id]);

  // Merge all 3 message sources: API + realtime + optimistic - transforms to UIMessage[]
  const mergedMessagesRaw = useMessageMerging(
    apiMessages || [],
    realtimeMessages,
    optimisticMessages,
    user?.id || null
  );

  // Subscribe to read receipt updates for this conversation
  // This allows the sender to see when their messages are read in realtime
  const { readReceipts } =   useRealtimeReadReceipts({
    conversationId: selectedConversation?.id || '',
    onReadReceiptUpdated: React.useCallback((receipt: ReadReceipt) => {
      console.log('[Inbox Detail] Read receipt updated:', receipt.user_id, 'at', receipt.last_read_at);
    }, []),
  });

  // Compute final message status using read receipts
  // For sent messages, check if recipient has read them based on their read receipt
  // This enhances the database-computed isRead with real-time read receipt data
  const isSelfConversation = selectedConversation?.coach_id === selectedConversation?.client_id;
  const mergedMessages = React.useMemo(() => {
    if (!user?.id) return mergedMessagesRaw;

    // Find the recipient's read receipt (not the current user's)
    // For self-conversations (demo: coach_id === client_id), use the only receipt available
    const recipientReceipt = isSelfConversation
      ? readReceipts[0]
      : readReceipts.find((r) => r.user_id !== user.id);

    return mergedMessagesRaw.map((msg) => {
      // Only update read status for own sent messages
      if (!msg.isSent) return msg;

      // If already marked as read from database, preserve it
      if (msg.isRead) return msg;

      // If recipient has a read receipt and it's after this message was sent
      if (recipientReceipt?.last_read_at) {
        const msgSentAt = new Date(msg.sent_at).getTime();
        const readAt = new Date(recipientReceipt.last_read_at).getTime();

        if (readAt >= msgSentAt) {
          return { ...msg, isRead: true };
        }
      }

      return msg;
    });
  }, [mergedMessagesRaw, readReceipts, user?.id, isSelfConversation]);

  // Collect attachments that need signed URL generation
  // Skip attachments that already have URLs (optimistic with local_uri, or API with signed_url)
  // Includes both main message attachments AND parent message attachments (for reply previews)
  const attachmentsNeedingUrls = React.useMemo(() => {
    if (!mergedMessages || mergedMessages.length === 0) return [];

    const allAttachments: typeof mergedMessages[0]['attachments'] = [];

    mergedMessages.forEach((msg) => {
      // Add main message attachments
      if (msg.attachments) {
        allAttachments.push(...msg.attachments);
      }
      // Add parent message attachments (for reply previews)
      const parentMsg = (msg as any).parent_message;
      if (parentMsg && parentMsg.attachments) {
        allAttachments.push(...parentMsg.attachments);
      }
    });

    return allAttachments.filter((att) => {
      if (!att) return false;
      // Skip optimistic attachments (have blob URL)
      if ((att as any).local_uri) return false;
      // Skip attachments that already have signed URL from API
      if ((att as any).signed_url) return false;
      // Only include if has file_path (needs URL generation from storage)
      return !!att.file_path;
    });
  }, [mergedMessages]);

  // Generate signed URLs only for attachments that need them
  const attachmentUrlMap = useAttachmentUrls(attachmentsNeedingUrls);

  // Auto-mark conversation as read when viewing it
  // Pass latest REAL message ID (skip optimistic temp-xxx IDs) to avoid database errors
  const latestRealMessage = React.useMemo(() => {
    // Find the latest message that's not optimistic (doesn't start with "temp-")
    for (let i = mergedMessages.length - 1; i >= 0; i--) {
      if (!mergedMessages[i].id.startsWith('temp-')) {
        return mergedMessages[i];
      }
    }
    return undefined;
  }, [mergedMessages]);

  useSyncReadReceipt({
    conversationId: selectedConversation?.id || '',
    userId: user?.id || '',
    enabled: !!selectedConversation && !!user,
    latestMessageId: latestRealMessage?.id,
  });

  const [isNavigating, setIsNavigating] = React.useState(false);
  const [isMessageListReady, setIsMessageListReady] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(!!contactIdFromPath);
  const [userManuallyOpenedSidebar, setUserManuallyOpenedSidebar] = React.useState(false);
  const [messageInput, setMessageInput] = React.useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = React.useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = React.useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = React.useState(false);
  const [isBroadcastUpgradeOpen, setIsBroadcastUpgradeOpen] = React.useState(false);
  const { hasAccess: hasBroadcastAccess } = useFeatureAccess('broadcast_messaging');
  const [isPowerViewOpen, setIsPowerViewOpenInternal] = React.useState(true); // Power view (client profile panel) open by default
  // On mobile, force power view to be closed
  const effectiveIsPowerViewOpen = isMobile ? false : isPowerViewOpen;
  const setIsPowerViewOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    if (!isMobile) {
      setIsPowerViewOpenInternal(value);
    }
  };
  const [noteTitle, setNoteTitle] = React.useState('');
  const [noteContent, setNoteContent] = React.useState('');
  const [isNoteEmpty, setIsNoteEmpty] = React.useState(true);
  const noteTitleInputRef = React.useRef<HTMLInputElement>(null);
  const noteTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = React.useState<Note[]>(mockNotes);
  const [isViewNoteOpen, setIsViewNoteOpen] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = React.useState('');
  const [editingNoteBody, setEditingNoteBody] = React.useState('');
  const [hasNoteChanges, setHasNoteChanges] = React.useState(false);
  const [isDeleteNoteMenuOpen, setIsDeleteNoteMenuOpen] = React.useState(false);
  const [isNoteSearchOpen, setIsNoteSearchOpen] = React.useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = React.useState('');
  const [filteredNotes, setFilteredNotes] = React.useState<Note[]>(mockNotes);

  React.useEffect(() => {
    if (isCreateNoteOpen && noteTitleInputRef.current) {
      // Small delay to ensure the sidebar is fully rendered
      setTimeout(() => {
        noteTitleInputRef.current?.focus();
      }, 100);
    }
  }, [isCreateNoteOpen]);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setEditingNoteTitle(note.title);
    setEditingNoteBody(note.body);
    setHasNoteChanges(false);
    setIsViewNoteOpen(true);
  };

  // Update filtered notes when notes or search query changes
  React.useEffect(() => {
    if (!isNoteSearchOpen || !noteSearchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const performSearch = async () => {
      if (selectedContactId && user?.id) {
        await searchNotes(selectedContactId, user.id, noteSearchQuery);
      }

      // Client-side filtering
      const query = noteSearchQuery.toLowerCase();
      const filtered = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.body.toLowerCase().includes(query)
      );
      setFilteredNotes(filtered);
    };

    performSearch();
  }, [notes, noteSearchQuery, isNoteSearchOpen, selectedContactId]);

  React.useEffect(() => {
    if (selectedNote) {
      const titleChanged = editingNoteTitle !== selectedNote.title;
      const bodyChanged = editingNoteBody !== selectedNote.body;
      setHasNoteChanges(titleChanged || bodyChanged);
    }
  }, [editingNoteTitle, editingNoteBody, selectedNote]);

  React.useEffect(() => {
    if (isViewNoteOpen) {
      // Prevent auto-focus when sidebar opens
      // Use a small delay to ensure the sidebar is fully rendered
      const timeoutId = setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement;
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
        ) {
          activeElement.blur();
        }
        // Also explicitly blur any inputs in the view note panel
        const titleInput = document.getElementById('view-note-title') as HTMLInputElement;
        const bodyTextarea = document.getElementById('view-note-body') as HTMLTextAreaElement;
        if (titleInput) titleInput.blur();
        if (bodyTextarea) bodyTextarea.blur();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isViewNoteOpen]);

  const handleSaveNote = () => {
    if (!selectedNote) return;

    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNote.id
          ? {
            ...note,
            title: editingNoteTitle,
            body: editingNoteBody,
            updatedAt: Date.now(),
          }
          : note
      )
    );
    setIsViewNoteOpen(false);
    setSelectedNote(null);
    setHasNoteChanges(false);
  };

  const handleCancelNoteEdit = () => {
    if (selectedNote) {
      setEditingNoteTitle(selectedNote.title);
      setEditingNoteBody(selectedNote.body);
    }
    setHasNoteChanges(false);
    setIsViewNoteOpen(false);
    setSelectedNote(null);
  };

  const handleDeleteNote = () => {
    if (!selectedNote) return;

    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== selectedNote.id));
    setIsViewNoteOpen(false);
    setSelectedNote(null);
    setHasNoteChanges(false);
  };

  const [textareaHeight, setTextareaHeight] = React.useState(36);
  const [openDeleteMenuId, setOpenDeleteMenuId] = React.useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = React.useState<Message | null>(null);
  const [drafts, setDrafts] = React.useState<
    Record<string, import('@/lib/general/message-draft-storage').MessageDraftData>
  >({});
  const [attachedPdf, setAttachedPdf] = React.useState<File | null>(null);
  const [attachedImages, setAttachedImages] = React.useState<File[]>([]);
  const [attachedVideo, setAttachedVideo] = React.useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [dragCounter, setDragCounter] = React.useState(0);
  const isLoadingDraftRef = React.useRef(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = React.useRef(false);
  const previousMessageCountRef = React.useRef(0);

  // Check if a contact has a draft (text, PDF, video, or images)
  const hasDraft = React.useCallback(
    (contactId: string): boolean => {
      const draft = drafts[contactId];
      if (!draft) return false;
      return (
        Boolean(draft.text?.trim()) ||
        Boolean(draft.pdf) ||
        Boolean(draft.video) ||
        Boolean(draft.images && draft.images.length > 0)
      );
    },
    [drafts]
  );

  // Update drafts state from localStorage
  // Preserves optimistic updates (drafts with empty data fields) until actual data is saved
  const updateDraftsState = React.useCallback(() => {
    const allDrafts = messageDraftStorage.getAllDrafts();
    setDrafts((prev) => {
      const updated = { ...allDrafts };
      // Preserve optimistic updates (drafts with files that have empty data)
      // These will be replaced once the actual save completes
      Object.keys(prev).forEach((contactId) => {
        const prevDraft = prev[contactId];
        const savedDraft = updated[contactId];

        // If we have an optimistic PDF update (has name/size but empty or missing data)
        if (prevDraft?.pdf) {
          const prevHasData = prevDraft.pdf.data && prevDraft.pdf.data !== '';
          const savedHasData = savedDraft?.pdf?.data && savedDraft.pdf.data !== '';

          // Preserve optimistic update only if saved version doesn't have data yet
          if (!prevHasData && !savedHasData) {
            if (!updated[contactId]) {
              updated[contactId] = { text: prevDraft.text || '' };
            }
            updated[contactId].pdf = prevDraft.pdf;
            // Also preserve video and images if they exist in optimistic state
            if (prevDraft.video) {
              updated[contactId].video = prevDraft.video;
            }
            if (prevDraft.images && prevDraft.images.length > 0) {
              updated[contactId].images = prevDraft.images;
            }
          }
        }

        // If we have an optimistic video update (has name/size but empty or missing data)
        if (prevDraft?.video) {
          const prevHasData = prevDraft.video.data && prevDraft.video.data !== '';
          const savedHasData = savedDraft?.video?.data && savedDraft.video.data !== '';

          // Preserve optimistic update only if saved version doesn't have data yet
          if (!prevHasData && !savedHasData) {
            if (!updated[contactId]) {
              updated[contactId] = { text: prevDraft.text || '' };
            }
            updated[contactId].video = prevDraft.video;
            // Also preserve PDF and images if they exist in optimistic state
            if (prevDraft.pdf) {
              updated[contactId].pdf = prevDraft.pdf;
            }
            if (prevDraft.images && prevDraft.images.length > 0) {
              updated[contactId].images = prevDraft.images;
            }
          }
        }

        // If we have optimistic image updates (has images but empty data)
        if (prevDraft?.images && prevDraft.images.length > 0) {
          const prevHasData = prevDraft.images.some((img: { data?: string }) => img.data && img.data !== '');
          const savedHasData = savedDraft?.images?.some((img: { data?: string }) => img.data && img.data !== '');

          // Preserve optimistic update only if saved version doesn't have data yet
          if (!prevHasData && !savedHasData) {
            if (!updated[contactId]) {
              updated[contactId] = { text: prevDraft.text || '' };
            }
            updated[contactId].images = prevDraft.images;
            // Preserve PDF and video if they exist in optimistic state
            if (prevDraft.pdf) {
              updated[contactId].pdf = prevDraft.pdf;
            }
            if (prevDraft.video) {
              updated[contactId].video = prevDraft.video;
            }
          }
        }
      });
      return updated;
    });
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messageInputContextRef = React.useRef<{
    setReplyingToMessage: (message: Message | null) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    addAttachment: (file: File, type: import('@/components/app/types').AttachmentType) => void;
    addAttachments: (files: File[], type: import('@/components/app/types').AttachmentType) => void;
    canAddMoreAttachments: boolean;
  } | null>(null);

  // Convert conversations to Contact format for UI compatibility
  const contacts = React.useMemo<Contact[]>(() => {
    return conversations
      .filter((conv): conv is typeof conv & { other_user_id: string } => !!conv.other_user_id)
      .map((conv) => ({
        id: conv.other_user_id,
        name: conv.other_user_name || 'Unknown',
        avatar: conv.other_user_avatar ?? undefined,
        lastMessage: conv.last_message_preview || '',
        timestamp: conv.last_message_at ? format(conv.last_message_at, 'HH:mm') : '',
        unreadCount: conv.unread_count || 0,
        isOnline: false, // TODO: Add online status tracking
        lastMessageSenderId: conv.last_message_sender_id,
        lastMessageIsRead: conv.last_message_is_read,
      }));
  }, [conversations]);

  // Derived state
  const selectedContact = selectedContactId
    ? contacts.find((contact) => contact.id === selectedContactId) || null
    : null;

  // Helper to get public URL for a storage file
  const getStorageUrl = (bucketId: string, filePath: string): string => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${bucketId}/${filePath}`;
  };

  // Helper to determine attachment type from MIME type
  const getAttachmentType = (mimeType?: string): 'image' | 'video' | 'pdf' | 'audio' => {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.startsWith('audio/')) return 'audio';
    return 'pdf'; // default to pdf for documents
  };

  // Convert merged UIMessages to local Message format for MessageList component
  const currentMessages = React.useMemo<Message[]>(() => {
    if (!mergedMessages || mergedMessages.length === 0) return [];

    return mergedMessages.map((msg) => {
      // Helper to get the URL for an attachment
      // Priority: local_uri (optimistic) > signed_url (from API) > fallback public URL
      const getAttachmentUrl = (attachment: NonNullable<typeof msg.attachments>[number]): string => {
        // Use local_uri for optimistic messages (blob URL)
        if ((attachment as any).local_uri) {
          return (attachment as any).local_uri;
        }
        // Use signed_url from API if available
        if ((attachment as any).signed_url) {
          return (attachment as any).signed_url;
        }
        // Fallback to URL map from hook (for realtime messages)
        if (attachmentUrlMap[attachment.id]) {
          return attachmentUrlMap[attachment.id];
        }
        // Last resort: public URL (may not work if bucket is private)
        return getStorageUrl(attachment.bucket_id || 'message_attachments', attachment.file_path);
      };

      // Transform attachments to the format expected by MessageAttachmentGrid
      const transformedAttachments = msg.attachments?.map((a) => ({
        name: a.filename,
        data: getAttachmentUrl(a),
        type: a.mime_type || 'application/octet-stream',
        size: a.size_bytes || 0,
        attachmentType: getAttachmentType(a.mime_type),
        // Include duration for audio attachments (convert from seconds to ms)
        duration: a.duration_seconds ? a.duration_seconds * 1000 : undefined,
      }));

      return {
        id: msg.id,
        text: msg.text || '',  // UIMessage.text (already transformed from content)
        timestamp: format(new Date(msg.sent_at), 'HH:mm'),
        sentAt: new Date(msg.sent_at), // Full date for date pill grouping
        isSent: msg.isSent,    // UIMessage.isSent (already computed)
        isRead: msg.isRead,    // UIMessage.isRead (already computed)
        // New unified attachments array with proper URLs
        attachments: transformedAttachments,
        // Legacy fields for backward compatibility
        images: msg.attachments
          ?.filter((a) => a.mime_type?.startsWith('image/'))
          .map((a) => ({
            name: a.filename,
            data: getAttachmentUrl(a),
            type: a.mime_type || 'image/jpeg',
            size: a.size_bytes || 0,
          })),
        pdf: msg.attachments?.find((a) => a.mime_type === 'application/pdf')
          ? (() => {
              const pdfAttachment = msg.attachments!.find((a) => a.mime_type === 'application/pdf')!;
              return {
                name: pdfAttachment.filename,
                data: getAttachmentUrl(pdfAttachment),
                type: 'application/pdf',
                size: pdfAttachment.size_bytes || 0,
              };
            })()
          : undefined,
        video: msg.attachments?.find((a) => a.mime_type?.startsWith('video/'))
          ? (() => {
              const videoAttachment = msg.attachments!.find((a) => a.mime_type?.startsWith('video/'))!;
              return {
                name: videoAttachment.filename,
                data: getAttachmentUrl(videoAttachment),
                type: videoAttachment.mime_type || 'video/mp4',
                size: videoAttachment.size_bytes || 0,
              };
            })()
          : undefined,
        // UIMessage.replyTo is already transformed, use it directly
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo.id,
              text: msg.replyTo.text || '',
              isSent: msg.replyTo.isSent,
              is_deleted: msg.replyTo.is_deleted,
              attachments: msg.replyTo.attachments?.map((a) => {
                // Priority: signed_url from API > URL from map > fallback public URL
                const url = (a as any).signed_url || attachmentUrlMap[a.id] || getStorageUrl(a.bucket_id || 'message_attachments', a.file_path);
                return {
                  name: a.filename,
                  data: url,
                  type: a.mime_type || 'application/octet-stream',
                  size: a.size_bytes || 0,
                  attachmentType: getAttachmentType(a.mime_type),
                };
              }),
            }
          : undefined,
        reaction: msg.reactions?.[0]?.reaction,
        // Extract sender and recipient reactions from reactions array
        // senderReaction = reaction from the person who sent this message
        // recipientReaction = reaction from the person who received this message
        // Apply optimistic reactions if present (for instant UI feedback)
        // Note: empty string '' means "no reaction" (deletion), so we use it directly
        senderReaction: optimisticReactions[msg.id]?.senderReaction !== undefined
          ? (optimisticReactions[msg.id].senderReaction === '' ? undefined : optimisticReactions[msg.id].senderReaction)
          : msg.reactions?.find(r => r.user_id === msg.sender_id)?.reaction,
        recipientReaction: optimisticReactions[msg.id]?.recipientReaction !== undefined
          ? (optimisticReactions[msg.id].recipientReaction === '' ? undefined : optimisticReactions[msg.id].recipientReaction)
          : msg.reactions?.find(r => r.user_id !== msg.sender_id)?.reaction,
      };
    });
  }, [mergedMessages, attachmentUrlMap, optimisticReactions]);

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, contacts]);

  const filteredAthletes = React.useMemo(() => {
    if (!searchQuery.trim()) return athletes;
    const query = searchQuery.toLowerCase();
    return athletes.filter(
      (athlete) =>
        athlete.name.toLowerCase().includes(query) || athlete.email.toLowerCase().includes(query)
    );
  }, [searchQuery, athletes]);

  // Scroll to bottom: instant on initial load, smooth when new messages arrive
  React.useEffect(() => {
    const messageCount = currentMessages.length;
    const previousCount = previousMessageCountRef.current;

    const scrollToBottom = (instant: boolean) => {
      const scrollViewport = messagesEndRef.current?.closest('[data-slot="scroll-area-viewport"]');
      if (scrollViewport) {
        if (instant) {
          scrollViewport.scrollTop = scrollViewport.scrollHeight;
        } else {
          scrollViewport.scrollTo({
            top: scrollViewport.scrollHeight,
            behavior: 'smooth',
          });
        }
      }
    };

    // Initial scroll: when we have messages AND not loading AND haven't scrolled yet
    if (!hasInitialScrolledRef.current && !isLoadingMessages && messageCount > 0) {
      hasInitialScrolledRef.current = true;
      // Use setTimeout to ensure Radix ScrollArea has fully rendered
      setTimeout(() => {
        scrollToBottom(true);
        // Retry scroll and reveal overlay
        setTimeout(() => {
          scrollToBottom(true);
          setIsMessageListReady(true);
        }, 100);
      }, 50);
    } else if (!hasInitialScrolledRef.current && !isLoadingMessages && messageCount === 0) {
      // No messages - just show the empty state
      hasInitialScrolledRef.current = true;
      setIsMessageListReady(true);
    } else if (hasInitialScrolledRef.current && messageCount > previousCount) {
      // New message added - smooth scroll
      requestAnimationFrame(() => scrollToBottom(false));
    }

    previousMessageCountRef.current = messageCount;
  }, [currentMessages, isLoadingMessages]);

  // Reset when conversation changes
  React.useEffect(() => {
    hasInitialScrolledRef.current = false;
    previousMessageCountRef.current = 0;
    setIsMessageListReady(false);
  }, [selectedContactId]);

  // Handler for manual sidebar toggle - tracks user preference
  const handleManualSidebarToggle = React.useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    // Track if user manually opened the sidebar (not collapsed means opened)
    setUserManuallyOpenedSidebar(!collapsed);
  }, []);

  // Handler for contact click in sidebar - shows loading immediately
  const handleContactClick = React.useCallback((contactId: string) => {
    setIsNavigating(true);
    // Only auto-collapse if user hasn't manually opened the sidebar
    if (!userManuallyOpenedSidebar) {
      setIsSidebarCollapsed(true);
    }
    router.push(`/inbox/${contactId}/overview`);
  }, [router, userManuallyOpenedSidebar]);

  // Read contact ID from URL path params on mount and when path changes
  React.useEffect(() => {
    if (contactIdFromPath && !isLoadingClients) {
      const contact = contacts.find(c => c.id === contactIdFromPath);
      if (contact) {
        setSelectedContactId(contactIdFromPath);
        // Only auto-collapse if user hasn't manually opened the sidebar
        if (!userManuallyOpenedSidebar) {
          setIsSidebarCollapsed(true);
        }
        // Reset to overview tab when selecting a new contact
        setActiveClientTab('overview');
        // Clear navigating state once contact is selected
        setIsNavigating(false);
      } else { // Invalid contact ID, redirect to base inbox page
        router.replace('/inbox');
        setSelectedContactId(undefined);
        setIsNavigating(false);
      }
    } else {
      setSelectedContactId(undefined);
      setIsNavigating(false);
    }
  }, [contactIdFromPath, contacts, isLoadingClients, router, userManuallyOpenedSidebar]);

  // Load drafts on mount
  React.useEffect(() => {
    updateDraftsState();
  }, [updateDraftsState]);

  // Load draft when contact is selected
  React.useEffect(() => {
    const currentContactId = selectedContactId;
    isLoadingDraftRef.current = true;

    // Immediately clear files and text to prevent save effects from saving old data to new contact
    setMessageInput('');
    setAttachedPdf(null);
    setAttachedVideo(null);
    setAttachedImages([]);

    // Use a small delay to ensure state clears before loading draft
    // This prevents race conditions where save effects might fire with old data
    setTimeout(() => {
      if (currentContactId && selectedContactId === currentContactId) {
        const draft = messageDraftStorage.getDraft(currentContactId);
        if (draft.text) {
          setMessageInput(draft.text);
        }

        // Restore PDF if it exists
        if (draft.pdf) {
          try {
            const pdfFile = messageDraftStorage.pdfDataToFile(draft.pdf);
            setAttachedPdf(pdfFile);
            setTextareaHeight(60);
          } catch {
            // If PDF restoration fails, just clear it
            setAttachedPdf(null);
          }
        }

        // Restore video if it exists
        if (draft.video) {
          try {
            const videoFile = messageDraftStorage.videoDataToFile(draft.video);
            setAttachedVideo(videoFile);
            setTextareaHeight(60);
          } catch {
            // If video restoration fails, just clear it
            setAttachedVideo(null);
          }
        } else {
          setAttachedVideo(null);
        }

        // Restore images if they exist
        if (draft.images && draft.images.length > 0) {
          try {
            const imageFiles = draft.images.map((img) => messageDraftStorage.imageDataToFile(img));
            setAttachedImages(imageFiles);
            setTextareaHeight(60);
          } catch {
            // If image restoration fails, just clear them
            setAttachedImages([]);
          }
        }
      }

      // Reset flag after a delay to allow all state updates and effects to settle
      // This prevents save effects from firing during draft loading
      setTimeout(() => {
        isLoadingDraftRef.current = false;
      }, 300);
    }, 50);
  }, [selectedContactId]);

  // Save draft as user types (with debouncing for text)
  React.useEffect(() => {
    if (!selectedContactId) return;
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return;

    // Only save if there's actual content
    const hasContent =
      messageInput.trim().length > 1 || attachedPdf || attachedVideo || attachedImages.length > 0;
    if (!hasContent) return;

    const timeoutId = setTimeout(() => {
      // Only save if there's actual content for this specific contact
      // Don't update state immediately - let the file-specific effects handle state updates
      // This prevents overwriting optimistic updates before FileReader completes
      messageDraftStorage.saveDraft(
        selectedContactId,
        messageInput,
        attachedPdf,
        attachedImages,
        attachedVideo
      );
      // Only update state if there are no files (text-only draft)
      // Files will trigger their own state updates via callbacks
      if (!attachedPdf && !attachedVideo && attachedImages.length === 0) {
        updateDraftsState();
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [messageInput, selectedContactId, attachedPdf, attachedImages, updateDraftsState]);

  // Save draft immediately when PDF changes (not debounced)
  React.useEffect(() => {
    if (!selectedContactId) return;
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return;

    const currentContactId = selectedContactId;
    const currentPdf = attachedPdf;
    const currentText = messageInput;
    const currentImages = attachedImages;

    // Check if this PDF is from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId);
    const isPdfFromDraft =
      existingDraft.pdf &&
      currentPdf &&
      existingDraft.pdf.name === currentPdf.name &&
      existingDraft.pdf.size === currentPdf.size;

    // Only save if PDF is actually being added (not removed) and not from draft
    if (currentPdf && !isPdfFromDraft) {
      // Update state optimistically for immediate feedback (before FileReader completes)
      setDrafts((prev) => {
        const updated = { ...prev };
        updated[currentContactId] = {
          text: currentText,
          pdf: {
            name: currentPdf.name,
            data: '', // Will be filled when FileReader completes
            type: currentPdf.type,
            size: currentPdf.size,
          },
        };
        return updated;
      });

      // Save draft with captured values to ensure correct contactId
      messageDraftStorage.saveDraft(
        currentContactId,
        currentText,
        currentPdf,
        currentImages,
        attachedVideo,
        () => {
          // Callback when PDF is saved (after FileReader completes)
          // Only update if we're still on the same contact
          if (selectedContactId === currentContactId) {
            // Force update from localStorage now that PDF is saved
            const savedDrafts = messageDraftStorage.getAllDrafts();
            setDrafts(savedDrafts);
          }
        }
      );
    } else if (
      currentPdf === null &&
      currentText.trim().length <= 1 &&
      currentImages.length === 0 &&
      !attachedVideo
    ) {
      // If PDF is removed and there's no other content, clear draft
      messageDraftStorage.removeDraft(currentContactId);
      updateDraftsState();
    }
  }, [
    attachedPdf,
    attachedVideo,
    attachedImages,
    selectedContactId,
    messageInput,
    updateDraftsState,
  ]);

  // Save draft immediately when images change (not debounced)
  React.useEffect(() => {
    if (!selectedContactId) return;
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return;

    const currentContactId = selectedContactId;
    const currentImages = attachedImages;
    const currentText = messageInput;
    const currentPdf = attachedPdf;

    // Check if these images are from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId);
    const isImagesFromDraft =
      existingDraft.images &&
      existingDraft.images.length > 0 &&
      currentImages.length > 0 &&
      existingDraft.images.length === currentImages.length &&
      existingDraft.images.every(
        (draftImg, idx) =>
          currentImages[idx] &&
          draftImg.name === currentImages[idx].name &&
          draftImg.size === currentImages[idx].size
      );

    // Only save if images are actually being added (not removed) and not from draft
    if (currentImages.length > 0 && !isImagesFromDraft) {
      // Update state optimistically for immediate feedback (before FileReader completes)
      setDrafts((prev) => {
        const updated = { ...prev };
        const existingDraft = updated[currentContactId];
        updated[currentContactId] = {
          text: currentText,
          // Preserve existing PDF if it exists, otherwise use current PDF
          ...(existingDraft?.pdf
            ? { pdf: existingDraft.pdf }
            : currentPdf
              ? {
                pdf: {
                  name: currentPdf.name,
                  data: '', // Will be filled when FileReader completes
                  type: currentPdf.type,
                  size: currentPdf.size,
                },
              }
              : {}),
          images: currentImages.map((img) => ({
            name: img.name,
            data: '', // Will be filled when FileReader completes
            type: img.type,
            size: img.size,
          })),
        };
        return updated;
      });

      // Save draft with captured values to ensure correct contactId
      messageDraftStorage.saveDraft(
        currentContactId,
        currentText,
        currentPdf,
        currentImages,
        attachedVideo,
        undefined, // onPdfSaved callback (not needed here)
        () => {
          // Callback when images are saved (after FileReader completes)
          // Only update if we're still on the same contact
          if (selectedContactId === currentContactId) {
            // Force update from localStorage now that images are saved
            const savedDrafts = messageDraftStorage.getAllDrafts();
            setDrafts(savedDrafts);
          }
        }
      );
      // The optimistic update above ensures the draft indicator shows immediately
      // The callback will update the state with actual base64 data when ready
    } else if (
      currentImages.length === 0 &&
      currentText.trim().length <= 1 &&
      !currentPdf &&
      !attachedVideo
    ) {
      // If images are removed and there's no other content, clear draft
      messageDraftStorage.removeDraft(currentContactId);
      updateDraftsState();
    }
  }, [
    attachedImages,
    selectedContactId,
    messageInput,
    attachedPdf,
    attachedVideo,
    updateDraftsState,
  ]);

  // Save draft immediately when video changes (not debounced)
  React.useEffect(() => {
    if (!selectedContactId) return;
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return;

    const currentContactId = selectedContactId;
    const currentVideo = attachedVideo;
    const currentText = messageInput;
    const currentImages = attachedImages;
    const currentPdf = attachedPdf;

    // Check if this video is from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId);
    const isVideoFromDraft =
      existingDraft.video &&
      currentVideo &&
      existingDraft.video.name === currentVideo.name &&
      existingDraft.video.size === currentVideo.size;

    // Only save if video is actually being added (not removed) and not from draft
    if (currentVideo && !isVideoFromDraft) {
      // Update state optimistically for immediate feedback (before FileReader completes)
      setDrafts((prev) => {
        const updated = { ...prev };
        updated[currentContactId] = {
          text: currentText,
          video: {
            name: currentVideo.name,
            data: '', // Will be filled when FileReader completes
            type: currentVideo.type,
            size: currentVideo.size,
          },
        };
        return updated;
      });

      // Save draft with captured values to ensure correct contactId
      messageDraftStorage.saveDraft(
        currentContactId,
        currentText,
        currentPdf,
        currentImages,
        currentVideo,
        undefined, // onPdfSaved callback (not needed here)
        undefined, // onImagesSaved callback (not needed here)
        () => {
          // Callback when video is saved (after FileReader completes)
          // Only update if we're still on the same contact
          if (selectedContactId === currentContactId) {
            // Force update from localStorage now that video is saved
            const savedDrafts = messageDraftStorage.getAllDrafts();
            setDrafts(savedDrafts);
          }
        }
      );
    } else if (
      currentVideo === null &&
      currentText.trim().length <= 1 &&
      currentImages.length === 0 &&
      !currentPdf
    ) {
      // If video is removed and there's no other content, clear draft
      messageDraftStorage.removeDraft(currentContactId);
      updateDraftsState();
    }
  }, [
    attachedVideo,
    attachedImages,
    selectedContactId,
    messageInput,
    attachedPdf,
    updateDraftsState,
  ]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const wasFocused = document.activeElement === textarea;
    const cursorPosition = textarea.selectionStart;

    // If replying, PDF/video attached, or images attached, ensure multi-line height
    if (replyingToMessage || attachedPdf || attachedVideo || attachedImages.length > 0) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 60;
      const maxHeight = 120;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    } else {
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;

      // Update height state
      setTextareaHeight(newHeight > 40 ? newHeight : 36);
    }

    // Restore focus and cursor position if it was focused
    if (wasFocused) {
      // Use a microtask to ensure DOM has updated
      Promise.resolve().then(() => {
        if (textarea && document.activeElement !== textarea) {
          textarea.focus();
          if (cursorPosition !== null && cursorPosition <= textarea.value.length) {
            textarea.setSelectionRange(cursorPosition, cursorPosition);
          }
        }
      });
    }
  }, [messageInput, replyingToMessage, attachedPdf, attachedVideo, attachedImages.length]);


  // Handler for MessageInputProvider - uses real messaging API with optimistic updates
  // ATOMIC FLOW: Client generates messageId, so optimistic ID = real ID (no deduplication needed)
  const handleSendMessageFromContext = React.useCallback(async (params: {
    text: string;
    attachments?: Array<{
      file: File;
      attachmentType: import('@/components/app/types').AttachmentType;
      durationMs?: number;
    }>;
    replyTo?: Message['replyTo'];
  }) => {
    if (!selectedContactId || !selectedConversation || !user?.id) {
      console.error('No contact or conversation selected');
      return;
    }

    // Determine message type based on attachments
    let messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text';

    if (params.attachments && params.attachments.length > 0) {
      const firstAttachment = params.attachments[0];
      if (firstAttachment.attachmentType === 'image') {
        messageType = 'image';
      } else if (firstAttachment.attachmentType === 'video') {
        messageType = 'video';
      } else if (firstAttachment.attachmentType === 'audio') {
        messageType = 'audio';
      } else if (firstAttachment.attachmentType === 'pdf') {
        messageType = 'file';
      }
    }

    // Create local preview URLs for attachments IMMEDIATELY (synchronous)
    // These are blob URLs that can be displayed before upload completes
    const optimisticAttachments = params.attachments?.map((att) => ({
      local_uri: URL.createObjectURL(att.file),
      mime_type: att.file.type,
      filename: att.file.name,
    }));

    // Build parent message data for optimistic reply preview
    // This allows the optimistic message to display the reply preview immediately
    const parentMessageData = params.replyTo ? (() => {
      // Determine sender_id from isSent flag
      const parentSenderId = params.replyTo.isSent ? user.id : selectedContactId;

      // Determine message type from attachments
      let parentMessageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text';
      if (params.replyTo.attachments && params.replyTo.attachments.length > 0) {
        const firstAtt = params.replyTo.attachments[0];
        if (firstAtt.attachmentType === 'image') parentMessageType = 'image';
        else if (firstAtt.attachmentType === 'video') parentMessageType = 'video';
        else if (firstAtt.attachmentType === 'audio') parentMessageType = 'audio';
        else if (firstAtt.attachmentType === 'pdf') parentMessageType = 'file';
      } else if (params.replyTo.images && params.replyTo.images.length > 0) {
        parentMessageType = 'image';
      } else if (params.replyTo.video) {
        parentMessageType = 'video';
      } else if (params.replyTo.pdf) {
        parentMessageType = 'file';
      }

      return {
        id: params.replyTo.id,
        content: params.replyTo.text || null,
        message_type: parentMessageType,
        sender_id: parentSenderId,
        sent_at: new Date(), // Approximate - not critical for display
        is_deleted: (params.replyTo as any).is_deleted || false,
        // Convert attachments to the format expected by parent message
        attachments: params.replyTo.attachments?.map((att) => ({
          id: `parent-att-${Date.now()}-${Math.random()}`,
          message_id: params.replyTo!.id,
          conversation_id: selectedConversation.id,
          bucket_id: 'message_attachments',
          file_path: '',
          filename: att.name,
          mime_type: att.type,
          size_bytes: att.size,
          upload_status: 'completed' as const,
          created_at: new Date(),
          // Use the data URL for display
          signed_url: att.data,
        })),
      };
    })() : undefined;

    // Create optimistic message IMMEDIATELY for instant UI feedback
    // IMPORTANT: This uses client-generated messageId, so optimistic ID = real message ID
    // This eliminates the need for complex deduplication and realMessageId tracking
    const optimisticMsg = createOptimisticMessage(
      selectedConversation.id,
      user.id,
      params.text || '',
      messageType,
      params.replyTo?.id,
      optimisticAttachments,
      parentMessageData
    );

    // Add to optimistic messages state for immediate display
    // Use flushSync to ensure this renders IMMEDIATELY before any async work
    // This prevents the message from appearing without attachments first
    flushSync(() => {
      setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    });

    try {
      // 1. Create message via API using client-provided ID
      // The API will use this exact ID, so no ID mismatch between optimistic and real
      const hasAttachments = (params.attachments?.length ?? 0) > 0;
      await sendMessageAPI({
        conversationId: selectedConversation.id,
        content: params.text || undefined,
        messageType,
        parentMessageId: params.replyTo?.id,
        attachmentCount: params.attachments?.length || 0,
        messageId: optimisticMsg.id, // Client-provided ID
        idempotencyKey: optimisticMsg.idempotency_key, // Prevents duplicate on retry
      });

      // 2. Upload attachments if present (convert to base64 here, AFTER optimistic message shown)
      if (hasAttachments && params.attachments) {
        const { uploadAttachments } = await import('@/lib/messaging/upload-attachments');

        // Convert File objects to base64 format expected by uploadAttachments
        const convertToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };

        const attachmentsWithData = await Promise.all(
          params.attachments.map(async (att) => {
            const durationSeconds = att.durationMs ? Math.round(att.durationMs / 1000) : undefined;
            return {
              name: att.file.name,
              data: await convertToBase64(att.file),
              type: att.file.type,
              size: att.file.size,
              attachmentType: att.attachmentType,
              durationSeconds,
            };
          })
        );

        // Upload attachments - DB trigger will mark message as ready when all complete
        const result = await uploadAttachments({
          conversationId: selectedConversation.id,
          messageId: optimisticMsg.id, // Use same ID as optimistic
          attachments: attachmentsWithData,
        });

        // Handle partial failures
        if (result.failedCount > 0) {
          console.warn('[handleSendMessage] Some attachments failed to upload:', result.errors);
        }
      }

      // Invalidate conversations to update last_message_preview and last_message_at
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // SIMPLIFIED CLEANUP: Since optimistic ID = real ID, realtime will automatically
      // provide the real message data. We just need to wait for the realtime update
      // or refetch to confirm, then remove the optimistic message.
      //
      // For messages with attachments:
      // - Database trigger marks message ready when all attachments complete
      // - This triggers a realtime broadcast with complete attachment data
      // - The optimistic message is replaced when we receive this broadcast
      //
      // For messages without attachments:
      // - Realtime broadcast happens immediately after insert
      // - Simple refetch + remove optimistic after short delay
      setTimeout(async () => {
        await refetchMessages();
        // Revoke blob URLs before removing
        setOptimisticMessages((current) => {
          const msgToRemove = current.find((m) => m.id === optimisticMsg.id);
          if (msgToRemove?.attachments) {
            msgToRemove.attachments.forEach((att) => {
              if (att.local_uri?.startsWith('blob:')) {
                URL.revokeObjectURL(att.local_uri);
              }
            });
          }
          return current.filter((m) => m.id !== optimisticMsg.id);
        });
      }, hasAttachments ? 2000 : 1000); // Give more time for attachments

    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove optimistic message on failure (error toast will show)
      setOptimisticMessages((prev) => {
        // Revoke blob URLs to prevent memory leaks
        const msgToRemove = prev.find((m) => m.id === optimisticMsg.id);
        if (msgToRemove?.attachments) {
          msgToRemove.attachments.forEach((att) => {
            if (att.local_uri?.startsWith('blob:')) {
              URL.revokeObjectURL(att.local_uri);
            }
          });
        }
        return prev.filter((m) => m.id !== optimisticMsg.id);
      });

      throw error; // Let MessageInputProvider handle the toast
    }
  }, [selectedContactId, selectedConversation, user?.id, refetchMessages, queryClient]);

  // Handle message reactions with optimistic updates
  const handleReaction = React.useCallback(async (messageId: string, emoji: string) => {
    if (!selectedConversation || !user?.id) {
      console.error('No conversation or user selected');
      return;
    }

    // Find the current message to determine sender/recipient
    const currentMsg = mergedMessages.find(m => m.id === messageId);
    if (!currentMsg) {
      console.error('Message not found');
      return;
    }

    // Determine if coach is sender or recipient of this message
    const isCoachSender = currentMsg.isSent;

    // Get current reactions (from optimistic state or API)
    const currentSenderReaction = optimisticReactions[messageId]?.senderReaction !== undefined
      ? optimisticReactions[messageId].senderReaction
      : currentMsg.reactions?.find(r => r.user_id === currentMsg.sender_id)?.reaction;
    const currentRecipientReaction = optimisticReactions[messageId]?.recipientReaction !== undefined
      ? optimisticReactions[messageId].recipientReaction
      : currentMsg.reactions?.find(r => r.user_id !== currentMsg.sender_id)?.reaction;

    // Calculate new reaction state
    let newSenderReaction = currentSenderReaction;
    let newRecipientReaction = currentRecipientReaction;

    if (emoji) {
      // Adding a reaction - coach's reaction changes
      if (isCoachSender) {
        newSenderReaction = emoji;
      } else {
        newRecipientReaction = emoji;
      }
    } else {
      // Removing a reaction - coach's reaction is cleared
      if (isCoachSender) {
        newSenderReaction = '';
      } else {
        newRecipientReaction = '';
      }
    }

    // Apply optimistic update immediately
    setOptimisticReactions(prev => ({
      ...prev,
      [messageId]: {
        senderReaction: newSenderReaction,
        recipientReaction: newRecipientReaction,
      },
    }));

    try {
      if (emoji) {
        // Add or update reaction
        await addReaction(
          messageId,
          selectedConversation.id,
          emoji as '👍' | '❤️' | '😂' | '😮' | '😢' | '🙏'
        );
      } else {
        // Remove reaction (emoji is empty string)
        await removeReaction(messageId);
      }

      // Refetch messages to get the updated reactions from the server
      // This ensures we get the correct state even if realtime is delayed
      await refetchMessages();

      // Keep optimistic state for a bit longer after refetch to prevent
      // stale realtime updates from causing flicker. The optimistic state
      // will override any stale data during this window.
      setTimeout(() => {
        setOptimisticReactions(prev => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to update reaction:', error);
      // Revert optimistic update on error
      setOptimisticReactions(prev => {
        const updated = { ...prev };
        delete updated[messageId];
        return updated;
      });
    }
  }, [selectedConversation, user?.id, mergedMessages, optimisticReactions, refetchMessages]);

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFileButtonClick();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedContactId) return;

    // Capture the contact ID at the time of file selection to ensure it's saved to the correct contact
    const contactIdAtSelection = selectedContactId;

    // Check if it's a PDF - store it instead of auto-sending
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Only set PDF if we're still on the same contact (prevent leaks to other conversations)
      if (selectedContactId === contactIdAtSelection) {
        setAttachedPdf(file);
        // Make input multi-line
        setTextareaHeight(60);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check if it's an image - store it instead of auto-sending
    if (file.type.startsWith('image/')) {
      // Only add image if we're still on the same contact (prevent leaks to other conversations)
      if (selectedContactId === contactIdAtSelection) {
        setAttachedImages((prev) => {
          const updated = [...prev, file];
          return updated;
        });
        // Make input multi-line if not already
        if (textareaHeight <= 36) {
          setTextareaHeight(60);
        }
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Other file types - just reset input (not supported for auto-submit)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    // Capture the contact ID at the time of file selection to ensure it's saved to the correct contact
    const contactIdAtSelection = selectedContactId;
    if (!files || !contactIdAtSelection) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      // Only add images if we're still on the same contact (prevent leaks to other conversations)
      if (selectedContactId === contactIdAtSelection) {
        setAttachedImages((prev) => {
          const updated = [...prev, ...imageFiles];
          return updated;
        });
        // Make input multi-line if not already
        if (textareaHeight <= 36) {
          setTextareaHeight(60);
        }
      }
    }

    // Reset image input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0 && !attachedPdf && !attachedVideo && !replyingToMessage) {
        setTextareaHeight(36);
      }
      // Update draft to remove images
      if (selectedContactId) {
        messageDraftStorage.saveDraft(
          selectedContactId,
          messageInput,
          attachedPdf,
          updated,
          attachedVideo
        );
        updateDraftsState();
      }
      return updated;
    });
  };

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedContactId) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setAttachedPdf(file);
      // Make input multi-line
      setTextareaHeight(60);
    }

    // Reset PDF input
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const handleRemovePdf = () => {
    setAttachedPdf(null);
    setTextareaHeight(36);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
    // Update draft to remove PDF
    if (selectedContactId) {
      messageDraftStorage.saveDraft(
        selectedContactId,
        messageInput,
        null,
        attachedImages,
        attachedVideo
      );
      updateDraftsState();
    }
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedContactId) return;

    // Check if it's an MP4 video
    if (file.type === 'video/mp4' || file.name.endsWith('.mp4')) {
      setAttachedVideo(file);
      setTextareaHeight(60);
      // Reset file input
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveVideo = () => {
    setAttachedVideo(null);
    setTextareaHeight(36);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    // Update draft to remove video
    if (selectedContactId) {
      messageDraftStorage.saveDraft(
        selectedContactId,
        messageInput,
        attachedPdf,
        attachedImages,
        null
      );
      updateDraftsState();
    }
  };

  const handleDownloadVideo = () => {
    if (!attachedVideo) return;

    // Create a blob URL from the file and trigger download
    const url = URL.createObjectURL(attachedVideo);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachedVideo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVideoPreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDownloadVideo();
    }
  };

  const handleDownloadMessageVideo = (
    video: { name: string; data: string; type: string; size: number } | undefined
  ) => {
    if (!video) return;
    const byteString = atob(video.data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: video.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = video.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMessageVideoPreviewKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    video: { name: string; data: string; type: string; size: number } | undefined
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDownloadMessageVideo(video);
    }
  };

  // Handle drag and drop for files
  const handleDragEnter = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (event.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDraggingOver(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);
      setDragCounter(0);

      if (!selectedContactId || !messageInputContextRef.current) return;

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      const { addAttachment, addAttachments, canAddMoreAttachments } = messageInputContextRef.current;

      if (!canAddMoreAttachments) {
        console.warn('Maximum 4 attachments allowed');
        return;
      }

      // Separate PDFs, videos, and images
      const pdfFiles = files.filter(
        (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
      );
      const videoFiles = files.filter(
        (file) => file.type.startsWith('video/')
      );
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      // Add files to message input context
      // PDFs
      if (pdfFiles.length > 0) {
        addAttachment(pdfFiles[0], 'pdf');
      }

      // Videos
      if (videoFiles.length > 0) {
        addAttachment(videoFiles[0], 'video');
      }

      // Images (can add multiple)
      if (imageFiles.length > 0) {
        addAttachments(imageFiles, 'image');
      }
    },
    [selectedContactId]
  );

  const handleDownloadPdf = () => {
    if (!attachedPdf) return;

    // Create a blob URL from the file and trigger download
    const url = URL.createObjectURL(attachedPdf);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachedPdf.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePdfPreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDownloadPdf();
    }
  };

  const handleDownloadImage = (image: File) => {
    // Create a blob URL from the file and trigger download
    const url = URL.createObjectURL(image);
    const link = document.createElement('a');
    link.href = url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImagePreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, image: File) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDownloadImage(image);
    }
  };

  const handleDownloadMessagePdf = (pdf: Message['pdf']) => {
    if (!pdf || !pdf.data) return;

    // Convert base64 to blob and download
    const byteString = atob(pdf.data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: pdf.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = pdf.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMessagePdfPreviewKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    pdf: Message['pdf']
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDownloadMessagePdf(pdf);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return;

    // Optimistically remove the message from ALL local states immediately (no flicker)
    // This includes apiMessages, optimisticMessages (for audio/attachment messages that stay longer)
    removeApiMessage(messageId);
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      // Call the real delete API (soft delete)
      await deleteMessageAPI(messageId);

      // Invalidate conversations to update the list (last_message_preview may change)
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error('Failed to delete message:', error);
      // On error, refetch to restore the message
      refetchMessages();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const formatTime = (timestamp: string) => {
    return timestamp;
  };


  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full flex-1 overflow-hidden">
        <div className="h-full w-full flex">
          {/* Left Column - Inbox Sidebar (20% width, sticky) */}
          <div className="flex-shrink-0 h-full z-10">
            <InboxSidebar
              isSidebarCollapsed={isSidebarCollapsed}
              setIsSidebarCollapsed={handleManualSidebarToggle}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredContacts={filteredContacts}
              selectedContactId={selectedContactId}
              showArchivedConversations={showArchivedConversations}
              setShowArchivedConversations={setShowArchivedConversations}
              isLoading={isLoadingConversations}
              onOpenBroadcast={() => {
                if (!hasBroadcastAccess) {
                  setIsBroadcastUpgradeOpen(true);
                  return;
                }
                setIsBroadcastOpen(true);
              }}
              onContactClick={handleContactClick}
            />
          </div>
          {/* Scrollable content area for Chat + Client Profile */}
          <div className="flex-1 h-full overflow-x-auto">
            {!selectedContactId ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Select a client</p>
                </div>
              </div>
            ) : (
              <ClientProfileProvider clientId={selectedContactId}>
                <div className="h-full w-full relative">
                  <InboxUnifiedLoader isNavigating={isNavigating} />
                  <div className="h-full flex w-full min-w-0">
                    {/* Chat Area (32.5% when power view open, 100% otherwise) */}
                    <div
                      className={cn(
                        "relative h-full transition-[width] duration-300 ease-in-out",
                        effectiveIsPowerViewOpen ? "w-[32.5%]" : "w-full"
                      )}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {/* Drag and Drop Overlay */}
                      {isDraggingOver && selectedContactId && (
                        <div className="absolute inset-0 z-50 bg-background border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                          <div className="text-center px-8">
                            <div className="flex flex-col items-center gap-4">
                              <div className="flex items-center gap-2 text-primary">
                                <FileText className="h-8 w-8" />
                                <ImageIcon className="h-8 w-8" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-foreground">
                                  {t('messages.dropFilesHere')}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {t('messages.filesWillBeAdded')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Loading overlay - shows until messages are loaded and scrolled to bottom */}
                      {!isMessageListReady && (
                        <div className="absolute inset-0 z-40 bg-background flex flex-col items-center justify-center gap-3">
                          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-muted-foreground">{t('messages.loadingMessages')}</p>
                        </div>
                      )}
                      <div className="h-full overflow-y-auto flex flex-col">
                        <ChatHeader
                          selectedContact={selectedContact!}
                          isPowerViewOpen={effectiveIsPowerViewOpen}
                          hideToggle={isMobile}
                          onTogglePowerView={() => {
                            const newState = !effectiveIsPowerViewOpen;
                            setIsPowerViewOpen(newState);
                            // Only auto-collapse sidebar if user hasn't manually opened it
                            if (!userManuallyOpenedSidebar || !newState) {
                              setIsSidebarCollapsed(newState);
                            }
                          }}
                        />

                        <MessageInputProvider
                          selectedContactId={selectedContactId}
                          onSendMessage={handleSendMessageFromContext}
                        >
                          <MessageList
                            messages={currentMessages}
                            selectedContact={selectedContact!}
                            onReply={(message) => {
                              messageInputContextRef.current?.setReplyingToMessage(message);
                            }}
                            onDeleteMessage={handleDeleteMessage}
                            onReaction={handleReaction}
                            messagesEndRef={messagesEndRef}
                            loadMoreTriggerRef={loadMoreTriggerRef}
                            isLoadingMore={isLoadingMoreMessages}
                            hasMoreMessages={hasMoreMessages}
                            isClientPanelOpen={effectiveIsPowerViewOpen}
                          />

                          <MessageInputWrapper contextRef={messageInputContextRef} selectedContact={selectedContact} />
                        </MessageInputProvider>
                      </div>
                    </div>

                    {/* Client Profile Area (67.5% width, animates in/out based on power view state) - hidden on mobile */}
                    {!isMobile && (
                      <div
                        className={cn(
                          "h-full border-l overflow-y-auto transition-[width,opacity] duration-300 ease-in-out",
                          effectiveIsPowerViewOpen
                            ? "w-[67.5%] opacity-100"
                            : "w-0 opacity-0 overflow-hidden"
                        )}
                      >
                        <ClientProfileLayoutContent
                          hideBreadcrumb={true}
                          activeTab={activeClientTab}
                          onTabChange={setActiveClientTab}
                          hideMessageButton={true}
                          hideLoader={true}
                        >
                          <ClientProfileContent tab={activeClientTab} />
                        </ClientProfileLayoutContent>
                      </div>
                    )}
                  </div>
                </div>
              </ClientProfileProvider>
            )}
          </div>
        </div>
      </div>
      <SidePanel
        open={isNewMessageOpen}
        onOpenChange={setIsNewMessageOpen}
        title={t('messages.newMessage')}
      >
        <AssignAthletesList
          navigateOnSelect={false}
          onAthleteSelected={(athleteId) => {
            if (!athleteId) return;
            // Find or create contact for this athlete
            let contact = contacts.find((c) => c.id === athleteId);
            if (!contact) {
              const athlete = athletes.find((a) => a.id === athleteId);
              if (athlete) {
                contact = {
                  id: athlete.id,
                  publicId: athlete.publicId,
                  name: athlete.name,
                  avatar: athlete.avatarUrl,
                  lastMessage: '',
                  timestamp: '',
                  unreadCount: 0,
                  isOnline: false,
                };
              }
            }
            if (contact) {
              router.push(`/inbox/${contact.id}/overview`);
              setIsNewMessageOpen(false);
            }
          }}
        />
      </SidePanel>
      <SidePanel
        open={isCreateNoteOpen}
        onOpenChange={setIsCreateNoteOpen}
        title={t('messages.createNote')}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateNoteOpen(false);
                setNoteTitle('');
                setNoteContent('');
                setIsNoteEmpty(true);
              }}
            >
              {t('general.cancel')}
            </Button>
            <Button
              onClick={() => {
                // TODO: Handle save note
                console.log('Note title:', noteTitle);
                console.log('Note content:', noteContent);
                setIsCreateNoteOpen(false);
                setNoteTitle('');
                setNoteContent('');
                setIsNoteEmpty(true);
              }}
              disabled={!noteTitle.trim()}
            >
              {t('general.save')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">
              {t('messages.noteTitle')}<RequiredAsterisk />
            </Label>
            <Input
              id="note-title"
              ref={noteTitleInputRef}
              value={noteTitle}
              onChange={(e) => {
                setNoteTitle(e.target.value);
                setIsNoteEmpty(!e.target.value.trim());
              }}
              placeholder={t('messages.enterNoteTitle')}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <Label htmlFor="note-body">{t('messages.noteBody')}</Label>
            <Textarea
              id="note-body"
              ref={noteTextareaRef}
              value={noteContent}
              onChange={(e) => {
                setNoteContent(e.target.value);
              }}
              placeholder={t('messages.writeNoteHere')}
              className="flex-1 resize-none"
            />
          </div>
        </div>
      </SidePanel>
      <SidePanel
        open={isViewNoteOpen}
        onOpenChange={setIsViewNoteOpen}
        title={t('messages.viewNote')}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={handleCancelNoteEdit}>
              {t('general.cancel')}
            </Button>
            <DropdownMenu open={isDeleteNoteMenuOpen} onOpenChange={setIsDeleteNoteMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" type="button" aria-label={t('general.delete')}>
                  {t('general.delete')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-40">
                <DropdownMenuItem onClick={handleDeleteNote} aria-label={t('general.delete')} className="gap-2">
                  <Trash2 className="size-4" />
                  {t('general.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleSaveNote} disabled={!hasNoteChanges}>
              {t('general.save')}
            </Button>
          </div>
        }
      >
        {selectedNote && (
          <div className="flex-1 flex flex-col min-h-0 gap-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>
                  {t('messages.createdAt')} {formatNoteDate(selectedNote.createdAt)}
                </span>
                {selectedNote.updatedAt && (
                  <>
                    <span>•</span>
                    <span>
                      {t('messages.updatedAt')} {formatNoteDate(selectedNote.updatedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-note-title">{t('messages.noteTitle')}</Label>
              <Input
                id="view-note-title"
                value={editingNoteTitle}
                onChange={(e) => setEditingNoteTitle(e.target.value)}
                placeholder={t('messages.enterNoteTitle')}
                autoFocus={false}
                tabIndex={0}
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <Label htmlFor="view-note-body">{t('messages.noteBody')}</Label>
              <Textarea
                id="view-note-body"
                value={editingNoteBody}
                onChange={(e) => setEditingNoteBody(e.target.value)}
                placeholder={t('messages.writeNoteHere')}
                className="flex-1 resize-none"
                autoFocus={false}
                tabIndex={0}
              />
            </div>
          </div>
        )}
      </SidePanel>
      <BroadcastSidePanel open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen} />

      {/* Broadcast Upgrade Dialog */}
      <Dialog open={isBroadcastUpgradeOpen} onOpenChange={setIsBroadcastUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Max</DialogTitle>
            <DialogDescription>
              Send broadcast messages to multiple clients at once. Keep your clients informed with announcements, updates, and important information.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastUpgradeOpen(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => router.push('/settings/billing')}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InboxPage;
