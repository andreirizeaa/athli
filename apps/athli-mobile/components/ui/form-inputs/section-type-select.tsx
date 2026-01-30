import React from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { SECTION_TYPES, type SectionType } from '@athli/shared-types';
import { Card } from '@/components/ui/card';

type SectionTypeSelectProps = {
  sectionType: SectionType | null;
  onSectionTypeChange: (type: SectionType) => void;
  duration?: string;
  onDurationChange?: (duration: string) => void;
  rounds?: string;
  onRoundsChange?: (rounds: string) => void;
  // Tabata/HIIT fields
  workSec?: string;
  onWorkSecChange?: (workSec: string) => void;
  restSec?: string;
  onRestSecChange?: (restSec: string) => void;
  // EMOM fields
  intervalSec?: string;
  onIntervalSecChange?: (intervalSec: string) => void;
  durationMin?: string;
  onDurationMinChange?: (durationMin: string) => void;
  metadataErrors?: {
    durationError?: boolean;
    roundsError?: boolean;
    workSecError?: boolean;
    restSecError?: boolean;
    intervalSecError?: boolean;
    durationMinError?: boolean;
  };
  required?: boolean;
};

export const SectionTypeSelect = ({
  sectionType,
  onSectionTypeChange,
  duration = '',
  onDurationChange,
  rounds = '',
  onRoundsChange,
  workSec = '',
  onWorkSecChange,
  restSec = '',
  onRestSecChange,
  intervalSec = '',
  onIntervalSecChange,
  durationMin = '',
  onDurationMinChange,
  metadataErrors = {},
  required = false,
}: SectionTypeSelectProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const selectedType = SECTION_TYPES.find((opt) => opt.value === sectionType);

  return (
    <Card variant="form" style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      {/* Section Type Dropdown */}
      <DropdownMenuWrapper
        options={SECTION_TYPES.map((type) => ({
          label: type.label,
          subtitle: type.description,
          onPress: () => onSectionTypeChange(type.value as SectionType),
        }))}
      >
        <View style={styles.fieldRow}>
          <View style={styles.labelContainer}>
            <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>
              {t('library.addSection.type')}
            </Text>
            {required && <Text style={styles.requiredAsterisk}>*</Text>}
          </View>
          <View style={styles.dropdownValueRow}>
            <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
              {selectedType?.label || t('library.addSection.typePlaceholder')}
            </Text>
            <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
          </View>
        </View>
      </DropdownMenuWrapper>

      {/* Duration field for AMRAP */}
      {sectionType === 'amrap' && onDurationChange && (
        <>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.durationError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.durationError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.duration')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={duration}
                onChangeText={onDurationChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.durationError ? '#EF4444' : themeColors.text },
                ]}
              />
              <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>m</Text>
            </View>
          </View>
        </>
      )}

      {/* Rounds field for Timed and Circuits */}
      {(sectionType === 'timed' || sectionType === 'circuits') && onRoundsChange && (
        <>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.roundsError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.roundsError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.rounds')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={rounds}
                onChangeText={onRoundsChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.roundsError ? '#EF4444' : themeColors.text },
                ]}
              />
            </View>
          </View>
        </>
      )}

      {/* Tabata/HIIT fields: Work, Rest, Rounds */}
      {(sectionType === 'tabata' || sectionType === 'hiit') && onWorkSecChange && onRestSecChange && onRoundsChange && (
        <>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.workSecError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.workSecError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.workSec')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={workSec}
                onChangeText={onWorkSecChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.workSecError ? '#EF4444' : themeColors.text },
                ]}
              />
              <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>s</Text>
            </View>
          </View>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.restSecError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.restSecError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.restSec')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={restSec}
                onChangeText={onRestSecChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.restSecError ? '#EF4444' : themeColors.text },
                ]}
              />
              <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>s</Text>
            </View>
          </View>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.roundsError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.roundsError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.rounds')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={rounds}
                onChangeText={onRoundsChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.roundsError ? '#EF4444' : themeColors.text },
                ]}
              />
            </View>
          </View>
        </>
      )}

      {/* EMOM fields: Interval, Duration */}
      {sectionType === 'emom' && onIntervalSecChange && onDurationMinChange && (
        <>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.intervalSecError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.intervalSecError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.intervalSec')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={intervalSec}
                onChangeText={onIntervalSecChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.intervalSecError ? '#EF4444' : themeColors.text },
                ]}
              />
              <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>s</Text>
            </View>
          </View>
          <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.fieldRow,
              metadataErrors.durationMinError && styles.errorField,
            ]}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: metadataErrors.durationMinError ? '#EF4444' : themeColors.mutedText },
                ]}
              >
                {t('library.section.durationMin')}
              </Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
              <TextInput
                value={durationMin}
                onChangeText={onDurationMinChange}
                placeholder="0"
                placeholderTextColor={themeColors.mutedText}
                keyboardType="number-pad"
                style={[
                  styles.inputField,
                  { color: metadataErrors.durationMinError ? '#EF4444' : themeColors.text },
                ]}
              />
              <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>m</Text>
            </View>
          </View>
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    ...typography.p4,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requiredAsterisk: {
    ...typography.p4,
    color: '#EF4444',
    marginLeft: 2,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownValue: {
    ...typography.p2,
  },
  configDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  inputField: {
    ...typography.p2,
    textAlign: 'right',
    minWidth: 120,
    height: '100%',
  },
  errorField: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
});
