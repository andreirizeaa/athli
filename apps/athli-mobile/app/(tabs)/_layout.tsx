import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { LucideIcon } from 'lucide-react-native';

import { useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';
import { iconSizes } from '@/constants/typography';
import {
  Calendar,
  ChartNoAxesColumn,
  Cog,
  Dumbbell,
  Mail,
  Plus,
  User,
  Users,
} from 'lucide-react-native';

const hasLiquidGlass = isLiquidGlassAvailable();

export default function TabLayout() {
  const { primaryColor } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const router = useRouter();
  const previousAppView = useRef(appView);
  const isInitialMount = useRef(true);

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

  if (hasLiquidGlass) {
    if (appView === 'coach') {
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
            <Icon sf="envelope.fill" />
            <Label>Chats</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="settings">
            <Icon sf="gearshape.fill" />
            <Label>Settings</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="add" role="search">
            <Icon sf="plus" />
            <Label>Add</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
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

        <NativeTabs.Trigger name="profile">
          <Icon sf="person.crop.circle.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="add" role="search">
          <Icon sf="plus" />
          <Label>Add</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      initialRouteName={appView === 'coach' ? 'clients' : 'training'}
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
          title: t('settings.title'),
          href: appView === 'coach' ? '/settings' : null,
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
      <Tabs.Screen name="add" options={{ title: t('general.add'), href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

function FallbackTabBar({ state, navigation }: BottomTabBarProps) {
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

  const renderTab = (name: string, label: string, IconComponent: LucideIcon) => {
    const isActive = activeRouteName === name;
    const color = isActive ? themeColors.text : themeColors.mutedText;

    return (
      <TouchableOpacity
        key={name}
        style={styles.tab}
        onPress={() => handleTabPress(name)}
        activeOpacity={0.7}
      >
        <IconComponent size={iconSizes.tabBarIcons} color={color} />
        <Text style={[styles.tabText, { color }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (appView === 'coach') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
        <View
          style={[
            styles.navigationBar,
            { paddingBottom: insets.bottom + 8, backgroundColor: themeColors.background },
          ]}
        >
          <View style={styles.sideTabsContainer}>
            <View style={styles.sideGroup}>
              {renderTab('clients', t('clients.title'), Users)}
              {renderTab('chats', t('chats.title'), Mail)}
            </View>

            <View style={styles.sideGroup}>
              {renderTab('calendar', t('calendar.title'), Calendar)}
              {renderTab('settings', t('settings.title'), Cog)}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: primaryColor }]}
            onPress={() => {
              // Add action; no-op for now
            }}
            activeOpacity={0.7}
          >
            <Plus size={iconSizes.tabBarIcons} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Athlete view (default)
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
      <View
        style={[
          styles.navigationBar,
          { paddingBottom: insets.bottom + 8, backgroundColor: themeColors.background },
        ]}
      >
        <View style={styles.sideTabsContainer}>
          <View style={styles.sideGroup}>
            {renderTab('training', t('training.title'), Dumbbell)}
            {renderTab('inbox', t('inbox.title'), Mail)}
          </View>

          <View style={styles.sideGroup}>
            {renderTab('progress', t('progress.title'), ChartNoAxesColumn)}
            {renderTab('profile', t('profile.title'), User)}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            // Add action; no-op for now
          }}
          activeOpacity={0.7}
        >
          <Plus size={iconSizes.tabBarIcons} color="#FFFFFF" />
        </TouchableOpacity>
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
  sideTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sideGroup: {
    flexDirection: 'row',
    // If `gap` is not supported in your RN version, replace with margins on `tab`
    gap: 32,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  addButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: -14,
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

