import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { addClient } from '@/services/client-service';
import { InputBox, ButtonTabGroup } from '@/components/form-inputs';

type AddClientContentProps = {
  onClose: () => void;
  onClientAdded?: () => void;
  headerHeight?: number;
};

export type AddClientContentRef = {
  canComplete: boolean;
  handleComplete: () => Promise<void>;
};

type ClientCategory = 'online' | 'in-person' | 'hybrid';

export const AddClientContent = forwardRef<AddClientContentRef, AddClientContentProps>(
  ({ onClose, onClientAdded, headerHeight = 56 }, ref) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState<ClientCategory>('online');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim());

    const canComplete = name.trim() !== '' && isEmailValid;

    const handleComplete = async () => {
      if (!canComplete || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await addClient({
          firstName: name.trim(),
          lastName: '',
          email: email.trim(),
          type: category,
        });
        setName('');
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

    const categoryOptions = useMemo(() => [
      { value: 'online' as const, label: t('clients.addClientModal.online') },
      { value: 'in-person' as const, label: t('clients.addClientModal.inPerson') },
      { value: 'hybrid' as const, label: t('clients.addClientModal.hybrid') },
    ], [t]);

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <InputBox
          label={t('clients.addClientModal.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('clients.addClientModal.namePlaceholder')}
        />

        <InputBox
          label={t('clients.addClientModal.email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('clients.addClientModal.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <ButtonTabGroup
          options={categoryOptions}
          value={category}
          onChange={setCategory}
        />
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
    paddingBottom: 16,
    gap: 12,
  },
});
