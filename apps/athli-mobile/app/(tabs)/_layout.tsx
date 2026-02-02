import React, { useEffect, useRef, useState } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, Text, Pressable, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentType } from 'react';

import { useThemePreference, useColorScheme, useAuth } from '@/stores';
import { useAppView } from '@/stores';
import { useTranslations } from '@/stores';
import { useTrainingOverlay } from '@/stores';
import { useLibraryTab, type LibraryTab } from '@/stores';
import { useAthleteDataStore, useCoachDataStore } from '@/stores';

const darkBackground = require('@/assets/backgrounds/dark.png');
const lightBackground = require('@/assets/backgrounds/light.png');
import { iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
  ChartNoAxesColumn,
  FileText,
  Home,
  Cog,
  Dumbbell,
  Mail,
  Megaphone,
  MessagesSquare,
  User,
  UserPlus,
  Users,
} from 'lucide-react-native';

const hasLiquidGlass = isLiquidGlassAvailable();

type NativeTabsCoachViewProps = {
  primaryColor: string;
  isOnChats?: boolean;
  isOnSettings?: boolean;
};

// Pure layout component with overlay button
const NativeTabsCoachView = ({ primaryColor, onAddPress, isOnChats, isOnSettings }: NativeTabsCoachViewProps & { onAddPress: () => void }) => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();

  const handleAddPressWithHaptic = () => {
    haptics.medium();
    onAddPress();
  };

  return (
    <View style={{ flex: 1 }}>
      <NativeTabs tintColor={primaryColor}>
        <NativeTabs.Trigger name="clients">
          <Icon sf="person.2.fill" />
          <Label>Clients</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="chats">
          <Icon sf="bubble.left.and.text.bubble.right.fill" />
          <Label>Chats</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="library">
          <Icon sf="folder.fill" />
          <Label>Library</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <Icon sf="gear" />
          <Label>Settings</Label>
        </NativeTabs.Trigger>

        {/* Keep this for layout - touch will be intercepted by overlay */}
        <NativeTabs.Trigger name="add-modal" role="search">
          <Icon sf={isOnChats ? 'megaphone.fill' : isOnSettings ? 'person.fill.badge.plus' : 'plus'} />
          <Label>{isOnChats ? 'Broadcast' : isOnSettings ? 'Add' : 'Add'}</Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      {/* Transparent overlay button on top of search pill */}
      <Pressable
        style={[styles.addButtonOverlay, { bottom: insets.bottom - 16 }]}
        onPress={handleAddPressWithHaptic}
      />
    </View>
  );
};

