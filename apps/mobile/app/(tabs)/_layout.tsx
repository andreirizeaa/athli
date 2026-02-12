import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentType } from 'react';

import { useThemePreference, useColorScheme, useAuth, useEntitlements } from '@/stores';
import { useAppView } from '@/stores';
import { useTranslations } from '@/stores';
import { useLibraryTab, type LibraryTab } from '@/stores';
import { useAthleteDataStore, useCoachDataStore, useCoachEntitlementsStore, useAthleteCoachEntitlementsStore } from '@/stores';
import { useTerminology } from '@/hooks/useTerminology';
import { UpgradeDialog } from '@/components/permissions/upgrade-dialog';

type UpgradeTargetPlan = 'pro' | 'max' | 'increase' | null;

const darkBackground = require('@/assets/backgrounds/dark.png');
const lightBackground = require('@/assets/backgrounds/light.png');
import { FAB } from '@/components/ui';
import { iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
  ChartNoAxesColumn,
  FileText,
  Home,
  Cog,
  Dumbbell,
  MessagesSquare,
  User,
  Users,
} from 'lucide-react-native';

type TabDefinition = {
  name: string;
  label: string;
  sf: string;
  mdi: string;
  IconComponent: ComponentType<{ size?: number; color?: string }>;
};

const hasLiquidGlass = isLiquidGlassAvailable();

type NativeTabsCoachViewProps = {
  primaryColor: string;
  clientsLabel: string;
};

// Pure layout component for coach view
const NativeTabsCoachView = ({ primaryColor, clientsLabel }: NativeTabsCoachViewProps) => {
  return (
    <NativeTabs tintColor={primaryColor}>
      <NativeTabs.Trigger name="home">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="clients">
        <Icon sf="person.2.fill" />
        <Label>{clientsLabel}</Label>
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
    </NativeTabs>
  );
};

type NativeTabsAthleteViewProps = {
  primaryColor: string;
  hideProgressTab?: boolean;
};

