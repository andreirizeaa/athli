'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  Bell,
  Check,
  CreditCard,
  ChevronsLeft,
  Home,
  Laptop,
  LogOut,
  Megaphone,
  MessageCircle,
  Moon,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  UserPlus,
  Users,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { LogoIcon } from '@/components/logo';
import { Spinner } from '@/components/ui/spinner';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Kbd } from '@/components/ui/kbd';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { availableLanguages } from '@/lib/providers/intl-provider';
import { UnsavedChangesProvider } from '@/app/settings/context/unsaved-changes-context';

export type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isOnline?: boolean;
};

export type Message = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  replyTo?: {
    id: string;
    text: string;
    isSent: boolean;
    pdf?: {
      name: string;
      data: string; // base64 encoded
      type: string;
      size: number;
    };
    images?: Array<{
      name: string;
      data: string; // base64 encoded
      type: string;
      size: number;
    }>;
    video?: {
      name: string;
      data: string; // base64 encoded
      type: string;
      size: number;
    };
  };
  pdf?: {
    name: string;
    data: string; // base64 encoded
    type: string;
    size: number;
  };
  images?: Array<{
    name: string;
    data: string; // base64 encoded
    type: string;
    size: number;
  }>;
  video?: {
    name: string;
    data: string; // base64 encoded
    type: string;
    size: number;
  };
};

export type Athlete = {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: string;
  last7DaysTraining: string;
  last30DaysTraining: string;
  category: 'online' | 'in-person';
  connected: boolean | 'invitation-sent';
  email: string;
  phone: string;
  country: string;
  age: number;
  clientFor: number; // in days
};

export type Workout = {
  id: string;
  program: string;
  description: string;
  type: string;
  length: string;
  totalExercises: number;
  equipment: string;
  created: string; // dd-mm-yy format
};

export type Program = {
  id: string;
  program: string;
  description: string;
  type: string;
  length: string;
  totalExercises: number;
  equipment: string;
  created: string; // dd-mm-yy format
};

export type Exercise = {
  id: string;
  program: string; // Exercise name
  description: string; // Exercise instructions
  category: string;
  muscleGroup: string[]; // Array of muscle groups
  equipment: string;
  modality: string;
  created: string; // dd-mm-yy format
  videoLink?: string;
};

