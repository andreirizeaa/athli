'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { mockContacts, type Contact } from '@/components/app/app-shell';

export const MessagesCard = () => {
  const t = useTranslations();
  const router = useRouter();

  const unreadMessages = useMemo(() => {
    return mockContacts.filter((contact) => (contact.unreadCount || 0) > 0);
  }, []);

  const handleContactClick = (contact: Contact) => {
    router.push(`/messaging/${contact.id}`);
  };

  const handleContactKeyDown = (contact: Contact, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleContactClick(contact);
    }
  };

  return (
    <Card className="bg-background flex flex-col w-full" style={{ height: '500px', minHeight: '500px', maxHeight: '500px' }}>
      <CardHeader className="px-4 flex-shrink-0">
        <CardTitle>
          {t('home.messages')} ({unreadMessages.length})
        </CardTitle>
      </CardHeader>
      <Separator className="w-full mt-[-8px] flex-shrink-0" />
      <CardContent className="px-0 flex flex-col flex-1 min-h-0">
        <div className="px-4 pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              {t('home.client')}
            </div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              {t('home.unread')}
            </div>
          </div>
        </div>
        <Separator className="w-full" />
        <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: '420px' }}>
          {unreadMessages.length === 0 ? (
            <div className="px-4 py-4">
              <p className="text-sm text-muted-foreground">{t('home.noUnreadMessages')}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {unreadMessages.map((contact) => (
                <div
                  key={contact.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleContactClick(contact)}
                  onKeyDown={(e) => handleContactKeyDown(contact, e)}
                  className={cn(
                    'border-b transition-colors hover:bg-accent cursor-pointer',
                    'px-4 py-3 flex items-center justify-between gap-3'
                  )}
                  aria-label={`Open conversation with ${contact.name}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={contact.avatar} alt={contact.name} />
                      <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-sm font-medium truncate">{contact.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{contact.lastMessage}</span>
                    </div>
                  </div>
                  {contact.unreadCount && contact.unreadCount > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs flex items-center justify-center bg-primary text-primary-foreground">
                      {contact.unreadCount}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

