import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/dialog';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react-native';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';

import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SearchBar } from '@/components/ui/search-bar';
import { createBillingPortalSession, type ClientPackage } from '@/services/client/client-billing-service';

// Simple fuzzy search - checks if all characters appear in order
const fuzzyMatch = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
};

// Format amount from cents
const formatAmount = (amountCents: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
};

// Format interval for display
const formatInterval = (interval: string, intervalCount?: number | null): string => {
  if (interval === 'one_time') return 'One-time';
  const count = intervalCount ?? 1;
  if (count > 1) return `Every ${count} ${interval}s`;
  if (interval === 'day') return 'Daily';
  if (interval === 'week') return 'Weekly';
  if (interval === 'month') return 'Monthly';
  if (interval === 'year') return 'Yearly';
  return '';
};

// Get display status - accounts for scheduled cancellations
const getDisplayStatus = (subscription: ClientPackage['subscription']): string => {
  if (!subscription) return 'active';
  // If cancel_at is set and subscription is still active, it's "cancelling"
  if (subscription.cancel_at && subscription.status === 'active') {
    return 'cancelling';
  }
  return subscription.status;
};

// Format subscription status
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'cancelling':
      return 'Cancelling';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Past Due';
    case 'cancelled':
      return 'Cancelled';
    case 'unpaid':
      return 'Unpaid';
    default:
      return status;
  }
};

// Format date for display
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusColor = (status: string, colors: any): string => {
  switch (status) {
    case 'active':
    case 'trialing':
      return colors.success;
    case 'cancelling':
      return colors.warning || '#f59e0b';
    case 'past_due':
    case 'unpaid':
      return colors.warning || '#f59e0b';
    case 'cancelled':
      return colors.error || colors.destructive;
    default:
      return colors.mutedText;
  }
};

