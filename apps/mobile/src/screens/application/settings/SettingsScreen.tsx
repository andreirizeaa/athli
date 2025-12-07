import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as DynamicAppIcon from 'expo-dynamic-app-icon';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { usePlacement } from 'expo-superwall';
import {
  BellRing,
  FileText,
  FileVideoCamera,
  IdCard,
  Languages,
  LogOut,
  MailPlus,
  Megaphone,
  Pencil,
  RefreshCw,
  Ruler,
  School2,
  ShieldCheck,
  Star,
  User,
  UserMinus,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLiftData } from '../../../context/LiftDataContext';
import { useLoadingLifts } from '../../../context/LoadingLiftsContext';
import { usePurchases } from '../../../context/PurchasesContext';
import { useTutorial, useTutorialTarget } from '../../../context/TutorialContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { supabase } from '../../../lib/supabase';
import { showAlert } from '../../../services/alertService';
import { track } from '../../../services/analytics';
import { deleteUserAccount } from '../../../services/authService';
import { clearUserSpecificData } from '../../../services/contextCleanupService';
import { openSupportEmail } from '../../../services/emailService';
import { getUserId, removeUserId } from '../../../services/storageService';
import { getFormattedLastSyncTime, performManualSync } from '../../../services/syncService';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { openAppSettings } from '../../../utils/openAppSettings';
import { DeleteAccountModal } from './DeleteAccountModal';
import { LogoutModal } from './LogoutModal';

interface SettingsScreenProps {
  onPersonalDetailsPress: () => void;
  onUnitsPress: () => void;
  onLanguagePress: () => void;
  onSharePress: () => void;
  onLogout?: () => void;
  onEditNamePress?: () => void;
  onAppIconPress?: () => void;
}

interface SettingsOptionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  ref?: any;
  isLoading?: boolean;
}

