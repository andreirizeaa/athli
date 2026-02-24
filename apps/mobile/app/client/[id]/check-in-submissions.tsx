import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getCheckInLogs, type CheckInLogInstance } from '@/services/client/client-form-service';

type CheckInSubmissionsParams = {
  id: string;
  checkInId: string;
  checkInName: string;
};

export default function CheckInSubmissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<CheckInSubmissionsParams>();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  const coachId = useClientDetailStore((state) => state.coachId);

  const [submissions, setSubmissions] = useState<CheckInLogInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    if (!params.id || !params.checkInId || !coachId) return;
    setIsLoading(true);
    try {
      const logs = await getCheckInLogs(params.id, params.checkInId, coachId);
      setSubmissions(logs);
    } catch (error) {
      console.error('Failed to fetch check-in submissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, params.checkInId, coachId]);

  useFocusEffect(
    useCallback(() => {
      fetchSubmissions();
    }, [fetchSubmissions])
  );

  const handleBackPress = () => {
    router.back();
  };

  const handleSubmissionPress = (submission: CheckInLogInstance) => {
    router.push({
      pathname: '/modals/athlete/form-review-modal',
      params: {
        questionnaireId: params.checkInId,
        questionnaireName: params.checkInName,
        clientId: params.id,
        formType: 'checkIn',
        logId: submission.id,
        completedAt: submission.completedAt || '',
      },
    } as any);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'review': return t('clientDetail.checkIns.statusReview');
      case 'reviewed': return t('clientDetail.checkIns.statusReviewed');
      case 'completed': return t('clientDetail.checkIns.statusCompleted');
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'review': return '#F59E0B';
      case 'reviewed': return '#10B981';
      case 'completed': return primaryColor;
      default: return themeColors.mutedText;
    }
  };

  const completedSubmissions = submissions.filter((s) => s.status !== 'assigned');

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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.mutedText} />
          </View>
        ) : completedSubmissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PlatformIcon
              sf="tray.full"
              IconComponent={Inbox}
              size={48}
              color={themeColors.mutedText}
            />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              {t('clientDetail.checkIns.noSubmissions')}
            </Text>
            <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
              {t('clientDetail.checkIns.noSubmissionsDescription')}
            </Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Card>
              {completedSubmissions.map((submission, index) => (
                <React.Fragment key={submission.id}>
                  {index > 0 && <Separator />}
                  <TouchableOpacity
                    style={styles.submissionRow}
                    onPress={() => handleSubmissionPress(submission)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.submissionInfo}>
                      <Text style={[styles.submissionDate, { color: themeColors.text }]}>
                        {formatDate(submission.scheduledDate)}
                      </Text>
                      <View style={styles.pillRow}>
                        {submission.completedAt && (
                          <View style={[styles.pill, { borderColor: themeColors.border }]}>
                            <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                              {formatTime(submission.completedAt)}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.pill, { borderColor: getStatusColor(submission.status) }]}>
                          <Text style={[styles.pillText, { color: getStatusColor(submission.status) }]}>
                            {getStatusLabel(submission.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <PlatformIcon
                      sf="chevron.right"
                      IconComponent={ChevronRight}
                      size={16}
                      color={themeColors.mutedText}
                    />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          </View>
        )}
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
          {t('clientDetail.checkIns.submissionsTitle')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
    </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  submissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  submissionInfo: {
    flex: 1,
    gap: 2,
  },
  submissionDate: {
    ...typography.p1,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    ...typography.p3,
    fontWeight: '500',
  },
});
