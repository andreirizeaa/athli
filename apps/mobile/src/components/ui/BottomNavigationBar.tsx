import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartNoAxesColumn, House, Settings, Plus } from 'lucide-react-native';

interface BottomNavigationBarProps {
  activeTab: 'home' | 'progress' | 'settings';
  onTabPress: (tab: 'home' | 'progress' | 'settings') => void;
  onAddPress: () => void;
}

interface TabIconProps {
  name: 'home' | 'progress' | 'settings';
  isActive: boolean;
  size?: number;
}

function TabIcon({ name, isActive, size = 26 }: TabIconProps) {
  const color = isActive ? '#000000' : '#8E8E93';

  const icons = {
    home: <House size={size} color={color} />,
    progress: <ChartNoAxesColumn size={size} color={color} />,
    settings: <Settings size={size} color={color} />,
  };

  return icons[name];
}

export function BottomNavigationBar({
  activeTab,
  onTabPress,
  onAddPress,
}: BottomNavigationBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.separator} />
      <View style={[styles.navigationBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabPress('home')}
            activeOpacity={0.7}
          >
            <TabIcon name="home" isActive={activeTab === 'home'} />
            <Text style={[styles.tabText, { color: activeTab === 'home' ? '#000000' : '#8E8E93' }]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabPress('progress')}
            activeOpacity={0.7}
          >
            <TabIcon name="progress" isActive={activeTab === 'progress'} />
            <Text
              style={[styles.tabText, { color: activeTab === 'progress' ? '#000000' : '#8E8E93' }]}
            >
              Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabPress('settings')}
            activeOpacity={0.7}
          >
            <TabIcon name="settings" isActive={activeTab === 'settings'} />
            <Text
              style={[styles.tabText, { color: activeTab === 'settings' ? '#000000' : '#8E8E93' }]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={onAddPress} activeOpacity={0.7}>
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
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 12,
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
    justifyContent: 'space-between',
    flex: 1,
    marginRight: 20,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: 'System',
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -50,
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