// Pure layout component for athlete view
const NativeTabsAthleteView = ({ primaryColor, hideProgressTab }: NativeTabsAthleteViewProps) => {
  return (
    <NativeTabs tintColor={primaryColor}>
      <NativeTabs.Trigger name="home">
        <Icon sf="house.fill"/>
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="training">
        <Icon sf="dumbbell.fill" />
        <Label>Training</Label>
      </NativeTabs.Trigger>

      {!hideProgressTab && (
        <NativeTabs.Trigger name="progress">
          <Icon sf="chart.bar.fill" />
          <Label>Progress</Label>
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

export default function TabLayout() {
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const router = useRouter();
  const pathname = usePathname();
  const previousAppView = useRef(appView);
  const isInitialMount = useRef(true);
  const colorScheme = useColorScheme();
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

  // Athlete's coach entitlements store
  const isCoachOnStarter = useAthleteCoachEntitlementsStore((state) => state.isCoachOnStarter);
  const loadCoachEntitlements = useAthleteCoachEntitlementsStore((state) => state.loadCoachEntitlements);
  const coachEntitlements = useAthleteCoachEntitlementsStore((state) => state.coachEntitlements);

  // Load athlete data when in athlete view
  useEffect(() => {
    if (appView === 'athlete' && clientProfile && !isAthleteDataInitialLoadComplete) {
      loadAthleteData(clientProfile.client_id, clientProfile.coach_id);
    }
  }, [appView, clientProfile, isAthleteDataInitialLoadComplete, loadAthleteData]);

  // Load coach entitlements when in athlete view
  useEffect(() => {
    if (appView === 'athlete' && clientProfile && !coachEntitlements) {
      loadCoachEntitlements(clientProfile.coach_id);
    }
  }, [appView, clientProfile, coachEntitlements, loadCoachEntitlements]);

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

  // Helper to check if pathname matches the current app view
  const isValidRouteForView = useCallback((path: string, view: 'coach' | 'athlete') => {
    const coachRoutes = ['/home', '/clients', '/chats', '/library', '/settings'];
    const athleteRoutes = ['/home', '/training', '/progress', '/profile'];
    const validRoutes = view === 'coach' ? coachRoutes : athleteRoutes;
    return validRoutes.some(route => path.startsWith(route));
  }, []);

  // Use useEffect for initial mount to prevent navigation before layout is ready
  useEffect(() => {
    if (!isInitialMount.current) {
      return;
    }

    isInitialMount.current = false;
    previousAppView.current = appView;

    // On initial mount, ensure we navigate to the correct initial route
    // This prevents showing wrong view's content (e.g., athlete route with coach tab bar)
    const initialRoute = '/home';
    // Navigate if: on index, or on wrong view's route, or on add-modal
    const needsNavigation =
      pathname === '/' ||
      pathname === '/(tabs)' ||
      pathname.startsWith('/add-modal') ||
      !isValidRouteForView(pathname, appView);

    if (needsNavigation) {
      // Delay navigation to ensure layout is mounted
      setTimeout(() => {
        router.replace(initialRoute);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - pathname and router are stable

  useEffect(() => {
    if (previousAppView.current !== appView) {
      previousAppView.current = appView;
      // Navigate to the correct initial route when app view changes
      // Both views now start at /home
      router.replace('/home');
    }
  }, [appView, router]);

  const insets = useSafeAreaInsets();
  const { hasFeature } = useEntitlements();
  const { entitlements } = useCoachEntitlementsStore();
  const { clients } = useCoachDataStore();

  // Upgrade dialog state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState<UpgradeTargetPlan>('pro');

  const handleFabPress = () => {
    // Check for library first, then clients/chats
    if (pathname.includes('/library')) {
      // Feature gate for files tab
      if (currentLibraryTab === 'files' && !hasFeature('file_storage')) {
        setUpgradeFeature(t('library.tabs.files') || 'Files');
        setUpgradeTargetPlan('pro');
        setShowUpgradeDialog(true);
        return;
      }
      router.push(getLibraryModalRoute() as any);
    } else if (pathname.includes('/clients')) {
      // Check client limit
      const clientLimit = entitlements?.client_limit || 5;
      const currentClientCount = clients.length;
      const planType = entitlements?.plan_type || 'starter';

      if (currentClientCount >= clientLimit) {
        // Determine which upgrade to show based on current plan
        if (planType === 'starter') {
          // Starter at 5/5 -> Upgrade to Pro
          setUpgradeTargetPlan('pro');
          setUpgradeFeature(`You've reached your limit of ${clientLimit} ${terminology.pluralLower}. Upgrade to add more.`);
        } else if (planType === 'pro' && clientLimit >= 300) {
          // Pro at max (300) -> Upgrade to Max
          setUpgradeTargetPlan('max');
          setUpgradeFeature(`You've reached the Pro plan limit of ${clientLimit} ${terminology.pluralLower}. Upgrade to Max for more.`);
        } else {
          // Pro but not at 300 -> Increase allowance
          setUpgradeTargetPlan('increase');
          setUpgradeFeature(`You've reached your limit of ${clientLimit} ${terminology.pluralLower}. Increase your allowance to add more.`);
        }
        setShowUpgradeDialog(true);
        return;
      }
      router.push({
        pathname: '/add-modal-content',
        params: { route: 'clients' },
      });
    } else if (pathname.includes('/chats')) {
      // Feature gate for broadcast messaging (Max plan only)
      if (!hasFeature('broadcast_messaging')) {
        setUpgradeFeature('Broadcast Messaging');
        setUpgradeTargetPlan('max');
        setShowUpgradeDialog(true);
        return;
      }
      router.push('/modals/message/broadcast-modal');
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

  // Determine if FAB should be visible (coach view, on clients/chats/library tabs)
  const showFab = appView === 'coach' && (
    pathname.includes('/clients') ||
    pathname.includes('/chats') ||
    pathname.includes('/library')
  );
  const fabVariant = pathname.includes('/chats') ? 'megaphone' : 'plus';

  if (hasLiquidGlass) {
    if (appView === 'coach') {
      return (
        <View style={{ flex: 1 }}>
          <NativeTabsCoachView primaryColor={primaryColor} clientsLabel={terminology.plural} />
          {showFab && (
            <FAB
              onPress={handleFabPress}
              variant={fabVariant}
              bottom={insets.bottom + 70}
            />
          )}
          <UpgradeDialog
            visible={showUpgradeDialog}
            onClose={() => setShowUpgradeDialog(false)}
            feature={upgradeFeature}
            targetPlan={upgradeTargetPlan}
          />
        </View>
      );
    }

    // Athlete view (default)
    return <NativeTabsAthleteView primaryColor={primaryColor} hideProgressTab={isCoachOnStarter} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        key={appView}
        initialRouteName="home"
        tabBar={(props) => <FallbackTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="clients"
          options={{
            title: terminology.plural,
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
            href: '/home',
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
            href: appView === 'athlete' && !isCoachOnStarter ? '/progress' : null,
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
      {showFab && (
        <FAB
          onPress={handleFabPress}
          variant={fabVariant}
          bottom={Platform.OS === 'android' ? 100 : insets.bottom + 66}
        />
      )}
      <UpgradeDialog
        visible={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        feature={upgradeFeature}
        targetPlan={upgradeTargetPlan}
      />
    </View>
  );
}

type FallbackTabBarProps = BottomTabBarProps;

function FallbackTabBar({ state, navigation }: FallbackTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const isCoachOnStarter = useAthleteCoachEntitlementsStore((state) => state.isCoachOnStarter);

  const tabBarBackground =
    colorScheme === 'dark' ? '#0A0A0A' : themeColors.backgroundSecondary;

  const handleTabPress = (name: string) => {
    haptics.medium();
    if (name === activeRouteName) {
      return;
    }
    navigation.navigate(name as never);
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
        style={styles.tab}
        onPress={() => handleTabPress(tab.name)}
      >
        {iconNode}
        <Text style={[styles.tabText, { color }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </PressableOpacity>
    );
  };

  const coachTabs: TabDefinition[] = [
    {
      name: 'home',
      label: t('home.title'),
      sf: 'house.fill',
      mdi: 'home',
      IconComponent: Home,
    },
    {
      name: 'clients',
      label: terminology.plural,
      sf: 'person.2.fill',
      mdi: 'people',
      IconComponent: Users,
    },
    {
      name: 'chats',
      label: t('chats.title'),
      sf: 'bubble.left.and.text.bubble.right.fill',
      mdi: 'forum',
      IconComponent: MessagesSquare,
    },
    {
      name: 'library',
      label: t('library.title'),
      sf: 'folder.fill',
      mdi: 'folder',
      IconComponent: FileText,
    },
    {
      name: 'settings',
      label: t('settings.title'),
      sf: 'gear',
      mdi: 'settings',
      IconComponent: Cog,
    },
  ];

  const athleteTabs: TabDefinition[] = [
    {
      name: 'home',
      label: t('home.title'),
      sf: 'house.fill',
      mdi: 'home',
      IconComponent: Home,
    },
    {
      name: 'training',
      label: t('training.title'),
      sf: 'dumbbell.fill',
      mdi: 'fitness-center',
      IconComponent: Dumbbell,
    },
    {
      name: 'progress',
      label: t('progress.title'),
      sf: 'chart.bar.fill',
      mdi: 'bar-chart',
      IconComponent: ChartNoAxesColumn,
    },
    {
      name: 'profile',
      label: t('profile.title'),
      sf: 'person.fill',
      mdi: 'person',
      IconComponent: User,
    },
  ];

  // Filter out progress tab if coach is on Starter plan
  const filteredAthleteTabs = isCoachOnStarter
    ? athleteTabs.filter(tab => tab.name !== 'progress')
    : athleteTabs;
  const tabs = appView === 'coach' ? coachTabs : filteredAthleteTabs;

  return (
    <View style={[styles.container, { backgroundColor: tabBarBackground }]}>
      <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
      <View
        style={[
          styles.navigationBar,
          { paddingBottom: insets.bottom + 8, backgroundColor: tabBarBackground },
        ]}
      >
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <View key={tab.name} style={styles.tabSection}>
              {renderTab(tab)}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    position: 'relative',
    paddingHorizontal: 8,
    paddingTop: 4,
    marginBottom: Platform.OS === 'android' ? -8 : -12,
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
    justifyContent: 'space-evenly',
    width: '100%',
  },
  tabSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  tab: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: Platform.OS === 'android' ? 12 : 4,
    width: '100%',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
