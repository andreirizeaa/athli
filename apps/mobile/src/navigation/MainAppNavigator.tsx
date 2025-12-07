import { NavigationContainer, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigationBar } from '../components/ui/BottomNavigationBar';
import { UpgradeAppModal } from '../components/ui/modals/UpgradeAppModal';
import { TranslucentStatusBar } from '../components/ui/TranslucentStatusBar';
import { ILiftData, useLiftData } from '../context/LiftDataContext';
import { useUserDetails } from '../context/UserDetailsContext';
import { AddOptions } from '../screens/application/add/AddOptions';
import { RecordModal } from '../screens/application/add/record/RecordModal';
import { UploadModal } from '../screens/application/add/upload/UploadModal';
import { FeedbackSlideshow } from '../screens/application/feedback/feedbackSlideshow';
import { HowItWorksScreen } from '../screens/application/feedback/HowItWorksScreen';
import { LiftDetails } from '../screens/application/feedback/liftDetails';
import { HomeScreen } from '../screens/application/home/HomeScreen';
import { LibraryScreen } from '../screens/application/library/LibraryScreen';
import { PerformanceScreen } from '../screens/application/performance/PerformanceScreen';
import { WrappedDetailsScreen } from '../screens/application/performance/WrappedDetailsScreen';
import { AppIconScreen } from '../screens/application/settings/AppIconScreen';
import { EditLanguageScreen } from '../screens/application/settings/EditLanguageScreen';
import { EditNameScreen } from '../screens/application/settings/EditNameScreen';
import { EditAgeScreen } from '../screens/application/settings/editPersonalDetails/EditAgeScreen';
import { EditCurrentWeightScreen } from '../screens/application/settings/editPersonalDetails/EditCurrentWeightScreen';
import { EditGenderScreen } from '../screens/application/settings/editPersonalDetails/EditGenderScreen';
import { EditHeightScreen } from '../screens/application/settings/editPersonalDetails/EditHeightScreen';
import { EditUnitsScreen } from '../screens/application/settings/EditUnitsScreen';
import { PersonalDetailsScreen } from '../screens/application/settings/PersonalDetailsScreen';
import { SettingsScreen } from '../screens/application/settings/SettingsScreen';
import { ShareScreen } from '../screens/application/settings/ShareScreen';
import { track } from '../services/analytics';
import {
  checkAppVersion,
  forceCheckAppVersion,
  VersionCheckResult,
} from '../services/appVersionService';
import { AppEvents, eventBus } from '../services/lifts/event-bus';
import {
  navigateToFailedLiftDate,
  navigationRef,
  openLiftById,
} from '../services/navigationService';
import { handleColdStartNotificationIfAny } from '../services/notificationNavigation';
import { clearUserJustPaid, getUserJustPaid } from '../services/storageService';

// Types for navigation
export type MainTabParamList = {
  Home: undefined;
  Performance: undefined;
  Settings: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  PersonalDetails: undefined;
  EditUnits: undefined;
  EditLanguage: undefined;
  EditName: undefined;
  AppIcon: undefined;
  Share: undefined;
  EditCurrentWeight: { currentValue: string };
  EditHeight: { currentValue: string };
  EditAge: { currentValue: string };
  EditGender: { currentValue: string };
  RecordModal: undefined;
  UploadModal: undefined;
  UpgradeAppModal: { versionCheckResult: VersionCheckResult };
  LiftDetails: {
    liftData: ILiftData;
  };
  HowItWorks: undefined;
  FeedbackSlideshow: {
    liftData: ILiftData;
  };
  Library: { selectedFilters?: string[] };
  WrappedDetails: { selectedYear: string };
};

type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const Stack = createNativeStackNavigator<MainStackParamList>();

// Declare global function type
declare global {
  var triggerAddOptions: (() => void) | undefined;
  var navigateToPerformance: (() => void) | undefined;
  var openUploadModal: (() => void) | undefined;
  var closeAddOptions: (() => void) | undefined;
  var openLiftDetails: (() => void) | undefined;
  var showFirstLiftDetails: (() => void) | undefined;
  var openHowItWorksModal: (() => void) | undefined;
  var selectedVideoFromSearch: any | undefined;
  var uploadFromLibrarySearch: boolean | undefined;
  var pendingLiftId: string | undefined;
  var __navigateToHomeBase: (() => void) | undefined;
  var __lastHomeNavAt: number | undefined;
}

