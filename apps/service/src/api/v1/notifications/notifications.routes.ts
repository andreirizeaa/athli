import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const notificationsRouter = Router();

// Static routes before parameterized
notificationsRouter.get('/', supabaseAuthenticate, notificationsController.getNotifications);
notificationsRouter.patch('/mark-all-read', supabaseAuthenticate, notificationsController.markAllAsRead);
notificationsRouter.patch('/:id/read', supabaseAuthenticate, notificationsController.markAsRead);
notificationsRouter.patch('/:id/unread', supabaseAuthenticate, notificationsController.markAsUnread);
