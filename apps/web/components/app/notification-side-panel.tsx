'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidePanel } from './side-panel';
import { useCoachNotifications } from '@/hooks/use-coach-notifications';
import { cn } from '@/lib/general/utils';
import { CoachNotification } from '@/api/notifications/notifications-service';
import { NOTIFICATION_TYPES } from '@athli/shared-types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getNotificationNavigationUrl(notification: CoachNotification): string {
  const { client_id, notification_type, metadata } = notification;
  const baseUrl = `/athletes/${client_id}`;

  switch (notification_type) {
    // Training notifications - navigate to training page with workout params
    case NOTIFICATION_TYPES.workout_completed:
    case NOTIFICATION_TYPES.workout_missed: {
      const params = new URLSearchParams();
      if (metadata?.training_id) params.set('openWorkout', metadata.training_id);
      if (metadata?.date) params.set('workoutDate', metadata.date);
      const queryString = params.toString();
      return queryString ? `${baseUrl}/training?${queryString}` : `${baseUrl}/training`;
    }

    // Check-in notifications - navigate to specific check-in
    case NOTIFICATION_TYPES.checkin_completed:
    case NOTIFICATION_TYPES.checkin_missed: {
      if (metadata?.checkin_id) {
        return `${baseUrl}/check-in/${metadata.checkin_id}`;
      }
      return `${baseUrl}/check-in`;
    }

    // Questionnaire notifications - navigate to questionnaires page
    case NOTIFICATION_TYPES.questionnaire_completed: {
      if (metadata?.questionnaire_id) {
        return `${baseUrl}/questionnaires?openQuestionnaire=${metadata.questionnaire_id}`;
      }
      return `${baseUrl}/questionnaires`;
    }

    // Tracking notifications - navigate to respective pages
    case NOTIFICATION_TYPES.metric_logged:
    case NOTIFICATION_TYPES.metric_missed:
      return `${baseUrl}/metrics`;

    case NOTIFICATION_TYPES.habit_logged:
    case NOTIFICATION_TYPES.habit_missed:
      return `${baseUrl}/habits`;

    case NOTIFICATION_TYPES.photo_uploaded:
      return `${baseUrl}/photos`;

    // Goal notifications - navigate to overview with goal param
    case NOTIFICATION_TYPES.goal_added:
    case NOTIFICATION_TYPES.goal_edited: {
      if (metadata?.goal_id) {
        return `${baseUrl}/overview?openGoal=${metadata.goal_id}`;
      }
      return `${baseUrl}/overview`;
    }
    case NOTIFICATION_TYPES.goal_deleted:
      return `${baseUrl}/overview`;

    // Injury notifications - navigate to overview with injury param
    case NOTIFICATION_TYPES.injury_added:
    case NOTIFICATION_TYPES.injury_edited: {
      if (metadata?.injury_id) {
        return `${baseUrl}/overview?openInjury=${metadata.injury_id}`;
      }
      return `${baseUrl}/overview`;
    }
    case NOTIFICATION_TYPES.injury_deleted:
      return `${baseUrl}/overview`;

    // Client connected and default - navigate to overview
    case NOTIFICATION_TYPES.client_connected:
    default:
      return `${baseUrl}/overview`;
  }
}

type NotificationSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationSidePanel({ open, onOpenChange }: NotificationSidePanelProps) {
  const t = useTranslations();
  const router = useRouter();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  } = useCoachNotifications();

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.read_at)
    : notifications;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('notifications.title')}
    >
      <div className="flex items-center justify-between mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUnreadOnly(prev => !prev)}
          disabled={unreadCount === 0 && !showUnreadOnly}
        >
          {showUnreadOnly ? t('notifications.showAll') : t('notifications.showUnread')}
        </Button>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
          >
            {t('notifications.markAllAsRead')}
          </Button>
        )}
      </div>
      <div className="flex flex-col mt-4 -mx-4">
        {filteredNotifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {showUnreadOnly ? t('notifications.emptyUnread') : t('notifications.empty')}
          </p>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors group border-b border-border',
                !notification.read_at && 'bg-accent/50 border-l-[3px] border-l-primary'
              )}
              onClick={() => {
                // Mark as read if not already read
                if (!notification.read_at) {
                  markAsRead(notification.id);
                }
                onOpenChange(false);
                router.push(getNotificationNavigationUrl(notification));
              }}
            >
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={notification.client_avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(notification.client_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{notification.client_name}</p>
                <p className="text-xs text-muted-foreground truncate">{notification.description || notification.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {notification.read_at ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsUnread(notification.id);
                      }}
                    >
                      {t('notifications.markAsUnread')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      {t('notifications.markAsRead')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </SidePanel>
  );
}
