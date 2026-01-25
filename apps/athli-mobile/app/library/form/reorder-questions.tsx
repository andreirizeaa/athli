import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform, ScrollView, Alert } from 'react-native';
import { ChevronLeft, GripVertical, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { useTranslations } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { useModalCallbacks } from '@/stores';
import type { Question } from '@/services/coach/coach-questionnaire-service';

// Row height constants
const ROW_HEIGHT = 72;
const ROW_GAP = 8;
const ITEM_HEIGHT = ROW_HEIGHT + ROW_GAP;

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

// Draggable Row Component
interface DraggableRowProps {
  question: Question;
  index: number;
  totalItems: number;
  onDragComplete: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  draggingIndex: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  themeColors: any;
}

const DraggableRow: React.FC<DraggableRowProps> = ({
  question,
  index,
  totalItems,
  onDragComplete,
  onDragStart,
  onDragEnd,
  draggingIndex,
  hoverIndex,
  themeColors,
}) => {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const formatLabel = FORMAT_LABELS[question.format] || question.format;

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      draggingIndex.value = index;
      hoverIndex.value = index;
      runOnJS(onDragStart)();
      runOnJS(haptics.medium)();
    })
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;

      const halfItemHeight = ITEM_HEIGHT / 2;
      let displacement = 0;

      if (event.translationY > halfItemHeight) {
        displacement = Math.floor((event.translationY + halfItemHeight) / ITEM_HEIGHT);
      } else if (event.translationY < -halfItemHeight) {
        displacement = Math.ceil((event.translationY - halfItemHeight) / ITEM_HEIGHT);
      }

      let newHoverIndex = index + displacement;
      newHoverIndex = Math.max(0, Math.min(newHoverIndex, totalItems - 1));

      if (hoverIndex.value !== newHoverIndex) {
        hoverIndex.value = newHoverIndex;
        runOnJS(haptics.medium)();
      }
    })
    .onEnd(() => {
      'worklet';
      const finalIndex = hoverIndex.value;
      const startIndex = index;

      translateY.value = 0;
      isDragging.value = false;

      if (finalIndex !== startIndex) {
        runOnJS(onDragComplete)(startIndex, finalIndex);
      } else {
        draggingIndex.value = -1;
        hoverIndex.value = -1;
      }

      runOnJS(onDragEnd)();
      runOnJS(haptics.medium)();
    });

  const animatedDragStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: isDragging.value ? 1.05 : 1 },
      ],
      zIndex: isDragging.value ? 9999 : 1,
      elevation: isDragging.value ? 50 : 0,
    };
  });

  const shiftStyle = useAnimatedStyle(() => {
    if (draggingIndex.value === -1) {
      return { transform: [{ translateY: 0 }] };
    }

    if (draggingIndex.value === index) {
      return { transform: [{ translateY: 0 }] };
    }

    const draggedFrom = draggingIndex.value;
    const hoveredAt = hoverIndex.value;

    let shift = 0;

    if (draggedFrom < hoveredAt) {
      if (index > draggedFrom && index <= hoveredAt) {
        shift = -ITEM_HEIGHT;
      }
    } else if (draggedFrom > hoveredAt) {
      if (index >= hoveredAt && index < draggedFrom) {
        shift = ITEM_HEIGHT;
      }
    }

    return {
      transform: [{ translateY: withTiming(shift, { duration: 200 }) }],
    };
  });

  const draggingCardStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: isDragging.value ? 0.25 : 0,
      backgroundColor: themeColors.surfacePrimary,
    };
  });

  return (
    <Animated.View style={[styles.itemWrapper, shiftStyle]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.rowWrapper, animatedDragStyle]}>
          <Animated.View
            style={[
              styles.rowContent,
              draggingCardStyle,
            ]}
          >
            <View style={[styles.numberCircle, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.numberText, { color: themeColors.primaryForeground }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.textContent}>
              <Text
                style={[styles.questionText, { color: themeColors.text }]}
                numberOfLines={2}
              >
                {question.question}
                {question.required && <Text style={styles.requiredAsterisk}>*</Text>}
              </Text>
              <Text style={[styles.formatText, { color: themeColors.mutedText }]}>
                {formatLabel}
              </Text>
            </View>
            <View style={styles.dragHandle}>
              <GripVertical {...({ size: 20, color: themeColors.mutedText } as any)} />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

export default function ReorderQuestionsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { reorderQuestions, triggerQuestionsReorder } = useModalCallbacks();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  const draggingIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialQuestionsRef = useRef<Question[]>([]);

  useEffect(() => {
    if (reorderQuestions && reorderQuestions.length > 0) {
      setQuestions(reorderQuestions);
      initialQuestionsRef.current = reorderQuestions;
      setHasUnsavedChanges(false);
    }
  }, [reorderQuestions]);

  const handleDragComplete = useCallback((fromIndex: number, toIndex: number) => {
    setHasUnsavedChanges(true);

    setQuestions(prev => {
      const newQuestions = [...prev];
      const [movedItem] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, movedItem);
      return newQuestions;
    });

    requestAnimationFrame(() => {
      draggingIndex.value = -1;
      hoverIndex.value = -1;
    });
  }, [draggingIndex, hoverIndex]);

  const handleDragStart = useCallback(() => {
    setIsScrollEnabled(false);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsScrollEnabled(true);
  }, []);

  const handleSave = useCallback(() => {
    triggerQuestionsReorder(questions);
    setHasUnsavedChanges(false);
    router.back();
  }, [questions, triggerQuestionsReorder, router]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        t('common.discardChanges'),
        t('common.discardChangesMessage'),
        [
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => router.back(),
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, router, t]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
        <View style={[styles.fixedHeader, { height: headerHeight }]}>
          <LinearGradient
            colors={[
              hexToRgba(themeColors.backgroundSecondary, 1),
              hexToRgba(themeColors.backgroundSecondary, 0.85),
              hexToRgba(themeColors.backgroundSecondary, 0.5),
              hexToRgba(themeColors.backgroundSecondary, 0),
            ]}
            locations={[0, 0.5, 0.8, 1]}
            style={[styles.headerGradient, { height: gradientHeight }]}
            pointerEvents="none"
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isScrollEnabled}
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <IconButton
              icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
              onPress={handleBack}
              size="md"
              color={themeColors.text}
            />
            <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
              {t('library.formBuilder.reorder')}
            </Text>
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleSave}
              size="md"
              variant={hasUnsavedChanges ? 'primary' : 'default'}
              disabled={!hasUnsavedChanges}
            />
          </View>

          <View style={styles.listContainer}>
            {questions.map((question, index) => (
              <DraggableRow
                key={question.id}
                question={question}
                index={index}
                totalItems={questions.length}
                onDragComplete={handleDragComplete}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                draggingIndex={draggingIndex}
                hoverIndex={hoverIndex}
                themeColors={themeColors}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 16,
    height: 56,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  listContainer: {
    flex: 1,
  },
  itemWrapper: {},
  rowWrapper: {
    marginBottom: ROW_GAP,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
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
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  questionText: {
    ...typography.p1,
    fontWeight: '500',
    marginBottom: 2,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  formatText: {
    ...typography.p3,
  },
  dragHandle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