export const mockAthletes: Athlete[] = [
  {
    id: '1',
    name: 'John Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    lastActivity: '2 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '22/30',
    category: 'in-person',
    connected: true,
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    country: 'United States',
    age: 32,
    clientFor: 450,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    lastActivity: '1 day ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '28/30',
    category: 'online',
    connected: true,
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 234-5678',
    country: 'Canada',
    age: 28,
    clientFor: 180,
  },
  {
    id: '3',
    name: 'Mike Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    lastActivity: '30 minutes ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '18/30',
    category: 'in-person',
    connected: true,
    email: 'mike.wilson@example.com',
    phone: '+44 20 7946 0958',
    country: 'United Kingdom',
    age: 35,
    clientFor: 730,
  },
  {
    id: '4',
    name: 'Emily Davis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    lastActivity: '3 days ago',
    last7DaysTraining: '3/7',
    last30DaysTraining: '15/30',
    category: 'online',
    connected: false,
    email: 'emily.davis@example.com',
    phone: '+1 (555) 345-6789',
    country: 'United States',
    age: 29,
    clientFor: 90,
  },
  {
    id: '5',
    name: 'David Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    lastActivity: '5 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '30/30',
    category: 'in-person',
    connected: true,
    email: 'david.brown@example.com',
    phone: '+61 2 9374 4000',
    country: 'Australia',
    age: 41,
    clientFor: 1095,
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    lastActivity: '1 week ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '10/30',
    category: 'online',
    connected: false,
    email: 'lisa.anderson@example.com',
    phone: '+1 (555) 456-7890',
    country: 'United States',
    age: 26,
    clientFor: 60,
  },
  {
    id: '7',
    name: 'Chris Martinez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chris',
    lastActivity: '12 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '25/30',
    category: 'in-person',
    connected: true,
    email: 'chris.martinez@example.com',
    phone: '+34 91 123 4567',
    country: 'Spain',
    age: 38,
    clientFor: 365,
  },
  {
    id: '8',
    name: 'Jessica Taylor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
    lastActivity: '2 days ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '20/30',
    category: 'online',
    connected: true,
    email: 'jessica.taylor@example.com',
    phone: '+1 (555) 567-8901',
    country: 'Canada',
    age: 31,
    clientFor: 240,
  },
  {
    id: '9',
    name: 'Robert Lee',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
    lastActivity: '4 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '26/30',
    category: 'in-person',
    connected: true,
    email: 'robert.lee@example.com',
    phone: '+1 (555) 678-9012',
    country: 'United States',
    age: 34,
    clientFor: 520,
  },
  {
    id: '10',
    name: 'Amanda White',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda',
    lastActivity: '6 hours ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '19/30',
    category: 'online',
    connected: true,
    email: 'amanda.white@example.com',
    phone: '+44 20 7946 0959',
    country: 'United Kingdom',
    age: 27,
    clientFor: 150,
  },
  {
    id: '11',
    name: 'Michael Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    lastActivity: '1 day ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '29/30',
    category: 'in-person',
    connected: true,
    email: 'michael.chen@example.com',
    phone: '+86 10 1234 5678',
    country: 'China',
    age: 30,
    clientFor: 380,
  },
  {
    id: '12',
    name: 'Sophie Martin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
    lastActivity: '3 days ago',
    last7DaysTraining: '3/7',
    last30DaysTraining: '14/30',
    category: 'online',
    connected: false,
    email: 'sophie.martin@example.com',
    phone: '+33 1 23 45 67 89',
    country: 'France',
    age: 25,
    clientFor: 75,
  },
  {
    id: '13',
    name: 'James Thompson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    lastActivity: '8 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '21/30',
    category: 'in-person',
    connected: true,
    email: 'james.thompson@example.com',
    phone: '+1 (555) 789-0123',
    country: 'United States',
    age: 39,
    clientFor: 600,
  },
  {
    id: '14',
    name: 'Emma Garcia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    lastActivity: '2 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '27/30',
    category: 'online',
    connected: true,
    email: 'emma.garcia@example.com',
    phone: '+34 91 234 5678',
    country: 'Spain',
    age: 28,
    clientFor: 200,
  },
  {
    id: '15',
    name: 'Daniel Rodriguez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel',
    lastActivity: '5 days ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '12/30',
    category: 'in-person',
    connected: 'invitation-sent',
    email: 'daniel.rodriguez@example.com',
    phone: '+1 (555) 890-1234',
    country: 'United States',
    age: 33,
    clientFor: 30,
  },
  {
    id: '16',
    name: 'Olivia Williams',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia',
    lastActivity: '1 hour ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '30/30',
    category: 'online',
    connected: true,
    email: 'olivia.williams@example.com',
    phone: '+1 (555) 901-2345',
    country: 'Canada',
    age: 29,
    clientFor: 420,
  },
  {
    id: '17',
    name: 'William Jones',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=William',
    lastActivity: '12 hours ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '17/30',
    category: 'in-person',
    connected: true,
    email: 'william.jones@example.com',
    phone: '+44 20 7946 0960',
    country: 'United Kingdom',
    age: 36,
    clientFor: 680,
  },
  {
    id: '18',
    name: 'Isabella Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Isabella',
    lastActivity: '4 days ago',
    last7DaysTraining: '3/7',
    last30DaysTraining: '13/30',
    category: 'online',
    connected: false,
    email: 'isabella.brown@example.com',
    phone: '+1 (555) 012-3456',
    country: 'United States',
    age: 24,
    clientFor: 45,
  },
  {
    id: '19',
    name: 'Alexander Davis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander',
    lastActivity: '3 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '24/30',
    category: 'in-person',
    connected: true,
    email: 'alexander.davis@example.com',
    phone: '+61 2 9374 4001',
    country: 'Australia',
    age: 31,
    clientFor: 290,
  },
  {
    id: '20',
    name: 'Mia Miller',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
    lastActivity: '1 day ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '20/30',
    category: 'online',
    connected: true,
    email: 'mia.miller@example.com',
    phone: '+1 (555) 123-4568',
    country: 'United States',
    age: 26,
    clientFor: 180,
  },
  {
    id: '21',
    name: 'Benjamin Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Benjamin',
    lastActivity: '6 days ago',
    last7DaysTraining: '1/7',
    last30DaysTraining: '8/30',
    category: 'in-person',
    connected: 'invitation-sent',
    email: 'benjamin.wilson@example.com',
    phone: '+1 (555) 234-5679',
    country: 'United States',
    age: 37,
    clientFor: 20,
  },
  {
    id: '22',
    name: 'Charlotte Moore',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlotte',
    lastActivity: '7 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '25/30',
    category: 'online',
    connected: true,
    email: 'charlotte.moore@example.com',
    phone: '+44 20 7946 0961',
    country: 'United Kingdom',
    age: 30,
    clientFor: 340,
  },
  {
    id: '23',
    name: 'Lucas Taylor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
    lastActivity: '2 days ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '18/30',
    category: 'in-person',
    connected: true,
    email: 'lucas.taylor@example.com',
    phone: '+1 (555) 345-6790',
    country: 'Canada',
    age: 32,
    clientFor: 480,
  },
  {
    id: '24',
    name: 'Amelia Anderson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amelia',
    lastActivity: '5 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '28/30',
    category: 'online',
    connected: true,
    email: 'amelia.anderson@example.com',
    phone: '+1 (555) 456-7891',
    country: 'United States',
    age: 27,
    clientFor: 220,
  },
  {
    id: '25',
    name: 'Henry Thomas',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry',
    lastActivity: '1 week ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '11/30',
    category: 'in-person',
    connected: false,
    email: 'henry.thomas@example.com',
    phone: '+34 91 345 6789',
    country: 'Spain',
    age: 40,
    clientFor: 550,
  },
  {
    id: '26',
    name: 'Harper Jackson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Harper',
    lastActivity: '4 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '22/30',
    category: 'online',
    connected: true,
    email: 'harper.jackson@example.com',
    phone: '+1 (555) 567-8902',
    country: 'United States',
    age: 25,
    clientFor: 160,
  },
  {
    id: '27',
    name: 'Ethan White',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan',
    lastActivity: '3 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '26/30',
    category: 'in-person',
    connected: true,
    email: 'ethan.white@example.com',
    phone: '+1 (555) 678-9013',
    country: 'United States',
    age: 28,
    clientFor: 310,
  },
  {
    id: '28',
    name: 'Ava Harris',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava',
    lastActivity: '2 days ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '19/30',
    category: 'online',
    connected: true,
    email: 'ava.harris@example.com',
    phone: '+44 20 7946 0962',
    country: 'United Kingdom',
    age: 29,
    clientFor: 270,
  },
  {
    id: '29',
    name: 'Mason Martin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mason',
    lastActivity: '8 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '30/30',
    category: 'in-person',
    connected: true,
    email: 'mason.martin@example.com',
    phone: '+1 (555) 789-0124',
    country: 'United States',
    age: 35,
    clientFor: 650,
  },
  {
    id: '30',
    name: 'Ella Thompson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ella',
    lastActivity: '1 day ago',
    last7DaysTraining: '3/7',
    last30DaysTraining: '15/30',
    category: 'online',
    connected: false,
    email: 'ella.thompson@example.com',
    phone: '+1 (555) 890-1235',
    country: 'Canada',
    age: 23,
    clientFor: 85,
  },
  {
    id: '31',
    name: 'Noah Garcia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah',
    lastActivity: '5 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '21/30',
    category: 'in-person',
    connected: true,
    email: 'noah.garcia@example.com',
    phone: '+34 91 456 7890',
    country: 'Spain',
    age: 33,
    clientFor: 410,
  },
  {
    id: '32',
    name: 'Grace Martinez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace',
    lastActivity: '6 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '27/30',
    category: 'online',
    connected: true,
    email: 'grace.martinez@example.com',
    phone: '+1 (555) 901-2346',
    country: 'United States',
    age: 26,
    clientFor: 190,
  },
  {
    id: '33',
    name: 'Liam Robinson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam',
    lastActivity: '4 days ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '12/30',
    category: 'in-person',
    connected: 'invitation-sent',
    email: 'liam.robinson@example.com',
    phone: '+1 (555) 012-3457',
    country: 'United States',
    age: 38,
    clientFor: 25,
  },
  {
    id: '34',
    name: 'Chloe Clark',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe',
    lastActivity: '3 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '29/30',
    category: 'online',
    connected: true,
    email: 'chloe.clark@example.com',
    phone: '+44 20 7946 0963',
    country: 'United Kingdom',
    age: 31,
    clientFor: 360,
  },
  {
    id: '35',
    name: 'Jacob Rodriguez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jacob',
    lastActivity: '1 day ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '17/30',
    category: 'in-person',
    connected: true,
    email: 'jacob.rodriguez@example.com',
    phone: '+1 (555) 123-4569',
    country: 'United States',
    age: 29,
    clientFor: 250,
  },
  {
    id: '36',
    name: 'Lily Lewis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily',
    lastActivity: '7 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '23/30',
    category: 'online',
    connected: true,
    email: 'lily.lewis@example.com',
    phone: '+1 (555) 234-5680',
    country: 'Canada',
    age: 24,
    clientFor: 140,
  },
  {
    id: '37',
    name: 'Logan Walker',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Logan',
    lastActivity: '2 days ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '24/30',
    category: 'in-person',
    connected: true,
    email: 'logan.walker@example.com',
    phone: '+61 2 9374 4002',
    country: 'Australia',
    age: 36,
    clientFor: 590,
  },
  {
    id: '38',
    name: 'Zoe Hall',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
    lastActivity: '5 days ago',
    last7DaysTraining: '1/7',
    last30DaysTraining: '9/30',
    category: 'online',
    connected: false,
    email: 'zoe.hall@example.com',
    phone: '+1 (555) 345-6791',
    country: 'United States',
    age: 22,
    clientFor: 50,
  },
  {
    id: '39',
    name: 'Carter Allen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carter',
    lastActivity: '4 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '28/30',
    category: 'in-person',
    connected: true,
    email: 'carter.allen@example.com',
    phone: '+1 (555) 456-7892',
    country: 'United States',
    age: 34,
    clientFor: 470,
  },
  {
    id: '40',
    name: 'Nora Young',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nora',
    lastActivity: '1 hour ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '26/30',
    category: 'online',
    connected: true,
    email: 'nora.young@example.com',
    phone: '+44 20 7946 0964',
    country: 'United Kingdom',
    age: 27,
    clientFor: 210,
  },
  {
    id: '41',
    name: 'Owen King',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Owen',
    lastActivity: '3 days ago',
    last7DaysTraining: '3/7',
    last30DaysTraining: '14/30',
    category: 'in-person',
    connected: false,
    email: 'owen.king@example.com',
    phone: '+1 (555) 567-8903',
    country: 'United States',
    age: 41,
    clientFor: 720,
  },
  {
    id: '42',
    name: 'Scarlett Wright',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scarlett',
    lastActivity: '6 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '20/30',
    category: 'online',
    connected: true,
    email: 'scarlett.wright@example.com',
    phone: '+1 (555) 678-9014',
    country: 'Canada',
    age: 30,
    clientFor: 330,
  },
  {
    id: '43',
    name: 'Wyatt Lopez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wyatt',
    lastActivity: '2 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '25/30',
    category: 'in-person',
    connected: true,
    email: 'wyatt.lopez@example.com',
    phone: '+34 91 567 8901',
    country: 'Spain',
    age: 32,
    clientFor: 390,
  },
  {
    id: '44',
    name: 'Victoria Hill',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria',
    lastActivity: '1 day ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '18/30',
    category: 'online',
    connected: true,
    email: 'victoria.hill@example.com',
    phone: '+1 (555) 789-0125',
    country: 'United States',
    age: 28,
    clientFor: 230,
  },
  {
    id: '45',
    name: 'Jack Scott',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    lastActivity: '8 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '30/30',
    category: 'in-person',
    connected: true,
    email: 'jack.scott@example.com',
    phone: '+1 (555) 890-1236',
    country: 'United States',
    age: 37,
    clientFor: 610,
  },
  {
    id: '46',
    name: 'Aria Green',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
    lastActivity: '4 days ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '11/30',
    category: 'online',
    connected: 'invitation-sent',
    email: 'aria.green@example.com',
    phone: '+1 (555) 901-2347',
    country: 'United States',
    age: 25,
    clientFor: 15,
  },
  {
    id: '47',
    name: 'Luke Adams',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luke',
    lastActivity: '5 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '27/30',
    category: 'in-person',
    connected: true,
    email: 'luke.adams@example.com',
    phone: '+44 20 7946 0965',
    country: 'United Kingdom',
    age: 29,
    clientFor: 280,
  },
  {
    id: '48',
    name: 'Layla Baker',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Layla',
    lastActivity: '3 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '22/30',
    category: 'online',
    connected: true,
    email: 'layla.baker@example.com',
    phone: '+1 (555) 012-3458',
    country: 'Canada',
    age: 26,
    clientFor: 170,
  },
  {
    id: '49',
    name: 'Ryan Nelson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan',
    lastActivity: '2 days ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '19/30',
    category: 'in-person',
    connected: true,
    email: 'ryan.nelson@example.com',
    phone: '+1 (555) 123-4570',
    country: 'United States',
    age: 35,
    clientFor: 500,
  },
  {
    id: '50',
    name: 'Penelope Carter',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Penelope',
    lastActivity: '1 week ago',
    last7DaysTraining: '1/7',
    last30DaysTraining: '7/30',
    category: 'online',
    connected: false,
    email: 'penelope.carter@example.com',
    phone: '+1 (555) 234-5681',
    country: 'United States',
    age: 23,
    clientFor: 40,
  },
  {
    id: '51',
    name: 'Nathan Mitchell',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nathan',
    lastActivity: '7 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '29/30',
    category: 'in-person',
    connected: true,
    email: 'nathan.mitchell@example.com',
    phone: '+61 2 9374 4003',
    country: 'Australia',
    age: 33,
    clientFor: 430,
  },
  {
    id: '52',
    name: 'Hannah Perez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hannah',
    lastActivity: '4 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '24/30',
    category: 'online',
    connected: true,
    email: 'hannah.perez@example.com',
    phone: '+1 (555) 345-6792',
    country: 'United States',
    age: 28,
    clientFor: 260,
  },
  {
    id: '53',
    name: 'Isaac Roberts',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Isaac',
    lastActivity: '1 day ago',
    last7DaysTraining: '3/7',
    last30DaysTraining: '16/30',
    category: 'in-person',
    connected: true,
    email: 'isaac.roberts@example.com',
    phone: '+1 (555) 456-7893',
    country: 'United States',
    age: 39,
    clientFor: 570,
  },
  {
    id: '54',
    name: 'Addison Turner',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Addison',
    lastActivity: '5 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '21/30',
    category: 'online',
    connected: true,
    email: 'addison.turner@example.com',
    phone: '+44 20 7946 0966',
    country: 'United Kingdom',
    age: 31,
    clientFor: 350,
  },
  {
    id: '55',
    name: 'Caleb Phillips',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Caleb',
    lastActivity: '3 days ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '13/30',
    category: 'in-person',
    connected: 'invitation-sent',
    email: 'caleb.phillips@example.com',
    phone: '+1 (555) 567-8904',
    country: 'United States',
    age: 36,
    clientFor: 10,
  },
  {
    id: '56',
    name: 'Aubrey Campbell',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aubrey',
    lastActivity: '6 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '25/30',
    category: 'online',
    connected: true,
    email: 'aubrey.campbell@example.com',
    phone: '+1 (555) 678-9015',
    country: 'Canada',
    age: 27,
    clientFor: 200,
  },
  {
    id: '57',
    name: 'Julian Parker',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julian',
    lastActivity: '2 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '28/30',
    category: 'in-person',
    connected: true,
    email: 'julian.parker@example.com',
    phone: '+34 91 678 9012',
    country: 'Spain',
    age: 34,
    clientFor: 440,
  },
  {
    id: '58',
    name: 'Stella Evans',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Stella',
    lastActivity: '1 day ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '17/30',
    category: 'online',
    connected: true,
    email: 'stella.evans@example.com',
    phone: '+1 (555) 789-0126',
    country: 'United States',
    age: 29,
    clientFor: 240,
  },
  {
    id: '59',
    name: 'Levi Edwards',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Levi',
    lastActivity: '4 days ago',
    last7DaysTraining: '1/7',
    last30DaysTraining: '10/30',
    category: 'in-person',
    connected: false,
    email: 'levi.edwards@example.com',
    phone: '+1 (555) 890-1237',
    country: 'United States',
    age: 42,
    clientFor: 780,
  },
  {
    id: '60',
    name: 'Natalie Collins',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Natalie',
    lastActivity: '5 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '26/30',
    category: 'online',
    connected: true,
    email: 'natalie.collins@example.com',
    phone: '+1 (555) 901-2348',
    country: 'United States',
    age: 25,
    clientFor: 130,
  },
  {
    id: '61',
    name: 'Aaron Stewart',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aaron',
    lastActivity: '3 hours ago',
    last7DaysTraining: '5/7',
    last30DaysTraining: '23/30',
    category: 'in-person',
    connected: true,
    email: 'aaron.stewart@example.com',
    phone: '+44 20 7946 0967',
    country: 'United Kingdom',
    age: 30,
    clientFor: 320,
  },
  {
    id: '62',
    name: 'Lillian Sanchez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lillian',
    lastActivity: '2 days ago',
    last7DaysTraining: '4/7',
    last30DaysTraining: '20/30',
    category: 'online',
    connected: true,
    email: 'lillian.sanchez@example.com',
    phone: '+1 (555) 012-3459',
    country: 'United States',
    age: 28,
    clientFor: 220,
  },
  {
    id: '63',
    name: 'Eli Morris',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eli',
    lastActivity: '8 hours ago',
    last7DaysTraining: '7/7',
    last30DaysTraining: '30/30',
    category: 'in-person',
    connected: true,
    email: 'eli.morris@example.com',
    phone: '+1 (555) 123-4571',
    country: 'United States',
    age: 38,
    clientFor: 620,
  },
  {
    id: '64',
    name: 'Aurora Rogers',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aurora',
    lastActivity: '1 week ago',
    last7DaysTraining: '2/7',
    last30DaysTraining: '12/30',
    category: 'online',
    connected: false,
    email: 'aurora.rogers@example.com',
    phone: '+1 (555) 234-5682',
    country: 'Canada',
    age: 24,
    clientFor: 70,
  },
  {
    id: '65',
    name: 'Grayson Reed',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grayson',
    lastActivity: '6 hours ago',
    last7DaysTraining: '6/7',
    last30DaysTraining: '27/30',
    category: 'in-person',
    connected: true,
    email: 'grayson.reed@example.com',
    phone: '+61 2 9374 4004',
    country: 'Australia',
    age: 31,
    clientFor: 370,
  },
];

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    lastMessage: 'Hey, how are you doing?',
    timestamp: '2:30 PM',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    lastMessage: 'Thanks for the workout plan!',
    timestamp: '1:15 PM',
    isOnline: false,
  },
  {
    id: '3',
    name: 'Mike Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    lastMessage: 'Can we schedule a session?',
    timestamp: '12:45 PM',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: '4',
    name: 'Emily Davis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    lastMessage: 'The nutrition plan looks great',
    timestamp: 'Yesterday',
    isOnline: false,
  },
  {
    id: '5',
    name: 'David Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    lastMessage: 'See you at the gym tomorrow',
    timestamp: 'Yesterday',
    isOnline: true,
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    lastMessage: 'Perfect, thanks!',
    timestamp: '2 days ago',
    isOnline: false,
  },
];

