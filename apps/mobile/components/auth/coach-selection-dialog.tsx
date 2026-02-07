import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { Dialog } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import type { CoachAssignment } from '@/types/profile';

export interface CoachSelectionDialogProps {
  visible: boolean;
  coaches: CoachAssignment[];
  onSelect: (coachId: string) => void;
}

export const CoachSelectionDialog = ({
  visible,
  coaches,
  onSelect,
}: CoachSelectionDialogProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedCoachId) {
      onSelect(selectedCoachId);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={() => {}}
      title={t('auth.selectYourCoach')}
      message={t('auth.selectYourCoachMessage')}
      showCloseIcon={false}
      buttons={[
        {
          label: t('general.continue'),
          onPress: handleContinue,
          variant: 'primary',
          disabled: !selectedCoachId,
        },
      ]}
    >
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {coaches.map((coach, index) => {
          const isSelected = selectedCoachId === coach.coach_id;
          return (
            <React.Fragment key={coach.coach_id}>
              {index > 0 && <Separator style={styles.separator} />}
              <PressableOpacity
                style={styles.coachItem}
                onPress={() => setSelectedCoachId(coach.coach_id)}
              >
                <View style={styles.avatarContainer}>
                  {coach.profile_picture_url ? (
                    <Image
                      source={{ uri: coach.profile_picture_url }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      contentPosition="center"
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarImage,
                        styles.avatarPlaceholder,
                        { backgroundColor: themeColors.border },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.coachName, { color: themeColors.text }]} numberOfLines={1}>
                  {coach.name}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? themeColors.primary : themeColors.border },
                    isSelected && { backgroundColor: themeColors.primary },
                  ]}
                >
                  {isSelected && (
                    <Check {...({ size: 12, color: themeColors.primaryForeground, strokeWidth: 3 } as any)} />
                  )}
                </View>
              </PressableOpacity>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  coachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarContainer: {
    marginRight: 12,
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  coachName: {
    ...typography.p2,
    flex: 1,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    marginLeft: 56, // 44 (avatar) + 12 (margin)
  },
});
