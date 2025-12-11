import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreVertical, Pencil, Archive, Activity, BarChart3, Calendar, Target } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { getClients, type Client } from '@/services/client-service';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { SettingsOption } from '@/components/settings-option';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { PlatformIcon } from '@/components/platform-icon';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'options'>('overview');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const ellipsisButtonRef = useRef<View>(null);

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

  const handleEllipsisPress = () => {
    ellipsisButtonRef.current?.measureInWindow((x, y, width, height) => {
      setButtonPosition({ x, y, width, height });
      setDropdownVisible(true);
    });
  };

  const handleEditDetails = () => {
    router.push(`/client/edit-client-details-modal`);
  };

  const handleArchiveClient = () => {
    // TODO: Implement archive client action
  };

  const dropdownOptions: DropdownMenuOption[] = [
    {
      label: 'Edit details',
      icon: {
        sf: 'pencil',
        IconComponent: Pencil,
      },
      onPress: handleEditDetails,
    },
    {
      label: 'Archive user',
      icon: {
        sf: 'archivebox',
        IconComponent: Archive,
      },
      onPress: handleArchiveClient,
    },
  ];

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
          <TouchableOpacity
            style={[styles.headerRightButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleEllipsisPress}
          >
            <PlatformIcon
              sf="ellipsis"
              IconComponent={MoreVertical}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
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
          <TouchableOpacity
            style={[styles.headerRightButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleEllipsisPress}
          >
            <PlatformIcon
              sf="ellipsis"
              IconComponent={MoreVertical}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
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
        <View ref={ellipsisButtonRef} collapsable={false}>
          <TouchableOpacity
            style={[styles.headerRightButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleEllipsisPress}
          >
            <PlatformIcon
              sf="ellipsis"
              IconComponent={MoreVertical}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      <DropdownMenu
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        options={dropdownOptions}
        anchorPosition={buttonPosition}
      />

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
            View Options
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <View>
            {/* Overview content will go here */}
          </View>
        )}

        {activeTab === 'options' && (
          <View style={styles.optionsContainer}>
            <Card>
              <SettingsOption
                icon={
                  <PlatformIcon
                    sf="figure.run"
                    IconComponent={Activity}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title="Activity"
                showChevron
                onPress={() => router.push(`/client/${id}/activity`)}
              />
              <Separator />
              <SettingsOption
                icon={
                  <PlatformIcon
                    sf="chart.bar.fill"
                    IconComponent={BarChart3}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title="Metrics"
                showChevron
                onPress={() => router.push(`/client/${id}/metrics`)}
              />
              <Separator />
              <SettingsOption
                icon={
                  <PlatformIcon
                    sf="calendar"
                    IconComponent={Calendar}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title="Training Calendar"
                showChevron
                onPress={() => router.push(`/client/${id}/training-calendar`)}
              />
              <Separator />
              <SettingsOption
                icon={
                  <PlatformIcon
                    sf="target"
                    IconComponent={Target}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title="Goals & Injuries"
                showChevron
                onPress={() => router.push(`/client/${id}/goals-injuries`)}
              />
            </Card>
          </View>
        )}
      </ScrollView>
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
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 0,
  },
  optionsContainer: {
    flex: 1,
  },
});



