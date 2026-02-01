import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { useThemePreference, useColorScheme } from '@/stores';
import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import {
  InputBox,
  SelectInput,
  DateSelectInput,
  HeightInput,
  CountrySelectorInput,
  PhoneNumberInput,
  ProfilePictureInput,
  type Country,
  type PhoneNumber,
} from '@/components/ui/form-inputs';
import { COUNTRIES } from '@/components/ui/form-inputs/countries-data';
import { getClients, updateClient, type Client, type UpdateClientData } from '@/services/client-service';
import { hexToRgba } from '@/utils/colorUtils';
import { Dialog } from '@/components/ui/dialog';

// Helper to find country by name
const findCountryByName = (name: string): Country | null => {
  if (!name) return null;
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
};

// Helper to parse phone number string into PhoneNumber type
const parsePhoneNumber = (phoneString: string): PhoneNumber | null => {
  if (!phoneString) return null;

  // Extract only digits from the phone string
  const digits = phoneString.replace(/\D/g, '');
  if (!digits) return null;

  // Try to find matching country by dial code
  // Start with longer dial codes first (some countries have 4-digit codes)
  for (let len = 4; len >= 1; len--) {
    const possibleCode = '+' + digits.substring(0, len);
    const country = COUNTRIES.find((c) => c.dialCode === possibleCode);
    if (country) {
      return {
        country,
        number: digits.substring(len),
      };
    }
  }

  // Default to first country if no match found
  return {
    country: COUNTRIES[0],
    number: digits,
  };
};

// Type for tracking original values
type OriginalValues = {
  name: string;
  email: string;
  category: 'online' | 'in-person' | 'hybrid';
  dateOfBirth: Date | null;
  height: string;
  country: Country | null;
  phoneNumber: PhoneNumber | null;
  avatarUrl: string;
};

