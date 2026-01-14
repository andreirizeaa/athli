import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Sparkles,
  MessageCircle,
  Settings,
  ChevronRight,
  BarChart3,
  Repeat,
  Image as ImageIcon,
  File,
  ClipboardCheck,
  HelpCircle,
  Dumbbell,
  Notebook,
  Activity,
  Target,
  Heart,
  Pencil,
} from 'lucide-react-native';

import { PressableScale, PressableOpacity } from 'pressto';

import { typography, iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { OutlinedButton } from '@/components/ui/buttons';
import { Separator } from '@/components/ui/separator';

// Mock client data
const MOCK_CLIENT = {
  id: '1',
  name: 'Sarah Johnson',
  firstName: 'Sarah',
  lastName: 'Johnson',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  email: 'sarah.johnson@email.com',
  age: 28,
  coachingType: 'hybrid' as const,
};

type MenuItem = {
  id: string;
  icon: {
    sf: string;
    IconComponent: any;
  };
  title: string;
  route: string;
  section: 'quick' | 'coaching' | 'data' | 'forms';
};

export default function ClientProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const client = MOCK_CLIENT;
  const iconColor = themeColors.text;

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleAssistantPress = () => {
    haptics.medium();
    router.push(`/client/${id}/assistant`);
  };

  const handleEditProfilePress = () => {
    haptics.medium();
    router.push(`/modals/client/edit-client-details-modal?id=${id}`);
  };

  const handleMenuItemPress = (route: string) => {
    haptics.medium();
    router.push(route);
  };

  // Menu items organized by section
  const menuItems: MenuItem[] = [
    // Quick Actions (from Overview)
    {
      id: 'activity',
      icon: { sf: 'figure.walk', IconComponent: Activity },
      title: t('clientDetail.overview.activity'),
      route: `/client/${id}/activity`,
      section: 'quick',
    },
    {
      id: 'goals',
      icon: { sf: 'target', IconComponent: Target },
      title: t('clientDetail.overview.goals'),
      route: `/client/${id}/goals`,
      section: 'quick',
    },
    {
      id: 'injuries',
      icon: { sf: 'heart', IconComponent: Heart },
      title: t('clientDetail.overview.injuries'),
      route: `/client/${id}/injuries`,
      section: 'quick',
    },
    // Coaching
    {
      id: 'assistant',
      icon: { sf: 'sparkles', IconComponent: Sparkles },
      title: t('clientDetail.sections.assistant'),
      route: `/client/${id}/assistant`,
      section: 'coaching',
    },
    {
      id: 'notes',
      icon: { sf: 'note.text', IconComponent: Notebook },
      title: t('clientDetail.sections.notes'),
      route: `/client/${id}/notes`,
      section: 'coaching',
    },
    {
      id: 'training',
      icon: { sf: 'figure.run', IconComponent: Dumbbell },
      title: t('clientDetail.sections.training'),
      route: `/client/${id}/training`,
      section: 'coaching',
    },
    // Data
    {
      id: 'metrics',
      icon: { sf: 'chart.bar', IconComponent: BarChart3 },
      title: t('clientDetail.sections.metrics'),
      route: `/client/${id}/metrics`,
      section: 'data',
    },
    {
      id: 'habits',
      icon: { sf: 'repeat', IconComponent: Repeat },
      title: t('clientDetail.sections.habits'),
      route: `/client/${id}/habits`,
      section: 'data',
    },
    {
      id: 'photos',
      icon: { sf: 'photo', IconComponent: ImageIcon },
      title: t('clientDetail.sections.photos'),
      route: `/client/${id}/photos`,
      section: 'data',
    },
    {
      id: 'files',
      icon: { sf: 'doc', IconComponent: File },
      title: t('clientDetail.sections.files'),
      route: `/client/${id}/files`,
      section: 'data',
    },
    // Forms & Settings
    {
      id: 'check-ins',
      icon: { sf: 'checkmark.circle', IconComponent: ClipboardCheck },
      title: t('clientDetail.sections.checkIns'),
      route: `/client/${id}/check-ins`,
      section: 'forms',
    },
    {
      id: 'questionnaires',
      icon: { sf: 'questionmark.circle', IconComponent: HelpCircle },
      title: t('clientDetail.sections.questionnaires'),
      route: `/client/${id}/questionaires`,
      section: 'forms',
    },
    {
      id: 'settings',
      icon: { sf: 'gear', IconComponent: Settings },
      title: t('clientDetail.sections.settings'),
      route: `/client/${id}/settings`,
      section: 'forms',
    },
  ];

  return (
    <ScreenWrapper scrollable={true}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.profile')}
        </Text>
        <IconButton
          icon={{ sf: 'sparkles', IconComponent: Sparkles }}
          onPress={handleAssistantPress}
          size="md"
          color={iconColor}
        />
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: themeColors.surfacePrimary }]}>
        <View style={styles.avatarLarge}>
          {client?.avatarUrl ? (
            <Image
              source={{ uri: client.avatarUrl }}
              style={styles.avatarLargeImage}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatarLargeImage, styles.avatarPlaceholder]}>
              <Text style={[styles.avatarInitial, { color: themeColors.mutedText }]}>
                {client?.name?.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.profileName, { color: themeColors.text }]}>
          {client?.name}
        </Text>
        <PressableOpacity
          style={[
            styles.editButton,
            {
              backgroundColor: `${themeColors.surfaceSecondary}`,
            },
          ]}
          onPress={handleEditProfilePress}
        >
          <Pencil size={16} color={themeColors.primary} />
          <Text style={[styles.editButtonText, { color: themeColors.primary }]}>
            {t('clientDetail.editProfile')}
          </Text>
        </PressableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const isLastItem = index === menuItems.length - 1;
          return (
            <View key={item.id}>
              <PressableScale onPress={() => handleMenuItemPress(item.route)}>
                <View style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <PlatformIcon
                      sf={item.icon.sf}
                      IconComponent={item.icon.IconComponent}
                      size={24}
                      color={iconColor}
                    />
                    <Text style={[styles.menuItemTitle, { color: themeColors.text }]}>
                      {item.title}
                    </Text>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableScale>
              <Separator />
            </View>
          );
        })}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  profileCard: {
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    marginHorizontal: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatarLargeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h3,
    fontWeight: '600',
  },
  profileName: {
    ...typography.h6,
    fontWeight: '500',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignSelf: 'center',
  },
  editButtonText: {
    ...typography.p2,
    fontWeight: '500',
  },
  menuContainer: {
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemTitle: {
    ...typography.p1,
    fontWeight: '500',
  },
});