// Wrapper components for screens that need navigation
function HomeScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { getLiftById, isLiftDataLoaded } = useLiftData();

  const handleShowFeedback = (liftData: ILiftData) => {
    navigation.navigate('LiftDetails', {
      liftData: liftData,
    });
  };

  const handleShowFeedbackSlideshow = () => {
    // Navigate to feedback slideshow
    // This will be implemented later
  };

  const handleShowLibrary = () => {
    navigation.navigate('Library', { selectedFilters: [] });
  };

  const handleShowShare = () => {
    navigation.navigate('Share');
  };

  const handleTriggerAddOptions = () => {
    // This will be handled by the parent component
    // For now, we'll need to expose this through the global trigger
    if (global.triggerAddOptions) {
      global.triggerAddOptions();
    }
  };

  const handleNavigateToPerformance = () => {
    // Navigate to performance tab
    // This will be handled by the parent component to switch tabs
    if (global.navigateToPerformance) {
      global.navigateToPerformance();
    }
  };

  // Navigation is now handled by the centralized navigation service

  return (
    <HomeScreen
      onShowFeedback={handleShowFeedback}
      onShowFeedbackSlideshow={handleShowFeedbackSlideshow}
      onShowLibrary={handleShowLibrary}
      onShowShare={handleShowShare}
      onTriggerAddOptions={handleTriggerAddOptions}
      onNavigateToPerformance={handleNavigateToPerformance}
    />
  );
}

function SettingsScreenWrapper({ onLogout }: { onLogout?: () => void }) {
  const navigation = useNavigation<MainStackNavigationProp>();

  const handlePersonalDetailsPress = () => {
    navigation.navigate('PersonalDetails');
  };

  const handleUnitsPress = () => {
    navigation.navigate('EditUnits');
  };

  const handleLanguagePress = () => {
    navigation.navigate('EditLanguage');
  };

  const handleEditNamePress = () => {
    navigation.navigate('EditName');
  };

  const handleAppIconPress = () => {
    navigation.navigate('AppIcon');
  };

  const handleSharePress = () => {
    navigation.navigate('Share');
  };

  return (
    <SettingsScreen
      onPersonalDetailsPress={handlePersonalDetailsPress}
      onUnitsPress={handleUnitsPress}
      onLanguagePress={handleLanguagePress}
      onEditNamePress={handleEditNamePress}
      onAppIconPress={handleAppIconPress}
      onSharePress={handleSharePress}
      onLogout={onLogout}
    />
  );
}

function PerformanceScreenWrapper() {
  const handleTriggerAddOptions = () => {
    // This will be handled by the parent component
    // For now, we'll need to expose this through the global trigger
    if (global.triggerAddOptions) {
      global.triggerAddOptions();
    }
  };

  return <PerformanceScreen onTriggerAddOptions={handleTriggerAddOptions} />;
}

function PersonalDetailsScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { userDetails, getWeightDisplay, getHeightDisplay, getAgeRangeDisplay } = useUserDetails();

  // Temporarily neutralize global navigateToHome while this screen is mounted
  React.useEffect(() => {
    const previousNavigateToHome = (global as any).navigateToHome;
    (global as any).navigateToHome = () => {};
    return () => {
      if (previousNavigateToHome) {
        (global as any).navigateToHome = previousNavigateToHome;
      } else if ((global as any).__navigateToHomeBase) {
        (global as any).navigateToHome = (global as any).__navigateToHomeBase;
      } else {
        try {
          delete (global as any).navigateToHome;
        } catch {}
      }
    };
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEditCurrentWeight = (currentValue: string) => {
    navigation.navigate('EditCurrentWeight', { currentValue });
  };

  const handleEditHeight = (currentValue: string) => {
    navigation.navigate('EditHeight', { currentValue });
  };

  const handleEditAgeRange = (currentValue: string) => {
    navigation.navigate('EditAge', { currentValue });
  };

  const handleEditGender = (currentValue: string) => {
    navigation.navigate('EditGender', { currentValue });
  };

  return (
    <PersonalDetailsScreen
      onBack={handleBack}
      onEditCurrentWeight={handleEditCurrentWeight}
      onEditHeight={handleEditHeight}
      onEditAgeRange={handleEditAgeRange}
      onEditGender={handleEditGender}
    />
  );
}

function EditUnitsScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();

  // Temporarily neutralize global navigateToHome while this screen is mounted
  React.useEffect(() => {
    const previousNavigateToHome = (global as any).navigateToHome;
    (global as any).navigateToHome = () => {};
    return () => {
      if (previousNavigateToHome) {
        (global as any).navigateToHome = previousNavigateToHome;
      } else if ((global as any).__navigateToHomeBase) {
        (global as any).navigateToHome = (global as any).__navigateToHomeBase;
      } else {
        try {
          delete (global as any).navigateToHome;
        } catch {}
      }
    };
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  return <EditUnitsScreen onBack={handleBack} />;
}

function EditLanguageScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();

  // Temporarily neutralize global navigateToHome while this screen is mounted
  React.useEffect(() => {
    const previousNavigateToHome = (global as any).navigateToHome;
    (global as any).navigateToHome = () => {};
    return () => {
      if (previousNavigateToHome) {
        (global as any).navigateToHome = previousNavigateToHome;
      } else if ((global as any).__navigateToHomeBase) {
        (global as any).navigateToHome = (global as any).__navigateToHomeBase;
      } else {
        try {
          delete (global as any).navigateToHome;
        } catch {}
      }
    };
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  return <EditLanguageScreen onBack={handleBack} />;
}

function EditNameScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const handleBack = () => {
    navigation.goBack();
  };
  return <EditNameScreen onBack={handleBack} />;
}

function AppIconScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const handleBack = () => {
    navigation.goBack();
  };
  return <AppIconScreen onBack={handleBack} />;
}

function ShareScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();

  const handleBack = () => {
    navigation.goBack();
  };

  return <ShareScreen onBack={handleBack} />;
}

function EditCurrentWeightScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'EditCurrentWeight'>>();
  const { updateWeight } = useUserDetails();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = (newValue: string) => {
    // Parse the weight string to get the metric value for storage
    const weightMatch = newValue.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/);
    if (weightMatch) {
      const [, number, unit] = weightMatch;
      const weight = parseFloat(number);
      const weightKg = unit === 'kg' ? weight : weight * 0.453592;
      updateWeight(weightKg);
    }
    navigation.goBack();
  };

  return (
    <EditCurrentWeightScreen
      onBack={handleBack}
      currentValue={route.params.currentValue}
      onSave={handleSave}
    />
  );
}

function EditHeightScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'EditHeight'>>();
  const { updateHeight } = useUserDetails();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = (newValue: string) => {
    // Parse the height string to get the metric value for storage
    let heightCm: number;

    if (newValue.includes('cm')) {
      const heightMatch = newValue.match(/(\d+)\s*cm/);
      if (heightMatch) {
        heightCm = parseFloat(heightMatch[1]);
      } else {
        heightCm = 170; // Default
      }
    } else {
      // Parse feet/inches format
      const feetMatch = newValue.match(/(\d+)'/);
      const inchesMatch = newValue.match(/(\d+)"/);
      if (feetMatch && inchesMatch) {
        const feet = parseInt(feetMatch[1]);
        const inches = parseInt(inchesMatch[1]);
        heightCm = (feet * 12 + inches) * 2.54;
      } else {
        heightCm = 170; // Default
      }
    }

    updateHeight(heightCm);
    navigation.goBack();
  };

  return (
    <EditHeightScreen
      onBack={handleBack}
      currentValue={route.params.currentValue}
      onSave={handleSave}
    />
  );
}

function EditAgeScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'EditAge'>>();
  const { updateUserDetails } = useUserDetails();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = (newValue: string) => {
    // The newValue is an age range (e.g., "18-24") from EditAgeScreen
    updateUserDetails('ageRange', newValue);
    navigation.goBack();
  };

  return (
    <EditAgeScreen
      onBack={handleBack}
      currentValue={route.params.currentValue}
      onSave={handleSave}
    />
  );
}

function EditGenderScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'EditGender'>>();
  const { updateUserDetails } = useUserDetails();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = (newValue: string) => {
    updateUserDetails('gender', newValue);
    navigation.goBack();
  };

  return (
    <EditGenderScreen
      onBack={handleBack}
      currentValue={route.params.currentValue}
      onSave={handleSave}
    />
  );
}

function RecordModalWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();

  const handleClose = () => {
    navigation.goBack();
  };

  return <RecordModal isVisible={true} onClose={handleClose} />;
}

function UploadModalWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();

  const handleClose = () => {
    // Check if upload modal was opened from library search
    if (global.uploadFromLibrarySearch) {
      // Clear the flag
      global.uploadFromLibrarySearch = false;
      // Go back twice: first to Library, then to MainTabs
      navigation.goBack(); // Go back to Library
      setTimeout(() => {
        navigation.goBack(); // Go back to MainTabs
      }, 50);
    } else {
      // Normal behavior - go back
      navigation.goBack();
    }
  };

  return <UploadModal isVisible={true} onClose={handleClose} />;
}

function LiftDetailsWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'LiftDetails'>>();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleShowFeedbackSlideshow = () => {
    // Navigate directly to FeedbackSlideshow (which now includes How It Works)
    navigation.navigate('FeedbackSlideshow', { liftData: route.params.liftData });
  };

  const handleOpenFeedbackSlideshowDirectly = () => {
    // For tutorial: bypass HowItWorks and go directly to FeedbackSlideshow
    navigation.navigate('FeedbackSlideshow', { liftData: route.params.liftData });
  };

  // Expose functions globally for tutorial
  React.useEffect(() => {
    global.openFeedbackSlideshow = handleShowFeedbackSlideshow;

    return () => {
      delete global.openFeedbackSlideshow;
    };
  }, [handleShowFeedbackSlideshow]);

  return (
    <LiftDetails
      onClose={handleClose}
      onShowFeedbackSlideshow={handleShowFeedbackSlideshow}
      liftData={route.params.liftData}
    />
  );
}

function HowItWorksScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();

  const handleClose = () => {
    navigation.goBack();
  };

  return <HowItWorksScreen onClose={handleClose} />;
}

function FeedbackSlideshowWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'FeedbackSlideshow'>>();

  const handleClose = () => {
    // Go back to LiftDetails
    navigation.goBack();
  };

  const handleNavigateToLiftDetails = () => {
    // Go back to LiftDetails
    navigation.goBack();
  };

  const handleNavigateToHome = () => {
    // Go back twice: first from feedback slideshow to lift details, then from lift details to home
    navigation.goBack(); // Go back to lift details
    setTimeout(() => {
      navigation.goBack(); // Go back to home
      // Then navigate to home tab by calling the global function
      setTimeout(() => {
        if ((global as any).navigateToHome) {
          (global as any).navigateToHome();
        }
      }, 100);
    }, 100);
  };

  const handleShowHowItWorks = () => {
    navigation.navigate('HowItWorks');
  };

  // Transform the liftData to match the expected format
  const transformedLiftData = route.params?.liftData
    ? {
        analysis: {
          feedback: route.params.liftData.analysis.feedback.map((item) => ({
            imageURL: item.imageURL,
            flaws: item.flaws,
            improvement: item.improvement,
          })),
          accuracy: route.params.liftData.analysis.accuracy,
          accuracyScore: route.params.liftData.analysis.accuracy,
        },
      }
    : undefined;

  return (
    <FeedbackSlideshow
      onClose={handleClose}
      onNavigateToLiftDetails={handleNavigateToLiftDetails}
      onNavigateToHome={handleNavigateToHome}
      onShowHowItWorks={handleShowHowItWorks}
      liftData={transformedLiftData}
    />
  );
}

function LibraryScreenWrapperWithProps() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'Library'>>();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTriggerAddOptions = () => {
    // Check if we can go back, if not just trigger add options directly
    if (navigation.canGoBack()) {
      navigation.goBack();
      // Use a small delay to ensure navigation completes
      setTimeout(() => {
        if (global.triggerAddOptions) {
          global.triggerAddOptions();
        }
      }, 100);
    } else {
      // If we can't go back, just trigger add options directly
      if (global.triggerAddOptions) {
        global.triggerAddOptions();
      }
    }
  };

  return <LibraryScreen onBack={handleBack} onTriggerAddOptions={handleTriggerAddOptions} />;
}

function UpgradeAppModalWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'UpgradeAppModal'>>();

  const handleClose = () => {
    // Only allow closing if it's not a force update
    if (!route.params.versionCheckResult.forceUpdate) {
      navigation.goBack();
    }
  };

  return (
    <UpgradeAppModal
      isVisible={true}
      onClose={handleClose}
      versionCheckResult={route.params.versionCheckResult}
    />
  );
}

