// Re-export lucide icons with React 19 compatible types
// This works around the type incompatibility between React 19 and lucide-react-native

import {
  ChartNoAxesColumn as ChartNoAxesColumnOriginal,
  House as HouseOriginal,
  Settings as SettingsOriginal,
  Plus as PlusOriginal,
  Users as UsersOriginal,
  Calendar as CalendarOriginal,
  Inbox as InboxOriginal,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import type { FC } from 'react';

// Re-export with FC type to fix React 19 compatibility
export const ChartNoAxesColumn = ChartNoAxesColumnOriginal as FC<LucideProps>;
export const House = HouseOriginal as FC<LucideProps>;
export const Settings = SettingsOriginal as FC<LucideProps>;
export const Plus = PlusOriginal as FC<LucideProps>;
export const Users = UsersOriginal as FC<LucideProps>;
export const Calendar = CalendarOriginal as FC<LucideProps>;
export const Inbox = InboxOriginal as FC<LucideProps>;

// Re-export the props type
export type { LucideProps };

