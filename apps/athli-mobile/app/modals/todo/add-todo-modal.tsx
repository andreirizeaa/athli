import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableOpacity } from 'pressto';
import { X, Check, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SelectInput, SelectionInput } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { hexToRgba } from '@/utils/colorUtils';
import { haptics } from '@/utils/haptics';
import { useCoachOwnTodos } from '@/hooks/useCoachTodo';
import type { Client } from '@/types';

type TodoType = 'general' | 'client';

export default function AddTodoModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { setClientSelectCallback, setDateSelectCallback } = useModalCallbacks();
  const { createOwnTodo, isCreating } = useCoachOwnTodos();

  // Refs
  const titleInputRef = useRef<TextInput>(null);

  // Form state
  const [type, setType] = useState<TodoType>('general');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Auto-focus title input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Dialog state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Type options
  const typeOptions = useMemo(() => [
    { value: 'general' as const, label: t('todos.addTask.typeGeneral') },
    { value: 'client' as const, label: t('todos.addTask.typeClient') },
  ], [t]);

  // Form validation
  const { hasChanges, canComplete } = useMemo(() => {
    const trimmedTitle = title.trim();
    const formValid = trimmedTitle.length > 0;
    const clientValid = type === 'general' || selectedClient !== null;

    const changes = trimmedTitle.length > 0 ||
      description.trim().length > 0 ||
      selectedDate !== null ||
      selectedClient !== null ||
      type !== 'general';

    return {
      hasChanges: changes,
      canComplete: formValid && clientValid,
    };
  }, [title, description, selectedDate, selectedClient, type]);

  // Format date for display
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleCloseWithConfirmation = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      handleClose();
    }
  }, [hasChanges, handleClose]);

  const handleSave = useCallback(async () => {
    if (!canComplete || isCreating) return;

    try {
      await createOwnTodo({
        title: title.trim(),
        information: description.trim() || undefined,
        type: type,
        client_id: type === 'client' ? selectedClient?.id : undefined,
        due_date: selectedDate?.toISOString(),
      });
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
    }
  }, [canComplete, isCreating, createOwnTodo, title, description, type, selectedClient, selectedDate, router]);

  const handleSelectClient = useCallback(() => {
    setClientSelectCallback((client: Client) => {
      setSelectedClient(client);
    });
    router.push('/modals/client/search-client-modal');
  }, [setClientSelectCallback, router]);

  const handleSelectDate = useCallback(() => {
    setDateSelectCallback((date: Date) => {
      setSelectedDate(date);
    });
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: {
        selectedDate: selectedDate?.toISOString(),
        allowFuture: 'true',
        allowPast: 'false',
      },
    });
  }, [setDateSelectCallback, router, selectedDate]);

  // Clear client when switching to general type
  useEffect(() => {
    if (type === 'general') {
      setSelectedClient(null);
    }
  }, [type]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Fixed Header with gradient */}
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
            onPress={handleCloseWithConfirmation}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('todos.addTask.title')}
          </Text>
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleSave}
            size="md"
            variant={canComplete && !isCreating ? 'primary' : 'default'}
            disabled={!canComplete || isCreating}
            loading={isCreating}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.formContent,
          { paddingTop: headerHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={40}
      >
        {/* Type Select */}
        <SelectInput
          label={t('todos.addTask.type')}
          value={type}
          onChange={(val) => setType(val || 'general')}
          options={typeOptions}
          required
          clearable={false}
        />

        {/* Client Select - Only show when type is 'client' */}
        {type === 'client' && (
          <PressableOpacity onPress={handleSelectClient}>
            <Card variant="form">
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: themeColors.mutedText }]}>
                  {t('todos.addTask.typeClient')}
                </Text>
                <Text style={styles.requiredAsterisk}>*</Text>
              </View>
              {selectedClient ? (
                <View style={styles.clientRow}>
                  {selectedClient.avatarUrl ? (
                    <Image
                      source={{ uri: selectedClient.avatarUrl }}
                      style={styles.clientAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.clientAvatarPlaceholder, { backgroundColor: themeColors.surfaceSecondary }]}>
                      <Text style={[styles.clientAvatarInitial, { color: themeColors.text }]}>
                        {selectedClient.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.clientName, { color: themeColors.text }]}>
                    {selectedClient.name}
                  </Text>
                  <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                </View>
              ) : (
                <View style={styles.placeholderRow}>
                  <Text style={[styles.placeholder, { color: themeColors.mutedText }]}>
                    {t('todos.addTask.selectClient')}
                  </Text>
                  <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                </View>
              )}
            </Card>
          </PressableOpacity>
        )}

        {/* Title Input */}
        <InputBox
          ref={titleInputRef}
          label={t('todos.addTask.taskTitle')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('todos.addTask.titlePlaceholder')}
          required
        />

        {/* Description Input */}
        <TextAreaInput
          label={t('todos.addTask.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('todos.addTask.descriptionPlaceholder')}
          numberOfLines={3}
          minHeight={60}
        />

        {/* Date Select */}
        <SelectionInput
          label={t('todos.addTask.dueDate')}
          value={selectedDate ? formatDate(selectedDate) : ''}
          onPress={handleSelectDate}
          placeholder={t('todos.addTask.selectDate')}
        />
      </KeyboardAwareScrollView>

      {/* Discard Dialog */}
      <Dialog
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={t('common.discardChanges')}
        message={t('common.discardChangesMessage')}
        buttons={[
          { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
          { label: t('common.discard'), onPress: handleClose, variant: 'destructive' },
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
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  inputLabel: {
    ...typography.p4,
  },
  requiredAsterisk: {
    ...typography.p4,
    color: '#EF4444',
    marginLeft: 2,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  clientAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  clientAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarInitial: {
    ...typography.p3,
    fontWeight: '600',
  },
  clientName: {
    ...typography.p1,
    flex: 1,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  placeholder: {
    ...typography.p1,
    flex: 1,
  },
});
