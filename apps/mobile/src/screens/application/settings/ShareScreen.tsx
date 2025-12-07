import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Share, Platform } from 'react-native';
import { showAlert } from '../../../services/alertService';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { ChevronLeftIcon, CircleCheck, Copy } from 'lucide-react-native';

interface ShareScreenProps {
  onBack: () => void;
}

export function ShareScreen({ onBack }: ShareScreenProps) {
  const promoCode = 'NGACRP';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyPromoCode = async () => {
    try {
      hapticFeedback.success();
      await Clipboard.setString(promoCode);
      showAlert(i18n.t('share.copied'), i18n.t('share.promoCodeCopied'));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset copied state after 2 seconds
    } catch (error) {
      showAlert(
        'Error',
        'Failed to copy to clipboard. Please try again.',
        undefined,
        'SHARE_FAILED_TO_COPY_CLIPBOARD',
        error
      );
    }
  };

  const handleShare = async () => {
    try {
      hapticFeedback.selection();
      const shareMessage = `${i18n.t('share.shareMessage')} ${promoCode}\n`;

      await Share.share({
        message: shareMessage,
        title: i18n.t('share.shareTitle'),
      });
    } catch (error) {
      showAlert(
        'Error',
        'Failed to share. Please try again.',
        undefined,
        'SHARE_FAILED_TO_SHARE',
        error
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback.selection();
            onBack();
          }}
        >
          <ChevronLeftIcon width={24} height={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('share.referYourFriends')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.imageCard}>
          <Image
            source={require('../../../../assets/refer-friends-group.png')}
            style={styles.referImage}
          />
        </View>
        <Text style={styles.contentTitle}>{i18n.t('share.empowerYourFriends')}</Text>

        {/* Promo Code Section */}
        <View style={styles.promoCodeContainer}>
          <View style={styles.promoCodeRow}>
            <View style={styles.promoCodeContent}>
              <Text style={styles.promoCodeLabel}>{i18n.t('share.yourPersonalPromoCode')}</Text>
              <Text style={styles.promoCode}>{promoCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyPromoCode}>
              {isCopied ? (
                <CircleCheck width={28} height={28} color="#000000" />
              ) : (
                <Copy width={28} height={28} color="#000000" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareButtonText}>{i18n.t('share.share')}</Text>
        </TouchableOpacity>

        {/* How it works card */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>{i18n.t('share.howItWorks')}</Text>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>{i18n.t('share.step1')}</Text>
          </View>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>{i18n.t('share.step2')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60, // Account for status bar
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
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholder: {
    width: 44,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 0,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'left',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 24,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 32,
    lineHeight: 22,
    textAlign: 'center',
  },
  promoCodeContainer: {
    width: '100%',
    marginBottom: 32,
  },
  promoCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  promoCodeContent: {
    flex: 1,
  },
  promoCodeLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 4,
  },
  promoCode: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  copyButton: {},
  shareButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  imageCard: {
    width: '100%',
    height: 200,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    marginBottom: 24,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  referImage: {
    width: '100%',
    height: 200,
  },
  howItWorksCard: {
    backgroundColor: '#E5E5EA',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  howItWorksTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
  },
});
