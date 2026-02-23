import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Receipt, CreditCard, Users } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import { typography, iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useCoachEntitlementsStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { getClients } from '@/services/coach/coach-client-service';

export default function BillingScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  // Get entitlements from store
  const entitlements = useCoachEntitlementsStore((state) => state.entitlements);
  const isOnTrial = useCoachEntitlementsStore((state) => state.isOnTrial);
  const isLoadingEntitlements = useCoachEntitlementsStore((state) => state.isLoading);
  const loadEntitlements = useCoachEntitlementsStore((state) => state.loadEntitlements);

  // Get coach profile for created_at
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Fetch clients count
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    staleTime: 5 * 60 * 1000,
  });

  const activeClientsCount = clients.length;
  const clientsLimit = entitlements?.client_limit || 50;
  const clientPercentage = Math.min((activeClientsCount / clientsLimit) * 100, 100);
  const isAtLimit = activeClientsCount >= clientsLimit;
  const isNearLimit = clientPercentage >= 80;

  // Warm up the browser for faster opening
  React.useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  // Calculate trial days remaining (30 days from coach profile created_at)
  const trialDaysRemaining = React.useMemo(() => {
    if (!isOnTrial || !coachProfile?.created_at) return 0;
    const createdAt = new Date(coachProfile.created_at);
    const trialEnd = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after creation
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [isOnTrial, coachProfile?.created_at]);

  const planName = entitlements?.plan_type === 'max' ? 'Max' : entitlements?.plan_type === 'pro' ? 'Pro' : 'Starter';

  // Determine upgrade button text when at limit
  const getUpgradeButtonText = () => {
    const planType = entitlements?.plan_type;
    if (planType === 'starter' || !planType) {
      return t('settings.billing.upgradeToPro');
    }
    if (planType === 'pro' && clientsLimit >= 300) {
      return t('settings.billing.upgradeToMax');
    }
    return t('settings.billing.upgradeClientLimit');
  };

  // Collect active add-ons
  const activeAddons = React.useMemo(() => {
    const addons: string[] = [];
    if (entitlements?.has_automations) addons.push(t('settings.billing.automations'));
    if (entitlements?.has_ai_assistant) addons.push(t('settings.billing.aiAssistant'));
    return addons;
  }, [entitlements, t]);

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleInvoicesPress = () => {
    haptics.medium();
    router.push('/settings/invoices');
  };

  const [showTrialWarning, setShowTrialWarning] = useState(false);

  const openWebBilling = React.useCallback(async () => {
    const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://app.athli.io';
    const billingUrl = `${webAppUrl}/settings/billing?source=mobile`;
    try {
      await WebBrowser.openBrowserAsync(billingUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        dismissButtonStyle: 'done',
        showTitle: true,
      });
      // Refetch entitlements when browser closes (user dismissed or completed)
      await loadEntitlements(coachProfile?.created_at);
    } catch (err) {
      console.error('Failed to open billing URL:', err);
    }
  }, [coachProfile?.created_at, loadEntitlements]);

  const handleUpdatePlan = React.useCallback(() => {
    haptics.medium();
    if (isOnTrial) {
      setShowTrialWarning(true);
    } else {
      openWebBilling();
    }
  }, [isOnTrial, openWebBilling]);

  const handleConfirmTrialEnd = React.useCallback(() => {
    setShowTrialWarning(false);
    // Small delay to let the dialog close first
    setTimeout(() => {
      openWebBilling();
    }, 100);
  }, [openWebBilling]);

  const iconColor = themeColors.text;
  const iconSize = iconSizes.tabBarIcons;

  // Loading state
  if (isLoadingEntitlements) {
    return (
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('settings.billing.title')}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Current Plan Card */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
            {t('settings.billing.currentPlan')}
          </Text>
          <Card>
            <View style={styles.planHeader}>
              <View style={styles.planTitleRow}>
                <PlatformIcon
                  sf="creditcard"
                  IconComponent={CreditCard}
                  size={iconSize}
                  color={iconColor}
                />
                <Text style={[styles.planName, { color: themeColors.text }]}>
                  {planName}
                </Text>
              </View>
              {isOnTrial && (
                <View style={[styles.trialBadge, { backgroundColor: themeColors.warning + '20', borderColor: themeColors.warning }]}>
                  <Text style={[styles.trialBadgeText, { color: themeColors.warning }]}>
                    {trialDaysRemaining} {t('settings.billing.daysLeft')}
                  </Text>
                </View>
              )}
            </View>

            {/* Full width divider */}
            <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border }]} />

            {/* Clients */}
            <View style={styles.planDetailRow}>
              <Text style={[styles.planDetailLabel, { color: themeColors.mutedText }]}>
                {t('settings.billing.clients')}
              </Text>
              <Text style={[styles.planDetailValue, { color: themeColors.text }]}>
                {t('settings.billing.upTo')} {clientsLimit}
              </Text>
            </View>

            {/* Add-ons section */}
            {activeAddons.length > 0 && (
              <>
                <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border }]} />
                {activeAddons.map((addon, index) => (
                  <View key={addon} style={[styles.planDetailRow, index > 0 && styles.addonRow]}>
                    <Text style={[styles.planDetailLabel, { color: themeColors.mutedText }]}>
                      {addon}
                    </Text>
                    <Text style={[styles.planDetailValue, { color: themeColors.text }]}>
                      {t('settings.billing.included')}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Update Plan button */}
            <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border }]} />
            <PressableScale
              style={[styles.upgradeButton, { backgroundColor: themeColors.primary, marginTop: 0 }]}
              onPress={handleUpdatePlan}
            >
              <Text style={[styles.upgradeButtonText, { color: themeColors.primaryForeground }]}>
                {t('settings.billing.updatePlan')}
              </Text>
            </PressableScale>
          </Card>

          {/* Active Clients Card */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
            {t('settings.billing.activeClients')}
          </Text>
          <Card>
            <View style={styles.clientsHeader}>
              <PlatformIcon
                sf="person.2"
                IconComponent={Users}
                size={iconSize}
                color={iconColor}
              />
              <Text style={[styles.clientsCount, { color: themeColors.text }]}>
                {isLoadingClients ? '...' : `${activeClientsCount} ${t('settings.billing.of')} ${clientsLimit}`}
              </Text>
              <Text style={[styles.clientsPercentage, { color: themeColors.mutedText }]}>
                {Math.round(clientPercentage)}%
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBarContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: isAtLimit
                      ? (themeColors.error || themeColors.destructive || '#ef4444')
                      : isNearLimit
                        ? themeColors.warning
                        : themeColors.primary,
                    width: `${clientPercentage}%`,
                  },
                ]}
              />
            </View>

            {isNearLimit && (
              <>
                <Text style={[styles.warningText, { color: isAtLimit ? (themeColors.error || themeColors.destructive || '#ef4444') : themeColors.warning }]}>
                  {isAtLimit ? t('settings.billing.reachedLimit') : t('settings.billing.approachingLimit')}
                </Text>
                <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border }]} />
                <PressableScale
                  style={[styles.upgradeButton, { backgroundColor: themeColors.primary, marginTop: 0 }]}
                  onPress={handleUpdatePlan}
                >
                  <Text style={[styles.upgradeButtonText, { color: themeColors.primaryForeground }]}>
                    {getUpgradeButtonText()}
                  </Text>
                </PressableScale>
              </>
            )}
          </Card>

          {/* Invoices Card - matching settings style */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
            {t('settings.billing.billingHistory')}
          </Text>
          <PressableScale onPress={handleInvoicesPress}>
            <Card>
              <View style={styles.invoicesRow}>
                <View style={styles.optionIconContainer}>
                  <PlatformIcon
                    sf="doc.text"
                    IconComponent={Receipt}
                    size={iconSize}
                    color={iconColor}
                  />
                </View>
                <View style={styles.invoicesTextContainer}>
                  <Text style={[styles.invoicesTitle, { color: themeColors.text }]}>
                    {t('settings.billing.invoices')}
                  </Text>
                </View>
                <PlatformIcon
                  sf="chevron.right"
                  IconComponent={ChevronRight}
                  size={iconSizes.extraSmallIcons}
                  color={themeColors.mutedText}
                />
              </View>
            </Card>
          </PressableScale>
        </View>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('settings.billing.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Trial Warning Dialog */}
      <Dialog
        visible={showTrialWarning}
        onClose={() => setShowTrialWarning(false)}
        title={t('settings.billing.endTrialTitle')}
        message={t('settings.billing.endTrialMessage', { days: trialDaysRemaining })}
        buttons={[
          {
            label: t('common.cancel'),
            onPress: () => setShowTrialWarning(false),
            variant: 'secondary',
          },
          {
            label: t('common.continue'),
            onPress: handleConfirmTrialEnd,
            variant: 'primary',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  sectionTitle: {
    ...typography.p2,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  // Plan card styles
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planName: {
    ...typography.h5,
  },
  trialBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  trialBadgeText: {
    ...typography.p4,
    fontWeight: '600',
  },
  fullWidthDivider: {
    height: 1,
    marginHorizontal: -16,
    marginVertical: 8,
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  addonRow: {
    marginTop: 4,
  },
  planDetailLabel: {
    ...typography.p2,
  },
  planDetailValue: {
    ...typography.p2,
    fontWeight: '500',
  },
  // Clients card styles
  clientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 4,
  },
  clientsCount: {
    ...typography.p1,
    fontWeight: '500',
    flex: 1,
  },
  clientsPercentage: {
    ...typography.p2,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  warningText: {
    ...typography.p4,
    marginTop: 8,
  },
  upgradeButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  upgradeButtonText: {
    ...typography.p1,
    fontWeight: '600',
  },
  // Invoices card styles - matching settings page
  invoicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  invoicesTextContainer: {
    flex: 1,
  },
  invoicesTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});