export const mockWorkouts: Workout[] = [
  {
    id: '1',
    program: 'Strength Builder',
    description:
      'A comprehensive strength training program designed to build muscle mass and increase overall strength. This program focuses on compound movements and progressive overload principles.',
    type: 'Strength',
    length: '12 weeks',
    equipment: 'Barbell, Dumbbells, Bench',
    totalExercises: 24,
    created: '15-03-24',
  },
  {
    id: '2',
    program: 'Cardio Blast',
    description:
      'High-intensity cardio workout program perfect for improving cardiovascular health and burning calories. Includes interval training and endurance exercises.',
    type: 'Cardio',
    length: '8 weeks',
    totalExercises: 18,
    equipment: 'Treadmill, Bike, Rowing Machine',
    created: '22-01-24',
  },
  {
    id: '3',
    program: 'Flexibility Flow',
    description:
      'A yoga and stretching focused program that enhances flexibility, mobility, and relaxation. Ideal for recovery days and improving range of motion.',
    type: 'Flexibility',
    length: '6 weeks',
    totalExercises: 15,
    equipment: 'Yoga Mat, Blocks, Straps',
    created: '10-02-24',
  },
  {
    id: '4',
    program: 'HIIT Power',
    description:
      'High-intensity interval training program that alternates between intense bursts of activity and fixed periods of rest. Great for time-efficient workouts.',
    type: 'HIIT',
    length: '4 weeks',
    totalExercises: 12,
    equipment: 'Bodyweight, Kettlebells',
    created: '05-04-24',
  },
  {
    id: '5',
    program: 'Endurance Runner',
    description:
      'Progressive running program designed to build endurance and improve running performance. Includes tempo runs, intervals, and long-distance training.',
    type: 'Endurance',
    length: '16 weeks',
    totalExercises: 20,
    equipment: 'Running Shoes, Track',
    created: '18-12-23',
  },
  {
    id: '6',
    program: 'Bodyweight Basics',
    description:
      'No-equipment workout program using only bodyweight exercises. Perfect for home workouts and building functional strength.',
    type: 'Bodyweight',
    length: '10 weeks',
    totalExercises: 16,
    equipment: 'None',
    created: '28-03-24',
  },
  {
    id: '7',
    program: 'Powerlifting Prep',
    description:
      'Specialized program for powerlifting competition preparation. Focuses on squat, bench press, and deadlift with periodization.',
    type: 'Powerlifting',
    length: '20 weeks',
    totalExercises: 8,
    equipment: 'Power Rack, Barbell, Plates',
    created: '12-11-23',
  },
];

