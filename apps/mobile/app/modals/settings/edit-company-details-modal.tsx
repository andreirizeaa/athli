import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Check,
  Building2,
  Camera,
  ImageIcon,
} from 'lucide-react-native';
import { PressableScale, PressableOpacity } from 'pressto';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore, useCoachCompanyStore } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SearchBar } from '@/components/ui/search-bar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { InputBox } from '@/components/ui/form-inputs/input-box';
import { haptics } from '@/utils/haptics';
import { hexToRgba } from '@/utils/colorUtils';
import { Dialog } from '@/components/ui/dialog';
import {
  uploadCompanyLogo,
  SPECIALITY_OPTIONS,
  COUNTRY_OPTIONS,
  type CountryOption,
} from '@/services/coach/coach-company-service';

type EditField = 'logo' | 'companyName' | 'website' | 'linkedin' | 'location' | 'specialities';

export default function EditCompanyDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    field: EditField;
    currentValue?: string;
  }>();
  const field = params.field || 'companyName';
  const currentValue = params.currentValue || '';

  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const updateCompany = useCoachCompanyStore((state) => state.updateCompany);

  // State for different fields
  const [companyName, setCompanyName] = useState(currentValue);
  const [website, setWebsite] = useState(currentValue);
  const [linkedin, setLinkedin] = useState(currentValue);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [location, setLocation] = useState(currentValue);
  const [specialities, setSpecialities] = useState<string[]>(() => {
    try {
      return JSON.parse(currentValue) || [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const listRef = useRef<any>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  const hasChanges = useMemo(() => {
    switch (field) {
      case 'logo':
        return selectedImage !== null;
      case 'companyName':
        return companyName.trim() !== currentValue;
      case 'website':
        return website.trim() !== currentValue;
      case 'linkedin':
        return linkedin.trim() !== currentValue;
      case 'location':
        return location !== currentValue;
      case 'specialities':
        const originalSpecialities = (() => {
          try {
            return JSON.parse(currentValue) || [];
          } catch {
            return [];
          }
        })();
        return (
          JSON.stringify(specialities.sort()) !==
          JSON.stringify(originalSpecialities.sort())
        );
      default:
        return false;
    }
  }, [field, selectedImage, companyName, website, linkedin, location, specialities, currentValue]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
      return;
    }
    router.back();
  }, [router, hasChanges]);

  const getTitle = () => {
    switch (field) {
      case 'logo':
        return t('settings.companyDetails.editLogo');
      case 'companyName':
        return t('settings.companyDetails.editCompanyName');
      case 'website':
        return t('settings.companyDetails.editWebsite');
      case 'linkedin':
        return t('settings.companyDetails.editLinkedin');
      case 'location':
        return t('settings.companyDetails.editLocation');
      case 'specialities':
        return t('settings.companyDetails.editSpecialities');
      default:
        return '';
    }
  };

  // Logo editing
  const pickImage = useCallback(
    async (useCamera: boolean) => {
      try {
        let result: ImagePicker.ImagePickerResult;

        if (useCamera) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setErrorMessage(t('settings.companyDetails.cameraPermissionRequired'));
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
            setErrorMessage(t('settings.companyDetails.galleryPermissionRequired'));
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

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      switch (field) {
        case 'logo':
          if (selectedImage && coachProfile) {
            const publicUrl = await uploadCompanyLogo(
              selectedImage,
              coachProfile.id
            );
            await updateCompany({ logo_url: publicUrl });
          }
          break;
        case 'companyName':
          await updateCompany({ company_name: companyName.trim() });
          break;
        case 'website':
          await updateCompany({ website: website.trim() });
          break;
        case 'linkedin':
          await updateCompany({ linkedin: linkedin.trim() });
          break;
        case 'location':
          await updateCompany({ location });
          break;
        case 'specialities':
          await updateCompany({ specialities });
          break;
      }
      haptics.success();
      router.back();
    } catch (error) {
      console.error('Failed to update company info:', error);
      haptics.error();
      setErrorMessage(t('general.errorSaving'));
      setShowErrorDialog(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    field,
    hasChanges,
    isSaving,
    selectedImage,
    companyName,
    website,
    linkedin,
    location,
    specialities,
    coachProfile,
    updateCompany,
    router,
    t,
  ]);

  // Location list - selected country at top
  const filteredCountries = useMemo(() => {
    let countries = [...COUNTRY_OPTIONS];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      countries = countries.filter((country) =>
        country.name.toLowerCase().includes(query)
      );
    }

    // Sort with selected country at top
    if (location) {
      countries.sort((a, b) => {
        if (a.name === location) return -1;
        if (b.name === location) return 1;
        return 0;
      });
    }

    return countries;
  }, [searchQuery, location]);

  // Specialities list
  const filteredSpecialities = useMemo(() => {
    if (!searchQuery.trim()) return SPECIALITY_OPTIONS;
    const query = searchQuery.toLowerCase();
    return SPECIALITY_OPTIONS.filter(
      (spec) =>
        spec.label.toLowerCase().includes(query) ||
        spec.value.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleSpeciality = useCallback((value: string) => {
    setSpecialities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  // Render functions for different fields
  const renderLogoField = () => (
    <View style={styles.fieldContainer}>
      <View style={styles.avatarSection}>
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage }}
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
              sf="building.2"
              IconComponent={Building2}
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
                {t('settings.companyDetails.chooseFromLibrary')}
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
                {t('settings.companyDetails.takePhoto')}
              </Text>
            </View>
          </Card>
        </PressableScale>
      </View>
    </View>
  );

  const renderCompanyNameField = () => (
    <View style={styles.fieldContainer}>
      <InputBox
        label={t('settings.companyDetails.companyName')}
        value={companyName}
        onChangeText={setCompanyName}
        placeholder={t('settings.companyDetails.companyNamePlaceholder')}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
      />
    </View>
  );

  const renderWebsiteField = () => (
    <View style={styles.fieldContainer}>
      <InputBox
        label={t('settings.companyDetails.website')}
        value={website}
        onChangeText={setWebsite}
        placeholder={t('settings.companyDetails.websitePlaceholder')}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </View>
  );

  const renderLinkedinField = () => (
    <View style={styles.fieldContainer}>
      <InputBox
        label={t('settings.companyDetails.linkedin')}
        value={linkedin}
        onChangeText={setLinkedin}
        placeholder={t('settings.companyDetails.linkedinPlaceholder')}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </View>
  );

  const renderLocationItem = useCallback(
    ({ item }: { item: CountryOption }) => {
      const isSelected = item.name === location;
      return (
        <PressableOpacity
          style={styles.listItem}
          onPress={() => setLocation(item.name)}
        >
          <Text style={styles.flag}>{item.flag}</Text>
          <Text
            style={[styles.listItemText, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View
            style={[
              styles.radioOuter,
              { borderColor: isSelected ? themeColors.primary : themeColors.border },
              isSelected && { backgroundColor: themeColors.primary },
            ]}
          >
            {isSelected && (
              <Check
                {...({
                  size: 12,
                  color: themeColors.primaryForeground,
                  strokeWidth: 3,
                } as any)}
              />
            )}
          </View>
        </PressableOpacity>
      );
    },
    [location, themeColors]
  );

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  const renderLocationField = () => (
    <View style={styles.listContainer}>
      <FlashList
        ref={listRef as any}
        data={filteredCountries}
        renderItem={renderLocationItem}
        ItemSeparatorComponent={() => <Separator style={styles.separator} />}
        ListHeaderComponent={
          <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              clearable={false}
            />
          </View>
        }
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );

  const renderSpecialityItem = useCallback(
    ({ item }: { item: (typeof SPECIALITY_OPTIONS)[number] }) => {
      const isSelected = specialities.includes(item.value);
      return (
        <PressableOpacity
          style={styles.listItem}
          onPress={() => toggleSpeciality(item.value)}
        >
          <Text
            style={[styles.listItemText, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <View
            style={[
              styles.radioOuter,
              { borderColor: isSelected ? themeColors.primary : themeColors.border },
              isSelected && { backgroundColor: themeColors.primary },
            ]}
          >
            {isSelected && (
              <Check
                {...({
                  size: 12,
                  color: themeColors.primaryForeground,
                  strokeWidth: 3,
                } as any)}
              />
            )}
          </View>
        </PressableOpacity>
      );
    },
    [specialities, themeColors, toggleSpeciality]
  );

  const renderSpecialitiesField = () => (
    <View style={styles.listContainer}>
      <FlashList
        ref={listRef as any}
        data={filteredSpecialities}
        renderItem={renderSpecialityItem}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              clearable={false}
            />
          </View>
        }
        keyExtractor={(item) => item.value}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );

  const renderContent = () => {
    switch (field) {
      case 'logo':
        return renderLogoField();
      case 'companyName':
        return renderCompanyNameField();
      case 'website':
        return renderWebsiteField();
      case 'linkedin':
        return renderLinkedinField();
      case 'location':
        return renderLocationField();
      case 'specialities':
        return renderSpecialitiesField();
      default:
        return null;
    }
  };

  const isListField = field === 'location' || field === 'specialities';

  // For list fields, use scroll-through-header pattern
  if (isListField) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        {/* List Content */}
        <View style={styles.listContentWrapper}>
          {renderContent()}
        </View>

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
              styles.modalHeader,
              {
                paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
              },
            ]}
          >
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

  // For non-list fields (logo, companyName), use regular header
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
        {renderContent()}
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
  // Regular header for non-list fields
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
  // Fixed header for list fields (scroll-through pattern)
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  listContentWrapper: {
    flex: 1,
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
  listContainer: {
    flex: 1,
  },
  listHeader: {
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  listItemText: {
    ...typography.p2,
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    marginLeft: 36,
  },
});
