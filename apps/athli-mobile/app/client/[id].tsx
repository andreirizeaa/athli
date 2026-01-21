import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
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
  Sparkles,
} from 'lucide-react-native';

import { PressableScale, PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Separator } from '@/components/ui/separator';

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

  // Use Zustand store for client data
  const client = useClientDetailStore((state) => state.client);
  const isLoading = useClientDetailStore((state) => state.isLoading);
  const isLoadingClient = useClientDetailStore((state) => state.isLoadingClient);
  const error = useClientDetailStore((state) => state.error);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  const iconColor = themeColors.text;

  // Load client data when screen mounts or id changes
  useEffect(() => {
    if (id) {
      loadClientData(id);
    }
  }, [id, loadClientData]);

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
    router.push(route as any);
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

  // Loading state - show while client basic info is loading
  if (isLoadingClient && !client) {
    return (
      <ScreenWrapper>
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
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
            {t('general.loading')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <ScreenWrapper>
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
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.mutedText }]}>
            {error || t('clientDetail.clientNotFound')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

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
          {client.avatarUrl ? (
            <Image
              source={{ uri: client.avatarUrl }}
              style={styles.avatarLargeImage}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatarLargeImage, styles.avatarPlaceholder, { backgroundColor: themeColors.border }]}>
              <Text style={[styles.avatarInitial, { color: themeColors.mutedText }]}>
                {client.name?.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.profileName, { color: themeColors.text }]}>
          {client.name}
        </Text>
        <PressableOpacity
          style={[
            styles.editButton,
            {
              backgroundColor: themeColors.surfaceSecondary,
            },
          ]}
          onPress={handleEditProfilePress}
        >
          <Pencil {...({ size: 16, color: themeColors.primary } as any)} />
          <Text style={[styles.editButtonText, { color: themeColors.primary }]}>
            {t('clientDetail.editProfile')}
          </Text>
        </PressableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
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
        ))}
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
  headerPlaceholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    ...typography.p2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  errorText: {
    ...typography.p1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h3,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
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
