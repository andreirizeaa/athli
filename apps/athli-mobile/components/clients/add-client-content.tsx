import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View, ScrollView } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { FilledButton } from '@/components/buttons/filled-button';
import { addClient } from '@/services/client-service';

type AddClientContentProps = {
  onClose: () => void;
  onClientAdded?: () => void;
};

export const AddClientContent = ({ onClose, onClientAdded }: AddClientContentProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { height: windowHeight } = useWindowDimensions();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'online' | 'in-person' | 'hybrid'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalContentMinHeight = (windowHeight * 0.8) - 100;
  
  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim());
  
  const isFormValid = firstName.trim() !== '' && lastName.trim() !== '' && isEmailValid;

  const handleClose = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setCategory('online');
    onClose();
  };

  const handleSaveClient = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addClient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        type: category,
      });
      handleClose();
      onClientAdded?.();
    } catch (error) {
      console.error('Failed to add client:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (type: 'online' | 'in-person' | 'hybrid'): string => {
    if (type === 'in-person') return t('clients.addClientModal.inPerson');
    if (type === 'online') return t('clients.addClientModal.online');
    return t('clients.addClientModal.hybrid');
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.modalContent, { minHeight: modalContentMinHeight }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('clients.addClientModal.firstName')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            placeholder={t('clients.addClientModal.firstNamePlaceholder')}
            placeholderTextColor={themeColors.mutedText}
            value={firstName}
            onChangeText={setFirstName}
            textAlignVertical="center"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('clients.addClientModal.lastName')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            placeholder={t('clients.addClientModal.lastNamePlaceholder')}
            placeholderTextColor={themeColors.mutedText}
            value={lastName}
            onChangeText={setLastName}
            textAlignVertical="center"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('clients.addClientModal.email')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.surface,
                borderColor: email.trim() !== '' && !isEmailValid ? '#ef4444' : themeColors.border,
                color: themeColors.text,
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
          {email.trim() !== '' && !isEmailValid && (
            <Text style={[styles.errorText, { color: '#ef4444' }]}>
              {t('clients.addClientModal.emailError')}
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('clients.addClientModal.category')}</Text>
          <View style={styles.buttonGroup}>
            {(['online', 'in-person', 'hybrid'] as const).map((type) => {
              const isSelected = category === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: isSelected ? themeColors.primary : themeColors.surface,
                      borderColor: isSelected ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setCategory(type)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                    ]}
                  >
                    {getCategoryLabel(type)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <FilledButton
          label={isSubmitting ? t('clients.addClientModal.inviting') : t('clients.addClientModal.invite')}
          onPress={handleSaveClient}
          disabled={!isFormValid || isSubmitting}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...typography.p4,
    marginBottom: 8,
  },
  input: {
    ...typography.p3,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 48,
  },
  errorText: {
    ...typography.p4,
    marginTop: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonText: {
    ...typography.p3,
  },
  buttonsContainer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
});
