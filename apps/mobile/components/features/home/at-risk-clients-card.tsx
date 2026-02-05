import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale, PressableOpacity } from 'pressto';
import { ChevronRight, User, Info, TriangleAlert } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useAtRiskClients, type AtRiskClient } from '@/hooks/useAtRiskClients';

export const AtRiskClientsCard = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const { atRiskClients, isFetching } = useAtRiskClients();

  const handleClientPress = useCallback((client: AtRiskClient) => {
    router.push(`/client/${client.id}`);
  }, [router]);

  const handleInfoPress = useCallback(() => {
    setShowInfoDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowInfoDialog(false);
  }, []);

  const formatLastActivity = (lastActivity: string | null): string => {
    if (!lastActivity) return t('home.atRiskClients.noActivity' as any) || 'No activity';

    const lastDate = new Date(lastActivity);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return t('home.atRiskClients.lastActivity.one' as any) || 'Last activity 1 day ago';
    }
    return (t('home.atRiskClients.lastActivity.other' as any) || 'Last activity {count} days ago').replace('{count}', String(diffDays));
  };

  // Don't render if no at-risk clients
  if (!isFetching && atRiskClients.length === 0) {
    return null;
  }

  return (
    <>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="exclamationmark.triangle.fill" tintColor={themeColors.text} size={22} type="monochrome" />
            ) : (
              <TriangleAlert {...({ size: 22, color: themeColors.text } as any)} />
            )}
            <Text style={[styles.title, { color: themeColors.text }]}>
              {t('home.atRiskClients.title' as any) || 'At Risk'}
            </Text>
          </View>
          <PressableOpacity onPress={handleInfoPress} hitSlop={8}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="info.circle" tintColor={themeColors.mutedText} size={20} type="monochrome" />
            ) : (
              <Info {...({ size: 20, color: themeColors.mutedText } as any)} />
            )}
          </PressableOpacity>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

        {/* Content */}
        {isFetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={themeColors.mutedText} />
          </View>
        ) : (
          <View style={styles.clientsList}>
            {atRiskClients.map((client, index) => (
              <PressableScale
                key={client.id}
                style={[
                  styles.clientRow,
                  index < atRiskClients.length - 1 && styles.clientRowBorder,
                  index < atRiskClients.length - 1 && { borderBottomColor: themeColors.border },
                ]}
                onPress={() => handleClientPress(client)}
              >
                {/* Avatar */}
                <View style={[styles.avatarContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
                  {client.avatarUrl ? (
                    <Image
                      source={{ uri: client.avatarUrl }}
                      style={styles.avatar}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <User {...({ size: 16, color: themeColors.mutedText } as any)} />
                  )}
                </View>

                {/* Info */}
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientName, { color: themeColors.text }]} numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text style={[styles.lastActivity, { color: themeColors.mutedText }]} numberOfLines={1}>
                    {formatLastActivity(client.lastActivity)}
                  </Text>
                </View>

                {/* Chevron */}
                <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
              </PressableScale>
            ))}
          </View>
        )}
      </Card>

      {/* Info Dialog */}
      <Dialog
        visible={showInfoDialog}
        onClose={handleCloseDialog}
        title={t('home.atRiskClients.infoDialog.title' as any) || 'At Risk Clients'}
        message={t('home.atRiskClients.infoDialog.message' as any) || 'Clients shown here have not logged any training activity in the last 5 days. Regular check-ins can help keep them engaged and on track with their fitness goals.'}
        buttons={[
          {
            label: t('general.ok' as any) || 'OK',
            onPress: handleCloseDialog,
            variant: 'primary',
          },
        ]}
        showCloseIcon={false}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.h5,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  loadingContainer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientsList: {
    paddingVertical: 4,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  clientRowBorder: {
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clientInfo: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    ...typography.p2,
    fontWeight: '600',
  },
  lastActivity: {
    ...typography.p3,
  },
});
