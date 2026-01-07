import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { PressableOpacity } from 'pressto';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { addClient } from '@/services/client-service';

type AddClientContentProps = {
  onClose: () => void;
  onClientAdded?: () => void;
};

export type AddClientContentRef = {
  canComplete: boolean;
  handleComplete: () => Promise<void>;
};

export const AddClientContent = forwardRef<AddClientContentRef, AddClientContentProps>(
  ({ onClose, onClientAdded }, ref) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState<'online' | 'in-person' | 'hybrid'>('online');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim());

    const canComplete = firstName.trim() !== '' && lastName.trim() !== '' && isEmailValid;

    const handleComplete = async () => {
      if (!canComplete || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await addClient({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          type: category,
        });
        setFirstName('');
        setLastName('');
        setEmail('');
        setCategory('online');
        onClose();
        onClientAdded?.();
      } catch (error) {
        console.error('Failed to add client:', error);
        // Handle error (show toast, etc.)
      } finally {
        setIsSubmitting(false);
      }
    };

    useImperativeHandle(ref, () => ({
      canComplete,
      handleComplete,
    }), [canComplete, isSubmitting]);

    const getCategoryLabel = (type: 'online' | 'in-person' | 'hybrid'): string => {
      if (type === 'in-person') return t('clients.addClientModal.inPerson');
      if (type === 'online') return t('clients.addClientModal.online');
      return t('clients.addClientModal.hybrid');
    };

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card with First Name, Last Name, Email */}
        <Card style={[styles.inputCard, { paddingHorizontal: 16 }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder={t('clients.addClientModal.firstNamePlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={firstName}
              onChangeText={setFirstName}
              textAlignVertical="center"
            />
            <Text style={[styles.inputLabel, { color: themeColors.mutedText }]}>
              {t('clients.addClientModal.firstName')}
            </Text>
          </View>
          <Separator />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder={t('clients.addClientModal.lastNamePlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={lastName}
              onChangeText={setLastName}
              textAlignVertical="center"
            />
            <Text style={[styles.inputLabel, { color: themeColors.mutedText }]}>
              {t('clients.addClientModal.lastName')}
            </Text>
          </View>
          <Separator />
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  color: themeColors.text,
                  borderColor: email.trim() !== '' && !isEmailValid ? '#ef4444' : 'transparent',
                },
              ]}
              placeholder={t('clients.addClientModal.emailPlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlignVertical="center"
            />
            <Text style={[styles.inputLabel, { color: themeColors.mutedText }]}>
              {t('clients.addClientModal.email')}
            </Text>
          </View>
        </Card>

        {/* Toggle Group */}
        <View style={[styles.buttonGroup, { backgroundColor: themeColors.surfaceSecondary }]}>
          {(['online', 'in-person', 'hybrid'] as const).map((type) => {
            const isSelected = category === type;
            return (
              <PressableOpacity
                key={type}
                style={[
                  styles.buttonGroupButton,
                  isSelected && [
                    styles.buttonGroupButtonActive,
                    { backgroundColor: themeColors.background },
                  ],
                ]}
                onPress={() => setCategory(type)}
              >
                <Text
                  style={[
                    styles.buttonGroupText,
                    { color: isSelected ? themeColors.text : themeColors.mutedText },
                    isSelected && styles.buttonGroupTextActive,
                  ]}
                >
                  {getCategoryLabel(type)}
                </Text>
              </PressableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputCard: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  input: {
    ...typography.p2,
    flex: 1,
    padding: 0,
    marginRight: 12,
    flexShrink: 1,
  },
  inputLabel: {
    ...typography.p4,
    minWidth: 80,
    textAlign: 'right',
    flexShrink: 0,
  },
  buttonGroup: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  buttonGroupButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGroupButtonActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonGroupText: {
    ...typography.p2,
    fontWeight: '600',
  },
  buttonGroupTextActive: {
    fontWeight: '700',
  },
});
