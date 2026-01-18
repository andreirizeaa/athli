import React from 'react';
import { Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/general/utils';

export interface MessageReaction {
  senderReaction?: string;
  recipientReaction?: string;
}

interface MessageReactionsDisplayProps {
  reaction: MessageReaction;
  isSent: boolean;
  /** Called when user clicks on reactions - passes the emoji to add (other's) or empty to remove (own) */
  onReactionClick?: (action: 'remove' | 'add', emoji: string) => void;
}

export function MessageReactionsDisplay({
  reaction,
  isSent,
  onReactionClick,
}: MessageReactionsDisplayProps) {
  const { senderReaction, recipientReaction } = reaction;

  // Don't render if no reactions
  if (!senderReaction && !recipientReaction) {
    return null;
  }

  // Check if both users reacted with the same emoji
  const sameBothReaction = senderReaction && recipientReaction && senderReaction === recipientReaction;

  // Determine which reaction belongs to the current user (coach)
  // If coach sent the message (isSent=true), coach's reaction is senderReaction
  // If client sent the message (isSent=false), coach's reaction is recipientReaction
  const coachReaction = isSent ? senderReaction : recipientReaction;
  const clientReaction = isSent ? recipientReaction : senderReaction;

  // Determine what action will happen on click
  // - If coach has a reaction (or both have same) → remove (show trash)
  // - If only client has a reaction → add same (show copy/duplicate)
  const willRemove = coachReaction || sameBothReaction;

  const handleClick = () => {
    if (!onReactionClick) return;

    // If both have same reaction, clicking removes the coach's reaction
    if (sameBothReaction) {
      onReactionClick('remove', coachReaction!);
      return;
    }

    // If coach has a reaction, clicking removes it
    if (coachReaction) {
      onReactionClick('remove', coachReaction);
      return;
    }

    // If only the client has a reaction, clicking adds the same reaction for coach
    if (clientReaction) {
      onReactionClick('add', clientReaction);
    }
  };

  return (
    <div
      className={cn(
        // Negative top margin to overlap with bubble (like mobile)
        '-mt-1 mb-2 z-10',
        isSent ? 'mr-3 flex justify-end' : 'ml-3 flex justify-start'
      )}
    >
      <button
        onClick={handleClick}
        className={cn(
          'group flex items-center gap-0.5 px-1.5 py-0.5 rounded-full',
          'bg-muted shadow-sm border border-transparent',
          'hover:border-primary transition-colors',
          'active:scale-95 transition-transform'
        )}
      >
        {sameBothReaction ? (
          <>
            <span className="text-xs text-muted-foreground font-medium group-hover:hidden">2</span>
            <span className="text-xs leading-none group-hover:hidden">{senderReaction}</span>
            {/* Show trash icon on hover (removing coach's reaction) */}
            <Trash2 className="h-3 w-3 text-destructive hidden group-hover:block" />
          </>
        ) : (
          <>
            {senderReaction && (
              <span className="text-xs leading-none group-hover:hidden">{senderReaction}</span>
            )}
            {recipientReaction && (
              <span className="text-xs leading-none group-hover:hidden">{recipientReaction}</span>
            )}
            {/* Show appropriate icon on hover */}
            {willRemove ? (
              <Trash2 className="h-3 w-3 text-destructive hidden group-hover:block" />
            ) : (
              <Copy className="h-3 w-3 text-primary hidden group-hover:block" />
            )}
          </>
        )}
      </button>
    </div>
  );
}
