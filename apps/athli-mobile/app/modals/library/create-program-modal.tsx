import React, { useState, useRef } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { createNewProgram } from '@/services/program-service';

export default function CreateProgramModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState(1);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const inputCardRef = useRef<View>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const canContinue = name.trim().length > 0;

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    // Call the program service
    await createNewProgram({
      name: name.trim(),
      description: description.trim() || undefined,
      weeks: selectedWeeks,
    });

    // Close the modal first, then navigate to the create program page
    if (router.canGoBack()) {
      router.back();
    }
    // Use setTimeout to ensure modal closes before navigating
    setTimeout(() => {
      router.push({
        pathname: '/library/create-program',
        params: { name: name.trim() },
      });
    }, 100);
  };

  const TOP_OFFSET = 0;

  const scrollContainerBottomVisible = () => {
    // Let layout settle (KeyboardAvoidingView shifts things)
    setTimeout(() => {
      const sv = scrollViewRef.current;
      const card = inputCardRef.current;
      if (!sv || !card) return;

      (sv as any).measureInWindow((sx: number, sy: number, swidth: number, sheight: number) => {
        card.measureInWindow((cx: number, cy: number, cwidth: number, cheight: number) => {
          // Calculate the bottom of the card
          const cardBottom = cy + cheight;
          // Calculate the bottom of the ScrollView viewport
          const scrollViewBottom = sy + sheight;
          
          // We want the card's bottom to be visible above the keyboard
          // The KeyboardAvoidingView will push content up, but we need to ensure
          // we've scrolled enough so the bottom is in the visible area
          // Add some padding (e.g., 20px) to ensure it's comfortably visible
          const padding = 20;
          const targetBottom = scrollViewBottom - padding;
          
          // If card bottom is below the target, we need to scroll
          if (cardBottom > targetBottom) {
            const delta = cardBottom - targetBottom;
            const targetY = scrollYRef.current + delta;
            sv.scrollTo({ y: Math.max(0, targetY), animated: true });
          }
        });
      });
    }, Platform.OS === 'ios' ? 300 : 150);
  };

  const handleDescriptionFocus = () => scrollContainerBottomVisible();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
            backgroundColor: themeColors.background,
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
          {t('library.createPages.program')}
        </Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleContinue}
          size="md"
          color={canContinue ? themeColors.primary : themeColors.mutedText}
          disabled={!canContinue}
          activeOpacity={canContinue ? 0.7 : 1}
          style={!canContinue ? { opacity: 0.5 } : undefined}
        />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
        <View ref={inputCardRef}>
          <Card style={styles.inputCard}>
          {/* Name Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder={t('library.createModal.namePlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={name}
              onChangeText={setName}
              textAlignVertical="center"
            />
          </View>
          <Separator />
          {/* Weeks Picker Row */}
          <View style={styles.pickerRow}>
            <View style={styles.labelColumn}>
              <Text style={[styles.pickerLabel, { color: themeColors.mutedText }]}>
                {t('library.createModal.weeks')}
              </Text>
            </View>
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedWeeks}
                onValueChange={(itemValue) => setSelectedWeeks(itemValue as number)}
                style={[styles.picker, { color: themeColors.text }]}
                itemStyle={[styles.pickerItem, { color: themeColors.text }]}
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                  <Picker.Item key={week} label={week.toString()} value={week} />
                ))}
              </Picker>
            </View>
          </View>
          <Separator />
          {/* Description Input */}
          <View style={styles.inputRow}>
            <TextInput
              ref={descriptionInputRef}
              style={[styles.input, styles.multilineInput, { color: themeColors.text }]}
              placeholder={t('library.createModal.descriptionPlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={description}
              onChangeText={setDescription}
              onFocus={handleDescriptionFocus}
              multiline
              textAlignVertical="top"
            />
          </View>
        </Card>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputCard: {
    marginTop: 8,
  },
  inputRow: {
    paddingVertical: 12,
    minHeight: 44,
  },
  input: {
    ...typography.p2,
    padding: 0,
  },
  multilineInput: {
    minHeight: 160,
    paddingTop: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    width: '100%',
  },
  pickerColumn: {
    flex: 1,
    width: '70%',
  },
  labelColumn: {
    flex: 1,
    width: '30%',
  },
  picker: {
    width: '100%',
  },
  pickerItem: {
    ...typography.p2,
    fontSize: 13,
  },
  pickerLabel: {
    ...typography.p2,
  },
});

