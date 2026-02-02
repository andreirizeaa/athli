import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Moon, Sun, Zap, Brain, Dumbbell, LucideIcon } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { WorkoutPre } from '@athli/shared-types';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { en } from '@/lib/i18n/en';

import { RatingButton, RATING_COLORS } from './rating-button';

type ReadinessField = keyof WorkoutPre;

type ReadinessPageProps = {
  values: WorkoutPre;
  onValueChange: (field: ReadinessField, value: number) => void;
};

const READINESS_FIELDS: ReadinessField[] = ['sleep', 'mood', 'energy', 'stress', 'soreness'];

// Fields where lower is better (inverted color scale)
const INVERTED_FIELDS: ReadinessField[] = ['stress', 'soreness'];

const FIELD_ICONS: Record<ReadinessField, { sf: string; IconComponent: LucideIcon }> = {
  sleep: { sf: 'moon.zzz', IconComponent: Moon },
  mood: { sf: 'sun.max.fill', IconComponent: Sun },
  energy: { sf: 'bolt', IconComponent: Zap },
  stress: { sf: 'brain', IconComponent: Brain },
  soreness: { sf: 'heart.badge.bolt', IconComponent: Dumbbell },
};

const getMoodSfIcon = (value: number | null): string => {
  if (!value || value <= 3) return 'sun.min';
  return 'sun.max';
};

// Labels are arrays in translations, so we access them directly
const READINESS_LABELS: Record<ReadinessField, string[]> = en.training.readiness.labels;

export const ReadinessPage = ({ values, onValueChange }: ReadinessPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  if (!values) return null;

  const getQuestion = (field: ReadinessField): string => {
    return t(`training.readiness.${field}` as any);
  };

  const getLabels = (field: ReadinessField): string[] => {
    return READINESS_LABELS[field];
  };

  return (
    <View style={styles.container}>
      {READINESS_FIELDS.map((field) => {
        const labels = getLabels(field);
        const currentValue = values[field];
        const iconConfig = FIELD_ICONS[field];
        const isInverted = INVERTED_FIELDS.includes(field);
        // For inverted fields (stress, soreness), lower is better: 1=green, 5=red
        const iconColorIndex = currentValue ? (isInverted ? 5 - currentValue : currentValue - 1) : -1;
        const iconColor = iconColorIndex >= 0 ? RATING_COLORS[iconColorIndex] : themeColors.mutedText;
        const sfIcon = field === 'mood' ? getMoodSfIcon(currentValue) : iconConfig.sf;

        return (
          <View key={field} style={styles.section}>
            <View style={styles.questionRow}>
              <Text style={[styles.question, { color: themeColors.text }]}>
                {getQuestion(field)}
              </Text>
              <PlatformIcon
                sf={sfIcon}
                IconComponent={iconConfig.IconComponent}
                size={32}
                color={iconColor}
              />
            </View>
            <View style={styles.buttonsRow}>
              {(isInverted ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5]).map((value) => (
                <RatingButton
                  key={value}
                  value={value}
                  label={labels[value - 1]}
                  isSelected={currentValue === value}
                  onPress={() => onValueChange(field, value)}
                  colorIndex={isInverted ? 5 - value : value - 1}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  question: {
    ...typography.p1,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'bottom',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
