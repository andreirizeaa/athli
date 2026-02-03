import React, { useState, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Plus, Trash2, ChevronDown, Activity } from 'lucide-react-native';
import { PressableScale, PressableOpacity } from 'pressto';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useThemeStore } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Switch } from 'react-native';
import { InputBox, DropdownInput, TextAreaInput } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { getAllMetrics, type Metric } from '@/services/coach/coach-metric-service';
import type { Question } from '@/services/coach/coach-questionnaire-service';
import { Dialog } from '@/components/ui/dialog';

type QuestionFormat = {
  id: string;
  labelKey: string;
  subtitleKey: string;
};

const SYNCS_WITH_FORMATS: QuestionFormat[] = [
  { id: 'progressPhoto', labelKey: 'library.addQuestion.formats.progressPhoto', subtitleKey: 'library.addQuestion.formats.progressPhotoSubtitle' },
  { id: 'metrics', labelKey: 'library.addQuestion.formats.metrics', subtitleKey: 'library.addQuestion.formats.metricsSubtitle' },
];

const GENERAL_FORMATS: QuestionFormat[] = [
  { id: 'text', labelKey: 'library.addQuestion.formats.text', subtitleKey: 'library.addQuestion.formats.textSubtitle' },
  { id: 'number', labelKey: 'library.addQuestion.formats.number', subtitleKey: 'library.addQuestion.formats.numberSubtitle' },
  { id: 'multipleChoice', labelKey: 'library.addQuestion.formats.multipleChoice', subtitleKey: 'library.addQuestion.formats.multipleChoiceSubtitle' },
  { id: 'scale', labelKey: 'library.addQuestion.formats.scale', subtitleKey: 'library.addQuestion.formats.scaleSubtitle' },
  { id: 'yesNo', labelKey: 'library.addQuestion.formats.yesNo', subtitleKey: 'library.addQuestion.formats.yesNoSubtitle' },
  { id: 'images', labelKey: 'library.addQuestion.formats.images', subtitleKey: 'library.addQuestion.formats.imagesSubtitle' },
  { id: 'videos', labelKey: 'library.addQuestion.formats.videos', subtitleKey: 'library.addQuestion.formats.videosSubtitle' },
  { id: 'date', labelKey: 'library.addQuestion.formats.date', subtitleKey: 'library.addQuestion.formats.dateSubtitle' },
  { id: 'rating', labelKey: 'library.addQuestion.formats.rating', subtitleKey: 'library.addQuestion.formats.ratingSubtitle' },
  { id: 'signature', labelKey: 'library.addQuestion.formats.signature', subtitleKey: 'library.addQuestion.formats.signatureSubtitle' },
];

