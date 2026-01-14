import React from 'react';
import { REACTION_EMOJIS } from '@athli/shared-types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/general/utils';

interface ReactionPickerProps {
  trigger: React.ReactNode;
  onSelectReaction: (emoji: string) => void;
  currentReaction?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function ReactionPicker({
  trigger,
  onSelectReaction,
  currentReaction,
  align = 'center',
  side = 'top',
}: ReactionPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleReactionSelect = (emoji: string) => {
    onSelectReaction(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-auto p-2"
        sideOffset={8}
      >
        <div className="flex gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReactionSelect(emoji)}
              className={cn(
                'flex items-center justify-center',
                'h-10 w-10 rounded-lg',
                'hover:bg-muted transition-colors',
                'active:scale-95 transition-transform',
                'text-2xl leading-none',
                currentReaction === emoji && 'bg-muted ring-2 ring-primary'
              )}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
