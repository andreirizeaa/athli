import React from 'react';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChartNoAxesColumn,
  Dumbbell,
  Mail,
  Plus,
  User,
} from 'lucide-react-native';

const hasLiquidGlass = isLiquidGlassAvailable();

export default function TabLayout() {
  if (hasLiquidGlass) {
    // NativeTabs does not support an explicit initialRouteName prop, so we keep
    // the first trigger as "training" to make it the default.
    return (
        <NativeTabs>
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
      <Tabs initialRouteName="training" tabBar={(props) => <FallbackTabBar {...props} />}>
        <Tabs.Screen name="training" options={{ title: 'Training', headerShown: false }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress', headerShown: false }} />
        <Tabs.Screen name="inbox" options={{ title: 'Inbox', headerShown: false }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
        <Tabs.Screen name="add" options={{ title: 'Add', href: null }} />
      </Tabs>
  );
}

function FallbackTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;

  const handleTabPress = (name: string) => {
    if (name === activeRouteName) {
      return;
    }

    navigation.navigate(name as never);
  };

  const renderTab = (name: string, label: string, IconComponent: LucideIcon) => {
    const isActive = activeRouteName === name;
    const color = isActive ? '#000000' : '#8E8E93';

    return (
      <TouchableOpacity
        key={name}
        style={styles.tab}
        onPress={() => handleTabPress(name)}
        activeOpacity={0.7}
      >
        <IconComponent size={26} color={color} />
        <Text style={[styles.tabText, { color }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.separator} />
      <View style={[styles.navigationBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.sideTabsContainer}>
          <View style={styles.sideGroup}>
            {renderTab('training', 'Training', Dumbbell)}
            {renderTab('inbox', 'Inbox', Mail)}
          </View>

          <View style={styles.sideGroup}>
            {renderTab('progress', 'Progress', ChartNoAxesColumn)}
            {renderTab('profile', 'Profile', User)}
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Add action; no-op for now
          }}
          activeOpacity={0.7}
        >
          <Plus size={26} color="#FFFFFF" />
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
    marginHorizontal: 16,
  },
  navigationBar: {
    // Needed so the add button can be absolutely centered within this bar
    position: 'relative',
    backgroundColor: '#FFFFFF',
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