export default function BillingScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  // Get packages from store (already loaded by profile store)
  const packages = useClientProfileStore((state) => state.packages);
  const isLoadingPackages = useClientProfileStore((state) => state.isLoadingPackages);
  const loadPackages = useClientProfileStore((state) => state.loadPackages);

  // Refresh packages when page mounts
  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const statusFilters = useMemo(() => [
    { key: 'active', label: 'Active' },
    { key: 'cancelling', label: 'Cancelling' },
    { key: 'trialing', label: 'Trial' },
    { key: 'past_due', label: 'Past Due' },
    { key: 'cancelled', label: 'Cancelled' },
  ], []);

  const toggleFilter = useCallback((key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Dialog state
  const [selectedPackage, setSelectedPackage] = useState<ClientPackage | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Filter packages based on search query and status filters
  const filteredPackages = useMemo(() => {
    let result = packages;

    // Filter by status (use display status to account for "cancelling")
    if (activeFilters.size > 0) {
      result = result.filter((pkg) => {
        const displayStatus = getDisplayStatus(pkg.subscription);
        return activeFilters.has(displayStatus);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      result = result.filter((pkg) => {
        if (!pkg.package) return false;
        const matchesName = fuzzyMatch(pkg.package.name, searchQuery);
        const matchesDescription = pkg.package.description
          ? fuzzyMatch(pkg.package.description, searchQuery)
          : false;
        return matchesName || matchesDescription;
      });
    }

    return result;
  }, [packages, searchQuery, activeFilters]);

  const iconColor = themeColors.text;

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handlePackagePress = useCallback((pkg: ClientPackage) => {
    haptics.medium();
    setSelectedPackage(pkg);
    setShowManageDialog(true);
  }, []);

  const handleManageWithStripe = useCallback(async () => {
    if (!selectedPackage?.subscription?.id) {
      setShowManageDialog(false);
      return;
    }

    setIsLoadingPortal(true);
    try {
      const portalUrl = await createBillingPortalSession(selectedPackage.subscription.id);
      setShowManageDialog(false);
      setIsLoadingPortal(false);

      // Open the portal URL in the browser
      await WebBrowser.openBrowserAsync(portalUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        dismissButtonStyle: 'done',
        showTitle: true,
      });
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      setIsLoadingPortal(false);
      setShowManageDialog(false);
      haptics.error();
      setShowErrorDialog(true);
    }
  }, [selectedPackage]);

  const handleCloseManageDialog = () => {
    if (!isLoadingPortal) {
      setShowManageDialog(false);
      setSelectedPackage(null);
    }
  };

  // Get dialog message based on subscription status
  const getDialogMessage = useCallback(() => {
    if (!selectedPackage?.subscription) {
      return t('profile.oneTimePackageMessage');
    }

    const sub = selectedPackage.subscription;

    // If subscription is scheduled for cancellation
    if (sub.cancel_at) {
      return `${t('profile.subscriptionCancellingMessage')} ${formatDate(sub.cancel_at)}. ${t('profile.manageSubscriptionMessage')}`;
    }

    return t('profile.manageSubscriptionMessage');
  }, [selectedPackage, t]);

  const renderPackage = useCallback(
    ({ item, isLastItem }: { item: ClientPackage; isLastItem: boolean }) => {
      const pkg = item.package;
      if (!pkg) return null;

      const hasSubscription = !!item.subscription;
      const displayStatus = getDisplayStatus(item.subscription);
      const statusColor = hasSubscription ? getStatusColor(displayStatus, themeColors) : themeColors.mutedText;

      return (
        <View>
          <PressableScale onPress={() => handlePackagePress(item)}>
            <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
              {pkg.image_url ? (
                <Image
                  source={{ uri: pkg.image_url }}
                  style={styles.packageImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                  <PlatformIcon
                    sf="shippingbox"
                    IconComponent={Package}
                    size={24}
                    color={themeColors.text}
                  />
                </SquircleView>
              )}
              <View style={styles.textContent}>
                <Text
                  style={[styles.name, { color: themeColors.text }]}
                  numberOfLines={1}
                >
                  {pkg.name}
                </Text>
                <View style={styles.metaRow}>
                  <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                      {formatAmount(pkg.amount_cents, pkg.currency)}
                      {pkg.interval !== 'one_time' && ` · ${formatInterval(pkg.interval, pkg.interval_count)}`}
                    </Text>
                  </View>
                  {hasSubscription && (
                    <View
                      style={[
                        styles.pill,
                        { borderColor: statusColor, backgroundColor: statusColor + '15' },
                      ]}
                    >
                      <Text style={[styles.pillText, { color: statusColor }]}>
                        {getStatusLabel(displayStatus)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
            </View>
          </PressableScale>
          {!isLastItem && (
            <View style={styles.separatorContainer}>
              <View
                style={[
                  styles.separator,
                  { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                ]}
              />
            </View>
          )}
          {isLastItem && <View style={{ height: 24 }} />}
        </View>
      );
    },
    [themeColors, handlePackagePress]
  );

  // Loading state
  if (isLoadingPackages && packages.length === 0) {
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
            {t('profile.billing')}
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
        keyboardDismissMode="on-drag"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        {/* Status filter pills */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {statusFilters.map((filter) => {
              const isActive = activeFilters.has(filter.key);
              return (
                <PressableScale key={filter.key} onPress={() => toggleFilter(filter.key)}>
                  <SquircleView
                    cornerSmoothing={1}
                    style={[
                      styles.filterPill,
                      {
                        borderColor: isActive ? themeColors.primary : themeColors.border,
                        backgroundColor: isActive ? themeColors.primary + '15' : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: isActive ? themeColors.primary : themeColors.mutedText },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </SquircleView>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* Packages List */}
        <View style={styles.contentContainer}>
          {filteredPackages.length === 0 && searchQuery.trim() ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                {t('general.noResults')}
              </Text>
            </View>
          ) : filteredPackages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState message={t('profile.noPackages')} />
            </View>
          ) : (
            <View>
              {filteredPackages.map((item, index) => (
                <View key={item.id}>
                  {renderPackage({ item, isLastItem: index === filteredPackages.length - 1 })}
                </View>
              ))}
            </View>
          )}
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
          {t('profile.billing')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Manage Subscription Dialog */}
      <Dialog
        visible={showManageDialog}
        onClose={handleCloseManageDialog}
        title={selectedPackage?.package?.name || t('profile.billing')}
        message={getDialogMessage()}
        disableCloseIcon={isLoadingPortal}
        buttons={
          selectedPackage?.subscription
            ? [
                {
                  label: t('profile.manageWithStripe'),
                  onPress: handleManageWithStripe,
                  variant: 'primary',
                  loading: isLoadingPortal,
                },
              ]
            : [
                {
                  label: t('general.ok'),
                  onPress: handleCloseManageDialog,
                  variant: 'primary',
                },
              ]
        }
      />

      {/* Error Dialog */}
      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={t('profile.billingPortalError')}
        showCloseIcon={false}
        buttons={[
          {
            label: t('general.ok'),
            onPress: () => setShowErrorDialog(false),
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterContainer: {
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    ...typography.p3,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packageImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    ...typography.p4,
    fontWeight: '500',
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
