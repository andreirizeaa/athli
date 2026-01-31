/**
 * Messaging Seed Data
 * Generates test conversations and messages between coach and clients
 */

import { TEST_PREFIX, randomInRange, randomPick, generateUUID } from './utils';

/**
 * Get conversation data for a coach-client pair
 */
export function getConversation(coachId: string, clientId: string) {
  return {
    coach_id: coachId,
    client_id: clientId,
  };
}

/**
 * Get conversation participants data
 */
export function getConversationParticipants(conversationId: string, coachId: string, clientId: string) {
  return [
    {
      conversation_id: conversationId,
      user_id: coachId,
      is_archived: false,
      is_muted: false,
      is_pinned: false,
    },
    {
      conversation_id: conversationId,
      user_id: clientId,
      is_archived: false,
      is_muted: false,
      is_pinned: false,
    },
  ];
}

/**
 * Generate messages for a conversation (10-15 messages)
 */
export function getMessages(conversationId: string, coachId: string, clientId: string, clientName: string) {
  const messages: any[] = [];
  const numMessages = randomInRange(10, 15);

  // Message templates
  const coachMessages = [
    'Hey! How are you feeling after yesterday\'s workout?',
    'Great progress on your check-in! Keep up the good work.',
    'Don\'t forget to log your metrics today.',
    'I\'ve updated your program for next week. Let me know if you have any questions.',
    'How\'s your nutrition been this week?',
    'Remember to prioritize sleep - it\'s crucial for recovery.',
    'Your form in the videos looks good! Just a small cue on the squat depth.',
    'Let\'s schedule a call to discuss your goals for next month.',
    'How did the new exercises feel?',
    'I noticed you missed a few workouts. Everything okay?',
    'Awesome work hitting all your targets this week!',
    'The new meal plan is ready. Check your files.',
  ];

  const clientMessages = [
    'Feeling a bit sore but in a good way!',
    'Thanks! I\'m really enjoying the new program.',
    'Just logged them! Weight is trending down nicely.',
    'Looked at the new program - excited to try it!',
    'Been pretty consistent except for the weekend.',
    'Getting better sleep since I started the evening routine.',
    'Will work on that! Thanks for the feedback.',
    'Sure! I\'m free Tuesday or Thursday afternoon.',
    'The Romanian deadlifts feel challenging but good.',
    'Yeah, had a busy week at work. Back on track now!',
    'Thanks! Feeling stronger every week.',
    'Got it! Will review it tonight.',
    'Quick question - can I substitute lat pulldowns for pull-ups?',
    'Just finished today\'s session. Felt really strong!',
    'The cardio days are tough but I\'m getting better.',
  ];

  // Generate messages with timestamps spread over the past 2 weeks
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < numMessages; i++) {
    // Alternate between coach and client, with some randomization
    const isCoachMessage = i === 0 || (i % 3 !== 0 && Math.random() > 0.4);
    const senderId = isCoachMessage ? coachId : clientId;
    const content = isCoachMessage
      ? randomPick(coachMessages)
      : randomPick(clientMessages);

    // Calculate timestamp - spread messages over 2 weeks
    const timeProgress = i / numMessages;
    const messageTime = new Date(
      twoWeeksAgo.getTime() + timeProgress * (now.getTime() - twoWeeksAgo.getTime())
    );
    // Add some random minutes
    messageTime.setMinutes(messageTime.getMinutes() + randomInRange(0, 59));

    messages.push({
      id: generateUUID(),
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: 'text',
      status: 'sent',
      sent_at: messageTime.toISOString(),
      attachments_ready: true,
      attachment_count: 0,
    });
  }

  // Sort by sent_at
  messages.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());

  return messages;
}

/**
 * Get message attachments for a conversation (1-2 attachments)
 */
export function getMessageAttachments(messages: any[], coachId: string) {
  const attachments: any[] = [];

  // Find coach messages that could have attachments
  const coachMessages = messages.filter(m => m.sender_id === coachId);

  if (coachMessages.length >= 2) {
    // Add attachment to first coach message
    attachments.push({
      message_id: coachMessages[0].id,
      conversation_id: coachMessages[0].conversation_id,
      file_type: 'image',
      file_url: 'https://via.placeholder.com/800x600?text=Progress+Chart',
      file_name: 'progress_chart.png',
      file_size: 256000,
    });

    // Maybe add another attachment
    if (coachMessages.length >= 4 && Math.random() > 0.5) {
      attachments.push({
        message_id: coachMessages[3].id,
        conversation_id: coachMessages[3].conversation_id,
        file_type: 'document',
        file_url: 'https://example.com/placeholder.pdf',
        file_name: 'updated_program.pdf',
        file_size: 512000,
      });
    }
  }

  return attachments;
}

/**
 * Get message reactions (random reactions on some messages)
 */
export function getMessageReactions(messages: any[], coachId: string, clientId: string) {
  const reactions: any[] = [];
  const reactionEmojis = ['👍', '❤️', '💪', '🔥', '👏', '🎉'];

  // Add reactions to ~30% of messages
  for (const message of messages) {
    if (Math.random() < 0.3) {
      // Reaction from the other person
      const reactorId = message.sender_id === coachId ? clientId : coachId;

      reactions.push({
        message_id: message.id,
        conversation_id: message.conversation_id,
        user_id: reactorId,
        reaction: randomPick(reactionEmojis),
      });
    }
  }

  return reactions;
}

/**
 * Get read receipts for a conversation
 */
export function getReadReceipts(conversationId: string, coachId: string, clientId: string, lastMessage: any) {
  const receipts: any[] = [];

  if (lastMessage) {
    // Coach has read all messages
    receipts.push({
      conversation_id: conversationId,
      user_id: coachId,
      last_read_message_id: lastMessage.id,
      last_read_at: new Date().toISOString(),
    });

    // Client has read all messages (or most)
    receipts.push({
      conversation_id: conversationId,
      user_id: clientId,
      last_read_message_id: lastMessage.id,
      last_read_at: new Date().toISOString(),
    });
  }

  return receipts;
}
