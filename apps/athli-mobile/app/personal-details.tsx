import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Pencil } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';

interface PersonalDetailOptionProps {
  title: string;
  value: string;
  onPress?: () => void;
  colors: {
    text: string;
    mutedText: string;
    border: string;
  };
}

function PersonalDetailOption({ title, value, onPress, colors }: PersonalDetailOptionProps) {
  return (
    <PressableOpacity
      style={styles.optionRow}
      onPress={onPress}
      enabled={!!onPress}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.optionValue, { color: colors.text }]}>{value}</Text>
      </View>
      {onPress && (
        <View style={styles.iconContainer}>
          <PlatformIcon
            sf="pencil"
            IconComponent={Pencil}
            size={20}
            color={colors.mutedText}
          />
        </View>
      )}
    </PressableOpacity>
  );
}

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const iconColor = themeColors.text;

  // Mock user data - in the future, this will come from user service/context
  const clientName = 'John Doe';
  const clientAge = '25';
  const clientGenderRaw = 'Male'; // Raw gender value
  const clientHeight = '175 cm';
  const clientWeight = '70 kg';

  // Translate gender value
  const getGenderDisplay = (gender: string): string => {
    switch (gender.toLowerCase()) {
      case 'male':
        return t('personalDetails.gender.male');
      case 'female':
        return t('personalDetails.gender.female');
      case 'prefer not to say':
        return t('personalDetails.gender.preferNotToSay');
      default:
        return gender;
    }
  };

  const clientGender = getGenderDisplay(clientGenderRaw);

  const handleBackPress = () => {
    router.back();
  };

  const handleEditField = (field: 'name' | 'age' | 'gender' | 'height' | 'weight') => {
    router.push({
      pathname: '/modals/personal-details/edit-personal-details-modal',
      params: { field },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
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
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
          <View style={styles.content}>
            <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
              <IconButton
                icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                onPress={handleBackPress}
                size="md"
                color={iconColor}
              />
              <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                {t('personalDetails.title')}
              </Text>
              <View style={styles.headerRightPlaceholder} />
            </View>

            <Card>
              <PersonalDetailOption
                title={t('personalDetails.name')}
                value={clientName}
                onPress={() => handleEditField('name')}
                colors={themeColors}
              />
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
              <PersonalDetailOption
                title={t('personalDetails.age')}
                value={clientAge}
                onPress={() => handleEditField('age')}
                colors={themeColors}
              />
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
              <PersonalDetailOption
                title={t('personalDetails.genderLabel')}
                value={clientGender}
                onPress={() => handleEditField('gender')}
                colors={themeColors}
              />
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
              <PersonalDetailOption
                title={t('personalDetails.height')}
                value={clientHeight}
                onPress={() => handleEditField('height')}
                colors={themeColors}
              />
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
              <PersonalDetailOption
                title={t('personalDetails.weight')}
                value={clientWeight}
                onPress={() => handleEditField('weight')}
                colors={themeColors}
              />
            </Card>
            <View style={{ height: 60 }} />
          </View>
        </ScrollView>
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
    marginBottom: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  headerTitle: {
    ...typography.h5,
  },
  headerRightPlaceholder: {
    width: 44,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTitle: {
    ...typography.p1,
    fontWeight: '600',
  },
  optionValue: {
    ...typography.h6,
    fontSize: 19,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
