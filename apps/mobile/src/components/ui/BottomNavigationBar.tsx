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
import { useTheme } from '../../context/ThemeContext';
import i18n from '../../utils/i18n';

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
  activeColor: string;
  inactiveColor: string;
}

interface CoachTabIconProps {
  name: 'clients' | 'calendar' | 'inbox' | 'settings';
  isActive: boolean;
  size?: number;
  activeColor: string;
  inactiveColor: string;
}

function AthleteTabIcon({
  name,
  isActive,
  size = 22,
  activeColor,
  inactiveColor,
}: AthleteTabIconProps) {
  const color = isActive ? activeColor : inactiveColor;

  const icons = {
    home: <House size={size} color={color} />,
    progress: <ChartNoAxesColumn size={size} color={color} />,
    settings: <Settings size={size} color={color} />,
  };

  return icons[name];
}

function CoachTabIcon({
  name,
  isActive,
  size = 22,
  activeColor,
  inactiveColor,
}: CoachTabIconProps) {
  const color = isActive ? activeColor : inactiveColor;

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
  activeColor: string;
  inactiveColor: string;
  labelActiveColor: string;
  labelInactiveColor: string;
   primaryColor: string;
   primaryForegroundColor: string;
}

function AthleteNavigation({
  activeTab,
  onTabPress,
  onAddPress,
  activeColor,
  inactiveColor,
  labelActiveColor,
  labelInactiveColor,
  primaryColor,
  primaryForegroundColor,
}: AthleteNavigationProps) {
  return (
    <>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('home')}
          activeOpacity={0.7}
        >
          <AthleteTabIcon
            name="home"
            isActive={activeTab === 'home'}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'home' ? labelActiveColor : labelInactiveColor,
              },
            ]}
          >
            {i18n.t('navigation.home')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('progress')}
          activeOpacity={0.7}
        >
          <AthleteTabIcon
            name="progress"
            isActive={activeTab === 'progress'}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'progress'
                    ? labelActiveColor
                    : labelInactiveColor,
              },
            ]}
          >
            {i18n.t('navigation.progress')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('settings')}
          activeOpacity={0.7}
        >
          <AthleteTabIcon
            name="settings"
            isActive={activeTab === 'settings'}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'settings'
                    ? labelActiveColor
                    : labelInactiveColor,
              },
            ]}
          >
            {i18n.t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[
          styles.addButton,
          { marginTop: -50, backgroundColor: primaryColor },
        ]}
        onPress={onAddPress}
        activeOpacity={0.7}
      >
        <Plus size={22} color={primaryForegroundColor} />
      </TouchableOpacity>
    </>
  );
}

interface CoachNavigationProps {
  activeTab: 'clients' | 'calendar' | 'inbox' | 'settings';
  onTabPress: (tab: 'clients' | 'calendar' | 'inbox' | 'settings') => void;
  activeColor: string;
  inactiveColor: string;
  labelActiveColor: string;
  labelInactiveColor: string;
}

function CoachNavigation({
  activeTab,
  onTabPress,
  activeColor,
  inactiveColor,
  labelActiveColor,
  labelInactiveColor,
}: CoachNavigationProps) {
  return (
    <View style={styles.coachTabsContainer}>
      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('clients')}
        activeOpacity={0.7}
      >
        <CoachTabIcon
          name="clients"
          isActive={activeTab === 'clients'}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'clients'
                  ? labelActiveColor
                  : labelInactiveColor,
            },
          ]}
        >
          {i18n.t('navigation.clients')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('calendar')}
        activeOpacity={0.7}
      >
        <CoachTabIcon
          name="calendar"
          isActive={activeTab === 'calendar'}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'calendar'
                  ? labelActiveColor
                  : labelInactiveColor,
            },
          ]}
        >
          {i18n.t('navigation.calendar')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('inbox')}
        activeOpacity={0.7}
      >
        <CoachTabIcon
          name="inbox"
          isActive={activeTab === 'inbox'}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'inbox'
                  ? labelActiveColor
                  : labelInactiveColor,
            },
          ]}
        >
          {i18n.t('navigation.inbox')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.coachTabSection}
        onPress={() => onTabPress('settings')}
        activeOpacity={0.7}
      >
        <CoachTabIcon
          name="settings"
          isActive={activeTab === 'settings'}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'settings'
                  ? labelActiveColor
                  : labelInactiveColor,
            },
          ]}
        >
          {i18n.t('navigation.settings')}
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
  const { colors } = useTheme();

  const activeColor = colors.sidebarForeground;
  const inactiveColor = colors.mutedText;
  const labelActiveColor = colors.sidebarForeground;
  const labelInactiveColor = colors.mutedText;
  const primaryColor = colors.primary;
  const primaryForegroundColor = colors.primaryForeground;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.sidebar,
        },
      ]}
    >
      <View
        style={[
          styles.separator,
          {
            backgroundColor: colors.border,
          },
        ]}
      />
      <View
        style={[
          styles.navigationBar,
          {
            backgroundColor: colors.sidebar,
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
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            labelActiveColor={labelActiveColor}
            labelInactiveColor={labelInactiveColor}
            primaryColor={primaryColor}
            primaryForegroundColor={primaryForegroundColor}
          />
        ) : (
          <CoachNavigation
            activeTab={coachActiveTab}
            onTabPress={onCoachTabPress}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            labelActiveColor={labelActiveColor}
            labelInactiveColor={labelInactiveColor}
          />
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
  },
  separator: {
    height: 0.5,
  },
  navigationBar: {
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
