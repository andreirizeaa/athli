import React, { useEffect, useRef, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentType } from 'react';

import { useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';
import { iconSizes } from '@/constants/typography';
import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import {
  Calendar,
  CalendarFold,
  ChartNoAxesColumn,
  Cog,
  Dumbbell,
  Mail,
  MessagesSquare,
  Plus,
  User,
  Users,
} from 'lucide-react-native';

const hasLiquidGlass = isLiquidGlassAvailable();

type NativeTabsCoachViewProps = {
  primaryColor: string;
};

// Pure layout component - no navigation interception
const NativeTabsCoachView = ({ primaryColor }: NativeTabsCoachViewProps) => {
  return (
    <NativeTabs tintColor={primaryColor}>
      <NativeTabs.Trigger name="clients">
        <Icon sf="person.2.fill" />
        <Label>Clients</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <Icon sf="calendar" />
        <Label>Calendar</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <Icon sf="bubble.left.and.text.bubble.right.fill" />
        <Label>Chats</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>

      {/* Keep this for layout - touch will be intercepted by overlay */}
      <NativeTabs.Trigger name="add-modal" role="search">
        <Icon sf="plus" />
        <Label>Add</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

type TabDefinition = {
  name: string;
  label: string;
  sf: string;
  mdi: string;
  IconComponent: ComponentType<{ size?: number; color?: string }>;
  width: number;
};

export default function TabLayout() {
  const { primaryColor } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const router = useRouter();
  const previousAppView = useRef(appView);
  const isInitialMount = useRef(true);
  const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousAppView.current = appView;
      return;
    }

    if (previousAppView.current !== appView) {
      previousAppView.current = appView;
      const initialRoute = appView === 'coach' ? '/clients' : '/training';
      router.replace(initialRoute);
    }
  }, [appView, router]);

  const handleOpenAddClientModal = () => {
    setIsAddClientModalVisible(true);
  };

  const handleCloseAddClientModal = () => {
    setIsAddClientModalVisible(false);
  };

  const insets = useSafeAreaInsets();

  if (hasLiquidGlass) {
    if (appView === 'coach') {
      return (
        <>
          {/* Native iOS tab bar (full width, includes search pill) */}
          <NativeTabsCoachView primaryColor={primaryColor} />

          {/* Overlay that intercepts touches on the search pill */}
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <Pressable
              onPress={handleOpenAddClientModal}
              style={{
                position: 'absolute',
                // Position over the search pill (top-right area on iOS)
                right: 16,
                bottom: insets.bottom + 8,
                width: 80,
                height: 44,
                borderRadius: 22,
                // Transparent to keep native pill visible
                backgroundColor: 'transparent',
              }}
            />
          </View>

          {/* Bottom sheet modal */}
          <BottomSheetModal
            visible={isAddClientModalVisible}
            onClose={handleCloseAddClientModal}
            title={t('clients.addClient')}
          />
        </>
      );
    }

    // Athlete view (default)
    return (
      <NativeTabs tintColor={primaryColor}>
        <NativeTabs.Trigger name="training">
          <Icon sf="dumbbell.fill" />
          <Label>Training</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="progress">
          <Icon sf="chart.bar.fill" />
          <Label>Progress</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="inbox">
          <Icon sf="envelope.fill" />
          <Label>Inbox</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <Icon sf="person.crop.circle.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="add-modal" role="search">
          <Icon sf="plus" />
          <Label>Add</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <>
      <Tabs
        initialRouteName={appView === 'coach' ? 'clients' : 'training'}
        tabBar={(props) => (
          <FallbackTabBar
            {...props}
            onOpenAddClientModal={handleOpenAddClientModal}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="clients"
          options={{
            title: t('clients.title'),
            href: appView === 'coach' ? '/clients' : null,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: t('calendar.title'),
            href: appView === 'coach' ? '/calendar' : null,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: t('chats.title'),
            href: appView === 'coach' ? '/chats' : null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: appView === 'coach' ? t('settings.title') : t('profile.title'),
            href: appView === 'coach' ? '/settings' : appView === 'athlete' ? '/settings' : null,
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: t('training.title'),
            href: appView === 'athlete' ? '/training' : null,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: t('progress.title'),
            href: appView === 'athlete' ? '/progress' : null,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: t('inbox.title'),
            href: appView === 'athlete' ? '/inbox' : null,
          }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="add-modal" options={{ href: null }} />
      </Tabs>
      <BottomSheetModal
        visible={isAddClientModalVisible}
        onClose={handleCloseAddClientModal}
        title={t('clients.addClient')}
      />
    </>
  );
}

type FallbackTabBarProps = BottomTabBarProps & {
  onOpenAddClientModal: () => void;
};

function FallbackTabBar({ state, navigation, onOpenAddClientModal }: FallbackTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();

  const handleTabPress = (name: string) => {
    if (name === activeRouteName) {
      return;
    }

    navigation.navigate(name as never);
  };

  const handleAddPress = () => {
    // Only open modal when on clients screen in coach view
    if (appView === 'coach' && activeRouteName === 'clients') {
      onOpenAddClientModal();
    }
  };

  const renderTab = (tab: TabDefinition) => {
    const isActive = activeRouteName === tab.name;
    const color = isActive ? themeColors.text : themeColors.mutedText;
    const iconSize = Platform.OS === 'ios' ? iconSizes.tabBarIconsIOS : iconSizes.tabBarIcons;

    const iconNode =
      Platform.OS === 'ios' ? (
        <SymbolView name={tab.sf as any} tintColor={color} size={iconSize} type="monochrome" />
      ) : (
        <MaterialIcons name={tab.mdi as any} size={iconSize} color={color} />
      );

    return (
      <TouchableOpacity
        key={tab.name}
        style={[styles.tab, { width: tab.width }]}
        onPress={() => handleTabPress(tab.name)}
        activeOpacity={0.7}
      >
        {iconNode}
        <Text style={[styles.tabText, { color }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Coach view: match NativeTabs SF icons
  const coachTabs: TabDefinition[] = [
    {
      name: 'clients',
      label: t('clients.title'),
      sf: 'person.2.fill',
      mdi: 'people',
      IconComponent: Users,
      width: 70,
    },
    {
      name: 'calendar',
      label: t('calendar.title'),
      sf: 'calendar',
      mdi: 'calendar-today',
      IconComponent: CalendarFold,
      width: 75,
    },
    {
      name: 'chats',
      label: t('chats.title'),
      sf: 'bubble.left.and.text.bubble.right.fill',
      mdi: 'forum',
      IconComponent: MessagesSquare,
      width: 60,
    },
    {
      name: 'settings',
      label: t('settings.title'),
      sf: 'gear',
      mdi: 'settings',
      IconComponent: Cog,
      width: 70,
    },
  ];

  // Athlete view: match NativeTabs SF icons
  const athleteTabs: TabDefinition[] = [
    {
      name: 'training',
      label: t('training.title'),
      sf: 'dumbbell.fill',
      mdi: 'fitness-center',
      IconComponent: Dumbbell,
      width: 70,
    },
    {
      name: 'progress',
      label: t('progress.title'),
      sf: 'chart.bar.fill',
      mdi: 'bar-chart',
      IconComponent: ChartNoAxesColumn,
      width: 75,
    },
    {
      name: 'inbox',
      label: t('inbox.title'),
      sf: 'envelope.fill',
      mdi: 'mail',
      IconComponent: Mail,
      width: 60,
    },
    {
      name: 'settings',
      label: t('profile.title'),
      sf: 'person.crop.circle.fill',
      mdi: 'account-circle',
      IconComponent: User,
      width: 70,
    },
  ];

  const tabs = appView === 'coach' ? coachTabs : athleteTabs;

  const renderAddIcon = () => {
    const size = Platform.OS === 'ios' ? iconSizes.tabBarIconsIOS : iconSizes.tabBarIcons;

    if (Platform.OS === 'ios') {
      return <SymbolView name={'plus' as any} tintColor="#FFFFFF" size={size} type="monochrome" />;
    }

    return <Ionicons name="add-outline" size={size + 14} color="#FFFFFF" />;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
      <View
        style={[
          styles.navigationBar,
          { paddingBottom: insets.bottom + 8, backgroundColor: themeColors.background },
        ]}
      >
        <View style={styles.tabsContainer}>
          {/* Section 1: First tab */}
          <View style={styles.tabSection}>
            {renderTab(tabs[0])}
          </View>

          {/* Section 2: Second tab */}
          <View style={styles.tabSection}>
            {renderTab(tabs[1])}
          </View>

          {/* Section 3: Add button */}
          <View style={[styles.tabSection, styles.addButtonSection]}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: primaryColor }]}
              onPress={handleAddPress}
              activeOpacity={0.7}
            >
              {renderAddIcon()}
            </TouchableOpacity>
          </View>

          {/* Section 4: Third tab */}
          <View style={styles.tabSection}>
            {renderTab(tabs[2])}
          </View>

          {/* Section 5: Fourth tab */}
          <View style={styles.tabSection}>
            {renderTab(tabs[3])}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  separator: {
    height: 0.5,
  },
  navigationBar: {
    // Needed so the add button can be absolutely centered within this bar
    position: 'relative',
    paddingHorizontal: 24,
    paddingTop: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  tabSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  addButtonSection: {
    paddingHorizontal: 10,
  },
  tab: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 0,
    width: '100%',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  addButton: {
    alignSelf: 'center',
    marginTop: -20,
    transform: [{ translateY: -12 }],
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

