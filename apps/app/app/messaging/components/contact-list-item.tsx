'use client';

import { cn } from '@/lib/utils';
import { type Contact } from '@/components/app/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  onViewProfile,
}: {
  contact: Contact;
  active: boolean;
  hasDraft?: boolean;
  onClick: () => void;
  onViewProfile?: () => void;
}) {
  return (
    <div
      className={cn(
        'group/item hover:bg-muted relative flex min-w-0 cursor-pointer items-center gap-4 px-6 py-4',
        { 'dark:bg-muted! bg-gray-200!': active }
      )}
      onClick={onClick}>
      <Avatar className="overflow-visible md:size-10 rounded-full">
        <AvatarImage src={contact.avatar} alt={contact.name} className="rounded-full" />
        <AvatarFallback className="rounded-full">{getInitials(contact.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 grow">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{contact.name}</span>
          <span className="text-muted-foreground flex-none text-xs">{contact.timestamp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground truncate text-start text-sm">
            {contact.lastMessage}
          </span>
          {contact.unreadCount && contact.unreadCount > 0 && (
            <div className="ms-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              {contact.unreadCount}
            </div>
          )}
          {hasDraft && (
            <span
              className="font-medium text-muted-foreground flex-shrink-0 border border-muted-foreground/30 rounded px-1.5 py-0.5"
              style={{ fontSize: '12px' }}>
              Draft
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          'absolute end-0 top-0 bottom-0 flex items-center bg-linear-to-l from-50% px-4 opacity-0 group-hover/item:opacity-100',
          { 'from-muted': !active },
          { 'dark:from-muted from-gray-200': active }
        )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" className="rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile?.();
              }}
            >
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

