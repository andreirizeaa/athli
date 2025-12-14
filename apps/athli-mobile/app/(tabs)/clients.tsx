import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { getClients, type Client } from '@/services/client-service';
import { PlatformIcon } from '@/components/platform-icon';
import { SearchBar } from '@/components/search-bar';
import { Card } from '@/components/card';

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
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.background];

  const loadClients = useCallback(async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  // Filter clients based on search query
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

  const handleClientPress = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const formatSubtitle = (client: Client): string => {
    const parts: string[] = [];

    if (client.age) {
      parts.push(`${client.age} ${t('clients.years')}`);
    }

    if (client.gender && client.gender !== 'prefer-not-to-say') {
      parts.push(client.gender);
    }

    if (client.type) {
      const typeLabel =
        client.type === 'in-person'
          ? t('clients.addClientModal.inPerson')
          : client.type === 'online'
            ? t('clients.addClientModal.online')
            : t('clients.addClientModal.hybrid');
      parts.push(typeLabel);
    }

    return parts.join(' · ');
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
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: themeColors.text }]}>{t('clients.title')}</Text>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('clients.searchPlaceholder')}
            />
          </View>
          <View style={styles.listContainer}>
            {filteredClients.map((client, index) => {
              const isLastItem = index === filteredClients.length - 1;
              return (
                <View key={client.id} style={styles.cardWrapper}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => handleClientPress(client.id)}>
                    <View style={[styles.cardShadowWrapper, { shadowColor: themeColors.shadowColor }]}>
                      <Card style={[isLastItem ? { marginBottom: 60 } : undefined, styles.cardContainer]}>
                        <View style={styles.cardContent}>
                        {client.avatar ? (
                          <Image
                            source={{ uri: client.avatar }}
                            style={[styles.avatar, { borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.avatar,
                              styles.avatarPlaceholder,
                              { backgroundColor: themeColors.border, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
                            ]}
                          />
                        )}
                        <View style={styles.clientInfo}>
                          <Text style={[styles.clientName, { color: themeColors.text }]}>{client.fullName}</Text>
                          <Text style={[styles.clientSubtitle, { color: themeColors.mutedText }]}>
                            {formatSubtitle(client)}
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
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  cardShadowWrapper: {},
  cardContainer: {
    overflow: 'hidden',
    paddingLeft: 0,
    paddingRight: 16,
    paddingTop: 0,
    paddingBottom: 0,
    height: 88,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 88,
  },
  avatar: {
    width: 80,
    marginRight: 12,
    marginLeft: 0,
    alignSelf: 'stretch',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    marginBottom: 16,
  },
});

