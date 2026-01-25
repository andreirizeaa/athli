import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { User, Pencil } from 'lucide-react-native';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';

type ProfilePictureInputProps = {
  label: string;
  imageUrl: string | null;
  onPress: () => void;
  fallbackIcon?: {
    sf: string;
    IconComponent: React.ComponentType<any>;
  };
};

export const ProfilePictureInput = ({
  label,
  imageUrl,
  onPress,
  fallbackIcon = { sf: 'person.fill', IconComponent: User },
}: ProfilePictureInputProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <Card variant="form">
      <PressableOpacity style={styles.row} onPress={onPress}>
        <View style={styles.content}>
          <Text style={[styles.label, { color: themeColors.text }]}>
            {label}
          </Text>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.preview}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.fallback,
                { backgroundColor: themeColors.primarySoft },
              ]}
            >
              <PlatformIcon
                sf={fallbackIcon.sf}
                IconComponent={fallbackIcon.IconComponent}
                size={20}
                color={themeColors.primary}
              />
            </View>
          )}
        </View>
        <View style={styles.editIconContainer}>
          <PlatformIcon
            sf="pencil"
            IconComponent={Pencil}
            size={20}
            color={themeColors.mutedText}
          />
        </View>
      </PressableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.p1,
    fontWeight: '600',
  },
  preview: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  fallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
