import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ChevronLeft, MoreVertical, Pencil, Archive } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as ContextMenu from 'zeego/context-menu';

import { typography, iconSizes, bodyFontFamily } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { getClients, type Client } from '@/services/client-service';

type PlatformIconProps = {
  sf: string;
  IconComponent: LucideIcon;
  size?: number;
  color?: string;
};

const PlatformIcon = ({ sf, IconComponent, size = 24, color = '#000000' }: PlatformIconProps) => {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
  }
  return <IconComponent {...({ size, color } as any)} />;
};

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'options'>('overview');

  const iconColor = themeColors.text;
  const mutedSurfaceColor = themeColors.surfaceSecondary;

  useEffect(() => {
    const loadClient = async () => {
      try {
        const clients = await getClients();
        const foundClient = clients.find((c) => c.id === id);
        setClient(foundClient || null);
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadClient();
    }
  }, [id]);

  const handleBackPress = () => {
    router.back();
  };

  const handleTabPress = (tab: 'overview' | 'options') => {
    setActiveTab(tab);
  };

  const handleEditDetails = () => {
    // TODO: Implement edit details action
  };

  const handleArchiveClient = () => {
    // TODO: Implement archive client action
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Loading...</Text>
          <View style={styles.headerRightButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Client Not Found</Text>
          <View style={styles.headerRightButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
          activeOpacity={0.7}
          onPress={handleBackPress}
        >
          <PlatformIcon
            sf="chevron.left"
            IconComponent={ChevronLeft}
            size={iconSizes.navigationChevrons}
            color={iconColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {client.fullName}
        </Text>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <View style={[styles.headerRightButton, { backgroundColor: mutedSurfaceColor }]}>
              <PlatformIcon
                sf="ellipsis"
                IconComponent={MoreVertical}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </View>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item key="edit" onSelect={handleEditDetails}>
              <ContextMenu.ItemIcon
                ios={{ name: 'pencil' }}
                androidIconName="edit"
              >
                <Pencil size={16} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemTitle>Edit details</ContextMenu.ItemTitle>
            </ContextMenu.Item>
            <ContextMenu.Item key="archive" onSelect={handleArchiveClient}>
              <ContextMenu.ItemIcon
                ios={{ name: 'archivebox' }}
                androidIconName="archive"
              >
                <Archive size={16} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemTitle>Archive client</ContextMenu.ItemTitle>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: themeColors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'overview' && styles.tabActive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleTabPress('overview')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.tabTextActive,
              { color: activeTab === 'overview' ? themeColors.text : themeColors.mutedText },
            ]}
          >
            Overview
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'options' && styles.tabActive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleTabPress('options')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'options' && styles.tabTextActive,
              { color: activeTab === 'options' ? themeColors.text : themeColors.mutedText },
            ]}
          >
            Options
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 0,
    borderBottomWidth: 1,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // Removed borderBottomColor to eliminate underscore highlight
  },
  tabText: {
    ...typography.h7,
  },
  tabTextActive: {
    fontWeight: '600',
  },
});



