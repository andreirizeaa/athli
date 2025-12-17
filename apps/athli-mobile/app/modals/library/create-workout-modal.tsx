import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { createNewWorkout } from '@/services/workout-service';

export default function CreateWorkoutModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const canContinue = name.trim().length > 0;

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    // Call the workout service
    await createNewWorkout({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    // Close the modal first, then navigate to the create workout page
    if (router.canGoBack()) {
      router.back();
    }
    // Use setTimeout to ensure modal closes before navigating
    setTimeout(() => {
      router.push({
        pathname: '/library/create-workout',
        params: { name: name.trim() },
      });
    }, 100);
  };

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
          {t('library.createPages.workout')}
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
          {/* Description Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.multilineInput, { color: themeColors.text }]}
              placeholder={t('library.createModal.descriptionPlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>
        </Card>
      </ScrollView>
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
    minHeight: 100,
    paddingTop: 8,
  },
});

