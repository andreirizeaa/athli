import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useAuthSessionStore, useClientProfileStore, useThemePreference, useTranslations } from '@/stores';
import { haptics } from '@/utils/haptics';
import { IconButton } from '@/components/ui/icon-button';
import { supabase } from '@/lib/supabase';
import {
  CountrySelectorInput,
  DateSelectInput,
  GenderInput,
  InputBox,
  PhoneNumberInput,
  ProfilePictureInput,
  type Country,
  type GenderValue,
  type PhoneNumber,
} from '@/components/ui/form-inputs';
import { COUNTRIES } from '@/components/ui/form-inputs/countries-data';

type OriginalValues = {
  name: string;
  email: string;
  dateOfBirth: Date | null;
  gender: GenderValue;
  height: string;
  country: Country | null;
  phoneNumber: PhoneNumber | null;
};

const findCountryByName = (name: string | null): Country | null => {
  if (!name) return null;
  return COUNTRIES.find((country) => country.name.toLowerCase() === name.toLowerCase()) || null;
};

const parsePhoneNumber = (phoneString: string | null): PhoneNumber | null => {
  if (!phoneString) return null;
  const digits = phoneString.replace(/\D/g, '');
  if (!digits) return null;

  for (let len = 4; len >= 1; len--) {
    const possibleCode = `+${digits.substring(0, len)}`;
    const matchedCountry = COUNTRIES.find((country) => country.dialCode === possibleCode);
    if (matchedCountry) {
      return { country: matchedCountry, number: digits.substring(len) };
    }
  }

  return { country: COUNTRIES[0], number: digits };
};

const parseDateOfBirth = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const parsedDate = new Date(dateString);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const parseGender = (gender: string | null): GenderValue => {
  if (gender === 'male' || gender === 'female' || gender === 'prefer-not-to-say') return gender;
  return null;
};

const formatDateOfBirthForDatabase = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0] ?? null;
};

