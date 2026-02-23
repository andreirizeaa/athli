import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { useQuery } from '@tanstack/react-query';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { getCoachInvoices, formatCurrency, getInvoiceStatusInfo, getInvoiceType, getInvoiceTypeInfo, type Invoice } from '@/services/coach/coach-billing-service';

// Format date for display
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Format period range
const formatPeriod = (start: number, end: number): string => {
  const startDate = new Date(start * 1000);
  const endDate = new Date(end * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${months[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
};

export default function InvoicesScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  // Fetch invoices
  const { data, isLoading, error } = useQuery({
    queryKey: ['coach-invoices'],
    queryFn: getCoachInvoices,
    staleTime: 5 * 60 * 1000,
  });

  const invoices = data?.invoices || [];

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleInvoicePress = useCallback(async (invoice: Invoice) => {
    haptics.medium();
    const url = invoice.hosted_invoice_url || invoice.invoice_pdf;
    if (url) {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          dismissButtonStyle: 'done',
          showTitle: true,
        });
      } catch (err) {
        console.error('Failed to open invoice URL:', err);
      }
    }
  }, []);

  const getStatusColor = useCallback((status: Invoice['status']) => {
    const info = getInvoiceStatusInfo(status);
    switch (info.color) {
      case 'success':
        return themeColors.success;
      case 'warning':
        return themeColors.warning || '#f59e0b';
      case 'error':
        return themeColors.error || themeColors.destructive;
      default:
        return themeColors.mutedText;
    }
  }, [themeColors]);

  const getTypeColor = useCallback((type: 'subscription' | 'upgrade') => {
    const info = getInvoiceTypeInfo(type);
    switch (info.color) {
      case 'blue':
        return '#3b82f6';
      case 'purple':
        return '#a855f7';
      default:
        return themeColors.mutedText;
    }
  }, [themeColors]);

  const renderInvoice = useCallback(
    ({ item, isLastItem }: { item: Invoice; isLastItem: boolean }) => {
      const statusInfo = getInvoiceStatusInfo(item.status);
      const statusColor = getStatusColor(item.status);
      const invoiceType = getInvoiceType(item);
      const typeInfo = getInvoiceTypeInfo(invoiceType);
      const typeColor = getTypeColor(invoiceType);
      const hasUrl = item.hosted_invoice_url || item.invoice_pdf;
      // Show amount_due for open invoices, amount_paid for paid ones
      const displayAmount = item.status === 'open' ? (item.amount_due || item.amount_paid) : item.amount_paid;

      return (
        <View>
          <PressableScale onPress={() => handleInvoicePress(item)} enabled={!!hasUrl}>
            <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
              <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                <PlatformIcon
                  sf="doc.text"
                  IconComponent={FileText}
                  size={24}
                  color={themeColors.text}
                />
              </SquircleView>
              <View style={styles.textContent}>
                <Text style={[styles.invoiceDate, { color: themeColors.text }]} numberOfLines={1}>
                  {formatDate(item.created)}
                </Text>
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.pill,
                      { borderColor: typeColor, backgroundColor: typeColor + '15' },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: typeColor }]}>
                      {typeInfo.label}
                    </Text>
                  </View>
                  <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                      {formatCurrency(displayAmount, item.currency)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.pill,
                      { borderColor: statusColor, backgroundColor: statusColor + '15' },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: statusColor }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
                {invoiceType === 'subscription' && (
                  <Text style={[styles.periodText, { color: themeColors.mutedText }]} numberOfLines={1}>
                    {formatPeriod(item.period_start, item.period_end)}
                  </Text>
                )}
              </View>
              {hasUrl && <ChevronRight size={16} color={themeColors.mutedText} />}
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
    [themeColors, handleInvoicePress, getStatusColor, getTypeColor]
  );

  const iconColor = themeColors.text;

  // Loading state
  if (isLoading) {
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
            {t('settings.billing.invoices')}
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
        {/* Invoices List */}
        <View style={styles.contentContainer}>
          {error ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                {t('settings.billing.failedToLoadInvoices')}
              </Text>
            </View>
          ) : invoices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState message={t('settings.billing.noInvoices')} />
            </View>
          ) : (
            <View>
              {invoices.map((item, index) => (
                <View key={item.id}>
                  {renderInvoice({ item, isLastItem: index === invoices.length - 1 })}
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
          {t('settings.billing.invoices')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  invoiceDate: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  periodText: {
    ...typography.p4,
  },
  separatorContainer: {
    paddingLeft: 82,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
