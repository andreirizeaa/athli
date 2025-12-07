import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChartNoAxesColumn,
  House,
  Settings,
  Plus,
  Users,
  Calendar,
  Inbox,
} from 'lucide-react-native';
import type { ViewType } from '../../context/ViewContext';

interface BottomNavigationBarProps {
  viewType: ViewType;
  athleteActiveTab: 'home' | 'progress' | 'settings';
  coachActiveTab: 'clients' | 'calendar' | 'inbox' | 'settings';
  onAthleteTabPress: (tab: 'home' | 'progress' | 'settings') => void;
  onCoachTabPress: (tab: 'clients' | 'calendar' | 'inbox' | 'settings') => void;
  onAddPress: () => void;
}

interface AthleteTabIconProps {
  name: 'home' | 'progress' | 'settings';
  isActive: boolean;
  size?: number;
}

interface CoachTabIconProps {
  name: 'clients' | 'calendar' | 'inbox' | 'settings';
  isActive: boolean;
  size?: number;
}

function AthleteTabIcon({ name, isActive, size = 22 }: AthleteTabIconProps) {
  const color = isActive ? '#000000' : '#8E8E93';

  const icons = {
    home: <House size={size} color={color} />,
    progress: <ChartNoAxesColumn size={size} color={color} />,
    settings: <Settings size={size} color={color} />,
  };

  return icons[name];
}

function CoachTabIcon({ name, isActive, size = 22 }: CoachTabIconProps) {
  const color = isActive ? '#000000' : '#8E8E93';

  const icons = {
    clients: <Users size={size} color={color} />,
    calendar: <Calendar size={size} color={color} />,
    inbox: <Inbox size={size} color={color} />,
    settings: <Settings size={size} color={color} />,
  };

  return icons[name];
}

interface AthleteNavigationProps {
  activeTab: 'home' | 'progress' | 'settings';
  onTabPress: (tab: 'home' | 'progress' | 'settings') => void;
  onAddPress: () => void;
}

function AthleteNavigation({ activeTab, onTabPress, onAddPress }: AthleteNavigationProps) {
  return (
    <>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('home')}
          activeOpacity={0.7}
        >
          <AthleteTabIcon name="home" isActive={activeTab === 'home'} />
          <Text
            style={[styles.tabText, { color: activeTab === 'home' ? '#000000' : '#8E8E93' }]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('progress')}
          activeOpacity={0.7}
        >
          <AthleteTabIcon name="progress" isActive={activeTab === 'progress'} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'progress' ? '#000000' : '#8E8E93' },
            ]}
          >
            Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('settings')}
          activeOpacity={0.7}
        >
          <AthleteTabIcon name="settings" isActive={activeTab === 'settings'} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'settings' ? '#000000' : '#8E8E93' },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.addButton, { marginTop: -50 }]}
        onPress={onAddPress}
        activeOpacity={0.7}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </>
  );
}

interface CoachNavigationProps {
  activeTab: 'clients' | 'calendar' | 'inbox' | 'settings';
  onTabPress: (tab: 'clients' | 'calendar' | 'inbox' | 'settings') => void;
}

function CoachNavigation({ activeTab, onTabPress }: CoachNavigationProps) {
  return (
    <View style={styles.coachTabsContainer}>
      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('clients')}
        activeOpacity={0.7}
      >
        <CoachTabIcon name="clients" isActive={activeTab === 'clients'} />
        <Text
          style={[styles.tabText, { color: activeTab === 'clients' ? '#000000' : '#8E8E93' }]}
        >
          Clients
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('calendar')}
        activeOpacity={0.7}
      >
        <CoachTabIcon name="calendar" isActive={activeTab === 'calendar'} />
        <Text
          style={[styles.tabText, { color: activeTab === 'calendar' ? '#000000' : '#8E8E93' }]}
        >
          Calendar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('inbox')}
        activeOpacity={0.7}
      >
        <CoachTabIcon name="inbox" isActive={activeTab === 'inbox'} />
        <Text style={[styles.tabText, { color: activeTab === 'inbox' ? '#000000' : '#8E8E93' }]}>
          Inbox
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('settings')}
        activeOpacity={0.7}
      >
        <CoachTabIcon name="settings" isActive={activeTab === 'settings'} />
        <Text
          style={[styles.tabText, { color: activeTab === 'settings' ? '#000000' : '#8E8E93' }]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function BottomNavigationBar({
  viewType,
  athleteActiveTab,
  coachActiveTab,
  onAthleteTabPress,
  onCoachTabPress,
  onAddPress,
}: BottomNavigationBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.separator} />
      <View
        style={[
          styles.navigationBar,
          {
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: viewType === 'athlete' ? 40 : 0,
          },
        ]}
      >
        {viewType === 'athlete' ? (
          <AthleteNavigation
            activeTab={athleteActiveTab}
            onTabPress={onAthleteTabPress}
            onAddPress={onAddPress}
          />
        ) : (
          <CoachNavigation activeTab={coachActiveTab} onTabPress={onCoachTabPress} />
        )}
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
  coachTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  coachTab: {
    alignItems: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  coachTabSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 0,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: 'System',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
