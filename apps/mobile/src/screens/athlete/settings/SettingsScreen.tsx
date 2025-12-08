import { useFocusEffect } from '@react-navigation/native';
import * as DynamicAppIcon from 'expo-dynamic-app-icon';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import {
  FileText,
  IdCard,
  Languages,
  MailPlus,
  Megaphone,
  Palette,
  Pencil,
  Ruler,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useView } from '../../../context/ViewContext';
import { supabase } from '../../../lib/supabase';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { THEMES } from '../../../theme/theme';

interface SettingsScreenProps {
  onPersonalDetailsPress?: () => void;
  onUnitsPress?: () => void;
  onLanguagePress?: () => void;
  onColorSchemePress?: () => void;
  onSharePress?: () => void;
  onEditNamePress?: () => void;
  onAppIconPress?: () => void;
}

interface SettingsOptionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isLoading?: boolean;
  textColor?: string;
  iconColor?: string;
}

function SettingsOption({ icon, title, subtitle, onPress, isLoading, textColor, iconColor }: SettingsOptionProps) {
  return (
    <TouchableOpacity
      style={styles.optionRow}
      onPress={() => {
        if (!isLoading && onPress) {
          hapticFeedback.selection();
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={isLoading || !onPress}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={iconColor || '#000000'} />
          </View>
        ) : (
          <>
            <Text style={[styles.optionTitle, { color: textColor || '#000000' }]}>{title}</Text>
            {subtitle && <Text style={[styles.optionSubtitle, { color: textColor || '#000000' }]}>{subtitle}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen({
  onPersonalDetailsPress,
  onUnitsPress,
  onLanguagePress,
  onColorSchemePress,
  onSharePress,
  onEditNamePress,
  onAppIconPress,
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, colorScheme, mode, setMode, theme } = useTheme();
  const { currentView, switchView } = useView();
  const [currentAppIcon, setCurrentAppIcon] = useState<string>('default');
  const [userName, setUserName] = useState<string>('');

  // App icon mapping - placeholder paths, adjust as needed
  // Note: These paths may need to be adjusted based on actual asset locations
  const APP_ICONS: Record<string, any> = {
    default: null, // Will be handled gracefully
  };

  const getAppIconSource = (iconName: string) => {
    const icon = APP_ICONS[iconName] || APP_ICONS.default;
    return icon || null;
  };

  const iconSize = 26;
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const dividerColor = colorScheme === 'dark' ? colors.border : '#E5E5EA';


  // Load current app icon on mount
  useEffect(() => {
    const loadCurrentAppIcon = async () => {
      try {
        const icon = await DynamicAppIcon.getAppIcon();
        setCurrentAppIcon(icon || 'default');
      } catch (error) {
        setCurrentAppIcon('default');
      }
    };
    loadCurrentAppIcon();
  }, []);

  // Load user name
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        }
      } catch (error) {
        // Silently handle error
      }
    };
    loadUserName();
  }, []);

  // Refresh app icon when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          const icon = await DynamicAppIcon.getAppIcon();
          setCurrentAppIcon(icon || 'default');
        } catch (error) {
          // Silently handle error
        }
      };
      refreshData();
    }, []),
  );


  const handleUnitsPress = () => {
    onUnitsPress?.();
  };

  const handlePersonalDetailsPress = () => {
    onPersonalDetailsPress?.();
  };

  const handleLanguagePress = () => {
    onLanguagePress?.();
  };

  const handleSupportEmailPress = async () => {
    try {
      await Linking.openURL('mailto:support@useformai.com');
    } catch (error) {
      Alert.alert('Error', 'Unable to open email. Please try again later.');
    }
  };

  const handleFeatureRequestsPress = async () => {
    hapticFeedback.selection();
    setTimeout(async () => {
      try {
        await Linking.openURL('https://form-ai.canny.io/feature-requests');
      } catch (error) {
        Alert.alert('Error', 'Unable to open feature requests. Please try again later.');
      }
    }, 100);
  };


  const handlePrivacyPolicyPress = async () => {
    hapticFeedback.selection();
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/privacy');
      } catch (error) {
        Alert.alert('Error', 'Unable to open privacy policy. Please try again later.');
      }
    }, 100);
  };

  const handleTermsOfServicePress = async () => {
    hapticFeedback.selection();
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/tos');
      } catch (error) {
        Alert.alert('Error', 'Unable to open terms of use. Please try again later.');
      }
    }, 100);
  };


  const openEditName = () => {
    onEditNamePress?.();
  };

  const handleAppIconPress = () => {
    onAppIconPress?.();
  };

  const handleThemePress = () => {
    hapticFeedback.selection();
    // Switch to opposite theme
    if (mode === 'system') {
      // If system, switch based on current colorScheme
      setMode(colorScheme === 'dark' ? 'light' : 'dark');
    } else if (mode === 'light') {
      setMode('dark');
    } else {
      setMode('light');
    }
  };

  const getOppositeThemeLabel = () => {
    if (mode === 'system') {
      return colorScheme === 'dark' ? 'Light' : 'Dark';
    } else if (mode === 'light') {
      return 'Dark';
    } else {
      return 'Light';
    }
  };


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {i18n.t('tabs.settings')}
          </Text>

          {/* View Switch Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingsOption
              icon={<Users size={iconSize} />}
              title={currentView === 'athlete' ? i18n.t('settings.switchToCoachView') : i18n.t('settings.switchToAthleteView')}
              onPress={() => {
                hapticFeedback.selection();
                switchView();
              }}
              textColor={textColor}
              iconColor={iconColor}
            />
          </View>

          {/* Profile Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.profileRow}
            onPress={() => {
              hapticFeedback.selection();
              openEditName();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.profileAvatar}>
              {userName ? (
                <View style={[styles.fallbackAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.fallbackAvatarText}>
                    {userName.trim().split(' ')[0].charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={[styles.fallbackAvatar, { backgroundColor: colors.primary }]}>
                  <User size={24} />
                </View>
              )}
            </View>
            <View style={styles.profileTextContainer}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileNameText, { color: textColor }]} numberOfLines={1}>
                  {userName || i18n.t('settings.enterName')}
                </Text>
                {!userName && <Pencil size={16} />}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {i18n.t('settings.cardAccount')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsOption
            icon={<IdCard size={iconSize} />}
            title={i18n.t('settings.personalDetails')}
            onPress={handlePersonalDetailsPress}
            textColor={textColor}
            iconColor={iconColor}
          />
          <View style={[styles.separator, { backgroundColor: dividerColor }]} />
          <SettingsOption
            icon={<Languages size={iconSize} />}
            title={i18n.t('settings.language')}
            onPress={handleLanguagePress}
            textColor={textColor}
            iconColor={iconColor}
          />
          <View style={[styles.separator, { backgroundColor: dividerColor }]} />
          <SettingsOption
            icon={<Ruler size={iconSize} />}
            title={i18n.t('settings.units')}
            onPress={handleUnitsPress}
            textColor={textColor}
            iconColor={iconColor}
          />
          <View style={[styles.separator, { backgroundColor: dividerColor }]} />
          <SettingsOption
            icon={
              getAppIconSource(currentAppIcon) ? (
                <Image
                  source={getAppIconSource(currentAppIcon)}
                  style={{ width: 36, height: 36, borderRadius: 23 * 0.4453125 }}
                />
              ) : (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 23 * 0.4453125,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={20} />
                </View>
              )
            }
            title={i18n.t('settings.appIcon')}
            onPress={handleAppIconPress}
            textColor={textColor}
            iconColor={iconColor}
          />
        </View>

        {/* Customisations */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {i18n.t('settings.customisations')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsOption
            icon={<Palette size={iconSize} />}
            title={i18n.t('settings.theme')}
            subtitle={getOppositeThemeLabel()}
            onPress={handleThemePress}
            textColor={textColor}
            iconColor={iconColor}
          />
          <View style={[styles.separator, { backgroundColor: dividerColor }]} />
          <SettingsOption
            icon={
              <View
                style={[
                  styles.colorSchemeIcon,
                  {
                    backgroundColor:
                      THEMES.find((t) => t.value === theme.preset)?.colors[0] || '#000000',
                  },
                ]}
              />
            }
            title={THEMES.find((t) => t.value === theme.preset)?.name || i18n.t('settings.colorScheme')}
            onPress={onColorSchemePress}
            textColor={textColor}
            iconColor={iconColor}
          />
        </View>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {i18n.t('settings.cardSupport')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsOption
            icon={<MailPlus size={iconSize} />}
            title={i18n.t('settings.supportEmail')}
            onPress={handleSupportEmailPress}
            textColor={textColor}
            iconColor={iconColor}
          />
          <View style={[styles.separator, { backgroundColor: dividerColor }]} />
          <SettingsOption
            icon={<Megaphone size={iconSize} />}
            title={i18n.t('settings.featureRequests')}
            onPress={handleFeatureRequestsPress}
            textColor={textColor}
            iconColor={iconColor}
          />
        </View>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {i18n.t('settings.cardLegal')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsOption
            icon={<FileText size={iconSize} />}
            title={i18n.t('settings.termsAndConditions')}
            onPress={handleTermsOfServicePress}
            textColor={textColor}
            iconColor={iconColor}
          />
          <View style={[styles.separator, { backgroundColor: dividerColor }]} />
          <SettingsOption
            icon={<ShieldCheck size={iconSize} />}
            title={i18n.t('settings.privacyPolicy')}
            onPress={handlePrivacyPolicyPress}
            textColor={textColor}
            iconColor={iconColor}
          />
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    borderWidth: 0.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileNameText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  optionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
    opacity: 0.6,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  colorSchemeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
