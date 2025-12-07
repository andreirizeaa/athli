import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { hapticFeedback } from '../../../../utils/haptic';
import i18n from '../../../../utils/i18n';
import { useTutorialTarget } from '../../../../context/TutorialContext';
import { CircleCheck } from 'lucide-react-native';

interface PracticesScreenProps {
  onNext?: () => void;
  onUpload?: () => void;
  title?: string;
  buttonText?: string;
  tips?: string[];
  isLoading?: boolean; // Loading state for button
}

export function PracticesScreen({
  onNext,
  onUpload,
  title = i18n.t('add.bestRecordingPractices'),
  buttonText,
  tips = i18n.t('add.recordingTips') as string[],
  isLoading = false,
}: PracticesScreenProps) {
  const { ref: practicesCtaRef } = useTutorialTarget('upload_practices_cta');

  const handleButtonPress = () => {
    if (isLoading) return; // Don't process button press when loading
    hapticFeedback.selection();
    if (onNext) {
      onNext();
    } else if (onUpload) {
      onUpload();
    }
  };

  return (
    <>
      {/* Content */}
      <View style={styles.content}>
        {/* Spacer to push content to bottom */}
        <View style={styles.spacer} />

        {/* Recording Tip Image */}
        <View style={styles.tipImageWrapper}>
          {/* Checkmark Icon */}
          <View style={styles.simpleIconContainer}>
            <CircleCheck width={48} height={48} color="#000000" />
          </View>
          <View style={styles.tipImageContainer}>
            <Image
              source={require('../../../../../assets/recording-tip.png')}
              style={styles.tipImage}
              contentFit="contain"
            />
          </View>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard} ref={practicesCtaRef}>
          <Text style={styles.tipsTitle}>{i18n.t('add.generalTips')}</Text>
          <View style={styles.tipsList}>
            {(tips || []).map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Button */}
      {buttonText && (
        <View style={styles.bottomControls}>
          <View style={styles.buttonStack}>
            <TouchableOpacity
              style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
              onPress={handleButtonPress}
              disabled={isLoading}
              activeOpacity={isLoading ? 1 : 0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>{buttonText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  tipImageWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  simpleIconContainer: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    zIndex: 10,
  },
  tipImageContainer: {
    width: '70%',
    height: 330,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  tipsCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  tipsList: {
    //
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bottomControls: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  buttonStack: {
    width: '100%',
  },
  nextButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
});