export default function AddQuestionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    formType: 'questionnaire' | 'checkIn';
    formId: string;
    // Edit mode params
    editMode?: string;
    questionId?: string;
    questionText?: string;
    questionFormat?: string;
    questionRequired?: string;
    questionOptions?: string;
    questionScaleFrom?: string;
    questionScaleTo?: string;
    questionMediaCount?: string;
    questionMetricId?: string;
    questionMetricName?: string;
    // Existing questions info
    hasProgressPhoto?: string;
    usedMetricIds?: string;
    hideMetrics?: string;
  }>();

  const isEditMode = params.editMode === 'true';
  const hasExistingProgressPhoto = params.hasProgressPhoto === 'true';
  const shouldHideMetrics = params.hideMetrics === 'true';
  const usedMetricIds: string[] = params.usedMetricIds ? JSON.parse(params.usedMetricIds) : [];

  const { colors: themeColors } = useThemePreference();
  const preset = useThemeStore((state) => state.preset);
  const isDefaultPreset = preset === 'default';
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { triggerQuestionSelect } = useModalCallbacks();

  // Format picker modal state
  const [formatModalVisible, setFormatModalVisible] = useState(false);
  // Metric picker modal state
  const [metricModalVisible, setMetricModalVisible] = useState(false);
  const [metricSearchQuery, setMetricSearchQuery] = useState('');
  // Discard dialog state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Form state - initialize from params if in edit mode
  const [selectedFormat, setSelectedFormat] = useState<string | null>(
    isEditMode && params.questionFormat ? params.questionFormat : null
  );
  const [questionText, setQuestionText] = useState(
    isEditMode && params.questionText ? params.questionText : ''
  );
  const [isRequired, setIsRequired] = useState(
    isEditMode ? params.questionRequired !== 'false' : true
  );
  const [options, setOptions] = useState<string[]>(
    isEditMode && params.questionOptions ? JSON.parse(params.questionOptions) : ['']
  );
  const [scaleFrom, setScaleFrom] = useState(
    isEditMode && params.questionScaleFrom ? params.questionScaleFrom : '1'
  );
  const [scaleTo, setScaleTo] = useState(
    isEditMode && params.questionScaleTo ? params.questionScaleTo : '10'
  );
  const [mediaCount, setMediaCount] = useState(
    isEditMode && params.questionMediaCount ? parseInt(params.questionMediaCount, 10) : 1
  );
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(
    isEditMode && params.questionMetricId ? params.questionMetricId : null
  );
  const [selectedMetricName, setSelectedMetricName] = useState<string | null>(
    isEditMode && params.questionMetricName ? params.questionMetricName : null
  );

  // Fetch metrics for metric question type
  const { data: metrics = [] } = useQuery({
    queryKey: ['metrics'],
    queryFn: getAllMetrics,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Filter metrics: exclude already used ones (unless editing this question's metric)
  const availableMetrics = useMemo(() => {
    return metrics.filter(metric => {
      // If editing and this is the current question's metric, include it
      if (isEditMode && params.questionMetricId === metric.id) {
        return true;
      }
      // Otherwise, exclude used metrics
      return !usedMetricIds.includes(metric.id);
    });
  }, [metrics, usedMetricIds, isEditMode, params.questionMetricId]);

  // Filter metrics based on search
  const filteredMetrics = useMemo(() => {
    if (!metricSearchQuery.trim()) {
      return availableMetrics;
    }
    const query = metricSearchQuery.toLowerCase().trim();
    return availableMetrics.filter(metric =>
      fuzzyMatch(metric.name.toLowerCase(), query) ||
      (metric.description && fuzzyMatch(metric.description.toLowerCase(), query))
    );
  }, [availableMetrics, metricSearchQuery]);

  // Filter format options based on existing questions and context
  const filteredSyncsWithFormats = useMemo(() => {
    return SYNCS_WITH_FORMATS.filter(format => {
      // If editing a progressPhoto question, don't hide it
      if (format.id === 'progressPhoto' && isEditMode && params.questionFormat === 'progressPhoto') {
        return true;
      }
      // Hide progressPhoto if already exists
      if (format.id === 'progressPhoto' && hasExistingProgressPhoto) {
        return false;
      }
      // If editing a metrics question, don't hide it even if shouldHideMetrics is true
      if (format.id === 'metrics' && isEditMode && params.questionFormat === 'metrics') {
        return true;
      }
      // Hide metrics based on context (library page or no client metrics)
      if (format.id === 'metrics' && shouldHideMetrics) {
        return false;
      }
      return true;
    });
  }, [hasExistingProgressPhoto, isEditMode, params.questionFormat, shouldHideMetrics]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  }, [router, isDirty]);

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleFormatSelect = useCallback((format: string) => {
    setSelectedFormat(format);
    setFormatModalVisible(false);

    // Reset format-specific fields
    if (format === 'multipleChoice') {
      setOptions(['']);
    }
    if (format === 'scale') {
      setScaleFrom('1');
      setScaleTo('10');
    }
    if (format === 'images' || format === 'videos') {
      setMediaCount(1);
    }
    if (format !== 'metrics') {
      setSelectedMetricId(null);
      setSelectedMetricName(null);
    }
  }, []);

  const handleMetricSelect = useCallback((metric: Metric) => {
    setSelectedMetricId(metric.id);
    setSelectedMetricName(metric.name);
    setMetricModalVisible(false);
    setMetricSearchQuery('');
  }, []);

  const handleClearMetric = useCallback(() => {
    setSelectedMetricId(null);
    setSelectedMetricName(null);
  }, []);

  const handleAddOption = useCallback(() => {
    setOptions(prev => [...prev, '']);
  }, []);

  const handleRemoveOption = useCallback((index: number) => {
    if (options.length > 1) {
      setOptions(prev => prev.filter((_, i) => i !== index));
    }
  }, [options.length]);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const isValid = useMemo(() => {
    if (!questionText.trim() || !selectedFormat) return false;

    if (selectedFormat === 'multipleChoice') {
      return options.some(opt => opt.trim() !== '');
    }
    if (selectedFormat === 'scale') {
      return scaleFrom.trim() !== '' && scaleTo.trim() !== '';
    }
    if (selectedFormat === 'metrics') {
      return !!selectedMetricId;
    }
    return true;
  }, [questionText, selectedFormat, options, scaleFrom, scaleTo, selectedMetricId]);

  // Check if form has changed from original values (only relevant in edit mode)
  const hasChanged = useMemo(() => {
    if (!isEditMode) return true; // In add mode, always allow save if valid

    // Compare current values with original params
    if (questionText !== (params.questionText || '')) return true;
    if (selectedFormat !== (params.questionFormat || null)) return true;
    if (isRequired !== (params.questionRequired !== 'false')) return true;

    // Compare format-specific fields
    if (selectedFormat === 'multipleChoice') {
      const originalOptions: string[] = params.questionOptions ? JSON.parse(params.questionOptions) : [''];
      if (JSON.stringify(options) !== JSON.stringify(originalOptions)) return true;
    }
    if (selectedFormat === 'scale') {
      if (scaleFrom !== (params.questionScaleFrom || '1')) return true;
      if (scaleTo !== (params.questionScaleTo || '10')) return true;
    }
    if (selectedFormat === 'images' || selectedFormat === 'videos') {
      const originalMediaCount = params.questionMediaCount ? parseInt(params.questionMediaCount, 10) : 1;
      if (mediaCount !== originalMediaCount) return true;
    }
    if (selectedFormat === 'metrics') {
      if (selectedMetricId !== (params.questionMetricId || null)) return true;
    }

    return false;
  }, [isEditMode, questionText, selectedFormat, isRequired, options, scaleFrom, scaleTo, mediaCount, selectedMetricId, params]);

  // Combine validation and change detection for save button
  const canSave = isValid && hasChanged;

  // Check if the form is dirty (has any unsaved changes)
  const isDirty = useMemo(() => {
    if (isEditMode) {
      // In edit mode, dirty if something has changed from original
      return hasChanged;
    }
    // In add mode, dirty if user has started filling the form
    return selectedFormat !== null || questionText.trim() !== '';
  }, [isEditMode, hasChanged, selectedFormat, questionText]);

  const selectedFormatInfo = useMemo(() => {
    if (!selectedFormat) return null;
    const allFormats = [...SYNCS_WITH_FORMATS, ...GENERAL_FORMATS];
    return allFormats.find(f => f.id === selectedFormat);
  }, [selectedFormat]);

  const handleSave = useCallback(() => {
    if (!canSave) return;

    // Create question object - preserve ID in edit mode, create temp ID for new
    const newQuestion: Question = {
      id: isEditMode && params.questionId ? params.questionId : `temp-${Date.now()}`,
      question: questionText.trim(),
      required: isRequired,
      format: selectedFormat!,
    };

    if (selectedFormat === 'multipleChoice') {
      newQuestion.options = options.filter(opt => opt.trim() !== '');
    }
    if (selectedFormat === 'scale') {
      newQuestion.scaleFrom = scaleFrom;
      newQuestion.scaleTo = scaleTo;
    }
    if (selectedFormat === 'images' || selectedFormat === 'videos') {
      newQuestion.mediaCount = mediaCount;
    }
    if (selectedFormat === 'metrics' && selectedMetricId) {
      newQuestion.metricId = selectedMetricId;
      if (selectedMetricName) {
        newQuestion.metricName = selectedMetricName;
      }
    }

    // Pass the question to the parent via callback (no API call)
    haptics.success();
    triggerQuestionSelect(newQuestion);
    handleClose();
  }, [canSave, questionText, isRequired, selectedFormat, options, scaleFrom, scaleTo, mediaCount, selectedMetricId, selectedMetricName, triggerQuestionSelect, handleClose, isEditMode, params.questionId]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  const renderFormatRow = (format: QuestionFormat, index: number) => (
    <React.Fragment key={format.id}>
      {index > 0 && <Separator />}
      <PressableOpacity
        style={styles.formatRow}
        onPress={() => handleFormatSelect(format.id)}
      >
        <View style={styles.formatInfo}>
          <Text style={[styles.formatLabel, { color: themeColors.text }]}>
            {t(format.labelKey)}
          </Text>
          <Text style={[styles.formatSubtitle, { color: themeColors.mutedText }]} numberOfLines={1}>
            {t(format.subtitleKey)}
          </Text>
        </View>
        {selectedFormat === format.id && (
          <Check {...({ size: 20, color: themeColors.primary } as any)} />
        )}
      </PressableOpacity>
    </React.Fragment>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Header with gradient */}
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
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {isEditMode ? t('library.addQuestion.editTitle') : t('library.addQuestion.title')}
          </Text>
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleSave}
            size="md"
            variant={canSave ? 'primary' : 'default'}
            disabled={!canSave}
          />
        </View>
      </View>

      {/* Content */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {/* Format type selector */}
        <PressableOpacity onPress={() => setFormatModalVisible(true)}>
          <Card variant="form">
            <View style={styles.formatTypeLabelRow}>
              <Text style={[styles.formatTypeLabel, { color: themeColors.mutedText }]}>
                {t('library.addQuestion.questionType')}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>
            <View style={styles.formatTypeValueRow}>
              <Text style={[styles.formatTypeValue, { color: selectedFormatInfo ? themeColors.text : themeColors.mutedText }]}>
                {selectedFormatInfo ? t(selectedFormatInfo.labelKey) : t('library.addQuestion.selectType')}
              </Text>
              <ChevronDown {...({ size: 20, color: themeColors.mutedText } as any)} />
            </View>
          </Card>
        </PressableOpacity>

        {/* Metric selector - shown directly under question type when metrics format is selected */}
        {selectedFormat === 'metrics' && (
          <DropdownInput
            label={t('library.addQuestion.selectMetric')}
            value={selectedMetricName || ''}
            placeholder={t('library.addQuestion.selectMetricPlaceholder')}
            onPress={() => setMetricModalVisible(true)}
            onClear={selectedMetricId ? handleClearMetric : undefined}
            required
          />
        )}

        <TextAreaInput
          label={t('library.addQuestion.question')}
          value={questionText}
          onChangeText={setQuestionText}
          placeholder={t('library.addQuestion.questionPlaceholder')}
          required
          numberOfLines={3}
          minHeight={60}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: themeColors.text }]}>
            {t('library.addQuestion.required')}
          </Text>
          <Switch
            value={isRequired}
            onValueChange={setIsRequired}
            {...(!isDefaultPreset && {
              trackColor: { false: themeColors.surfaceSecondary, true: themeColors.primary },
              thumbColor: isRequired ? themeColors.primaryForeground : themeColors.text,
            })}
          />
        </View>

        {/* Format-specific fields */}
        {selectedFormat === 'multipleChoice' && (
          <View style={styles.optionsSection}>
            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <View style={styles.optionInputWrapper}>
                  <InputBox
                    label={t('library.addQuestion.optionNumber', { number: index + 1 })}
                    value={option}
                    onChangeText={(value) => handleOptionChange(index, value)}
                    placeholder={t('library.addQuestion.optionPlaceholder')}
                    required={index === 0}
                  />
                </View>
                {options.length > 1 && (
                  <PressableScale
                    style={[styles.removeOptionButton, { backgroundColor: themeColors.surfacePrimary }]}
                    onPress={() => handleRemoveOption(index)}
                  >
                    <Trash2 {...({ size: 18, color: themeColors.mutedText } as any)} />
                  </PressableScale>
                )}
              </View>
            ))}
            <PressableScale
              style={[styles.addOptionButton, { backgroundColor: themeColors.surfacePrimary }]}
              onPress={handleAddOption}
            >
              <Plus {...({ size: 18, color: themeColors.text } as any)} />
              <Text style={[styles.addOptionText, { color: themeColors.text }]}>
                {t('library.addQuestion.addOption')}
              </Text>
            </PressableScale>
          </View>
        )}

        {selectedFormat === 'scale' && (
          <View style={styles.scaleSection}>
            <View style={styles.scaleRow}>
              <View style={styles.scaleInput}>
                <InputBox
                  label={t('library.addQuestion.from')}
                  value={scaleFrom}
                  onChangeText={setScaleFrom}
                  placeholder="1 / Easy"
                  required
                />
              </View>
              <View style={styles.scaleInput}>
                <InputBox
                  label={t('library.addQuestion.to')}
                  value={scaleTo}
                  onChangeText={setScaleTo}
                  placeholder="10 / Hard"
                  required
                />
              </View>
            </View>
          </View>
        )}

        {(selectedFormat === 'images' || selectedFormat === 'videos') && (
          <View style={styles.mediaCountSection}>
            <Text style={[styles.mediaCountLabel, { color: themeColors.text }]}>
              {selectedFormat === 'images'
                ? t('library.addQuestion.numberOfImages')
                : t('library.addQuestion.numberOfVideos')}
            </Text>
            <View style={styles.mediaCountButtons}>
              {[1, 2, 3, 4, 5].map((count) => (
                <PressableScale
                  key={count}
                  style={[
                    styles.mediaCountButton,
                    {
                      backgroundColor: mediaCount === count ? themeColors.primary : themeColors.surfacePrimary,
                    },
                  ]}
                  onPress={() => setMediaCount(count)}
                >
                  <Text
                    style={[
                      styles.mediaCountButtonText,
                      { color: mediaCount === count ? themeColors.primaryForeground : themeColors.text },
                    ]}
                  >
                    {count}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Format Selection Modal */}
      <Modal
        visible={formatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormatModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
          {/* Modal Header with gradient */}
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
            <View
              style={[
                styles.header,
                {
                  paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                },
              ]}
            >
              <IconButton
                icon={{ sf: 'xmark', IconComponent: X }}
                onPress={() => setFormatModalVisible(false)}
                size="md"
                color={themeColors.text}
              />
              <Text style={[styles.title, { color: themeColors.text }]}>
                {t('library.addQuestion.questionType')}
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          {/* Format List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.modalScrollContent, { paddingTop: headerHeight + 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Syncs With section - only show if there are formats to display */}
            {filteredSyncsWithFormats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
                  {t('library.addQuestion.syncsWith')}
                </Text>
                <Card>
                  {filteredSyncsWithFormats.map((format, index) =>
                    renderFormatRow(format, index)
                  )}
                </Card>
              </View>
            )}

            {/* General section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
                {t('library.addQuestion.general')}
              </Text>
              <Card>
                {GENERAL_FORMATS.map((format, index) =>
                  renderFormatRow(format, index)
                )}
              </Card>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Metric Selection Modal */}
      <Modal
        visible={metricModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setMetricModalVisible(false);
          setMetricSearchQuery('');
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
          {/* Modal Header with gradient */}
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
            <View
              style={[
                styles.header,
                {
                  paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                },
              ]}
            >
              <IconButton
                icon={{ sf: 'xmark', IconComponent: X }}
                onPress={() => {
                  setMetricModalVisible(false);
                  setMetricSearchQuery('');
                }}
                size="md"
                color={themeColors.text}
              />
              <Text style={[styles.title, { color: themeColors.text }]}>
                {t('library.addQuestion.selectMetric')}
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          {/* Metric List */}
          <View style={styles.metricListContainer}>
            <FlashList
              data={filteredMetrics}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const isSelected = selectedMetricId === item.id;
                const isLastItem = index === filteredMetrics.length - 1;

                return (
                  <View>
                    <PressableOpacity
                      onPress={() => handleMetricSelect(item)}
                      style={styles.metricRowContent}
                    >
                      <View style={[styles.metricIconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                        <PlatformIcon
                          sf="chart.bar.fill"
                          IconComponent={Activity}
                          size={24}
                          color={themeColors.text}
                        />
                      </View>
                      <View style={styles.metricTextContent}>
                        <Text
                          style={[styles.metricName, { color: themeColors.text }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View style={styles.metricMetaRow}>
                          <Text style={[styles.metricMetaText, { color: themeColors.mutedText }]}>
                            {item.unit}
                          </Text>
                          {item.description && (
                            <>
                              <Text style={[styles.metricMetaDot, { color: themeColors.mutedText }]}>•</Text>
                              <Text style={[styles.metricMetaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                                {item.description}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <Check {...({ size: 20, color: themeColors.primary } as any)} />
                      )}
                    </PressableOpacity>

                    {!isLastItem && (
                      <View style={styles.metricSeparatorContainer}>
                        <View
                          style={[
                            styles.metricSeparator,
                            { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              }}
              contentContainerStyle={[styles.metricListContent, { paddingTop: headerHeight + 16 }]}
              ListHeaderComponent={
                <View style={styles.metricSearchContainer}>
                  <SearchBar
                    value={metricSearchQuery}
                    onChangeText={setMetricSearchQuery}
                    placeholder={t('general.searchPlaceholder')}
                  />
                </View>
              }
              ListEmptyComponent={
                <EmptyState message={availableMetrics.length === 0 ? t('library.addQuestion.noAvailableMetrics') : t('library.empty.metrics')} />
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Dialog
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={t('common.discardChanges')}
        message={t('common.discardChangesMessage')}
        buttons={[
          { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
          { label: t('common.discard'), onPress: handleDiscard, variant: 'destructive' }
        ]}
      />
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    ...typography.p1,
    fontWeight: '600',
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  formatInfo: {
    flex: 1,
    marginRight: 12,
  },
  formatLabel: {
    ...typography.p1,
    fontWeight: '500',
  },
  formatSubtitle: {
    ...typography.p3,
    marginTop: 2,
  },
  formatTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  formatTypeLabel: {
    ...typography.p4,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  formatTypeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  formatTypeValue: {
    ...typography.p1,
    flex: 1,
  },
  optionsSection: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  optionInputWrapper: {
    flex: 1,
  },
  removeOptionButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addOptionText: {
    ...typography.p2,
    fontWeight: '500',
  },
  scaleSection: {
    gap: 12,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scaleInput: {
    flex: 1,
  },
  mediaCountSection: {
    gap: 12,
  },
  mediaCountLabel: {
    ...typography.p2,
    fontWeight: '500',
  },
  mediaCountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaCountButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaCountButtonText: {
    ...typography.p1,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {
    ...typography.p1,
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 24,
  },
  // Metric modal styles
  metricListContainer: {
    flex: 1,
  },
  metricSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  metricListContent: {
    paddingBottom: 40,
  },
  metricRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  metricIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricTextContent: {
    flex: 1,
    marginRight: 8,
  },
  metricName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricMetaText: {
    ...typography.p3,
  },
  metricMetaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  metricSeparatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  metricSeparator: {
    height: 1,
  },
});