export const mockPrograms: Program[] = [
  {
    id: '1',
    program: 'Strength Builder',
    description:
      'A comprehensive strength training program designed to build muscle mass and increase overall strength. This program focuses on compound movements and progressive overload principles.',
    type: 'Strength',
    length: '12 weeks',
    equipment: 'Barbell, Dumbbells, Bench',
    totalExercises: 24,
    created: '15-03-24',
  },
  {
    id: '2',
    program: 'Cardio Blast',
    description:
      'High-intensity cardio workout program perfect for improving cardiovascular health and burning calories. Includes interval training and endurance exercises.',
    type: 'Cardio',
    length: '8 weeks',
    totalExercises: 18,
    equipment: 'Treadmill, Bike, Rowing Machine',
    created: '22-01-24',
  },
  {
    id: '3',
    program: 'Flexibility Flow',
    description:
      'A yoga and stretching focused program that enhances flexibility, mobility, and relaxation. Ideal for recovery days and improving range of motion.',
    type: 'Flexibility',
    length: '6 weeks',
    totalExercises: 15,
    equipment: 'Yoga Mat, Blocks, Straps',
    created: '10-02-24',
  },
  {
    id: '4',
    program: 'HIIT Power',
    description:
      'High-intensity interval training program that alternates between intense bursts of activity and fixed periods of rest. Great for time-efficient workouts.',
    type: 'HIIT',
    length: '4 weeks',
    totalExercises: 12,
    equipment: 'Bodyweight, Kettlebells',
    created: '05-04-24',
  },
  {
    id: '5',
    program: 'Endurance Runner',
    description:
      'Progressive running program designed to build endurance and improve running performance. Includes tempo runs, intervals, and long-distance training.',
    type: 'Endurance',
    length: '16 weeks',
    totalExercises: 20,
    equipment: 'Running Shoes, Track',
    created: '18-12-23',
  },
  {
    id: '6',
    program: 'Bodyweight Basics',
    description:
      'No-equipment workout program using only bodyweight exercises. Perfect for home workouts and building functional strength.',
    type: 'Bodyweight',
    length: '10 weeks',
    totalExercises: 16,
    equipment: 'None',
    created: '28-03-24',
  },
  {
    id: '7',
    program: 'Powerlifting Prep',
    description:
      'Specialized program for powerlifting competition preparation. Focuses on squat, bench press, and deadlift with periodization.',
    type: 'Powerlifting',
    length: '20 weeks',
    totalExercises: 8,
    equipment: 'Power Rack, Barbell, Plates',
    created: '12-11-23',
  },
];

