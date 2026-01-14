# Messaging Integration Guide

## Status: Backend Complete, Frontend Integration Pending

### ✅ Completed

1. **Backend API** (`apps/athli-web-api/`)
   - Controller: `src/api/v1/coach/coach-messaging.controller.ts`
   - Routes: `src/api/v1/coach/routes/messaging.routes.ts`
   - 14 endpoints for full messaging CRUD

2. **API Client** (`apps/athli-web-app/`)
   - Service: `lib/messaging/messaging-api-client.ts`
   - Hooks: `hooks/use-conversations.ts`, `hooks/use-messages.ts`
   - Realtime: `hooks/use-realtime-messaging.ts`

3. **Shared Infrastructure**
   - Database schema (migration 087) - production ready
   - Shared types in `@athli/shared-types`
   - RLS policies for security

---

## 📋 Remaining Work

### Step 1: Update Inbox Page to Fetch Real Conversations

**File:** `apps/athli-web-app/app/inbox/page.tsx`

**Current (Line 162):**
```tsx
const { clients: athletes, isLoading: isLoadingClients } = useCoachClients();
const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);
```

**Replace with:**
```tsx
import { useConversations } from '@/hooks/use-conversations';
import { useMessages } from '@/hooks/use-messages';
import { useRealtimeConversations, useRealtimeMessages } from '@/hooks/use-realtime-messaging';
import { sendMessage as sendMessageAPI } from '@/lib/messaging/messaging-api-client';
import { useUserProfile } from '@/hooks/use-user-profile';

const { conversations, isLoading: isLoadingConversations } = useConversations();
const { user } = useUserProfile();

// Get conversation ID from selected contact
const selectedConversation = conversations.find(
  (c) => c.other_user_id === selectedContactId
);

const { messages, addOptimisticMessage, removeOptimisticMessage } = useMessages(
  selectedConversation?.id || null
);

// Realtime subscriptions
const { realtimeMessages } = useRealtimeMessages({
  conversationId: selectedConversation?.id || '',
  onMessageReceived: (message) => {
    // Message will be added to messages array automatically
    console.log('New message received:', message);
  },
});

const { conversations: realtimeConversations } = useRealtimeConversations({
  userId: user?.id || '',
  onConversationUpdated: (conversation) => {
    console.log('Conversation updated:', conversation);
  },
});
```

### Step 2: Update Message Sending

**File:** `apps/athli-web-app/app/inbox/page.tsx`

**Find the MessageInputProvider** (around line 600+):
```tsx
<MessageInputProvider
  selectedContactId={selectedContactId}
  onSendMessage={handleSendMessage}  // <-- Update this function
>
```

**Create new handleSendMessage function:**
```tsx
const handleSendMessage = async (params: {
  text: string;
  attachments?: Array<{
    name: string;
    data: string;
    type: string;
    size: number;
    attachmentType: 'image' | 'video' | 'pdf';
  }>;
  replyTo?: any;
}) => {
  if (!selectedConversation || !user) {
    console.error('No conversation or user');
    return;
  }

  try {
    // TODO: Handle attachments (file upload to Supabase Storage)
    // For now, just send text messages

    await sendMessageAPI({
      conversationId: selectedConversation.id,
      content: params.text,
      messageType: 'text',
      // parentMessageId: params.replyTo?.id,  // For threading
    });

    // Message will appear via realtime subscription
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error; // Let the context handle the error toast
  }
};
```

### Step 3: Map Conversations to Contacts

The inbox UI currently expects `Contact` objects but we have `Conversation` objects.

**Create a mapper:**
```tsx
// Convert Conversation to Contact format for UI compatibility
const conversationsAsContacts: Contact[] = conversations.map((conv) => ({
  id: conv.other_user_id,
  name: conv.other_user_name || 'Unknown',
  avatar: conv.other_user_avatar || undefined,
  lastMessage: conv.last_message_preview || '',
  timestamp: conv.last_message_at?.toISOString() || '',
  unreadCount: conv.unread_count || 0,
}));
```

**Replace athletes list in sidebar:**
```tsx
<InboxSidebar
  contacts={conversationsAsContacts}  // <-- Use conversations instead of athletes
  selectedContactId={selectedContactId}
  onSelectContact={handleSelectContact}
  // ... other props
/>
```

### Step 4: Update Message List

**File:** `apps/athli-web-app/app/inbox/components/message-list.tsx`

The component already accepts `Message[]` - just need to ensure the message format matches.

