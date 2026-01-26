import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';
import { useTranslations } from '@/stores';
import { addClient } from '@/services/client-service';
import { InputBox, SelectInput } from '@/components/ui/form-inputs';
import { Dialog } from '@/components/ui/dialog';

type AddClientContentProps = {
  onClose: () => void;
  onClientAdded?: () => void;
  headerHeight?: number;
};

export type AddClientContentRef = {
  canComplete: boolean;
  isLoading: boolean;
  handleComplete: () => Promise<void>;
};

type ClientCategory = 'online' | 'in-person' | 'hybrid';

export const AddClientContent = forwardRef<AddClientContentRef, AddClientContentProps>(
  ({ onClose, onClientAdded, headerHeight = 56 }, ref) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState<ClientCategory>('online');

    // Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim());

    // TanStack Query mutation
    const addClientMutation = useMutation({
      mutationFn: addClient,
      onSuccess: async () => {
        // Refetch to update the cache and trigger Zustand store update
        await queryClient.refetchQueries({ queryKey: ['clients'] });

        // Success haptic feedback
        haptics.success();

        // Reset form and close modal
        setName('');
        setEmail('');
        setCategory('online');
        onClose();
        onClientAdded?.();
      },
      onError: (error: Error) => {
        // Error haptic feedback
        haptics.error();

        // Show error dialog
        setErrorMessage(error.message || t('clients.addClientModal.errorAdding'));
        setShowErrorDialog(true);
      },
    });

    const canComplete = name.trim() !== '' && isEmailValid && !addClientMutation.isPending;

    const handleComplete = async () => {
      if (!canComplete) return;

      addClientMutation.mutate({
        firstName: name.trim(),
        lastName: '',
        email: email.trim(),
        coachingType: category,
      });
    };

    useImperativeHandle(ref, () => ({
      canComplete,
      isLoading: addClientMutation.isPending,
      handleComplete,
    }), [canComplete, addClientMutation.isPending]);

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
        keyboardDismissMode="on-drag"
      >
        <InputBox
          label={t('clients.addClientModal.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('clients.addClientModal.namePlaceholder')}
          required
        />

        <InputBox
          label={t('clients.addClientModal.email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('clients.addClientModal.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />

        <SelectInput
          label={t('clients.editClientModal.type')}
          value={category}
          onChange={setCategory}
          options={categoryOptions}
          placeholder={t('clients.editClientModal.typePlaceholder')}
          required
        />

        <Dialog
          visible={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          title={t('general.error')}
          message={errorMessage}
          showCloseIcon={false}
          buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
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