export const mockExercises: Exercise[] = [
  {
    id: '1',
    program: 'Bench Press',
    description: 'Lie on bench, lower bar to chest, press up. Focus on controlled movement and full range of motion.',
    category: 'Weight & Reps',
    muscleGroup: ['Chest', 'Triceps', 'Shoulders'],
    equipment: 'Barbell',
    modality: 'Strength',
    created: '15-01-24',
    videoLink: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
  },
  {
    id: '2',
    program: 'Pull-ups',
    description: 'Hang from bar, pull body up until chin clears bar, lower with control. Keep core engaged throughout.',
    category: 'Reps',
    muscleGroup: ['Back', 'Biceps', 'Lats'],
    equipment: 'Bodyweight',
    modality: 'Strength',
    created: '14-01-24',
    videoLink: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
  },
  {
    id: '3',
    program: 'Squats',
    description: 'Stand with feet shoulder-width apart, lower hips back and down, keep knees tracking over toes, return to standing.',
    category: 'Weight & Reps',
    muscleGroup: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: 'Barbell',
    modality: 'Strength',
    created: '13-01-24',
    videoLink: 'https://www.youtube.com/watch?v=YaXPRqUwItQ',
  },
  {
    id: '4',
    program: 'Deadlift',
    description: 'Stand with feet hip-width apart, hinge at hips, grip bar, drive through heels to stand, keep back straight.',
    category: 'Weight & Reps',
    muscleGroup: ['Back', 'Glutes', 'Hamstrings', 'Traps'],
    equipment: 'Barbell',
    modality: 'Strength',
    created: '12-01-24',
  },
  {
    id: '5',
    program: 'Running',
    description: 'Maintain steady pace, focus on breathing rhythm, land mid-foot, keep posture upright.',
    category: 'Distance / Duration',
    muscleGroup: ['Quadriceps', 'Calves', 'Glutes'],
    equipment: 'Bodyweight',
    modality: 'Cardio',
    created: '11-01-24',
    videoLink: 'https://vimeo.com/123456789',
  },
  {
    id: '6',
    program: 'Box Jumps',
    description: 'Stand facing box, jump onto box landing softly, step down and repeat. Focus on explosive power.',
    category: 'Reps',
    muscleGroup: ['Quadriceps', 'Glutes', 'Calves'],
    equipment: 'Bodyweight',
    modality: 'Plyos',
    created: '10-01-24',
  },
  {
    id: '7',
    program: 'Shoulder Press',
    description: 'Press weight overhead, lower with control. Keep core tight and avoid arching back excessively.',
    category: 'Weight & Reps',
    muscleGroup: ['Shoulders', 'Triceps', 'Delts'],
    equipment: 'Dumbbell',
    modality: 'Strength',
    created: '09-01-24',
  },
  {
    id: '8',
    program: 'Plank',
    description: 'Hold body in straight line, support on forearms and toes, engage core, breathe normally.',
    category: 'Distance / Duration',
    muscleGroup: ['Abs', 'Obliques', 'Full Body'],
    equipment: 'Bodyweight',
    modality: 'Stability',
    created: '08-01-24',
  },
  {
    id: '9',
    program: 'Bicep Curls',
    description: 'Curl weight toward shoulders, squeeze at top, lower with control. Keep elbows stationary.',
    category: 'Weight & Reps',
    muscleGroup: ['Biceps', 'Forearms'],
    equipment: 'Dumbbell',
    modality: 'Strength',
    created: '07-01-24',
  },
  {
    id: '10',
    program: 'Yoga Flow',
    description: 'Move through poses with breath, maintain alignment, focus on flexibility and balance.',
    category: 'Distance / Duration',
    muscleGroup: ['Full Body'],
    equipment: 'Bodyweight',
    modality: 'Mobility',
    created: '06-01-24',
  },
];

export const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      text: 'Hey, how are you doing?',
      timestamp: '2:30 PM',
      isSent: false,
    },
    {
      id: 'm2',
      text: "I'm doing great, thanks for asking! How about you?",
      timestamp: '2:32 PM',
      isSent: true,
    },
    {
      id: 'm3',
      text: 'Pretty good! Just finished my workout.',
      timestamp: '2:33 PM',
      isSent: false,
    },
  ],
  '2': [
    {
      id: 'm4',
      text: 'Thanks for the workout plan!',
      timestamp: '1:15 PM',
      isSent: false,
    },
    {
      id: 'm5',
      text: "You're welcome! Let me know if you have any questions.",
      timestamp: '1:16 PM',
      isSent: true,
    },
  ],
};

const isFuzzyMatch = (text: string, query: string) => {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return false;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }

  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
    if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
      queryIndex += 1;
    }
    textIndex += 1;
  }

  return queryIndex === normalizedQuery.length;
};

type AppShellProps = {
  children: ReactNode;
};

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <UnsavedChangesProvider>
      <AppShellWithProvider>{children}</AppShellWithProvider>
    </UnsavedChangesProvider>
  );
};

const AppShellWithProvider = ({ children }: AppShellProps) => {
  const t = useTranslations();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [isThemeMounted, setIsThemeMounted] = React.useState(false);
  const [currentLanguage, setCurrentLanguage] = React.useState('en');
  const pathname = usePathname();

  React.useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  return (
    <SidebarProvider defaultOpen={false} className="h-svh">
      <AppShellContent
        t={t}
        user={user}
        openUserProfile={openUserProfile}
        signOut={signOut}
        resolvedTheme={resolvedTheme}
        setTheme={setTheme}
        theme={theme}
        isThemeMounted={isThemeMounted}
        currentLanguage={currentLanguage}
        setCurrentLanguage={setCurrentLanguage}
        pathname={pathname}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  );
};

