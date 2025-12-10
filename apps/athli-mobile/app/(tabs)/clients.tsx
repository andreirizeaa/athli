import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SymbolView } from 'expo-symbols';
import { Search, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/card';
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

// Fuzzy search function - checks if query matches name (allowing for character skipping)
const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query) return true;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) return true;
  
  // Fuzzy match: check if all query characters appear in order in the text
  let textIndex = 0;
  for (let i = 0; i < queryLower.length; i++) {
    const char = queryLower[i];
    const foundIndex = textLower.indexOf(char, textIndex);
    if (foundIndex === -1) {
      return false;
    }
    textIndex = foundIndex + 1;
  }
  return true;
};

export default function ClientsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.background];

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      // Ensure minimum 2 seconds of loading time
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  // Filter clients based on search query using fuzzy search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }
    
    return clients.filter((client) => {
      const fullName = client.fullName.toLowerCase();
      const firstName = client.firstName.toLowerCase();
      const lastName = client.lastName.toLowerCase();
      const query = searchQuery.toLowerCase();
      
      return (
        fuzzyMatch(fullName, query) ||
        fuzzyMatch(firstName, query) ||
        fuzzyMatch(lastName, query)
      );
    });
  }, [clients, searchQuery]);

  const formatSubtitle = (client: Client): string => {
    const parts: string[] = [];
    
    if (client.age) {
      parts.push(`${client.age} years`);
    }
    
    if (client.gender && client.gender !== 'prefer-not-to-say') {
      parts.push(client.gender);
    }
    
    if (client.type) {
      const typeLabel = client.type === 'in-person' ? 'In Person' : client.type === 'online' ? 'Online' : 'Hybrid';
      parts.push(typeLabel);
    }
    
    return parts.join(' · ');
  };

  const handleClientPress = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const renderClientCard = ({ item, index }: { item: Client; index: number }) => {
    const isLastItem = index === filteredClients.length - 1;
    
    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleClientPress(item.id)}
        >
          <Card style={isLastItem ? { marginBottom: 60 } : undefined}>
            <View style={styles.cardContent}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: themeColors.border }]} />
              )}
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: themeColors.text }]}>{item.fullName}</Text>
                <Text style={[styles.clientSubtitle, { color: themeColors.mutedText }]}>
                  {formatSubtitle(item)}
                </Text>
              </View>
              <View style={styles.chevronContainer}>
                <PlatformIcon
                  sf="chevron.right"
                  IconComponent={ChevronRight}
                  size={iconSizes.navigationChevrons}
                  color={themeColors.mutedText}
                />
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: themeColors.text }]}>{t('clients.title')}</Text>
            <View style={[styles.searchContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.searchIcon}>
                <PlatformIcon
                  sf="magnifyingglass"
                  IconComponent={Search}
                  size={20}
                  color={themeColors.mutedText}
                />
              </View>
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search clients..."
                placeholderTextColor={themeColors.mutedText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : (
            <FlashList<Client>
              data={filteredClients}
              renderItem={renderClientCard}
              keyExtractor={(item: Client) => item.id}
              // @ts-ignore - estimatedItemSize is a valid FlashList prop but types may be outdated
              estimatedItemSize={88}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.p2,
    padding: 0,
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  clientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clientName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientSubtitle: {
    ...typography.p4,
  },
  chevronContainer: {
    marginLeft: 8,
  },
});


