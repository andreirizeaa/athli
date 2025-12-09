import React, { useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CircleCheck, ChevronLeft, Languages, Ruler, X } from 'lucide-react-native';

import { SettingsOption } from './(tabs)/profile';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const iconSize = 26;
  const iconColor = '#000000';
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isUnitsModalVisible, setIsUnitsModalVisible] = useState(false);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('en');
  const [selectedUnits, setSelectedUnits] = useState<'metric' | 'imperial'>('metric');
  const { height: windowHeight } = useWindowDimensions();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const unitsBackdropOpacity = useRef(new Animated.Value(0)).current;
  const unitsSheetTranslateY = useRef(new Animated.Value(windowHeight)).current;

  const handleGoBack = () => {
    router.back();
  };

  const handleBackPress = (_event?: GestureResponderEvent) => {
    handleGoBack();
  };

  const handleAppearanceModePress = (_mode: 'light' | 'dark' | 'system') => {
    // Intentionally left blank; theme change functionality will be implemented later.
  };

  const handleOpenLanguageModal = () => {
    setIsLanguageModalVisible(true);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseLanguageModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: windowHeight,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsLanguageModalVisible(false);
      }
    });
  };

  const handleOpenUnitsModal = () => {
    setIsUnitsModalVisible(true);

    Animated.parallel([
      Animated.timing(unitsBackdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(unitsSheetTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseUnitsModal = () => {
    Animated.parallel([
      Animated.timing(unitsBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(unitsSheetTranslateY, {
        toValue: windowHeight,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsUnitsModalVisible(false);
      }
    });
  };

  const renderAppearanceModeCard = (label: string, mode: 'light' | 'dark' | 'system') => {
    const handlePress = () => {
      handleAppearanceModePress(mode);
    };

    return (
      <TouchableOpacity
        key={mode}
        style={styles.modeCard}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <Text style={styles.modeCardLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={handleBackPress}
        >
          <ChevronLeft width={24} height={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.content}>
        {/* Appearance */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.sectionSubtitle}>
            Choose light, dark, or system appearance
          </Text>

          <View style={styles.modeRow}>
            {renderAppearanceModeCard('Light', 'light')}
            {renderAppearanceModeCard('Dark', 'dark')}
            {renderAppearanceModeCard('System', 'system')}
          </View>
        </View>

        {/* Language and Units */}
        <View style={styles.card}>
          <SettingsOption
            icon={<Languages size={iconSize} color={iconColor} />}
            title="Language"
            showChevron
            onPress={handleOpenLanguageModal}
          />
          <View style={styles.separator} />
          <SettingsOption
            icon={<Ruler size={iconSize} color={iconColor} />}
            title="Units"
            showChevron
            onPress={handleOpenUnitsModal}
          />
        </View>
      </View>

      <Modal
        visible={isLanguageModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCloseLanguageModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={handleCloseLanguageModal}>
            <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.modalHandleContainer}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.7}
                onPress={handleCloseLanguageModal}
              >
                <X width={18} height={18} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGES.map((language, index) => {
                const isSelected = language.code === selectedLanguageCode;

                const handleSelectLanguage = () => {
                  setSelectedLanguageCode(language.code);
                  handleCloseLanguageModal();
                };

                return (
                  <View key={language.code}>
                    <TouchableOpacity
                      style={styles.languageRow}
                      activeOpacity={0.7}
                      onPress={handleSelectLanguage}
                    >
                      <View style={styles.languageInfo}>
                        <Text style={styles.languageFlag}>{language.flag}</Text>
                        <View style={styles.languageTextContainer}>
                          <Text style={styles.languageNativeName}>{language.nativeName}</Text>
                        </View>
                      </View>

                      {isSelected && (
                        <CircleCheck width={18} height={18} color="#000000" />
                      )}
                    </TouchableOpacity>

                    {index !== LANGUAGES.length - 1 && <View style={styles.modalDivider} />}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={isUnitsModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCloseUnitsModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={handleCloseUnitsModal}>
            <Animated.View style={[styles.modalBackdrop, { opacity: unitsBackdropOpacity }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [{ translateY: unitsSheetTranslateY }],
              },
            ]}
          >
            <View style={styles.modalHandleContainer}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Units</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.7}
                onPress={handleCloseUnitsModal}
              >
                <X width={18} height={18} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.unitsList}>
              {(['metric', 'imperial'] as const).map((unitsType) => {
                const isSelected = unitsType === selectedUnits;

                const handleSelectUnits = () => {
                  setSelectedUnits(unitsType);
                  handleCloseUnitsModal();
                };

                const label = unitsType === 'metric' ? 'Metric' : 'Imperial';
                const subtitle = unitsType === 'metric' ? 'kg / m / cm' : 'lbs / ft / in';

                return (
                  <View key={unitsType}>
                    <TouchableOpacity
                      style={styles.languageRow}
                      activeOpacity={0.7}
                      onPress={handleSelectUnits}
                    >
                      <View style={styles.languageInfo}>
                        <View style={styles.languageTextContainer}>
                          <Text style={styles.languageNativeName}>{label}</Text>
                          <Text style={styles.unitsSubtitle}>{subtitle}</Text>
                        </View>
                      </View>

                      {isSelected && <CircleCheck width={18} height={18} color="#000000" />}
                    </TouchableOpacity>

                    {unitsType !== 'imperial' && <View style={styles.modalDivider} />}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  headerRightPlaceholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9FB',
  },
  modeCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  modalSheet: {
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    maxHeight: '100%',
  },
  modalListContent: {
    paddingBottom: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageTextContainer: {
    flexShrink: 1,
  },
  languageNativeName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  unitsList: {
    paddingBottom: 8,
  },
  unitsSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 2,
  },
});


