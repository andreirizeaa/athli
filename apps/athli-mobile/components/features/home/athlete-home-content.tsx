import React, { useMemo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, FileText, ClipboardCheck, HelpCircle } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { SymbolView } from 'expo-symbols';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useAuth, useClientDetailStore } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getMyFiles } from '@/services/client/client-file-service';
import { useAthleteQuestionnaires } from '@/hooks/useAthleteQuestionnaires';

// Helper to get ordinal suffix
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export const AthleteHomeContent = () => {
  const router = useRouter();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const { clientProfile } = useAuth();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  // Fetch questionnaires to show outstanding count
  const { outstandingQuestionnaires } = useAthleteQuestionnaires();
  const outstandingQuestionnairesCount = outstandingQuestionnaires.length;

  // TODO: Replace with actual data from athlete check-ins hook
  const outstandingCheckIns = 0;

  // Store setters for athlete self-access
  const setStoreFiles = useClientDetailStore((state) => state.setFiles);
  const setStoreClientId = useClientDetailStore((state) => state.setClientId);
  const setStoreCoachId = useClientDetailStore((state) => state.setCoachId);

  // Fetch files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      if (!clientProfile) return;

      // Set IDs in store for file viewer
      setStoreClientId(clientProfile.client_id);
      setStoreCoachId(clientProfile.coach_id);

      try {
        const filesData = await getMyFiles();
        setStoreFiles(filesData);
      } catch (error) {
        console.error('[AthleteHomeContent] Error fetching files:', error);
      }
    };

    fetchFiles();
  }, [clientProfile, setStoreFiles, setStoreClientId, setStoreCoachId]);

  const handleOpenFiles = () => {
    if (!clientProfile?.client_id) return;
    router.push({
      pathname: '/client/[id]/files',
      params: { id: clientProfile.client_id, hideAddButton: 'true' },
    });
  };

  const handleOpenCheckIns = () => {
    router.push('/athlete-check-ins');
  };

  const handleOpenQuestionnaires = () => {
    router.push('/athlete-questionnaires');
  };

  const greeting = useMemo(() => {
    if (clientProfile?.name) {
      const firstName = clientProfile.name.split(' ')[0];
      return `Hey ${firstName}`;
    }
    return t('home.title');
  }, [clientProfile, t]);

  const dateSubtitle = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ] as const;
    const monthName = t(`calendar.months.${monthKeys[today.getMonth()]}`);
    return `Today is the ${day}${getOrdinalSuffix(day)} of ${monthName}`;
  }, [t]);

  return (
    <ScreenWrapper scrollable tabScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: themeColors.mutedText }]}>{dateSubtitle}</Text>
      </View>

      <View style={styles.content}>
        {/* Two column row for Check-ins and Questionnaires */}
        <View style={styles.twoColumnRow}>
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: themeColors.mutedText }]}>
              {t('athlete.checkIns.title')}
            </Text>
            <PressableScale onPress={handleOpenCheckIns}>
              <Card style={styles.squareCard}>
                <View style={styles.squareCardContent}>
                  {outstandingCheckIns > 0 ? (
                    <>
                      <Text style={[styles.squareCardNumber, { color: themeColors.text }]}>
                        {outstandingCheckIns}
                      </Text>
                      <Text style={[styles.squareCardSubtitle, { color: themeColors.mutedText }]}>
                        {t('athlete.checkIns.outstanding')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.squareCardIcon}>
                        {Platform.OS === 'ios' ? (
                          <SymbolView name="checkmark.circle" tintColor={primaryColor} size={28} type="monochrome" />
                        ) : (
                          <ClipboardCheck {...({ size: 28, color: primaryColor } as any)} />
                        )}
                      </View>
                      <Text style={[styles.squareCardEmpty, { color: themeColors.text }]}>
                        {t('athlete.checkIns.allCaughtUp')}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </PressableScale>
          </View>
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: themeColors.mutedText }]}>
              {t('athlete.questionnaires.title')}
            </Text>
            <PressableScale onPress={handleOpenQuestionnaires}>
              <Card style={styles.squareCard}>
                <View style={styles.squareCardContent}>
                  {outstandingQuestionnairesCount > 0 ? (
                    <>
                      <Text style={[styles.squareCardNumber, { color: themeColors.text }]}>
                        {outstandingQuestionnairesCount}
                      </Text>
                      <Text style={[styles.squareCardSubtitle, { color: themeColors.mutedText }]}>
                        {t('athlete.questionnaires.outstanding')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.squareCardIcon}>
                        {Platform.OS === 'ios' ? (
                          <SymbolView name="questionmark.circle" tintColor={primaryColor} size={28} type="monochrome" />
                        ) : (
                          <HelpCircle {...({ size: 28, color: primaryColor } as any)} />
                        )}
                      </View>
                      <Text style={[styles.squareCardEmpty, { color: themeColors.text }]}>
                        {t('athlete.questionnaires.allCaughtUp')}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </PressableScale>
          </View>
        </View>

        <PressableScale onPress={handleOpenFiles}>
          <Card>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="doc.text" IconComponent={FileText} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('athlete.availableResources')}
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
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
  subtitle: {
    ...typography.h5,
    fontWeight: '400',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 16,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    ...typography.p1,
    marginBottom: 8,
  },
  squareCard: {
    aspectRatio: 1.25,
    marginBottom: 0,
  },
  squareCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareCardIcon: {
    marginBottom: 8,
  },
  squareCardNumber: {
    ...typography.h1,
    fontSize: 48,
    lineHeight: 56,
  },
  squareCardSubtitle: {
    ...typography.p3,
    marginTop: 4,
  },
  squareCardEmpty: {
    ...typography.h5,
    textAlign: 'center',
  },
  optionRow: {
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
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});
