import React from 'react';
import { cn } from '@/lib/general/utils';

export interface MessageReaction {
  senderReaction?: string;
  recipientReaction?: string;
}

interface MessageReactionsDisplayProps {
  reaction: MessageReaction;
  isSent: boolean;
  onPress?: () => void;
}

export function MessageReactionsDisplay({
  reaction,
  isSent,
  onPress,
}: MessageReactionsDisplayProps) {
  const { senderReaction, recipientReaction } = reaction;

  // Don't render if no reactions
  if (!senderReaction && !recipientReaction) {
    return null;
  }

  // Check if both users reacted with the same emoji
  const sameBothReaction = senderReaction && recipientReaction && senderReaction === recipientReaction;

  return (
    <div
      className={cn(
        'mt-1 mb-2 z-10',
        isSent ? 'mr-3 flex justify-end' : 'ml-3 flex justify-start'
      )}
    >
      <button
        onClick={onPress}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-2xl',
          'bg-background border border-border shadow-sm',
          'hover:bg-muted/50 transition-colors',
          'active:scale-95 transition-transform'
        )}
      >
        {sameBothReaction ? (
          <>
            <span className="text-sm leading-none">{senderReaction}</span>
            <span className="text-xs text-muted-foreground font-medium">2</span>
          </>
        ) : (
          <>
            {senderReaction && (
              <span className="text-sm leading-none">{senderReaction}</span>
            )}
            {recipientReaction && (
              <span className="text-sm leading-none">{recipientReaction}</span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
