import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useLibraryTab, type LibraryTab } from '@/contexts/useLibraryTab';

export default function LibraryScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { activeTab, setActiveTab } = useLibraryTab();

  const handleTabPress = (tab: LibraryTab) => {
    setActiveTab(tab);
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingBottom: 0,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('library.title')}</Text>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { borderBottomColor: themeColors.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'workouts' && styles.tabActive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleTabPress('workouts')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'workouts' && styles.tabTextActive,
                  { color: activeTab === 'workouts' ? themeColors.text : themeColors.mutedText },
                ]}
              >
                {t('library.tabs.workouts')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'programs' && styles.tabActive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleTabPress('programs')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'programs' && styles.tabTextActive,
                  { color: activeTab === 'programs' ? themeColors.text : themeColors.mutedText },
                ]}
              >
                {t('library.tabs.programs')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'exercises' && styles.tabActive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleTabPress('exercises')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'exercises' && styles.tabTextActive,
                  { color: activeTab === 'exercises' ? themeColors.text : themeColors.mutedText },
                ]}
              >
                {t('library.tabs.exercises')}
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          <ScrollView
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'workouts' && <View style={styles.tabContent} />}
            {activeTab === 'programs' && <View style={styles.tabContent} />}
            {activeTab === 'exercises' && <View style={styles.tabContent} />}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 0,
    borderBottomWidth: 1,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // Removed borderBottomColor to eliminate underscore highlight
  },
  tabText: {
    ...typography.h7,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabContent: {
    flex: 1,
  },
});