function WrappedDetailsScreenWrapper() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'WrappedDetails'>>();

  const handleClose = () => {
    navigation.goBack();
  };

  return <WrappedDetailsScreen selectedYear={route.params.selectedYear} onClose={handleClose} />;
}

// Main tabs navigator with custom bottom navigation
function MainTabsNavigator({
  onLogout,
  onAddPress,
}: {
  onLogout?: () => void;
  onAddPress?: () => boolean | void;
}) {
  const [activeTab, setActiveTab] = React.useState<'home' | 'progress' | 'settings'>('home');
  const [showAddOptions, setShowAddOptions] = React.useState(false);
  const [versionCheckResult, setVersionCheckResult] = React.useState<VersionCheckResult | null>(
    null
  );
  const [showUpgradeAppModal, setShowUpgradeAppModal] = React.useState(false);
  const navigation = useNavigation<MainStackNavigationProp>();

  const handleTabPress = (tab: 'home' | 'progress' | 'settings') => {
    setActiveTab(tab);
  };

  const handleAddPress = async () => {
    // Force check app version when add button is pressed (bypasses 24-hour check)
    const result = await forceCheckAppVersion();
    setVersionCheckResult(result);

    if (result?.shouldShowModal) {
      setShowUpgradeAppModal(true);
      return; // Don't show add options if upgrade modal should be shown
    }

    // Check if there's a custom onAddPress handler (for subscription checks)
    if (onAddPress) {
      const wasHandled = onAddPress();
      // If the handler handled the press (e.g., shows payment screen), don't continue
      if (wasHandled === true) {
        return;
      }
    }

    // Default behavior: track and show add options
    track('Add analysis', { event: 'Add' });
    setShowAddOptions(true);
  };

  const handleCloseAddOptions = () => {
    setShowAddOptions(false);
  };

  const handleUploadPress = () => {
    setShowAddOptions(false);
    // Clear the library search flag when opening normally
    global.uploadFromLibrarySearch = false;
    navigation.navigate('UploadModal');
  };

  const handleRecordPress = () => {
    setShowAddOptions(false);
    navigation.navigate('RecordModal');
  };

  // Check for payment failsafe on mount
  React.useEffect(() => {
    const checkPaymentFailsafe = async () => {
      const userJustPaid = await getUserJustPaid();
      if (userJustPaid) {
        // The MainAppLayout should handle showing the welcome modal
      }
    };
    checkPaymentFailsafe();
  }, []);

  // Function to manually check app version (respects 24-hour interval)
  const checkAppVersionManually = async () => {
    try {
      const result = await checkAppVersion();
      setVersionCheckResult(result);

      if (result.shouldShowModal) {
        setShowUpgradeAppModal(true);
      }

      return result;
    } catch (error) {
      console.error('Error checking app version:', error);
      return null;
    }
  };

  // Check app version on mount
  React.useEffect(() => {
    checkAppVersionManually();
  }, []);

  // Show upgrade modal with delay when version check indicates it should be shown
  React.useEffect(() => {
    if (showUpgradeAppModal && versionCheckResult?.shouldShowModal) {
      const timer = setTimeout(() => {
        navigation.navigate('UpgradeAppModal', { versionCheckResult });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showUpgradeAppModal, versionCheckResult, navigation]);

  // Expose the add press function globally
  React.useEffect(() => {
    global.triggerAddOptions = handleAddPress;
    global.navigateToPerformance = () => handleTabPress('progress');
    global.navigateToSettings = () => handleTabPress('settings');
    global.__navigateToHomeBase = () => {
      (global as any).__lastHomeNavAt = Date.now();
      handleTabPress('home');
    };
    global.navigateToHome = global.__navigateToHomeBase;
    global.navigateToPersonalDetails = () => {
      // Navigate to personal details screen
      navigation.navigate('PersonalDetails');
    };
    global.completeTutorialAndGoHome = async () => {
      // Complete tutorial, restore user data, and navigate to home
      if (global.finishTutorialAndRestoreData) {
        await global.finishTutorialAndRestoreData();
      } else {
        // Fallback to old method if new function not available
        if (global.completeTutorial) {
          global.completeTutorial();
        }
        // Clear temporary lift data if available
        if (global.clearTemporaryLifts) {
          global.clearTemporaryLifts();
        }
      }
      // Clear the userJustPaid flag when tutorial completes
      await clearUserJustPaid();
      // Navigate to home tab
      handleTabPress('home');
    };
    global.openUploadModal = () => {
      global.uploadFromLibrarySearch = false;
      handleUploadPress();
    };
    global.closeAddOptions = () => handleCloseAddOptions();
    global.openLiftDetails = () => {
      // Navigate to the first lift in the home screen
      // This will be handled by the HomeScreen to show the first lift's details
      if (global.showFirstLiftDetails) {
        global.showFirstLiftDetails();
      }
    };
    (global as any).navigateToWrappedDetails = (year: string) => {
      navigation.navigate('WrappedDetails', { selectedYear: year });
    };
  }, []);

  const renderScreenContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreenWrapper />;
      case 'progress':
        return <PerformanceScreenWrapper />;
      case 'settings':
        return <SettingsScreenWrapper onLogout={onLogout} />;
      default:
        return <HomeScreenWrapper />;
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#e2e8f0', '#ffffff']}
        locations={[0, 0.9]}
        style={styles.container}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Global translucent status bar overlay, positioned outside SafeAreaView so it sits at the true top */}
        <TranslucentStatusBar tint="light" />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>{renderScreenContent()}</View>

          <BottomNavigationBar
            activeTab={activeTab}
            onTabPress={handleTabPress}
            onAddPress={handleAddPress}
          />
        </SafeAreaView>
      </LinearGradient>

      <AddOptions
        isVisible={showAddOptions}
        onUploadPress={handleUploadPress}
        onRecordPress={handleRecordPress}
        onClose={handleCloseAddOptions}
      />
    </>
  );
}

// Main stack navigator
export function MainAppNavigator({
  onLogout,
  onAddPress,
}: {
  onLogout?: () => void;
  onAddPress?: () => boolean | void;
}) {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={async () => {
        // Signal that navigation is ready
        eventBus.emit(AppEvents.NavReady);

        // Wait a bit for contexts to be fully loaded before handling pending navigation
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Handle any pending navigation from notifications
        if ((global as any).pendingLiftId) {
          const liftId = (global as any).pendingLiftId;
          (global as any).pendingLiftId = undefined;

          // Add a delay to ensure all contexts are fully initialized
          setTimeout(() => {
            openLiftById(liftId);
          }, 500);
        }

        if ((global as any).pendingFailedLiftNavigation) {
          const { assetId, liftId } = (global as any).pendingFailedLiftNavigation;
          (global as any).pendingFailedLiftNavigation = undefined;
          navigateToFailedLiftDate(assetId, liftId);
        }

        // Handle cold start notification if any
        await handleColdStartNotificationIfAny();
      }}
    >
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs">
          {() => <MainTabsNavigator onLogout={onLogout} onAddPress={onAddPress} />}
        </Stack.Screen>
        <Stack.Screen
          name="PersonalDetails"
          component={PersonalDetailsScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditUnits"
          component={EditUnitsScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditLanguage"
          component={EditLanguageScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditName"
          component={EditNameScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="AppIcon"
          component={AppIconScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Share"
          component={ShareScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditCurrentWeight"
          component={EditCurrentWeightScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditHeight"
          component={EditHeightScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditAge"
          component={EditAgeScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="EditGender"
          component={EditGenderScreenWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="RecordModal"
          component={RecordModalWrapper}
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="UploadModal"
          component={UploadModalWrapper}
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="UpgradeAppModal"
          component={UpgradeAppModalWrapper}
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="LiftDetails"
          component={LiftDetailsWrapper}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="HowItWorks"
          component={HowItWorksScreenWrapper}
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="FeedbackSlideshow"
          component={FeedbackSlideshowWrapper}
          options={{
            presentation: 'card',
            freezeOnBlur: true,
          }}
        />

        <Stack.Screen
          name="Library"
          component={LibraryScreenWrapperWithProps}
          options={{
            presentation: 'card',
            freezeOnBlur: true,
            animation: 'slide_from_bottom',
            animationDuration: 350,
          }}
        />
        <Stack.Screen
          name="WrappedDetails"
          component={WrappedDetailsScreenWrapper}
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
            animationDuration: 300,
          }}
        />
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
