import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ChevronLeft } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { getClients, type Client } from '@/services/client-service';

type PlatformIconProps = {
  sf: string;
  IconComponent: LucideIcon;
  size?: number;
  color?: string;
};

const PlatformIcon = ({ sf, IconComponent, size = 24, color = '#000000' }: PlatformIconProps) => {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
  }
  return <IconComponent {...({ size, color } as any)} />;
};

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const iconColor = themeColors.text;
  const mutedSurfaceColor = themeColors.surfaceSecondary;

  useEffect(() => {
    const loadClient = async () => {
      try {
        const clients = await getClients();
        const foundClient = clients.find((c) => c.id === id);
        setClient(foundClient || null);
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadClient();
    }
  }, [id]);

  const handleBackPress = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Loading...</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Client Not Found</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.pageBackground }]}>
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
          activeOpacity={0.7}
          onPress={handleBackPress}
        >
          <PlatformIcon
            sf="chevron.left"
            IconComponent={ChevronLeft}
            size={iconSizes.navigationChevrons}
            color={iconColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {client.fullName}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightPlaceholder: {
    width: 44,
  },
});

