import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { X, CircleCheck } from 'lucide-react-native';
import { hapticFeedback } from '../../../utils/haptic';
import { VersionCheckResult } from '../../../services/appVersionService';
import { track } from '../../../services/analytics';
import i18n from '../../../utils/i18n';

interface UpgradeAppModalProps {
  isVisible: boolean;
  onClose: () => void;
  versionCheckResult?: VersionCheckResult | null;
}

export function UpgradeAppModal({ isVisible, onClose, versionCheckResult }: UpgradeAppModalProps) {
  // Lottie animation ref
  const confettiRef = useRef<LottieView>(null);

  // Start confetti animation when modal becomes visible
  useEffect(() => {
    if (isVisible && confettiRef.current) {
      // Start confetti animation after a short delay
      const timer = setTimeout(() => {
        confettiRef.current?.play();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleUpdatePress = async () => {
    try {
      hapticFeedback.selection();

      // Track the update button click
      track('Update app button clicked', {
        event: 'Update App',
        forceUpdate: versionCheckResult?.forceUpdate || false,
        forceShow: versionCheckResult?.forceShow || false,
        currentVersion: versionCheckResult?.currentVersion || 'unknown',
        latestVersion: versionCheckResult?.latestVersion || 'unknown',
      });

      onClose();

      const appStoreUrl = 'https://apps.apple.com/us/app/form-ai-train-safer-now/id6749869538';
      const canOpen = await Linking.canOpenURL(appStoreUrl);

      if (canOpen) {
        await Linking.openURL(appStoreUrl);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleClosePress = () => {
    hapticFeedback.selection();
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Close Button and Title */}
        <View style={styles.topControls}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{i18n.t('welcome.modal.upgrade.title')}</Text>
          </View>
          {!versionCheckResult?.forceUpdate && (
            <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
              <X width={24} height={24} color="#000000" />
            </TouchableOpacity>
          )}
        </View>

        {/* Image Container - takes up most of the space */}
        <View style={styles.photoContainer}>
          <Image
            source={require('../../../../assets/formai-loading.png')}
            style={styles.photo}
            resizeMode="contain"
          />
        </View>

        {/* Confetti Animation - centered overlay */}
        <View style={styles.confettiContainer}>
          <LottieView
            ref={confettiRef}
            source={require('../../../../assets/animations/confetti.json')}
            style={styles.confetti}
            autoPlay={true}
            loop={false}
            speed={0.7}
            resizeMode="cover"
          />
        </View>

        {/* White background container with tips card and button */}
        <View style={styles.whiteContainer}>
          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <View style={styles.iconContainer}>
                <CircleCheck width={24} height={24} color="#000000" />
              </View>
              <Text style={styles.tipsTitle}>{i18n.t('welcome.modal.upgrade.whatsNew')}</Text>
            </View>
            <View style={styles.tipsList}>
              {versionCheckResult?.whatsNew?.map((item, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.tipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom Button */}
          <View style={styles.bottomControls}>
            <TouchableOpacity onPress={handleUpdatePress} style={styles.updateButton}>
              <Text style={styles.updateButtonText}>
                {i18n.t('welcome.modal.upgrade.updateButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  confetti: {
    width: '100%',
    height: '100%',
  },
  whiteContainer: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  tipsCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    marginRight: 10,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
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
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  updateButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
