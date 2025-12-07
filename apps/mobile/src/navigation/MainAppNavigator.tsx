import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigationBar } from '../components/ui/BottomNavigationBar';
import { TranslucentStatusBar } from '../components/ui/TranslucentStatusBar';
import { useView } from '../context/ViewContext';
// Athlete screens
import { HomeScreen } from '../screens/athlete/home/HomeScreen';
import { PerformanceScreen } from '../screens/athlete/performance/PerformanceScreen';
import { SettingsScreen as AthleteSettingsScreen } from '../screens/athlete/settings/SettingsScreen';
// Coach screens
import { ClientsScreen } from '../screens/coach/clients/ClientsScreen';
import { CalendarScreen } from '../screens/coach/calendar/CalendarScreen';
import { InboxScreen } from '../screens/coach/inbox/InboxScreen';
import { SettingsScreen as CoachSettingsScreen } from '../screens/coach/settings/SettingsScreen';

// Types for navigation
export type MainTabParamList = {
  Home: undefined;
  Performance: undefined;
  Settings: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// Athlete screen wrappers
function AthleteHomeScreenWrapper() {
  return <HomeScreen />;
}

function AthletePerformanceScreenWrapper() {
  return <PerformanceScreen />;
}

function AthleteSettingsScreenWrapper() {
  return <AthleteSettingsScreen />;
}

// Coach screen wrappers
function CoachClientsScreenWrapper() {
  return <ClientsScreen />;
}

function CoachCalendarScreenWrapper() {
  return <CalendarScreen />;
}

function CoachInboxScreenWrapper() {
  return <InboxScreen />;
}

function CoachSettingsScreenWrapper() {
  return <CoachSettingsScreen />;
}

// Main tabs navigator with custom bottom navigation
function MainTabsNavigator() {
  const { currentView } = useView();

  // Athlete tabs
  const [athleteActiveTab, setAthleteActiveTab] = React.useState<'home' | 'progress' | 'settings'>('home');
  // Coach tabs
  const [coachActiveTab, setCoachActiveTab] = React.useState<'clients' | 'calendar' | 'inbox' | 'settings'>('clients');

  const handleAthleteTabPress = (tab: 'home' | 'progress' | 'settings') => {
    setAthleteActiveTab(tab);
  };

  const handleCoachTabPress = (tab: 'clients' | 'calendar' | 'inbox' | 'settings') => {
    setCoachActiveTab(tab);
  };

  const handleAddPress = () => {
    // Empty handler for add button
  };

  const renderAthleteScreenContent = () => {
    switch (athleteActiveTab) {
      case 'home':
        return <AthleteHomeScreenWrapper />;
      case 'progress':
        return <AthletePerformanceScreenWrapper />;
      case 'settings':
        return <AthleteSettingsScreenWrapper />;
      default:
        return <AthleteHomeScreenWrapper />;
    }
  };

  const renderCoachScreenContent = () => {
    switch (coachActiveTab) {
      case 'clients':
        return <CoachClientsScreenWrapper />;
      case 'calendar':
        return <CoachCalendarScreenWrapper />;
      case 'inbox':
        return <CoachInboxScreenWrapper />;
      case 'settings':
        return <CoachSettingsScreenWrapper />;
      default:
        return <CoachClientsScreenWrapper />;
    }
  };

  // Reset to first tab when switching views
  React.useEffect(() => {
    if (currentView === 'athlete') {
      setAthleteActiveTab('home');
    } else {
      setCoachActiveTab('clients');
    }
  }, [currentView]);

  return (
    <>
      <LinearGradient
        colors={['#e2e8f0', '#ffffff']}
        locations={[0, 0.9]}
        style={styles.container}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <TranslucentStatusBar tint="light" />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>
            {currentView === 'athlete' ? renderAthleteScreenContent() : renderCoachScreenContent()}
          </View>

          <BottomNavigationBar
            viewType={currentView}
            athleteActiveTab={athleteActiveTab}
            coachActiveTab={coachActiveTab}
            onAthleteTabPress={handleAthleteTabPress}
            onCoachTabPress={handleCoachTabPress}
            onAddPress={handleAddPress}
          />
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

// Main stack navigator
export function MainAppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs">
          {() => <MainTabsNavigator />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
});