function SettingsOption({ icon, title, subtitle, onPress, ref, isLoading }: SettingsOptionProps) {
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.optionRow}
      onPress={() => {
        if (!isLoading) {
          hapticFeedback.selection();
          onPress?.();
        }
      }}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : (
          <>
            <Text style={styles.optionTitle}>{title}</Text>
            {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen({
  onPersonalDetailsPress,
  onUnitsPress,
  onLanguagePress,
  onSharePress,
  onLogout,
  onEditNamePress,
  onAppIconPress,
}: SettingsScreenProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { hasSubscription, hasHdVideos } = usePurchases();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplayingTutorial, setIsReplayingTutorial] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [currentAppIcon, setCurrentAppIcon] = useState<string>('default');
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);

  // App icon mapping
  const APP_ICONS = {
    'default': require('../../../../assets/appIcons/formai-ios-icon.png'),
    'black': require('../../../../assets/appIcons/form-ai-icon-black.png'),
    'blue': require('../../../../assets/appIcons/form-ai-icon-blue.png'),
    'green': require('../../../../assets/appIcons/form-ai-icon-green.png'),
    'orange': require('../../../../assets/appIcons/form-ai-icon-orange.png'),
    'pink': require('../../../../assets/appIcons/form-ai-icon-pink.png'),
    'purple': require('../../../../assets/appIcons/form-ai-icon-purple.png'),
    'red': require('../../../../assets/appIcons/form-ai-icon-red.png'),
    'yellow': require('../../../../assets/appIcons/form-ai-icon-yellow.png'),
    'gradient-1': require('../../../../assets/appIcons/form-ai-icon-gradient-1.png'),
    'gradient-2': require('../../../../assets/appIcons/form-ai-icon-gradient-2.png'),
    'gradient-3': require('../../../../assets/appIcons/form-ai-icon-gradient-3.png'),
    'gradient-4': require('../../../../assets/appIcons/form-ai-icon-gradient-4.png'),
    'gradient-5': require('../../../../assets/appIcons/form-ai-icon-gradient-5.png'),
    'gradient-6': require('../../../../assets/appIcons/form-ai-icon-gradient-6.png'),
    'gradient-7': require('../../../../assets/appIcons/form-ai-icon-gradient-7.png'),
    'gradient-8': require('../../../../assets/appIcons/form-ai-icon-gradient-8.png'),
    'gradient-9': require('../../../../assets/appIcons/form-ai-icon-gradient-9.png'),
    'gradient-10': require('../../../../assets/appIcons/form-ai-icon-gradient-10.png'),
  };
  const iconSize = 26;
  const iconColor = '#000000';
  const queryClient = useQueryClient();
  const { addLift, formatDateForLift } = useLiftData();
  const { purgeAllLoadingLifts } = useLoadingLifts();
  const { userDetails } = useUserDetails();

  // Helper function to format user since date
  const getUserSinceText = () => {
    if (!userDetails?.createdAt) return '';
    try {
      const date = new Date(userDetails.createdAt);
      const year = date.getFullYear();
      return i18n.t('settings.userSince', { year });
    } catch (error) {
      return '';
    }
  };

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Settings' });
  }, []);
  const openEditName = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Edit name' });
    onEditNamePress?.();
  };

  const handleAppIconPress = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'App Icon' });
    onAppIconPress?.();
  };

  // Reset loading states on mount to prevent lingering indicators
  useEffect(() => {
    setIsLoggingOut(false);
    setIsDeleting(false);
    setIsReplayingTutorial(false);
    setIsSyncing(false);
  }, []);

  // Load last sync time on mount
  useEffect(() => {
    const loadLastSyncTime = async () => {
      try {
        const syncTime = await getFormattedLastSyncTime();
        setLastSyncTime(syncTime);
      } catch (error) {
        console.warn('Failed to load last sync time:', error);
      }
    };
    loadLastSyncTime();
  }, []);

  // Load current app icon on mount
  useEffect(() => {
    const loadCurrentAppIcon = async () => {
      try {
        const icon = await DynamicAppIcon.getAppIcon();
        setCurrentAppIcon(icon || 'default');
      } catch (error) {
        console.warn('Error loading current app icon:', error);
        setCurrentAppIcon('default');
      }
    };
    loadCurrentAppIcon();
  }, []);

  // Check notification permission status
  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setHasNotificationPermission(status === 'granted');
    } catch (error) {
      console.warn('Error checking notification permission:', error);
      setHasNotificationPermission(false);
    }
  };

  // Load notification permission status on mount
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  // Refresh app icon and notification permission when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          const icon = await DynamicAppIcon.getAppIcon();
          setCurrentAppIcon(icon || 'default');
        } catch (error) {
          console.warn('Error refreshing app icon:', error);
        }

        // Also refresh notification permission status
        await checkNotificationPermission();
      };
      refreshData();
    }, [])
  );

  // Reset modal states when component unmounts or navigation occurs
  useEffect(() => {
    return () => {
      setShowLogoutModal(false);
      setShowDeleteModal(false);
      setIsLoggingOut(false); // Also reset logout loading state
    };
  }, []);

  // Tutorial target registration
  const { ref: settingsFirstCardRef } = useTutorialTarget('settings_first_card');
  const { ref: settingsSupportEmailRef } = useTutorialTarget('settings_support_email');

  // Tutorial context
  const { start: startTutorial } = useTutorial();

  // Superwall placement
  const { registerPlacement } = usePlacement();

  const handleDeleteAccountPress = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Delete account' });
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return; // prevent closing while deleting
    setShowDeleteModal(false);
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      hapticFeedback.selection();
      setIsDeleting(true);
      const userId = await getUserId();
      if (!userId) {
        setIsDeleting(false);
        hapticFeedback.error();
        return;
      }

      // Delete user account from database
      const res = await deleteUserAccount(userId);
      if (!res?.success) throw new Error(res?.message || 'Delete failed');

      // Clear all user data from contexts and React Query cache
      await clearUserSpecificData(queryClient, userId);

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Remove user ID from storage (redundant but safe)
      await removeUserId();

      setShowDeleteModal(false);
      if (onLogout) onLogout();
    } catch (e: any) {
      showAlert('Delete failed', 'Please try again later', () => {
        hapticFeedback.selection();
        handleCloseDeleteModal();
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogoutPress = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Log out' });
    setShowLogoutModal(true);
  };

  const handleCloseLogoutModal = () => {
    setShowLogoutModal(false);
  };

  const handleConfirmLogout = () => {
    // Close modal immediately and trigger logout right away
    setShowLogoutModal(false);
    setIsLoggingOut(false);
    onLogout?.();
  };

  const handleUnitsPress = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Units' });
    onUnitsPress();
  };

  const handlePersonalDetailsPress = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Personal details' });
    onPersonalDetailsPress();
  };

  const handleLanguagePress = () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Language' });
    onLanguagePress();
  };

  const handleSupportEmailPress = async () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Support' });
    await openSupportEmail();
  };

  const handleFeatureRequestsPress = async () => {
    hapticFeedback.selection();
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Feature requests' });
    // Small delay to ensure haptic feedback is felt before opening browser
    setTimeout(async () => {
      try {
        await Linking.openURL('https://form-ai.canny.io/feature-requests');
      } catch (error) {
        showAlert('Error', 'Unable to open feature requests. Please try again later.');
      }
    }, 100);
  };

  const handleSyncDataPress = async () => {
    hapticFeedback.selection();

    // Check subscription status before allowing sync
    if (!hasSubscription) {
      // Track settings screen clicks
      track('Settings screen clicks', { event: 'Sync Data - No Subscription' });
      // Track paywall shown
      track('Sync paywall shown', { source: 'settings' });

      try {
        await registerPlacement({
          placement: 'sync_trigger',
        });

        // Track paywall completion
        track('Sync paywall complete', { source: 'settings' });
      } catch (error) {
        showAlert(
          'Error',
          'Unable to access premium features. Please try again.',
          undefined,
          'SETTINGS_SYNC_PAYWALL_ERROR',
          error
        );
      }
      return;
    }

    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Sync Data' });

    try {
      setIsSyncing(true);

      await performManualSync();

      // Update last sync time after successful sync
      const syncTime = await getFormattedLastSyncTime();
      setLastSyncTime(syncTime);

      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.error();
      showAlert('Sync Failed', 'Unable to sync data. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePrivacyPolicyPress = async () => {
    hapticFeedback.selection();
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Privacy' });
    // Small delay to ensure haptic feedback is felt before opening browser
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/privacy');
      } catch (error) {
        showAlert('Error', 'Unable to open privacy policy. Please try again later.');
      }
    }, 100);
  };

  const handleTermsOfServicePress = async () => {
    hapticFeedback.selection();
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Terms' });
    // Small delay to ensure haptic feedback is felt before opening browser
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/tos');
      } catch (error) {
        showAlert('Error', 'Unable to open terms of use. Please try again later.');
      }
    }, 100);
  };

  const handleShowTutorialPress = async () => {
    hapticFeedback.selection();
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Replay tutorial' });
    // Track tutorial replay
    track('Tutorials', { data: 'replay' });
    setIsReplayingTutorial(true);

    try {
      // Immediately start the cleanup process in the background (WITHOUT navigation)
      const cleanupPromise = (async () => {
        try {
          // Clear tutorial lifts if they exist
          if (global.clearTemporaryLifts) {
            global.clearTemporaryLifts();
          }

          // Save current lift data to storage and clear lift data for tutorial
          if (global.saveLiftDataToStorage) {
            await global.saveLiftDataToStorage();
          }

          if (global.clearLiftDataForTutorial) {
            global.clearLiftDataForTutorial();
          }
        } catch (error) {}
      })();

      // Wait for 2 seconds while cleanup happens in background
      await Promise.all([cleanupPromise, new Promise((resolve) => setTimeout(resolve, 1500))]);

      hapticFeedback.success();

      // After 2 seconds, navigate to home screen and start tutorial
      try {
        // Navigate to home screen
        if ((global as any).navigateToHome) {
          (global as any).navigateToHome();
        }

        // Small delay to ensure navigation completes before starting tutorial
        setTimeout(async () => {
          try {
            await startTutorial();
          } catch (error) {
          } finally {
            setIsReplayingTutorial(false);
          }
        }, 300);
      } catch (error) {
        setIsReplayingTutorial(false);
      }
    } catch (error) {
      setIsReplayingTutorial(false);
    }
  };

  const handleLeaveRatingPress = async () => {
    hapticFeedback.selection();
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Rating' });
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        // Fallback: open app store page
        const appStoreUrl = 'https://apps.apple.com/us/app/form-ai-train-safer-now/id6749869538';
        const canOpen = await Linking.canOpenURL(appStoreUrl);

        if (canOpen) {
          await Linking.openURL(appStoreUrl);
        } else {
          showAlert(
            'Error',
            'Unable to open the app store. Please try again later.',
            undefined,
            'SETTINGS_APP_STORE_ERROR',
            new Error('Cannot open App Store URL')
          );
        }
      }
    } catch (error) {
      showAlert(
        'Error',
        'Unable to open the app store. Please try again later.',
        undefined,
        'SETTINGS_APP_STORE_ERROR',
        error
      );
    }
  };

  const handleTurnOnNotificationsPress = async () => {
    // Track settings screen clicks
    track('Settings screen clicks', { event: 'Turn on Notifications' });

    try {
      await openAppSettings();
    } catch (error) {
      showAlert(
        'Error',
        'Unable to open app settings. Please try again later.',
        undefined,
        'SETTINGS_NOTIFICATIONS_ERROR',
        error
      );
    }
  };

  const handleHdVideoPress = async () => {
    try {
      // Track settings screen clicks
      track('Settings screen clicks', { event: 'Video quality' });
      // Track paywall shown
      track('Low quality paywall shown', { source: 'settings' });

      await registerPlacement({
        placement: 'hd_video_trigger',
      });

      // Track paywall completion
      track('Low quality paywall complete', { source: 'settings' });
    } catch (error) {
      showAlert(
        'Error',
        'Unable to access premium features. Please try again.',
        undefined,
        'SETTINGS_PREMIUM_FEATURES_ERROR',
        error
      );
    }
  };

  const handleAddTestLift = () => {
    hapticFeedback.selection();

    // Random movement selection
    const movements = [
      'Barbell Front Squat',
      'Deadlift',
      'Bench Press',
      'Overhead Press',
      'Romanian Deadlift',
      'Goblet Squat',
      'Push-ups',
      'Pull-ups',
      'Lunges',
      'Planks',
      'Bent Over Rows',
      'Shoulder Press',
      'Bicep Curls',
      'Tricep Dips',
      'Leg Press',
    ];

    // Add 1000 test lifts
    for (let i = 0; i < 1000; i++) {
      const randomMovement = movements[Math.floor(Math.random() * movements.length)];

      // Generate random date from 2 years ago to today
      const today = new Date();
      const randomDaysAgo = Math.floor(Math.random() * 730); // 2 years = 730 days
      const randomDate = new Date(today);
      randomDate.setDate(today.getDate() - randomDaysAgo);

      // Calculate accuracy based on date: older dates (2 years ago) = 40%, recent dates (today) = 80%
      // This creates a linear progression from 40% to 80% over 2 years
      const dateProgress = randomDaysAgo / 730; // 0 = today, 1 = 2 years ago
      const baseAccuracy = 80 - dateProgress * 40; // 80% for today, 40% for 2 years ago

      // Add significant variation to create realistic ups and downs
      // Some days will be much better or worse than the trend
      const variation = (Math.random() - 0.5) * 20; // ±10% variation
      const randomAccuracy = Math.floor(baseAccuracy + variation);
      const clampedAccuracy = Math.max(30, Math.min(90, randomAccuracy)); // Clamp between 30-90%

      // Random reps between 1-12
      const randomReps = Math.floor(Math.random() * 12) + 1;

      // Random weight between 1-500
      const randomWeight = Math.floor(Math.random() * 500) + 1;

      // Generate line graph values that follow the same improvement pattern with variation
      const lineGraphBaseAccuracy = baseAccuracy;
      const randomLineGraphValues = Array.from({ length: randomReps }, () => {
        const variation = (Math.random() - 0.5) * 15; // ±7.5% variation
        return Math.max(25, Math.min(95, Math.floor(lineGraphBaseAccuracy + variation)));
      });

      // Random time between 8 AM and 10 PM
      const randomHour = Math.floor(Math.random() * 14) + 8;
      const randomMinute = Math.floor(Math.random() * 60);
      const randomTime = `${randomHour > 12 ? randomHour - 12 : randomHour}:${randomMinute.toString().padStart(2, '0')} ${randomHour >= 12 ? 'PM' : 'AM'}`;

      const id = `demo-${today.getTime()}-${i}-${Math.random().toString(36).substr(2, 9)}`;

      addLift({
        id,
        isFavourite: Math.random() > 0.7, // 30% chance of being favourite
        liftType: randomMovement,
        liftDate: formatDateForLift(randomDate),
        liftTime: randomTime,
        metricWeight: randomWeight,
        reps: randomReps,
        rawVideoURL: require('../../../../assets/tutorial/formai-example-video.mp4'),
        poseVideoURL: require('../../../../assets/tutorial/formai-example-pose.mp4'),
        thumbnailURL: require('../../../../assets/tutorial/formai-example-video-thumbnail.jpg'),
        analysis: {
          accuracy: clampedAccuracy,
          lineGraphValues: randomLineGraphValues,
          barChartValues: randomLineGraphValues,
          feedback: [
            {
              imageURL: require('../../../../assets/tutorial/formai-example-feedback.png'),
              flaws: [
                'Right knee is caving inward compared to the left, showing knee valgus.',
                'Right ankle angle suggests the heel may be lifting more than the left.',
                'Torso is leaning forward excessively, which stresses the lower back.',
                'Barbell path is slightly forward of mid-foot, reducing lifting efficiency.',
                'Hip angle indicates possible butt wink or pelvic tuck at the bottom.',
              ],
              improvement: [
                "Actively push knees out and think 'spread the floor' with your feet to prevent valgus.",
                'Improve ankle dorsiflexion with stretches and banded mobilizations to keep heels grounded.',
                'Brace your core harder using the Valsalva maneuver to maintain an upright torso.',
                'Keep the bar over mid-foot and adjust grip width to tighten the upper back.',
                'Strengthen glutes and hamstrings with RDLs, hip thrusts, and pause squats to control hip position.',
                'Consider weightlifting shoes with a heel lift if ankle mobility limits squat depth.',
              ],
            },
          ],
        },
      });
    }
  };

  const handlePruneLifts = () => {
    hapticFeedback.selection();

    // Purge all loading lifts from memory and AsyncStorage
    purgeAllLoadingLifts();
  };

  const handleAddTodayTestLifts = () => {
    hapticFeedback.selection();

    const today = new Date();
    const currentTime = new Date();
    const timeString = `${currentTime.getHours() > 12 ? currentTime.getHours() - 12 : currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, '0')} ${currentTime.getHours() >= 12 ? 'PM' : 'AM'}`;

    // Add Barbell Front Squat
    const frontSquatId = `demo-front-squat-${today.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
    addLift({
      id: frontSquatId,
      isFavourite: false,
      liftType: 'Barbell Front Squat',
      liftDate: formatDateForLift(today),
      liftTime: timeString,
      metricWeight: 65,
      reps: 5,
      rawVideoURL: require('../../../../assets/tutorial/formai-example-video.mp4'),
      poseVideoURL: require('../../../../assets/tutorial/formai-example-pose.mp4'),
      thumbnailURL: require('../../../../assets/tutorial/formai-example-video-thumbnail.jpg'),
      analysis: {
        accuracy: 50,
        lineGraphValues: [70, 72, 74, 71, 73],
        barChartValues: [70, 72, 74, 71, 73],
        feedback: [
          {
            imageURL: require('../../../../assets/tutorial/formai-example-feedback.png'),
            flaws: [
              'Slight forward lean in the bottom position',
              'Knees tracking slightly inward on descent',
            ],
            improvement: [
              'Focus on keeping chest up and core braced',
              'Push knees out and track over toes',
              'Work on ankle mobility to improve depth',
              'Practice front rack position with lighter weights',
              'Strengthen upper back to maintain upright torso',
              'Use tempo squats to improve control and positioning',
            ],
          },
        ],
      },
    });

    // Add Barbell Back Squat
    const backSquatId = `demo-back-squat-${today.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
    addLift({
      id: backSquatId,
      isFavourite: false,
      liftType: 'Barbell Back Squat',
      liftDate: formatDateForLift(today),
      liftTime: timeString,
      metricWeight: 40,
      reps: 8,
      rawVideoURL: require('../../../../assets/tutorial/formai-example-video.mp4'),
      poseVideoURL: require('../../../../assets/tutorial/formai-example-pose.mp4'),
      thumbnailURL: require('../../../../assets/tutorial/thumbnail.jpeg'),
      analysis: {
        accuracy: 90,
        lineGraphValues: [80, 82, 84, 81, 83, 80, 82, 84],
        barChartValues: [80, 82, 84, 81, 83, 80, 82, 84],
        feedback: [
          {
            imageURL: require('../../../../assets/tutorial/formai-example-feedback.png'),
            flaws: ['Hip drive could be more explosive', 'Depth slightly inconsistent across reps'],
            improvement: [
              'Focus on driving hips up and forward out of the hole',
              'Aim for consistent depth on each rep',
            ],
          },
        ],
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <Text style={styles.title}>{i18n.t('tabs.settings')}!</Text>

          {/* Profile Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.profileRow}
              onPress={() => {
                hapticFeedback.selection();
                openEditName();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.profileAvatar}>
                {userDetails?.profilePicture ? (
                  <Image
                    source={{ uri: userDetails.profilePicture }}
                    style={styles.profileImage as any}
                    contentFit="cover"
                  />
                ) : userDetails?.fullName ? (
                  <View style={styles.fallbackAvatar}>
                    <Text style={styles.fallbackAvatarText}>
                      {userDetails.fullName.trim().split(' ')[0].charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.fallbackAvatar}>
                    <User size={24} color="#ffffff" />
                  </View>
                )}
              </View>
              <View style={styles.profileTextContainer}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileNameText} numberOfLines={1}>
                    {userDetails?.fullName || i18n.t('settings.enterName')}
                  </Text>
                  {!userDetails?.fullName && <Pencil size={16} color="#8E8E93" />}
                </View>
                {getUserSinceText() && (
                  <Text style={styles.profileSubtitleText} numberOfLines={1}>
                    {getUserSinceText()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <Text style={styles.sectionTitle}>{i18n.t('settings.cardAccount')}</Text>
          <View style={styles.card} ref={settingsFirstCardRef}>
            <SettingsOption
              icon={<IdCard size={iconSize} color={iconColor} />}
              title={i18n.t('settings.personalDetails')}
              onPress={handlePersonalDetailsPress}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Languages size={iconSize} color={iconColor} />}
              title={i18n.t('settings.language')}
              onPress={handleLanguagePress}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Ruler size={iconSize} color={iconColor} />}
              title={i18n.t('settings.units')}
              onPress={handleUnitsPress}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={
                <Image
                  source={APP_ICONS[currentAppIcon as keyof typeof APP_ICONS]}
                  style={{ width: 36, height: 36, borderRadius: 23 * 0.4453125 }}
                />
              }
              title={i18n.t('settings.appIcon')}
              onPress={handleAppIconPress}
            />
            {/* <View style={styles.separator} /> */}
            {/* <SettingsOption
            icon={<AppearanceIcon width={iconSize} height={iconSize} color={iconColor} />}
            title={i18n.t('settings.appTheme')}
            onPress={() => {}}
          /> */}
          </View>

          {/* Second Card - Video Quality (only show if user doesn't have HD videos) */}
          {!hasHdVideos && (
            <View style={styles.card}>
              <SettingsOption
                icon={<FileVideoCamera size={iconSize} color={iconColor} />}
                title={i18n.t('settings.whyLowQualityVideos')}
                onPress={handleHdVideoPress}
              />
            </View>
          )}

          {/* Third Card */}
          {/* <View style={styles.card}>
          <MemoizedReferFriendOption
            icon={<ReferFriendIcon width={iconSize} height={iconSize} color={iconColor} />}
            title={i18n.t('settings.referFriends')}
            onPress={handleReferFriendPress}
            onSharePress={handleSharePress}
          />
        </View> */}

          {/* Support */}
          <Text style={styles.sectionTitle}>{i18n.t('settings.cardSupport')}</Text>
          <View style={styles.card}>
            <SettingsOption
              ref={settingsSupportEmailRef}
              icon={<MailPlus size={iconSize} color={iconColor} />}
              title={i18n.t('settings.supportEmail')}
              onPress={handleSupportEmailPress}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Megaphone size={iconSize} color={iconColor} />}
              title={i18n.t('settings.featureRequests')}
              onPress={handleFeatureRequestsPress}
            />
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (!isSyncing) {
                  hapticFeedback.selection();
                  handleSyncDataPress();
                }
              }}
              activeOpacity={0.7}
              disabled={isSyncing}
            >
              <View style={styles.iconContainer}>
                <RefreshCw size={iconSize} color={iconColor} />
              </View>
              <View style={styles.textContainer}>
                {isSyncing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#000000" />
                  </View>
                ) : (
                  <>
                    <Text style={styles.optionTitle}>{i18n.t('settings.syncData')}</Text>
                    <Text style={styles.optionSubtitle}>
                      {lastSyncTime
                        ? i18n.t('settings.lastSynced', { time: lastSyncTime })
                        : i18n.t('settings.lastSynced', { time: 'Never' })}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.separator} />
            <SettingsOption
              icon={<School2 size={iconSize} color={iconColor} />}
              title={i18n.t('settings.replayTutorial')}
              onPress={handleShowTutorialPress}
              isLoading={isReplayingTutorial}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Star size={iconSize} color={iconColor} />}
              title={i18n.t('settings.leaveRating')}
              onPress={handleLeaveRatingPress}
            />
            {/* Only show notifications option if user hasn't granted permission */}
            {!hasNotificationPermission && (
              <>
                <View style={styles.separator} />
                <SettingsOption
                  icon={<BellRing size={iconSize} color={iconColor} />}
                  title={i18n.t('settings.turnOnNotifications')}
                  onPress={handleTurnOnNotificationsPress}
                />
              </>
            )}
          </View>

          {/* Legal */}
          <Text style={styles.sectionTitle}>{i18n.t('settings.cardLegal')}</Text>
          <View style={styles.card}>
            <SettingsOption
              icon={<FileText size={iconSize} color={iconColor} />}
              title={i18n.t('settings.termsAndConditions')}
              onPress={handleTermsOfServicePress}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<ShieldCheck size={iconSize} color={iconColor} />}
              title={i18n.t('settings.privacyPolicy')}
              onPress={handlePrivacyPolicyPress}
            />
          </View>

          {/* Account Actions */}
          <Text style={styles.sectionTitle}>{i18n.t('settings.cardAccountActions')}</Text>
          <View style={styles.card}>
            <SettingsOption
              icon={<LogOut size={iconSize} color={iconColor} />}
              title={i18n.t('settings.logout')}
              onPress={handleLogoutPress}
              isLoading={isLoggingOut}
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<UserMinus size={iconSize} color={iconColor} />}
              title={i18n.t('settings.deleteAccount')}
              onPress={handleDeleteAccountPress}
            />
          </View>

          {/* Development Test Buttons - Only visible in development */}
          {__DEV__ && (
            <View style={styles.card}>
              <Text style={styles.devSectionTitle}>Development Tools</Text>
              <TouchableOpacity
                style={styles.devButton}
                onPress={handleAddTestLift}
                activeOpacity={0.7}
              >
                <Text style={styles.devButtonText}>Add 1000 Test Lifts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devButton, styles.devButtonSecondary]}
                onPress={handlePruneLifts}
                activeOpacity={0.7}
              >
                <Text style={[styles.devButtonText, styles.devButtonTextSecondary]}>
                  Prune Loading Lifts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devButton, styles.devButtonTertiary]}
                onPress={handleAddTodayTestLifts}
                activeOpacity={0.7}
              >
                <Text style={[styles.devButtonText, styles.devButtonTextTertiary]}>
                  Add Today's Test Lifts
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delete Account Modal */}
        <DeleteAccountModal
          isVisible={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDeleteAccount}
        />

        {/* Logout Modal */}
        <LogoutModal
          isVisible={showLogoutModal}
          onClose={handleCloseLogoutModal}
          onConfirm={handleConfirmLogout}
        />

        {/* Personal Details Screen */}
        {/* This component is now rendered by the parent based on the onPersonalDetailsPress prop */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    marginBottom: -30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  rightTextContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    backgroundColor: '#ffb86a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileNameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileSubtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  optionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  rightSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  nestedCard: {
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nestedCardImage: {
    borderRadius: 12,
    top: -20,
  },
  opacityLayer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  nestedCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 4,
    textAlign: 'left',
  },
  nestedCardSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 4,
    textAlign: 'left',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 8,
    textAlign: 'left',
  },
  shareButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    width: '100%',
  },
  shareButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  // Development button styles
  devSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 16,
    textAlign: 'center',
  },
  devButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonSecondary: {
    backgroundColor: '#FF3B30',
  },
  devButtonTertiary: {
    backgroundColor: '#34C759',
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  devButtonTextSecondary: {
    color: '#FFFFFF',
  },
  devButtonTextTertiary: {
    color: '#FFFFFF',
  },
});