export default function EditClientDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  // Handle case where id might be an array (Expo Router quirk)
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'online' | 'in-person' | 'hybrid'>('online');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [height, setHeight] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [originalValues, setOriginalValues] = useState<OriginalValues | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showPermissionErrorDialog, setShowPermissionErrorDialog] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState('');
  const [showProfilePictureDialog, setShowProfilePictureDialog] = useState(false);
  const queryClient = useQueryClient();

  // TanStack Query mutation for updating client
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: UpdateClientData }) =>
      updateClient(data.id, data.updates),
    onSuccess: async () => {
      // Refetch to update the cache and trigger Zustand store update
      await queryClient.refetchQueries({ queryKey: ['clients'] });

      // Success haptic feedback
      haptics.success();

      // Close modal
      handleClose();
    },
    onError: (error: Error) => {
      // Error haptic feedback
      haptics.error();

      // Show error dialog
      setErrorMessage(error.message || t('clients.editClientModal.errorUpdating'));
      setShowErrorDialog(true);
    },
  });

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Combined validation and change detection - all in one useMemo for consistent reactivity
  const { isFormValid, hasChanges, canComplete } = useMemo(() => {
    // Form validation - name and email are mandatory
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Name must not be empty
    const nameValid = trimmedName.length > 0;

    // Email must be valid format (contains @ with text before and after)
    const atIndex = trimmedEmail.indexOf('@');
    const emailValid = trimmedEmail.length > 0 && atIndex > 0 && atIndex < trimmedEmail.length - 1;

    const formValid = nameValid && emailValid;

    // Change detection
    let changes = false;
    if (originalValues) {
      // Check for image change first
      if (selectedImage !== null) changes = true;
      // Simple string comparisons
      else if (trimmedName !== originalValues.name.trim()) changes = true;
      else if (trimmedEmail !== originalValues.email.trim()) changes = true;
      else if (category !== originalValues.category) changes = true;
      else if (height.trim() !== originalValues.height.trim()) changes = true;
      else {
        // Date comparison
        const currentDobTime = dateOfBirth?.getTime() ?? null;
        const originalDobTime = originalValues.dateOfBirth?.getTime() ?? null;
        if (currentDobTime !== originalDobTime) changes = true;
        else {
          // Country comparison
          const currentCountryCode = country?.code ?? null;
          const originalCountryCode = originalValues.country?.code ?? null;
          if (currentCountryCode !== originalCountryCode) changes = true;
          else {
            // Phone comparison
            const currentPhoneCountryCode = phoneNumber?.country?.code ?? null;
            const originalPhoneCountryCode = originalValues.phoneNumber?.country?.code ?? null;
            const currentPhoneNum = phoneNumber?.number ?? '';
            const originalPhoneNum = originalValues.phoneNumber?.number ?? '';
            if (currentPhoneCountryCode !== originalPhoneCountryCode || currentPhoneNum !== originalPhoneNum) {
              changes = true;
            }
          }
        }
      }
    }

    return {
      isFormValid: formValid,
      hasChanges: changes,
      canComplete: formValid && changes && !updateMutation.isPending,
    };
  }, [name, email, category, dateOfBirth, height, country, phoneNumber, originalValues, selectedImage, updateMutation.isPending]);

  // Load client data
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) {
        setIsLoading(false);
        return;
      }

      try {
        const clients = await getClients();
        const foundClient = clients.find((c) => c.id === clientId);
        if (foundClient) {
          setClient(foundClient);

          // Combine first and last name for display
          const fullName = [foundClient.firstName, foundClient.lastName].filter(Boolean).join(' ');
          setName(fullName || '');
          setEmail(foundClient.email || '');
          setCategory(foundClient.coachingType || 'online');

          // Set country
          const foundCountry = findCountryByName(foundClient.country);
          setCountry(foundCountry);

          // Parse and set phone number
          const parsedPhone = parsePhoneNumber(foundClient.phone);
          setPhoneNumber(parsedPhone);

          // Calculate and set date of birth from age (approximate) - add null check
          if (foundClient.age !== null && foundClient.age > 0) {
            const today = new Date();
            const birthYear = today.getFullYear() - foundClient.age;
            const dob = new Date(birthYear, 0, 1); // January 1st of birth year
            setDateOfBirth(dob);
          }

          // Store original values for change detection
          const calculatedDob = foundClient.age !== null && foundClient.age > 0
            ? new Date(new Date().getFullYear() - foundClient.age, 0, 1)
            : null;

          setOriginalValues({
            name: fullName || '',
            email: foundClient.email || '',
            category: foundClient.coachingType || 'online',
            dateOfBirth: calculatedDob,
            height: foundClient.height || '', // Height can be null
            country: foundCountry,
            phoneNumber: parsedPhone,
            avatarUrl: foundClient.avatarUrl || '',
          });
        }
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClient();
  }, [clientId]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleCloseWithConfirmation = useCallback(() => {
    // Only show discard dialog if there are valid saveable changes
    if (canComplete) {
      setShowDiscardDialog(true);
    } else {
      handleClose();
    }
  }, [canComplete, handleClose]);

  // Image picker function
  const pickImage = useCallback(
    async (useCamera: boolean) => {
      try {
        let result: ImagePicker.ImagePickerResult;

        if (useCamera) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setPermissionErrorMessage(t('clients.editClientModal.cameraPermissionRequired'));
            setShowPermissionErrorDialog(true);
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            setPermissionErrorMessage(t('clients.editClientModal.galleryPermissionRequired'));
            setShowPermissionErrorDialog(true);
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
        }

        if (!result.canceled && result.assets[0]) {
          setSelectedImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Error picking image:', error);
        haptics.error();
      }
    },
    [t]
  );

  const handleSave = () => {
    if (!canComplete || !client) return;

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Pass avatarUri to the service - it will handle the upload via API
    updateMutation.mutate({
      id: client.id,
      updates: {
        firstName,
        lastName,
        email: email.trim(),
        coachingType: category,
        ...(selectedImage && { avatarUri: selectedImage }),
      },
    });
  };

  // Current image to display (selected or original)
  const currentImage = selectedImage || originalValues?.avatarUrl || client?.avatarUrl;

  // Show dialog for profile picture options
  const handleEditProfilePicture = useCallback(() => {
    setShowProfilePictureDialog(true);
  }, []);

  const categoryOptions = useMemo(() => [
    { value: 'online' as const, label: t('clients.addClientModal.online') },
    { value: 'in-person' as const, label: t('clients.addClientModal.inPerson') },
    { value: 'hybrid' as const, label: t('clients.addClientModal.hybrid') },
  ], [t]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
        <View style={styles.container}>
          {/* Header with blur effect */}
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
                {t('clients.editClientModal.title')}
              </Text>
              <IconButton
                icon={{ sf: 'checkmark', IconComponent: Check }}
                onPress={handleSave}
                size="md"
                variant={canComplete ? 'primary' : 'default'}
                disabled={!canComplete}
                loading={updateMutation.isPending}
              />
            </View>
          </View>

          {/* Content */}
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bottomOffset={40}
          >
            <ProfilePictureInput
              label={t('clients.editClientModal.profilePicture')}
              imageUrl={currentImage || null}
              onPress={handleEditProfilePicture}
            />

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

            <SelectInput
              label={t('clients.editClientModal.type')}
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              placeholder={t('clients.editClientModal.typePlaceholder')}
              clearable={false}
            />

            <DateSelectInput
              label={t('clients.editClientModal.dateOfBirth')}
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder={t('clients.editClientModal.dateOfBirthPlaceholder')}
              allowFuture={false}
              mode="birthdate"
            />

            {/* Height input temporarily hidden
            <HeightInput
              label={t('clients.editClientModal.height')}
              value={height}
              onChangeText={setHeight}
              placeholder={t('clients.editClientModal.heightPlaceholder')}
            />
            */}

            <CountrySelectorInput
              label={t('clients.editClientModal.country')}
              value={country}
              onChange={setCountry}
              placeholder={t('clients.editClientModal.countryPlaceholder')}
              modalTitle={t('clients.editClientModal.countryModalTitle')}
            />

            <PhoneNumberInput
              codeLabel={t('clients.editClientModal.code')}
              numberLabel={t('clients.editClientModal.phoneNumber')}
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder={t('clients.editClientModal.phoneNumberPlaceholder')}
              modalTitle={t('clients.editClientModal.countryModalTitle')}
            />
          </KeyboardAwareScrollView>
        </View>
      </TouchableWithoutFeedback>

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />

      <Dialog
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={t('clients.editClientModal.discardChangesTitle')}
        message={t('clients.editClientModal.discardChangesMessage')}
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
          { label: t('clients.editClientModal.discardChanges'), onPress: handleClose, variant: 'destructive' }
        ]}
      />

      <Dialog
        visible={showPermissionErrorDialog}
        onClose={() => setShowPermissionErrorDialog(false)}
        title={t('general.error')}
        message={permissionErrorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowPermissionErrorDialog(false), variant: 'primary' }]}
      />

      <Dialog
        visible={showProfilePictureDialog}
        onClose={() => setShowProfilePictureDialog(false)}
        title={t('clients.editClientModal.profilePicture')}
        buttonLayout="vertical"
        buttons={[
          { label: t('clients.editClientModal.chooseFromLibrary'), onPress: () => { setShowProfilePictureDialog(false); pickImage(false); }, variant: 'primary' },
          { label: t('clients.editClientModal.takePhoto'), onPress: () => { setShowProfilePictureDialog(false); pickImage(true); }, variant: 'primary' },
          { label: t('general.cancel'), onPress: () => setShowProfilePictureDialog(false), variant: 'secondary' },
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
    paddingBottom: 16,
    gap: 12,
  },
});
