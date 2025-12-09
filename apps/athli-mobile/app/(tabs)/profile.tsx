import React from 'react';
import type { JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BellRing,
  Cog,
  ChevronRight,
  FileText,
  IdCard,
  Languages,
  LogOut,
  MailPlus,
  Megaphone,
  Pencil,
  RefreshCw,
  Ruler,
  School2,
  ShieldCheck,
  Star,
  User,
  UserMinus,
} from 'lucide-react-native';

export interface SettingsOptionProps {
  icon: JSX.Element;
  title: string;
  subtitle?: string;
  onPress?: (event: GestureResponderEvent) => void;
  showChevron?: boolean;
}

export function SettingsOption({ icon, title, subtitle, onPress, showChevron }: SettingsOptionProps) {
  const handleOptionPress = (event: GestureResponderEvent) => {
    if (!onPress) {
      return;
    }

    onPress(event);
  };

  return (
    <TouchableOpacity
      style={styles.optionRow}
      activeOpacity={0.7}
      onPress={onPress ? handleOptionPress : undefined}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && (
        <View style={styles.chevronContainer}>
          <ChevronRight size={20} color="#C7C7CC" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const iconSize = 26;
  const iconColor = '#000000';

  const handleOpenPreferences = () => {
    router.push({ pathname: '/preferences' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>

          {/* Profile Card */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
              <View style={styles.profileAvatar}>
                <View style={styles.fallbackAvatar}>
                  <User size={24} color="#ffffff" />
                </View>
              </View>
              <View style={styles.profileTextContainer}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileNameText} numberOfLines={1}>
                    Enter your name
                  </Text>
                  <Pencil size={16} color="#8E8E93" />
                </View>
                <Text style={styles.profileSubtitleText} numberOfLines={1}>
                  Member since 2024
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingsOption
              icon={<IdCard size={iconSize} color={iconColor} />}
              title="Personal Details"
              showChevron
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Cog size={iconSize} color={iconColor} />}
              title="Preferences"
              showChevron
              onPress={handleOpenPreferences}
            />
          </View>

          {/* Support */}
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <SettingsOption
              icon={<MailPlus size={iconSize} color={iconColor} />}
              title="Support Email"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Megaphone size={iconSize} color={iconColor} />}
              title="Feature Requests"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<RefreshCw size={iconSize} color={iconColor} />}
              title="Sync Data"
              subtitle="Last synced: Never"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<School2 size={iconSize} color={iconColor} />}
              title="Replay Tutorial"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<Star size={iconSize} color={iconColor} />}
              title="Leave Rating"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<BellRing size={iconSize} color={iconColor} />}
              title="Turn on Notifications"
            />
          </View>

          {/* Legal */}
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <SettingsOption
              icon={<FileText size={iconSize} color={iconColor} />}
              title="Terms and Conditions"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<ShieldCheck size={iconSize} color={iconColor} />}
              title="Privacy Policy"
            />
          </View>

          {/* Account Actions */}
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.card}>
            <SettingsOption
              icon={<LogOut size={iconSize} color={iconColor} />}
              title="Logout"
            />
            <View style={styles.separator} />
            <SettingsOption
              icon={<UserMinus size={iconSize} color={iconColor} />}
              title="Delete Account"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingTop: 20,
    marginBottom: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
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
  chevronContainer: {
    marginLeft: 4,
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
    borderRadius: 21,
    backgroundColor: '#ffb86a',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileSubtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  optionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
});
