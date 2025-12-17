import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity, Platform, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';

import { useThemePreference } from '@/contexts/useColorScheme';
import { typography, iconSizes } from '@/constants/typography';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { getClients, updateClient, type Client } from '@/services/client-service';

export default function EditClientDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<Client | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'online' | 'in-person' | 'hybrid'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim() === '' || emailRegex.test(email.trim());

  // Tick button is enabled unless a field is completely empty
  const canComplete = firstName.trim() !== '' && lastName.trim() !== '' && email.trim() !== '' && isEmailValid;

  // Load client data
  useEffect(() => {
    const loadClient = async () => {
      if (!params.id) {
        setIsLoading(false);
        return;
      }

      try {
        const clients = await getClients();
        const foundClient = clients.find((c) => c.id === params.id);
        if (foundClient) {
          setClient(foundClient);
          setFirstName(foundClient.firstName || '');
          setLastName(foundClient.lastName || '');
          setEmail(foundClient.email || '');
          setCategory(foundClient.type || 'online');
        }
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClient();
  }, [params.id]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!canComplete || isSubmitting || !client) return;

    setIsSubmitting(true);
    try {
      await updateClient(client.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        type: category,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to update client:', error);
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>Edit details</Text>
          <View style={styles.closeButton} />
        </View>
      </View>
    );
  }

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
        <Text style={[styles.title, { color: themeColors.text }]}>Edit details</Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleSave}
          size="md"
          color={canComplete ? themeColors.primary : themeColors.mutedText}
          disabled={!canComplete}
          activeOpacity={canComplete ? 0.7 : 1}
          style={!canComplete ? { opacity: 0.5 } : undefined}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
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
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.buttonGroupButton,
                    isSelected && [
                      styles.buttonGroupButtonActive,
                      { backgroundColor: themeColors.background },
                    ],
                  ]}
                  onPress={() => setCategory(type)}
                  activeOpacity={0.7}
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
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
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
