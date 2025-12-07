import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { usePurchases } from '../../../context/PurchasesContext';
import { usePlacement } from 'expo-superwall';
import { Pencil, ChevronLeft } from 'lucide-react-native';
import { track } from '../../../services/analytics';
import { showAlert } from '../../../services/alertService';

interface PersonalDetailsScreenProps {
  onBack: () => void;
  onEditCurrentWeight: (currentValue: string) => void;
  onEditHeight: (currentValue: string) => void;
  onEditAgeRange: (currentValue: string) => void;
  onEditGender: (currentValue: string) => void;
}

interface PersonalDetailOptionProps {
  title: string;
  value: string;
  onPress?: () => void;
}

function PersonalDetailOption({ title, value, onPress }: PersonalDetailOptionProps) {
  return (
    <TouchableOpacity
      style={styles.optionRow}
      onPress={() => {
        hapticFeedback.selection();
        onPress?.();
      }}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.textContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionValue}>{value}</Text>
      </View>
      {onPress && (
        <View style={styles.iconContainer}>
          <Pencil width={20} height={20} color="#8E8E93" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// Function to translate personal data values based on current language
function translatePersonalDataValue(key: string, value: string): string {
  switch (key) {
    case 'currentWeight':
      // Extract number and unit from weight value
      const weightMatch = value.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/);
      if (weightMatch) {
        const [, number, unit] = weightMatch;
        const translatedUnit =
          unit === 'kg'
            ? i18n.t('onboarding.measurements.kg')
            : i18n.t('onboarding.measurements.lbs');
        return `${number} ${translatedUnit}`;
      }
      return value;

    case 'height':
      // Handle both metric and imperial height formats
      if (value.includes('cm')) {
        const heightMatch = value.match(/(\d+)\s*cm/);
        if (heightMatch) {
          const [, number] = heightMatch;
          return `${number} ${i18n.t('onboarding.measurements.cm')}`;
        }
      } else if (value.includes("'") && value.includes('"')) {
        // Keep feet/inches format as is since it's universal
        return value;
      }
      return value;

    case 'ageRange':
      // Age range is already in the correct format (e.g., "18-24")
      return value;

    case 'gender':
      // Translate gender values
      const genderTranslations = {
        'male': i18n.t('personalDetails.male'),
        'female': i18n.t('personalDetails.female'),
      };
      return genderTranslations[value as keyof typeof genderTranslations] || value;

    default:
      return value;
  }
}

export function PersonalDetailsScreen({
  onBack,
  onEditCurrentWeight,
  onEditHeight,
  onEditAgeRange,
  onEditGender,
}: PersonalDetailsScreenProps) {
  const { userDetails, getWeightDisplay, getHeightDisplay, getAgeRangeDisplay } = useUserDetails();
  const { hasHdVideos } = usePurchases();
  const { registerPlacement } = usePlacement();

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Personal Details' });
  }, []);

  const videoQuality = hasHdVideos
    ? i18n.t('personalDetails.highDefinition')
    : i18n.t('personalDetails.low');

  const handleEditCurrentWeight = () => {
    onEditCurrentWeight(getWeightDisplay());
  };

  const handleEditHeight = () => {
    onEditHeight(getHeightDisplay());
  };

  const handleEditAgeRange = () => {
    onEditAgeRange(getAgeRangeDisplay());
  };

  const handleEditGender = () => {
    onEditGender(userDetails?.gender ?? '');
  };

  const handleHdVideoPress = async () => {
    hapticFeedback.selection();
    try {
      // Track paywall shown
      track('Low quality paywall shown', { source: 'personal_details' });

      await registerPlacement({
        placement: 'hd_video_trigger',
      });

      // Track paywall completion
      track('Low quality paywall complete', { source: 'personal_details' });
    } catch (error) {
      showAlert(
        'Error',
        'Unable to access premium features. Please try again.',
        undefined,
        'PERSONAL_DETAILS_PREMIUM_FEATURES_ERROR',
        error
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback.selection();
            onBack();
          }}
        >
          <ChevronLeft width={24} height={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.personalDetails')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.scrollableContent}>
          {/* Personal Details Card */}
          <View style={styles.card}>
            <PersonalDetailOption
              title={i18n.t('personalDetails.currentWeight')}
              value={translatePersonalDataValue('currentWeight', getWeightDisplay())}
              onPress={handleEditCurrentWeight}
            />
            <View style={styles.separator} />
            <PersonalDetailOption
              title={i18n.t('personalDetails.height')}
              value={translatePersonalDataValue('height', getHeightDisplay())}
              onPress={handleEditHeight}
            />
            <View style={styles.separator} />
            <PersonalDetailOption
              title={i18n.t('personalDetails.age')}
              value={translatePersonalDataValue('ageRange', getAgeRangeDisplay())}
              onPress={handleEditAgeRange}
            />
            <View style={styles.separator} />
            <PersonalDetailOption
              title={i18n.t('personalDetails.gender')}
              value={translatePersonalDataValue('gender', userDetails?.gender ?? '')}
              onPress={handleEditGender}
            />
          </View>

          {/* Video Quality Card */}
          <View style={[styles.card, styles.videoQualityCard]}>
            <PersonalDetailOption
              title={i18n.t('personalDetails.videoQuality')}
              value={videoQuality}
              onPress={
                !hasHdVideos
                  ? () => {
                      handleHdVideoPress();
                    }
                  : undefined
              }
            />
          </View>
        </View>

        {/* Version Text - Fixed at bottom */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version {Constants.expoConfig?.version}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scrollableContent: {
    flex: 1,
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
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  optionValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  videoQualityCard: {
    paddingVertical: 16,
  },
  versionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '400',
  },
});