**Check if message formats align:**
- Backend API returns messages with `sent_at`, `sender_id`, etc.
- UI expects `timestamp`, `isSent`, etc.

**Create a mapper if needed:**
```tsx
// In inbox page
const messagesForUI = messages.map((msg) => ({
  id: msg.id,
  text: msg.content || '',
  timestamp: format(msg.sent_at, 'h:mm a'),
  isSent: msg.sender_id === user?.id,
  isRead: msg.status === 'read',
  // Map other fields as needed
  images: msg.attachments?.filter(a => a.mime_type?.startsWith('image/')),
  pdf: msg.attachments?.find(a => a.mime_type === 'application/pdf'),
  video: msg.attachments?.find(a => a.mime_type?.startsWith('video/')),
  replyTo: msg.parent_message ? {
    id: msg.parent_message.id,
    text: msg.parent_message.content || '',
    isSent: msg.parent_message.sender_id === user?.id,
  } : undefined,
  reaction: msg.reactions?.[0]?.reaction,  // Simplified for now
}));

<MessageList
  messages={messagesForUI}
  // ... other props
/>
```

### Step 5: Handle Reactions

**Update message reaction handlers:**
```tsx
import { addReaction, removeReaction } from '@/lib/messaging/messaging-api-client';

const handleReaction = async (messageId: string, emoji: string) => {
  if (!selectedConversation) return;

  try {
    if (emoji) {
      await addReaction(messageId, selectedConversation.id, emoji as any);
    } else {
      await removeReaction(messageId);
    }
    // Reaction will update via realtime subscription
  } catch (error) {
    console.error('Failed to update reaction:', error);
  }
};

<MessageList
  messages={messagesForUI}
  onReaction={handleReaction}
  // ... other props
/>
```

### Step 6: Mark as Read

**Add read receipt handling:**
```tsx
import { markConversationAsRead } from '@/lib/messaging/messaging-api-client';
import { useSyncReadReceipt } from '@/hooks/use-realtime-messaging';

// Auto-mark as read when conversation is viewed
useSyncReadReceipt({
  conversationId: selectedConversation?.id || '',
  userId: user?.id || '',
  enabled: !!selectedConversation && !!user,
});
```

---

## 🔧 File Upload (Future Work)

File uploads need special handling:

1. Upload file to Supabase Storage bucket `message_attachments`
2. Create attachment record in `message_attachments` table
3. Send message with reference to attachment

**Create hook:**
```tsx
// hooks/use-file-upload.ts
export const useFileUpload = () => {
  const uploadAttachment = async (
    file: File,
    conversationId: string,
    messageId: string
  ) => {
    const supabase = createClient();

    // Upload to storage
    const filePath = `${conversationId}/${messageId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('message_attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create attachment record (will be linked to message)
    return filePath;
  };

  return { uploadAttachment };
};
```

---

## 🧪 Testing Checklist

- [ ] Conversations load from backend API
- [ ] Messages display correctly
- [ ] Send text message works
- [ ] Realtime: Receive messages instantly
- [ ] Realtime: Conversation list updates
- [ ] Reactions work
- [ ] Read receipts update
- [ ] Reply to message (threading)
- [ ] Archive/pin/mute conversations
- [ ] Search conversations
- [ ] Handle errors gracefully

---

## 🚀 Quick Start (Next Session)

1. Open `apps/athli-web-app/app/inbox/page.tsx`
2. Add imports from Step 1
3. Replace `useCoachClients()` with `useConversations()`
4. Update `handleSendMessage` function
5. Map conversations to contacts format
6. Test in browser!

---

## 📚 Reference

**Backend Endpoints:** `/api/v1/coach/messaging/*`
**API Client:** `lib/messaging/messaging-api-client.ts`
**Realtime:** `hooks/use-realtime-messaging.ts`
**Database:** Migration 087

---

## ⚠️ Important Notes

1. **Hybrid Approach:**
   - HTTP API for CRUD operations
   - Direct Supabase for realtime (WebSocket)

2. **Message Format:**
   - Backend uses `Message` from `@athli/shared-types`
   - UI uses `Message` from `@/components/app/app-shell`
   - May need mapper to bridge formats

3. **User ID:**
   - Use `useUserProfile()` to get current user ID
   - Needed for `sender_id` and permission checks

4. **Conversation Creation:**
   - Conversations are auto-created when client is assigned to coach
   - No manual creation needed in most cases