const AppShellContent = ({
  children,
  t,
  user,
  openUserProfile,
  signOut,
  resolvedTheme,
  setTheme,
  theme,
  isThemeMounted,
  currentLanguage,
  setCurrentLanguage,
  pathname,
}: {
  children: ReactNode;
  t: (key: string, values?: Record<string, string>) => string;
  user: ReturnType<typeof useUser>['user'];
  openUserProfile: () => void;
  signOut: (options: { redirectUrl: string }) => void;
  resolvedTheme: string | undefined;
  setTheme: (theme: string) => void;
  theme: string | undefined;
  isThemeMounted: boolean;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
  pathname: string;
}) => {
  const { state, toggleSidebar, isHovered, setOpen, setIsHovered, setJustClosed } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isHovered;
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const isPinnedOpen = state === 'expanded' && !isHovered;
  const isHoverExpanded = state === 'collapsed' && isHovered;
  const navigationRouter = useRouter();


  const handlePinMenu = () => {
    setOpen(true);
    setJustClosed(false);
  };

  const handleUnpinMenu = () => {
    setIsHovered(false);
    setJustClosed(true);
    setOpen(false);
    // Reset the justClosed flag after a short delay to allow hover to work again
    setTimeout(() => {
      setJustClosed(false);
    }, 300);
  };
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isClient, setIsClient] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  // Normalize pathname by removing trailing slashes (except for root)
  const normalizedPathname = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const [activePath, setActivePath] = React.useState(normalizedPathname);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Use Next.js pathname directly, normalized
  React.useEffect(() => {
    const normalized = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
    setActivePath(normalized);
  }, [pathname]);

  const displayName =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';
  const displayEmail = user?.primaryEmailAddress?.emailAddress;

  // Calculate initials only on client to avoid hydration mismatch
  const [initials, setInitials] = React.useState('U');

  React.useEffect(() => {
    const calculatedInitials =
      displayName
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || 'U';
    setInitials(calculatedInitials);
  }, [displayName]);

  const currentTheme = theme || 'system';
  const isDark = isThemeMounted && resolvedTheme === 'dark';

  const getActiveSidebarClasses = (isActive: boolean) => {
    if (!isActive) return '';
    // Light mode: custom dark gray background (#3f3c39), white text (background)
    // Dark mode: white background (foreground), black text (background)
    // Override sidebar's default bg-primary/10 and text-primary with stronger specificity
    return 'data-[active=true]:!bg-[#3f3c39] dark:data-[active=true]:!bg-foreground data-[active=true]:!text-background [&_svg]:data-[active=true]:!text-background';
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const messageSearchResults = React.useMemo(
    () =>
      mockContacts.reduce<Array<{ contact: Contact }>>((results, contact) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const contactMessages = mockMessages[contact.id] ?? [];
        const hasMatchInContact =
          isFuzzyMatch(contact.name, query) || isFuzzyMatch(contact.lastMessage, query);

        const matchingMessage = contactMessages.find((message) =>
          isFuzzyMatch(message.text, query)
        );

        if (!hasMatchInContact && !matchingMessage) {
          return results;
        }

        results.push({
          contact,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const athleteSearchResults = React.useMemo(
    () =>
      mockAthletes.reduce<Array<{ athlete: Athlete }>>((results, athlete) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInAthlete =
          isFuzzyMatch(athlete.name, query) ||
          isFuzzyMatch(athlete.email, query) ||
          isFuzzyMatch(athlete.phone, query) ||
          isFuzzyMatch(athlete.country, query) ||
          isFuzzyMatch(athlete.category, query);

        if (!hasMatchInAthlete) {
          return results;
        }

        results.push({
          athlete,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const workoutSearchResults = React.useMemo(
    () =>
      mockWorkouts.reduce<Array<{ workout: Workout }>>((results, workout) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInWorkout =
          isFuzzyMatch(workout.program, query) ||
          isFuzzyMatch(workout.description, query) ||
          isFuzzyMatch(workout.type, query) ||
          isFuzzyMatch(workout.equipment, query);

        if (!hasMatchInWorkout) {
          return results;
        }

        results.push({
          workout,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const programSearchResults = React.useMemo(
    () =>
      mockPrograms.reduce<Array<{ program: Program }>>((results, program) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInProgram =
          isFuzzyMatch(program.program, query) ||
          isFuzzyMatch(program.description, query) ||
          isFuzzyMatch(program.type, query) ||
          isFuzzyMatch(program.equipment, query);

        if (!hasMatchInProgram) {
          return results;
        }

        results.push({
          program,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const exerciseSearchResults = React.useMemo(
    () =>
      mockExercises.reduce<Array<{ exercise: Exercise }>>((results, exercise) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInExercise =
          isFuzzyMatch(exercise.program, query) ||
          isFuzzyMatch(exercise.description, query) ||
          isFuzzyMatch(exercise.category, query) ||
          isFuzzyMatch(exercise.equipment, query) ||
          isFuzzyMatch(exercise.modality, query) ||
          exercise.muscleGroup.some((group) => isFuzzyMatch(group, query));

        if (!hasMatchInExercise) {
          return results;
        }

        results.push({
          exercise,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const handleSearchResultClick = (contactId: string) => {
    router.push(`/messaging/${contactId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleAthleteSearchResultClick = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/overview`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleWorkoutSearchResultClick = (workoutId: string) => {
    router.push(`/library/workouts/${workoutId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleProgramSearchResultClick = (programId: string) => {
    router.push(`/library/programs/${programId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleExerciseSearchResultClick = (exerciseId: string) => {
    router.push(`/library/exercises`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const router = navigationRouter;

  const generalNavItems = [
    {
      href: '/library',
      labelKey: 'sidebar.links.library',
      icon: Archive,
    },
  ] as const;

  const businessNavItems = [
    {
      href: '/calendar',
      labelKey: 'sidebar.links.calendar',
      icon: CalendarDays,
    },
  ] as const;

  const athletesNavItems = [
    {
      href: '/athletes',
      labelKey: 'sidebar.links.athletes',
      icon: Users,
    },
    {
      href: '/messaging',
      labelKey: 'sidebar.links.messaging',
      icon: MessageCircle,
    },
  ] as const;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          {isCollapsed ? (
            <div className="flex items-center justify-center px-2 py-1 h-10">
              <LogoIcon className="h-5 w-auto" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-2 py-1 h-10">
              <span className="text-base font-semibold">OneNinety</span>
              {isHoverExpanded ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handlePinMenu}
                      className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
                      aria-label={t('sidebar.actions.keepMenuOpenAria')}
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('sidebar.actions.keepMenuOpen')}</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={handleUnpinMenu}
                  className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
                  aria-label={t('sidebar.actions.closeSidebarAria')}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </SidebarHeader>
        <SidebarContent className="gap-0">
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePath === '/home'}
                    className={cn('text-xs', getActiveSidebarClasses(activePath === '/home'))}
                  >
                    <Link href="/home">
                      <Home className="shrink-0" />
                      {!isCollapsed && <span>{t('sidebar.links.home')}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {generalNavItems.map((item) => {
                  const Icon = item.icon;
                  let isActive = false;
                  if (item.href === '/library') {
                    // Check exact match or if path starts with the href followed by /
                    isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);
                  } else {
                    isActive = activePath === item.href;
                  }
                  const label = 'label' in item ? item.label : ('labelKey' in item ? t(item.labelKey) : '');

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn('text-xs', getActiveSidebarClasses(isActive))}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          {!isCollapsed && <span>{label as string}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {businessNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activePath === item.href || activePath.startsWith(`${item.href}/`);
                  const label = t(item.labelKey);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn('text-xs', getActiveSidebarClasses(isActive))}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          {!isCollapsed && <span>{label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="pb-0">
            <div className="flex h-6 items-center px-2">
              {isCollapsed ? (
                <div className="mx-auto h-px w-8 bg-sidebar-border" />
              ) : (
                <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                  {t('sidebar.group.athletes')}
                </span>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {athletesNavItems.map((item) => {
                  const Icon = item.icon;
                  const href = item.href;
                  const isActive =
                    (href === '/athletes' || href === '/messaging')
                      ? activePath === href || activePath.startsWith(`${href}/`)
                      : activePath === href;
                  const label = t(item.labelKey);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn('text-xs', getActiveSidebarClasses(isActive))}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          {!isCollapsed && <span>{label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mt-auto px-2 pb-3">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={activePath === '/settings' || activePath.startsWith('/settings/')}
                className={cn('text-xs', getActiveSidebarClasses(activePath === '/settings' || activePath.startsWith('/settings/')))}
              >
                <Link href="/settings">
                  <Settings className="shrink-0" />
                  {!isCollapsed && <span>{t('sidebar.settings.label') || 'Settings'}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-xs bg-primary !text-primary-foreground hover:bg-primary/90 [&_svg]:!text-primary-foreground"
              >
                <Link href="/settings/business/company/team">
                  <UserPlus className="shrink-0" />
                  {!isCollapsed && <span className="!text-primary-foreground">{t('sidebar.footer.addTeamMembers')}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-col gap-2 p-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2 px-2 py-0.5">
            <div className="flex items-center gap-2 flex-1">
              <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative flex items-center flex-1">
                    <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      ref={searchInputRef}
                      type="search"
                      placeholder={t('sidebar.search.placeholder')}
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-8 pr-20 h-10"
                    />
                    <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
                      <Kbd className="h-5 px-1.5">
                        {isClient && navigator.platform.toUpperCase().indexOf('MAC') >= 0
                          ? '⌘'
                          : 'Ctrl'}
                      </Kbd>
                      <Kbd className="h-5 px-1.5">K</Kbd>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                  sideOffset={4}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col max-h-[80vh] overflow-y-auto">
                    {!searchQuery.trim() && (
                      <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[400px]">
                        <Search className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          {t('sidebar.search.emptyMessage')}
                        </p>
                      </div>
                    )}
                    {searchQuery.trim() &&
                      messageSearchResults.length === 0 &&
                      athleteSearchResults.length === 0 &&
                      workoutSearchResults.length === 0 &&
                      programSearchResults.length === 0 &&
                      exerciseSearchResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                          <p className="text-sm text-muted-foreground">
                            {t('sidebar.search.noResults')}{' '}
                            <span className="font-medium">"{searchQuery}"</span>.
                          </p>
                        </div>
                      )}
                    {searchQuery.trim() &&
                      (messageSearchResults.length > 0 ||
                        athleteSearchResults.length > 0 ||
                        workoutSearchResults.length > 0 ||
                        programSearchResults.length > 0 ||
                        exerciseSearchResults.length > 0) && (
                        <div className="py-2">
                          {athleteSearchResults.length > 0 && (
                            <>
                              <div className="px-3 pb-1 pt-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t('sidebar.search.athletes')}
                                </p>
                              </div>
                              <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                                <div
                                  className={cn(
                                    'grid gap-2',
                                    athleteSearchResults.length === 1
                                      ? 'grid-cols-1'
                                      : athleteSearchResults.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2 sm:grid-cols-3'
                                  )}
                                >
                                  {athleteSearchResults.map((result) => {
                                    const initials = result.athlete.name
                                      .split(' ')
                                      .map((part) => part.charAt(0).toUpperCase())
                                      .slice(0, 2)
                                      .join('');
                                    return (
                                      <Card
                                        key={result.athlete.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                          handleAthleteSearchResultClick(result.athlete.id)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleAthleteSearchResultClick(result.athlete.id);
                                          }
                                        }}
                                        className="cursor-pointer hover:bg-accent transition-colors p-3"
                                        aria-label={t('sidebar.search.openProfileAria', { name: result.athlete.name })}
                                      >
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8 rounded-md">
                                              <AvatarImage
                                                src={result.athlete.avatar}
                                                alt={result.athlete.name}
                                              />
                                              <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium truncate">
                                              {result.athlete.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{result.athlete.category}</span>
                                            <span>•</span>
                                            <span>{result.athlete.country}</span>
                                          </div>
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                          {workoutSearchResults.length > 0 && (
                            <>
                              {athleteSearchResults.length > 0 && (
                                <div className="px-3 pt-4 pb-1">
                                  <div className="h-px bg-border" />
                                </div>
                              )}
                              <div className="px-3 pb-1 pt-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t('sidebar.search.workouts')}
                                </p>
                              </div>
                              <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                                <div
                                  className={cn(
                                    'grid gap-2',
                                    workoutSearchResults.length === 1
                                      ? 'grid-cols-1'
                                      : workoutSearchResults.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2 sm:grid-cols-3'
                                  )}
                                >
                                  {workoutSearchResults.map((result) => (
                                    <Card
                                      key={result.workout.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() =>
                                        handleWorkoutSearchResultClick(result.workout.id)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleWorkoutSearchResultClick(result.workout.id);
                                        }
                                      }}
                                      className="cursor-pointer hover:bg-accent transition-colors p-3"
                                      aria-label={t('sidebar.search.openWorkoutAria', { name: result.workout.program })}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                            <Archive className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <span className="text-sm font-medium truncate">
                                            {result.workout.program}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>{result.workout.type}</span>
                                          <span>•</span>
                                          <span>{result.workout.length}</span>
                                          <span>•</span>
                                          <span>{result.workout.totalExercises} {t('sidebar.search.exercises')}</span>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                          {programSearchResults.length > 0 && (
                            <>
                              {(athleteSearchResults.length > 0 ||
                                workoutSearchResults.length > 0) && (
                                <div className="px-3 pt-4 pb-1">
                                  <div className="h-px bg-border" />
                                </div>
                              )}
                              <div className="px-3 pb-1 pt-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t('sidebar.search.programs')}
                                </p>
                              </div>
                              <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                                <div
                                  className={cn(
                                    'grid gap-2',
                                    programSearchResults.length === 1
                                      ? 'grid-cols-1'
                                      : programSearchResults.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2 sm:grid-cols-3'
                                  )}
                                >
                                  {programSearchResults.map((result) => (
                                    <Card
                                      key={result.program.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() =>
                                        handleProgramSearchResultClick(result.program.id)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleProgramSearchResultClick(result.program.id);
                                        }
                                      }}
                                      className="cursor-pointer hover:bg-accent transition-colors p-3"
                                      aria-label={t('sidebar.search.openProgramAria', { name: result.program.program })}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                            <Archive className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <span className="text-sm font-medium truncate">
                                            {result.program.program}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>{result.program.type}</span>
                                          <span>•</span>
                                          <span>{result.program.length}</span>
                                          <span>•</span>
                                          <span>{result.program.totalExercises} {t('sidebar.search.exercisesCount')}</span>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                          {exerciseSearchResults.length > 0 && (
                            <>
                              {(athleteSearchResults.length > 0 ||
                                workoutSearchResults.length > 0 ||
                                programSearchResults.length > 0) && (
                                <div className="px-3 pt-4 pb-1">
                                  <div className="h-px bg-border" />
                                </div>
                              )}
                              <div className="px-3 pb-1 pt-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t('sidebar.search.exercises')}
                                </p>
                              </div>
                              <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                                <div
                                  className={cn(
                                    'grid gap-2',
                                    exerciseSearchResults.length === 1
                                      ? 'grid-cols-1'
                                      : exerciseSearchResults.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2 sm:grid-cols-3'
                                  )}
                                >
                                  {exerciseSearchResults.map((result) => (
                                    <Card
                                      key={result.exercise.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() =>
                                        handleExerciseSearchResultClick(result.exercise.id)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleExerciseSearchResultClick(result.exercise.id);
                                        }
                                      }}
                                      className="cursor-pointer hover:bg-accent transition-colors p-3"
                                      aria-label={t('sidebar.search.openExerciseAria', { name: result.exercise.program })}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                            <Archive className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <span className="text-sm font-medium truncate">
                                            {result.exercise.program}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>{result.exercise.modality}</span>
                                          <span>•</span>
                                          <span>{result.exercise.equipment}</span>
                                          <span>•</span>
                                          <span>{result.exercise.muscleGroup.slice(0, 2).join(', ')}</span>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                          {messageSearchResults.length > 0 && (
                            <>
                              {(athleteSearchResults.length > 0 ||
                                workoutSearchResults.length > 0 ||
                                programSearchResults.length > 0 ||
                                exerciseSearchResults.length > 0) && (
                                <div className="px-3 pt-4 pb-1">
                                  <div className="h-px bg-border" />
                                </div>
                              )}
                              <div className="px-3 pb-1 pt-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t('sidebar.search.messages')}
                                </p>
                              </div>
                              <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                                <div
                                  className={cn(
                                    'grid gap-2',
                                    messageSearchResults.length === 1
                                      ? 'grid-cols-1'
                                      : messageSearchResults.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2 sm:grid-cols-3'
                                  )}
                                >
                                  {messageSearchResults.map((result) => {
                                    const initials = result.contact.name
                                      .split(' ')
                                      .map((part) => part.charAt(0).toUpperCase())
                                      .slice(0, 2)
                                      .join('');
                                    return (
                                      <Card
                                        key={result.contact.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSearchResultClick(result.contact.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleSearchResultClick(result.contact.id);
                                          }
                                        }}
                                        className="cursor-pointer hover:bg-accent transition-colors p-3"
                                        aria-label={t('sidebar.search.openConversationAria', { name: result.contact.name })}
                                      >
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8 rounded-md">
                                              <AvatarImage
                                                src={result.contact.avatar}
                                                alt={result.contact.name}
                                              />
                                              <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium truncate">
                                              {result.contact.name}
                                            </span>
                                          </div>
                                          <div className="text-xs text-muted-foreground truncate">
                                            {result.contact.lastMessage}
                                          </div>
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
                aria-label={t('sidebar.search.aiAssistantAria')}
                onClick={() => openUserProfile()}
              >
                <Sparkles className="size-4" />
                {t('sidebar.search.aiAssistant')}
              </Button>
              <DropdownMenu open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                    aria-label={t('sidebar.profile.openAccountMenuAria')}
                  >
                    <Avatar className="h-8 w-8 rounded-md">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  collisionPadding={{ bottom: 8 }}
                  className="w-64 rounded-2xl p-0"
                >
                  <div className="flex items-center gap-3 px-3 py-3">
                    <Avatar className="h-10 w-10 rounded-md">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="text-foreground truncate text-sm font-medium">
                        {displayName}
                      </span>
                      {displayEmail && (
                        <span className="text-muted-foreground truncate text-xs">{displayEmail}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-0" />
                  {isThemeMounted && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="px-3 py-2 rounded-t-none">
                        {currentTheme === 'dark' ? (
                          <Moon className="mr-2 size-4" />
                        ) : currentTheme === 'light' ? (
                          <Sun className="mr-2 size-4" />
                        ) : (
                          <Laptop className="mr-2 size-4" />
                        )}
                        <span className="flex-1">{t('sidebar.theme.label') || 'Theme'}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                          value={currentTheme}
                          onValueChange={(value) => setTheme(value)}
                        >
                          <DropdownMenuRadioItem
                            value="light"
                            className={cn(currentTheme === 'light' && 'bg-accent')}
                          >
                            <Sun className="mr-2 size-4" />
                            <span className="flex-1">{t('sidebar.theme.light')}</span>
                            {currentTheme === 'light' && <Check className="ml-2 size-4" />}
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value="dark"
                            className={cn(currentTheme === 'dark' && 'bg-accent')}
                          >
                            <Moon className="mr-2 size-4" />
                            <span className="flex-1">{t('sidebar.theme.dark')}</span>
                            {currentTheme === 'dark' && <Check className="ml-2 size-4" />}
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value="system"
                            className={cn(currentTheme === 'system' && 'bg-accent')}
                          >
                            <Laptop className="mr-2 size-4" />
                            <span className="flex-1">{t('sidebar.theme.system')}</span>
                            {currentTheme === 'system' && <Check className="ml-2 size-4" />}
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="px-3 py-2">
                      <span className="mr-2 text-lg leading-none">
                        {availableLanguages.find((lang) => lang.code === currentLanguage)?.flag ||
                          '🇬🇧'}
                      </span>
                      <span className="flex-1">{t('sidebar.language.label') || 'Language'}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={currentLanguage}
                        onValueChange={setCurrentLanguage}
                      >
                        {availableLanguages.map((language) => (
                          <DropdownMenuRadioItem
                            key={language.code}
                            value={language.code}
                            className={cn(currentLanguage === language.code && 'bg-accent')}
                          >
                            <span className="mr-2 text-lg leading-none">{language.flag}</span>
                            <span className="flex-1">{language.label}</span>
                            {currentLanguage === language.code && <Check className="ml-2 size-4" />}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="cursor-pointer px-3 py-2 rounded-b-none"
                    asChild
                  >
                    <Link href="/settings">
                      <Settings className="mr-2 size-4" />
                      <span>{t('sidebar.settings.label') || 'Settings'}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0" />
                  <DropdownMenuItem
                    className="cursor-pointer px-3 py-2 rounded-t-none"
                    variant="destructive"
                    onClick={() => {
                      setIsLoggingOut(true);
                      const wwwUrl =
                        process.env.NODE_ENV === 'production'
                          ? 'https://oneninety.com'
                          : 'http://localhost:3000';
                      signOut({ redirectUrl: wwwUrl });
                    }}
                  >
                    <LogOut className="mr-2 size-4" />
                    <span>{t('sidebar.profile.logOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">{children}</div>
      </SidebarInset>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">{t('sidebar.logout.loggingOut')}</p>
          </div>
        </div>
      )}
    </>
  );
};