const formatPhoneForDatabase = (phoneNumber: PhoneNumber | null): string | null => {
  if (!phoneNumber) return null;
  const cleanedNumber = phoneNumber.number.replace(/\D/g, '');
  if (!cleanedNumber) return null;
  return `${phoneNumber.country.dialCode}${cleanedNumber}`;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const userId = useAuthSessionStore((state) => state.userId);
  const profile = useClientProfileStore((state) => state.profile);
  const isLoadingProfile = useClientProfileStore((state) => state.isLoading);
  const loadProfile = useClientProfileStore((state) => state.loadProfile);
  const updateProfile = useClientProfileStore((state) => state.updateProfile);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<GenderValue>(null);
  const [height, setHeight] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [originalValues, setOriginalValues] = useState<OriginalValues | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPhotoSourceDialog, setShowPhotoSourceDialog] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (profile?.client_id === userId) return;
    loadProfile(userId).catch(() => undefined);
  }, [loadProfile, profile?.client_id, userId]);

  useEffect(() => {
    if (!profile) return;

    console.log('[ClientDetailsScreen] Client profile data:', profile);

    setName(profile.name || '');
    setEmail(profile.email || '');
    setDateOfBirth(parseDateOfBirth(profile.date_of_birth));
    setGender(parseGender(profile.gender));
    setHeight(profile.height_cm ? String(profile.height_cm) : '');
    const foundCountry = findCountryByName(profile.country);
    setCountry(foundCountry);
    setPhoneNumber(parsePhoneNumber(profile.phone));

    setOriginalValues({
      name: profile.name || '',
      email: profile.email || '',
      dateOfBirth: parseDateOfBirth(profile.date_of_birth),
      gender: parseGender(profile.gender),
      height: profile.height_cm ? String(profile.height_cm) : '',
      country: foundCountry,
      phoneNumber: parsePhoneNumber(profile.phone),
    });
  }, [profile]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleBackPress = useCallback(
    (_event?: GestureResponderEvent) => {
      handleGoBack();
    },
    [handleGoBack]
  );

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Image picker function
  const pickImage = useCallback(
    async (useCamera: boolean) => {
      try {
        let result: ImagePicker.ImagePickerResult;

        if (useCamera) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setErrorMessage(t('settings.personalDetails.cameraPermissionRequired'));
            setShowErrorDialog(true);
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
            setErrorMessage(t('settings.personalDetails.galleryPermissionRequired'));
            setShowErrorDialog(true);
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
          const imageUri = result.assets[0].uri;
          setSelectedImage(imageUri);
          await uploadProfilePicture(imageUri);
        }
      } catch (error) {
        console.error('Error picking image:', error);
        haptics.error();
      }
    },
    [t]
  );

  const uploadProfilePicture = async (uri: string) => {
    if (!profile) return;

    setIsUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${profile.client_id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.client_id}/${fileName}`;

      const arrayBuffer = await blob.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('client-avatars').getPublicUrl(filePath);

      await updateProfile({ profile_picture_url: publicUrl });
      haptics.success();
    } catch (error) {
      console.error('Failed to update profile picture:', error);
      haptics.error();
      setSelectedImage(null);
      setErrorMessage(t('settings.personalDetails.uploadFailed'));
      setShowErrorDialog(true);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Show dialog for profile picture options
  const handleEditProfilePicture = useCallback(() => {
    setShowPhotoSourceDialog(true);
  }, []);

  const { canSave } = useMemo(() => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    const atIndex = trimmedEmail.indexOf('@');
    const emailValid = trimmedEmail.length > 0 && atIndex > 0 && atIndex < trimmedEmail.length - 1;
    const nameValid = trimmedName.length > 0;
    const formValid = nameValid && emailValid;

    if (!originalValues) return { canSave: false };

    const dateChanged =
      (dateOfBirth?.getTime() ?? null) !== (originalValues.dateOfBirth?.getTime() ?? null);
    const genderChanged = gender !== originalValues.gender;
    const countryChanged = (country?.code ?? null) !== (originalValues.country?.code ?? null);
    const phoneChanged =
      (phoneNumber?.country?.code ?? null) !== (originalValues.phoneNumber?.country?.code ?? null) ||
      (phoneNumber?.number ?? '') !== (originalValues.phoneNumber?.number ?? '');

    const hasChanges =
      trimmedName !== originalValues.name.trim() ||
      trimmedEmail !== originalValues.email.trim() ||
      height.trim() !== originalValues.height.trim() ||
      dateChanged ||
      genderChanged ||
      countryChanged ||
      phoneChanged;

    return { canSave: formValid && hasChanges && !isLoadingProfile };
  }, [country, dateOfBirth, email, gender, height, isLoadingProfile, name, originalValues, phoneNumber]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    if (!userId) return;

    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        date_of_birth: formatDateOfBirthForDatabase(dateOfBirth),
        gender,
        height_cm: height.trim() ? Number(height.trim()) : null,
        country: country?.name ?? null,
        phone: formatPhoneForDatabase(phoneNumber),
      });
      haptics.success();
      router.back();
    } catch (error: any) {
      haptics.error();
      setErrorMessage(error?.message || t('general.tryAgain'));
      setShowErrorDialog(true);
    }
  }, [canSave, country, dateOfBirth, email, gender, height, name, phoneNumber, router, t, updateProfile, userId]);

  // Current image to display (selected or original)
  const currentImage = selectedImage || profile?.profile_picture_url || null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.backgroundPrimary,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={40}
        >
          <View style={styles.header}>
            <IconButton
              icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
              onPress={handleBackPress}
              size="md"
              color={themeColors.text}
            />
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>
              {t('profile.editTitle')}
            </Text>
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleSave}
              size="md"
              variant={canSave ? 'primary' : 'default'}
              disabled={!canSave}
              loading={isLoadingProfile}
            />
          </View>

            <ProfilePictureInput
              label={t('settings.personalDetails.profilePicture')}
              imageUrl={currentImage}
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
              editable={false}
            />

            <GenderInput
              label={t('clients.editClientModal.gender')}
              value={gender}
              onChange={setGender}
              placeholder={t('clients.editClientModal.genderPlaceholder')}
              options={{
                male: t('clients.editClientModal.genderMale'),
                female: t('clients.editClientModal.genderFemale'),
                preferNotToSay: t('clients.editClientModal.genderPreferNotToSay'),
              }}
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
        visible={showPhotoSourceDialog}
        onClose={() => setShowPhotoSourceDialog(false)}
        title={t('settings.personalDetails.profilePicture')}
        buttonLayout="vertical"
        showCloseIcon={false}
        buttons={[
          { label: t('settings.personalDetails.takePhoto'), onPress: () => { setShowPhotoSourceDialog(false); pickImage(true); }, variant: 'primary' },
          { label: t('settings.personalDetails.chooseFromLibrary'), onPress: () => { setShowPhotoSourceDialog(false); pickImage(false); }, variant: 'primary' },
          { label: t('general.cancel'), onPress: () => setShowPhotoSourceDialog(false), variant: 'secondary' },
        ]}
      />
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
});
