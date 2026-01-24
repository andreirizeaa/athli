import React from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { GripVertical, Trash2 } from 'lucide-react-native';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import type { Question } from '@/services/coach/coach-questionnaire-service';

type QuestionCardProps = {
  question: Question;
  index: number;
  isReorderMode: boolean;
  onDelete: () => void;
  onPress?: () => void;
};

const FORMAT_LABELS: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  multipleChoice: 'Multiple Choice',
  scale: 'Scale',
  yesNo: 'Yes/No',
  images: 'Images',
  videos: 'Videos',
  date: 'Date',
  rating: 'Rating',
  signature: 'Signature',
  progressPhoto: 'Progress Photo',
  metrics: 'Metrics',
};

export const QuestionCard = ({ question, index, isReorderMode, onDelete, onPress }: QuestionCardProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const formatLabel = FORMAT_LABELS[question.format] || question.format;

  const handleDelete = () => {
    Alert.alert(
      t('library.formBuilder.deleteQuestion'),
      t('library.formBuilder.deleteQuestionMessage'),
      [
        {
          text: t('general.cancel'),
          style: 'cancel',
        },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const cardContent = (
    <Card style={styles.container}>
      <View style={[styles.numberCircle, { backgroundColor: themeColors.primary }]}>
        <Text style={[styles.numberText, { color: themeColors.primaryForeground }]}>
          {index + 1}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.questionText, { color: themeColors.text }]} numberOfLines={2}>
          {question.question}
          {question.required && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
        <Text style={[styles.formatText, { color: themeColors.mutedText }]}>
          {formatLabel}
        </Text>
      </View>

      {isReorderMode ? (
        <View style={styles.dragHandle}>
          <GripVertical {...({ size: 20, color: themeColors.mutedText } as any)} />
        </View>
      ) : (
        <PressableOpacity onPress={handleDelete} style={styles.deleteButton} hitSlop={8}>
          <Trash2 {...({ size: 20, color: themeColors.text } as any)} />
        </PressableOpacity>
      )}
    </Card>
  );

  // Wrap in PressableScale when not in reorder mode and onPress is provided
  if (!isReorderMode && onPress) {
    return (
      <PressableScale onPress={onPress}>
        {cardContent}
      </PressableScale>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    ...typography.p2,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  questionText: {
    ...typography.p1,
    fontWeight: '500',
    marginBottom: 4,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  formatText: {
    ...typography.p3,
  },
  dragHandle: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
});
