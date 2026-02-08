/**
 * Supabase Edge Function: message-push-notification
 *
 * Sends push notifications for new chat messages.
 * Triggered by a database webhook on INSERT to messages.
 *
 * WhatsApp-like behavior:
 * - Waits a few seconds, then checks if the recipient already read the message
 * - If read (on web or mobile), skips the push notification
 * - Respects conversation mute settings
 * - Title = sender name, body = message text or attachment summary
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    conversation_id: string
    sender_id: string
    sender_role: string | null
    content: string | null
    message_type: string
    status: string
    attachment_count: number
    sent_at: string
    is_deleted: boolean
  }
  schema: string
  old_record: null | Record<string, any>
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }
    if (!expoAccessToken) {
      throw new Error('EXPO_ACCESS_TOKEN not configured')
    }

    const payload: WebhookPayload = await req.json()

    // Only process INSERT events
    if (payload.type !== 'INSERT') {
      return jsonResponse({ success: true, message: 'Skipped: not an INSERT event' })
    }

    const message = payload.record

    // Skip deleted messages
    if (message.is_deleted) {
      return jsonResponse({ success: true, message: 'Skipped: message is deleted' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get conversation to find recipient
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('coach_id, client_id')
      .eq('id', message.conversation_id)
      .single()

    if (convError || !conversation) {
      throw new Error(`Failed to fetch conversation: ${convError?.message}`)
    }

    // Self-conversation: coach_id === client_id (coach testing as their own client)
    const isSelfConversation = conversation.coach_id === conversation.client_id

    // Determine recipient
    let recipientId: string
    let recipientRole: string

    if (isSelfConversation) {
      // Same user ID for both roles — use sender_role to determine recipient role
      recipientId = conversation.coach_id // same as client_id
      recipientRole = message.sender_role === 'coach' ? 'client' : 'coach'
    } else {
      recipientId = message.sender_id === conversation.coach_id
        ? conversation.client_id
        : conversation.coach_id
      recipientRole = recipientId === conversation.coach_id ? 'coach' : 'client'
    }

    // Check if conversation is muted for recipient
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('is_muted')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', recipientId)
      .single()

    if (participant?.is_muted) {
      console.log(`Conversation muted for recipient ${recipientId}, skipping`)
      return jsonResponse({ success: true, message: 'Skipped: conversation muted' })
    }

    // Wait 3 seconds to give the recipient time to open the chat / upsert presence
    await new Promise(resolve => setTimeout(resolve, 3000))

    // --- Presence check (primary): is recipient actively viewing this conversation? ---
    const { data: presence } = await supabase
      .from('conversation_presence')
      .select('last_active_at')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', recipientId)
      .single()

    if (presence?.last_active_at) {
      const lastActive = new Date(presence.last_active_at)
      const now = new Date()
      const secondsAgo = (now.getTime() - lastActive.getTime()) / 1000
      if (secondsAgo <= 60) {
        console.log(`Recipient ${recipientId} has conversation open (active ${secondsAgo.toFixed(0)}s ago), skipping`)
        return jsonResponse({ success: true, message: 'Skipped: recipient has conversation open' })
      }
    }

    // --- Read receipt check (fallback): works for all conversations including self ---
    const { data: readReceipt } = await supabase
      .from('message_read_receipts')
      .select('last_read_at')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', recipientId)
      .single()

    if (readReceipt?.last_read_at) {
      const lastReadAt = new Date(readReceipt.last_read_at)
      const messageSentAt = new Date(message.sent_at)

      if (lastReadAt >= messageSentAt) {
        console.log(`Recipient ${recipientId} already read the message, skipping`)
        return jsonResponse({ success: true, message: 'Skipped: already read' })
      }
    }

    // Determine sender role
    const senderRole = isSelfConversation
      ? (message.sender_role || 'coach')
      : (message.sender_id === conversation.coach_id ? 'coach' : 'client')

    // Get sender name from the correct user_profiles row (composite PK: id + user_type)
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('id', message.sender_id)
      .eq('user_type', senderRole)
      .single()

    const senderName = senderProfile?.name || null

    // Build title based on sender role
    // Coach → client: "New message from coach"
    // Client → coach: "Message from <client name>"
    const title = senderRole === 'coach'
      ? 'New message from coach'
      : `Message from ${senderName || 'client'}`

    // Get push tokens from the recipient's role table
    const tokenTable = recipientRole === 'coach' ? 'coach_push_tokens' : 'client_push_tokens'
    const tokenColumn = recipientRole === 'coach' ? 'coach_id' : 'client_id'

    const { data: tokens, error: tokenError } = await supabase
      .from(tokenTable)
      .select('expo_push_token')
      .eq(tokenColumn, recipientId)

    if (tokenError || !tokens || tokens.length === 0) {
      console.log(`No push tokens for recipient ${recipientId}`)
      return jsonResponse({ success: true, message: 'No push tokens' })
    }

    // Build notification body
    let body: string
    if (message.content && message.content.trim().length > 0) {
      body = message.content.length > 200
        ? message.content.substring(0, 200) + '...'
        : message.content
    } else {
      // No text content — show attachment summary
      const count = message.attachment_count || 1
      body = count === 1 ? '1 attachment' : `${count} attachments`
    }

    // Send push notifications to all recipient devices
    const messages = tokens.map((token: { expo_push_token: string }) => ({
      to: token.expo_push_token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'message',
        conversation_id: message.conversation_id,
        message_id: message.id,
      },
    }))

    console.log(`Sending ${messages.length} push notification(s) to ${recipientRole} ${recipientId}`)

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(messages),
    })

    const expoResult = await expoResponse.json()

    if (!expoResponse.ok) {
      throw new Error(`Expo push failed: ${JSON.stringify(expoResult)}`)
    }

    console.log('Expo push response:', JSON.stringify(expoResult))

    return jsonResponse({
      success: true,
      message: `Sent ${messages.length} push notification(s)`,
      expo_response: expoResult,
    })
  } catch (error) {
    console.error('message-push-notification failed:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}