// Pure layout component for athlete view
const NativeTabsAthleteView = ({ primaryColor }: NativeTabsCoachViewProps) => {
  return (
    <View style={{ flex: 1 }}>
      <NativeTabs tintColor={primaryColor}>
        <NativeTabs.Trigger name="home">
          <Icon sf="house.fill"/>
          <Label>Home</Label>
        </NativeTabs.Trigger>

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

        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
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
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const previousAppView = useRef(appView);
  const isInitialMount = useRef(true);
  const colorScheme = useColorScheme();
  const { showOverlay: showTrainingOverlay } = useTrainingOverlay();
  const { currentLibraryTab } = useLibraryTab();
  const { clientProfile, coachProfile } = useAuth();

  // Background image based on color scheme
  const backgroundImage = colorScheme === 'dark' ? darkBackground : lightBackground;

  // Athlete data store for loading state
  const isAthleteDataInitialLoadComplete = useAthleteDataStore((state) => state.isInitialLoadComplete);
  const loadAthleteData = useAthleteDataStore((state) => state.loadAthleteData);

  // Coach data store for loading state
  const isCoachDataInitialLoadComplete = useCoachDataStore((state) => state.isInitialLoadComplete);
  const loadCoachData = useCoachDataStore((state) => state.loadCoachData);

  // Load athlete data when in athlete view
  useEffect(() => {
    if (appView === 'athlete' && clientProfile && !isAthleteDataInitialLoadComplete) {
      loadAthleteData(clientProfile.client_id, clientProfile.coach_id);
    }
  }, [appView, clientProfile, isAthleteDataInitialLoadComplete, loadAthleteData]);

  // Load coach data when in coach view
  useEffect(() => {
    if (appView === 'coach' && coachProfile && !isCoachDataInitialLoadComplete) {
      loadCoachData();
    }
  }, [appView, coachProfile, isCoachDataInitialLoadComplete, loadCoachData]);

  // Helper to get the correct modal route based on current library tab
  const getLibraryModalRoute = (): string => {
    const modalRoutes: Record<LibraryTab, string> = {
      workouts: '/modals/library/add-workout-modal',
      sections: '/modals/library/add-section-modal',
      exercises: '/modals/library/add-exercise-modal',
      checkIns: '/modals/library/add-check-in-modal',
      questionnaires: '/modals/library/add-questionnaire-modal',
      metrics: '/modals/library/add-metric-modal',
      habits: '/modals/library/add-habit-modal',
      files: '/modals/files/add-file-modal',
    };
    return modalRoutes[currentLibraryTab];
  };

  // Use useEffect for initial mount to prevent navigation before layout is ready
  useEffect(() => {
    if (!isInitialMount.current) {
      return;
    }

    isInitialMount.current = false;
    previousAppView.current = appView;

    // On initial mount with NativeTabs, ensure we navigate to the correct initial route
    // This prevents add-modal from being shown on app load
    if (hasLiquidGlass) {
      const initialRoute = appView === 'athlete' ? '/home' : '/clients';
      // Navigate to initial route if we're on index or any unexpected route (but not on a valid tab)
      if (
        pathname === '/' ||
        pathname === '/(tabs)' ||
        (pathname !== initialRoute && !pathname.startsWith('/clients') && !pathname.startsWith('/chats') && !pathname.startsWith('/library') && !pathname.startsWith('/settings') && !pathname.startsWith('/home') && !pathname.startsWith('/training') && !pathname.startsWith('/progress') && !pathname.startsWith('/inbox') && !pathname.startsWith('/profile') && !pathname.startsWith('/add-modal'))
      ) {
        // Delay navigation to ensure layout is mounted
        setTimeout(() => {
          router.replace(initialRoute);
        }, 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - pathname and router are stable

  useEffect(() => {
    if (previousAppView.current !== appView) {
      previousAppView.current = appView;
      // For liquid glass, navigate explicitly
      // For non-liquid glass, the key prop on Tabs will handle remounting with correct initialRouteName
      if (hasLiquidGlass) {
        const initialRoute = appView === 'athlete' ? '/home' : '/clients';
        router.replace(initialRoute);
      }
    }
  }, [appView, router]);

  const insets = useSafeAreaInsets();

  const handleNativeTabsAddPress = () => {
    if (appView === 'coach') {
      // Check for library first, then clients/chats/settings
      if (pathname.includes('/library')) {
        router.push(getLibraryModalRoute() as any);
      } else if (pathname.includes('/clients')) {
        router.push({
          pathname: '/add-modal-content',
          params: { route: 'clients' },
        });
      } else if (pathname.includes('/chats')) {
        router.push('/modals/message/broadcast-modal');
      } else if (pathname.includes('/settings')) {
        router.push({
          pathname: '/add-modal-content',
          params: { route: 'clients' },
        });
      }
    } else if (appView === 'athlete') {
      // Show training overlay if on training tab
      if (pathname.includes('/training')) {
        showTrainingOverlay();
      }
    }
  };

  // Show loading screen while data is loading
  const isDataLoading =
    (appView === 'athlete' && !isAthleteDataInitialLoadComplete) ||
    (appView === 'coach' && !isCoachDataInitialLoadComplete);

  if (isDataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={backgroundImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (hasLiquidGlass) {
    if (appView === 'coach') {
      return (
        <>
          {/* Native iOS tab bar (full width, includes search pill) */}
          <NativeTabsCoachView primaryColor={primaryColor} onAddPress={handleNativeTabsAddPress} isOnChats={pathname.includes('/chats')} isOnSettings={pathname.includes('/settings')} />
        </>
      );
    }

    // Athlete view (default)
    return (
      <>
        <NativeTabsAthleteView primaryColor={primaryColor} />
      </>
    );
  }

  return (
    <>
      <Tabs
        key={appView}
        initialRouteName={appView === 'athlete' ? 'home' : 'clients'}
        tabBar={(props) => <FallbackTabBar {...props} />}
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
          name="chats"
          options={{
            title: t('chats.title'),
            href: appView === 'coach' ? '/chats' : null,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: t('library.title'),
            href: appView === 'coach' ? '/library' : null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings.title'),
            href: appView === 'coach' ? '/settings' : appView === 'athlete' ? '/settings' : null,
          }}
        />
        <Tabs.Screen
          name="home"
          options={{
            title: t('home.title'),
            href: appView === 'athlete' ? '/home' : null,
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
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile.title'),
            href: appView === 'athlete' ? '/profile' : null,
          }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="add-modal" options={{ href: null }} />
      </Tabs>
    </>
  );
}

type FallbackTabBarProps = BottomTabBarProps;

function FallbackTabBar({ state, navigation }: FallbackTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { showOverlay: showTrainingOverlay } = useTrainingOverlay();
  const { currentLibraryTab } = useLibraryTab();

  // Helper to get the correct modal route based on current library tab
  const getLibraryModalRoute = (): string => {
    const modalRoutes: Record<LibraryTab, string> = {
      workouts: '/modals/library/add-workout-modal',
      sections: '/modals/library/add-section-modal',
      exercises: '/modals/library/add-exercise-modal',
      checkIns: '/modals/library/add-check-in-modal',
      questionnaires: '/modals/library/add-questionnaire-modal',
      metrics: '/modals/library/add-metric-modal',
      habits: '/modals/library/add-habit-modal',
      files: '/modals/files/add-file-modal',
    };
    return modalRoutes[currentLibraryTab];
  };

  const handleTabPress = (name: string) => {
    haptics.medium();
    if (name === activeRouteName) {
      return;
    }

    navigation.navigate(name as never);
  };

  const handleAddPress = () => {
    haptics.medium();
    if (appView === 'coach') {
      // Navigate to appropriate modal based on route
      if (activeRouteName === 'clients') {
        router.push({
          pathname: '/add-modal-content',
          params: { route: activeRouteName },
        });
      } else if (activeRouteName === 'chats') {
        router.push('/modals/message/broadcast-modal');
      } else if (activeRouteName === 'library') {
        router.push(getLibraryModalRoute() as any);
      } else if (activeRouteName === 'settings') {
        router.push({
          pathname: '/add-modal-content',
          params: { route: 'clients' },
        });
      }
    } else if (appView === 'athlete') {
      // Show training overlay if on training tab
      if (activeRouteName === 'training') {
        showTrainingOverlay();
      }
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
      <PressableOpacity
        key={tab.name}
        style={[styles.tab, { width: tab.width }]}
        onPress={() => handleTabPress(tab.name)}
      >
        {iconNode}
        <Text style={[styles.tabText, { color }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </PressableOpacity>
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
      name: 'chats',
      label: t('chats.title'),
      sf: 'bubble.left.and.text.bubble.right.fill',
      mdi: 'forum',
      IconComponent: MessagesSquare,
      width: 60,
    },
    {
      name: 'library',
      label: t('library.title'),
      sf: 'folder.fill',
      mdi: 'folder',
      IconComponent: FileText,
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
      name: 'home',
      label: t('home.title'),
      sf: 'house.fill',
      mdi: 'home',
      IconComponent: Home,
      width: 60,
    },
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
      name: 'profile',
      label: t('profile.title'),
      sf: 'person.fill',
      mdi: 'person',
      IconComponent: User,
      width: 60,
    },
  ];

  const tabs = appView === 'coach' ? coachTabs : athleteTabs;

  const renderAddIcon = () => {
    const size = Platform.OS === 'ios' ? iconSizes.tabBarIconsIOS : iconSizes.tabBarIcons;
    const iconColor = themeColors.primaryForeground;

    // Show megaphone icon when on chats tab
    if (activeRouteName === 'chats') {
      if (Platform.OS === 'ios') {
        return <SymbolView name={'megaphone.fill' as any} tintColor={iconColor} size={size} type="monochrome" />;
      }
      return <Megaphone size={size + 8}/>;
    }

    // Show user add icon when on settings tab
    if (activeRouteName === 'settings') {
      if (Platform.OS === 'ios') {
        return <SymbolView name={'person.fill.badge.plus' as any} tintColor={iconColor} size={size} type="monochrome" />;
      }
      return <UserPlus size={size + 8}/>;
    }

    if (Platform.OS === 'ios') {
      return <SymbolView name={'plus' as any} tintColor={iconColor} size={size} type="monochrome" />;
    }

    return <Ionicons name="add-outline" size={size + 14} color={iconColor} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
      <View
        style={[
          styles.navigationBar,
          { paddingBottom: insets.bottom + 8, backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        <View style={styles.tabsContainer}>
          {appView === 'coach' ? (
            <>
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
                <PressableOpacity
                  style={[styles.addButton, { backgroundColor: primaryColor }]}
                  onPress={handleAddPress}
                >
                  {renderAddIcon()}
                </PressableOpacity>
              </View>

              {/* Section 4: Third tab */}
              <View style={styles.tabSection}>
                {renderTab(tabs[2])}
              </View>

              {/* Section 5: Fourth tab */}
              <View style={styles.tabSection}>
                {renderTab(tabs[3])}
              </View>
            </>
          ) : (
            <>
              {/* Athlete view: No add button, just tabs */}
              <View style={styles.tabSection}>
                {renderTab(tabs[0])}
              </View>
              <View style={styles.tabSection}>
                {renderTab(tabs[1])}
              </View>
              <View style={styles.tabSection}>
                {renderTab(tabs[2])}
              </View>
              <View style={styles.tabSection}>
                {renderTab(tabs[3])}
              </View>
              <View style={styles.tabSection}>
                {renderTab(tabs[4])}
              </View>
            </>
          )}
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
    marginBottom: Platform.OS === 'android' ? -8 : -12,
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
  },
  addButton: {
    alignSelf: 'center',
    marginTop: -20,
    transform: [{ translateY: -12 }],
    width: 64,
    height: 64,
    borderRadius: 32,
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
  addButtonOverlay: {
    position: 'absolute',
    // Position over the search pill (top-right area on iOS)
    right: 16,
    bottom: 0, // Will be adjusted with insets.bottom - 16 in component
    width: 66,
    height: 66,
    borderRadius: 40,
    // Transparent to keep native pill visible
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
