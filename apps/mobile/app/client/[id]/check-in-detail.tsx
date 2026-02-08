import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Pencil, Inbox, Pause, Play, Trash2, Send, Eye } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Card } from '@/components/ui/card';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Dialog } from '@/components/ui/dialog';
import { deleteClientCheckIns, updateClientCheckInStatus } from '@/services/client/client-form-service';
import { haptics } from '@/utils/haptics';

type CheckInDetailParams = {
  id: string;
  checkInId: string;
  checkInName: string;
};

export default function CheckInDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<CheckInDetailParams>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  const coachId = useClientDetailStore((state) => state.coachId);
  const checkIns = useClientDetailStore((state) => state.checkIns);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const clientId = useClientDetailStore((state) => state.clientId);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Load client data if navigating directly to this screen
  useEffect(() => {
    if (params.id && !clientId) {
      loadClientData(params.id);
    }
  }, [params.id, clientId, loadClientData]);

  // Find current check-in to get its status
  const currentCheckIn = checkIns.find((c) => c.id === params.checkInId);
  const isDraft = currentCheckIn?.status === 'draft' || !currentCheckIn?.status;
  const isLive = currentCheckIn?.status === 'live';
  const isPaused = currentCheckIn?.status === 'paused';

  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const iconSize = iconSizes.listIcons;
  const iconColor = themeColors.text;

  const handleBackPress = () => {
    router.back();
  };

  const handleViewEditForm = () => {
    router.push({
      pathname: '/library/form/form-builder',
      params: {
        formType: 'checkIn',
        formId: params.checkInId,
        formName: params.checkInName,
        clientId: params.id,
        viewOnly: isDraft ? 'false' : 'true',
      },
    } as any);
  };

  const handleViewSubmissions = () => {
    router.push({
      pathname: '/client/[id]/check-in-submissions',
      params: {
        id: params.id,
        checkInId: params.checkInId,
        checkInName: params.checkInName,
      },
    } as any);
  };

  const handlePauseResume = () => {
    setShowPauseDialog(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!coachId) return;
    setIsLoading(true);
    try {
      // Draft -> Live (publish), Live -> Paused, Paused -> Live
      const newStatus = isLive ? 'paused' : 'live';
      await updateClientCheckInStatus({
        checkInId: params.checkInId,
        clientId: params.id,
        coachId,
        status: newStatus,
      });
      haptics.success();
      refreshSection('check-ins');
      setShowPauseDialog(false);
    } catch (error) {
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!coachId) return;
    setIsLoading(true);
    try {
      await deleteClientCheckIns({
        checkInIds: [params.checkInId],
        clientId: params.id,
        coachId,
      });
      haptics.success();
      refreshSection('check-ins');
      setShowDeleteDialog(false);
      router.back();
    } catch (error) {
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
            <Card>
              <SettingsOption
                icon={<PlatformIcon sf={isDraft ? 'pencil' : 'eye'} IconComponent={isDraft ? Pencil : Eye} size={iconSize} color={iconColor} />}
                title={isDraft ? t('clientDetail.checkIns.viewEditForm') : t('clientDetail.checkIns.viewForm')}
                onPress={handleViewEditForm}
                showChevron
              />
              <Separator />
              <SettingsOption
                icon={<PlatformIcon sf="tray.full" IconComponent={Inbox} size={iconSize} color={iconColor} />}
                title={t('clientDetail.checkIns.submissions')}
                onPress={handleViewSubmissions}
                showChevron
              />
            </Card>

            <Card style={styles.actionsCard}>
              <SettingsOption
                icon={
                  <PlatformIcon
                    sf={isDraft ? 'paperplane' : isLive ? 'pause' : 'play'}
                    IconComponent={isDraft ? Send : isLive ? Pause : Play}
                    size={iconSize}
                    color={iconColor}
                  />
                }
                title={
                  isDraft
                    ? t('clientDetail.checkIns.publish')
                    : isLive
                      ? t('clientDetail.checkIns.pause')
                      : t('clientDetail.checkIns.resume')
                }
                onPress={handlePauseResume}
                showChevron
                disabled={isDraft && (currentCheckIn?.questionCount ?? 0) === 0}
              />
              <Separator />
              <SettingsOption
                icon={<PlatformIcon sf="trash" IconComponent={Trash2} size={iconSize} color={iconColor} />}
                title={t('clientDetail.checkIns.delete')}
                onPress={handleDelete}
                showChevron
              />
            </Card>
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {currentCheckIn?.name || params.checkInName}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <Dialog
        visible={showPauseDialog}
        onClose={() => setShowPauseDialog(false)}
        title={
          isDraft
            ? t('clientDetail.checkIns.publishTitle')
            : isLive
              ? t('clientDetail.checkIns.pauseTitle')
              : t('clientDetail.checkIns.resumeTitle')
        }
        message={
          isDraft
            ? t('clientDetail.checkIns.publishMessage')
            : isLive
              ? t('clientDetail.checkIns.pauseMessage')
              : t('clientDetail.checkIns.resumeMessage')
        }
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => setShowPauseDialog(false),
            variant: 'secondary',
          },
          {
            label: isDraft
              ? t('clientDetail.checkIns.publish')
              : isLive
                ? t('clientDetail.checkIns.pause')
                : t('clientDetail.checkIns.resume'),
            onPress: handleConfirmStatusChange,
            variant: 'primary',
            loading: isLoading,
          },
        ]}
      />

      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t('clientDetail.checkIns.deleteTitle')}
        message={t('clientDetail.checkIns.deleteMessage')}
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => setShowDeleteDialog(false),
            variant: 'secondary',
          },
          {
            label: t('general.delete'),
            onPress: handleConfirmDelete,
            variant: 'destructive',
            loading: isLoading,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    marginHorizontal: 8,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionsCard: {
    marginTop: 16,
  },
});
