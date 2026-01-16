'use client';

// TODO: Complete inbox backend integration
// ✅ DONE: Contacts are now fetched from the coach_client view using useCoachClients hook
// ⏳ REMAINING: The following fields still need backend implementation:
//    - lastMessage: Currently empty string, needs real message data
//    - timestamp: Currently empty string, needs real message timestamp
//    - unreadCount: Currently 0, needs real unread message count
//    - isOnline: Currently false, needs real online status tracking

import { cn } from '@/lib/general/utils';
import { type Contact } from '@/components/app/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export function ContactListItem({
  contact,
  active,
  hasDraft,
  onClick,
  isCollapsed,
}: {
  contact: Contact;
  active: boolean;
  hasDraft?: boolean;
  onClick: () => void;
  onViewProfile?: () => void;
  isCollapsed?: boolean;
}) {
  return (
    <div
      className={cn(
        'group/item relative flex h-[64px] w-full cursor-pointer items-center px-4 transition-all duration-300 ease-in-out hover:bg-primary/10',
        active && 'bg-primary/10'
      )}
      onClick={onClick}
    >
      <Avatar className="size-8 rounded-full flex-shrink-0">
        <AvatarImage src={contact.avatar} alt={contact.name} className="rounded-full" />
        <AvatarFallback className="rounded-full">{getInitials(contact.name)}</AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "absolute left-[60px] w-[232px] flex flex-col justify-center overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed
            ? "opacity-0 invisible"
            : "opacity-100 visible delay-150"
        )}
      >
        <div className="flex items-center justify-between gap-2 whitespace-nowrap">
          <span className="truncate text-sm font-semibold">{contact.name}</span>
          <span className="text-muted-foreground text-[10px] leading-none flex-none">{contact.timestamp}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5 whitespace-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            {contact.unreadCount != null && contact.unreadCount > 0 ? (
              <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex-none">
                {contact.unreadCount}
              </span>
            ) : null}
            <span className={cn(
              "truncate text-start text-xs flex-1",
              contact.lastMessage ? "text-muted-foreground" : "text-muted-foreground/60 italic"
            )}>
              {contact.lastMessage || "Be the first to message..."}
            </span>
            {hasDraft && (
              <span className="font-medium text-[10px] text-primary/70 flex-shrink-0">
                Draft
              </span>
            )}
          </div>
        </div>
      </div>
    </div >
  );
}

