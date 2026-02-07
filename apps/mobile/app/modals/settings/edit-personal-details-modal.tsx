import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, User, Camera, ImageIcon } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { InputBox } from '@/components/ui/form-inputs/input-box';
import { Card } from '@/components/ui/card';
import { haptics } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';
import { updateCoachProfile } from '@/services/coach/coach-profile-service';
import { Dialog } from '@/components/ui/dialog';

type EditField = 'name' | 'profilePicture';

export default function EditPersonalDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ field: EditField }>();
  const field = params.field || 'name';

  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const setProfile = useCoachProfileStore((state) => state.setProfile);

  const [name, setName] = useState(coachProfile?.name || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const hasChanges =
    field === 'name'
      ? name.trim() !== (coachProfile?.name || '')
      : selectedImage !== null;

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
      return;
    }
    router.back();
  }, [router, hasChanges]);

  const getTitle = () => {
    switch (field) {
      case 'name':
        return t('settings.personalDetails.editName');
      case 'profilePicture':
        return t('settings.personalDetails.editProfilePicture');
      default:
        return '';
    }
  };

  // Name editing
  const handleSaveName = useCallback(async () => {
    if (!coachProfile || !hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      const updatedProfile = await updateCoachProfile(coachProfile.id, {
        name: name.trim(),
      });
      setProfile(updatedProfile);
      haptics.success();
      router.back();
    } catch (error) {
      console.error('Failed to update name:', error);
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  }, [coachProfile, name, hasChanges, isSaving, setProfile, router]);

  // Profile picture editing
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
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
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
          setSelectedImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Error picking image:', error);
        haptics.error();
      }
    },
    [t]
  );

  const uploadProfilePicture = async (uri: string): Promise<string> => {
    if (!coachProfile) throw new Error('No profile');

    const response = await fetch(uri);
    const blob = await response.blob();

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${coachProfile.id}-${Date.now()}.${fileExt}`;
    const filePath = `${coachProfile.id}/${fileName}`;

    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('coach-avatars')
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
    } = supabase.storage.from('coach-avatars').getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSaveProfilePicture = useCallback(async () => {
    if (!coachProfile || !selectedImage || isSaving) return;

    setIsSaving(true);
    try {
      const publicUrl = await uploadProfilePicture(selectedImage);
      const updatedProfile = await updateCoachProfile(coachProfile.id, {
        profile_picture_url: publicUrl,
      });
      setProfile(updatedProfile);
      haptics.success();
      router.back();
    } catch (error) {
      console.error('Failed to update profile picture:', error);
      haptics.error();
      setErrorMessage(t('settings.personalDetails.uploadFailed'));
      setShowErrorDialog(true);
    } finally {
      setIsSaving(false);
    }
  }, [coachProfile, selectedImage, isSaving, setProfile, router, t]);

  const handleSave = field === 'name' ? handleSaveName : handleSaveProfilePicture;

  const currentImage = selectedImage || coachProfile?.profile_picture_url;

  const renderNameField = () => (
    <View style={styles.fieldContainer}>
      <InputBox
        label={t('settings.personalDetails.fullName')}
        value={name}
        onChangeText={setName}
        placeholder={t('settings.personalDetails.namePlaceholder')}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
      />
    </View>
  );

  const renderProfilePictureField = () => (
    <View style={styles.fieldContainer}>
      <View style={styles.avatarSection}>
        {currentImage ? (
          <Image
            source={{ uri: currentImage }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: themeColors.primarySoft },
            ]}
          >
            <PlatformIcon
              sf="person.fill"
              IconComponent={User}
              size={60}
              color={themeColors.primary}
            />
          </View>
        )}
      </View>

      <View style={styles.optionsContainer}>
        <PressableScale onPress={() => pickImage(false)}>
          <Card>
            <View style={styles.option}>
              <View style={styles.optionIcon}>
                <PlatformIcon
                  sf="photo"
                  IconComponent={ImageIcon}
                  size={iconSizes.tabBarIcons}
                  color={themeColors.text}
                />
              </View>
              <Text style={[styles.optionText, { color: themeColors.text }]}>
                {t('settings.personalDetails.chooseFromLibrary')}
              </Text>
            </View>
          </Card>
        </PressableScale>

        <PressableScale onPress={() => pickImage(true)}>
          <Card>
            <View style={styles.option}>
              <View style={styles.optionIcon}>
                <PlatformIcon
                  sf="camera"
                  IconComponent={Camera}
                  size={iconSizes.tabBarIcons}
                  color={themeColors.text}
                />
              </View>
              <Text style={[styles.optionText, { color: themeColors.text }]}>
                {t('settings.personalDetails.takePhoto')}
              </Text>
            </View>
          </Card>
        </PressableScale>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.backgroundSecondary,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        },
      ]}
    >
      <View style={styles.header}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {getTitle()}
        </Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleSave}
          size="md"
          variant={hasChanges ? 'primary' : 'default'}
          disabled={!hasChanges}
          loading={isSaving}
        />
      </View>

      <View style={styles.content}>
        {field === 'name' && renderNameField()}
        {field === 'profilePicture' && renderProfilePictureField()}
      </View>

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
        title={t('common.discardChanges')}
        message={t('common.discardChangesMessage')}
        showCloseIcon={false}
        buttons={[
          { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
          { label: t('common.discard'), onPress: () => { setShowDiscardDialog(false); router.back(); }, variant: 'destructive' },
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  fieldContainer: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarFallback: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  optionText: {
    ...typography.p1,
    flex: 1,
  },
});
