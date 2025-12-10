import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { getClients, type Client } from '@/services/client-service';
import { ClientsFilterModal } from '@/components/clients/clients-filter-modal';
import { PlatformIcon } from '@/components/platform-icon';
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersModalVisible, setIsFiltersModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Filter clients based on search query and category filters
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply category filters
    if (selectedCategories.size > 0) {
      filtered = filtered.filter((client) => {
        if (!client.type) return false;
        return selectedCategories.has(client.type);
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((client) => {
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
    }

    return filtered;
  }, [clients, searchQuery, selectedCategories]);

  const handleClientPress = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const handleOpenFiltersModal = () => {
    setIsFiltersModalVisible(true);
  };

  const handleCloseFiltersModal = () => {
    setIsFiltersModalVisible(false);
  };

  const handleApplyFilters = (categories: Set<string>) => {
    setSelectedCategories(categories);
    // Scroll to top when filters are applied
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
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

  // Check if any filters are applied
  const hasAppliedFilters = selectedCategories.size > 0;

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
            <View
              style={[styles.searchContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
            >
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
                placeholder={t('clients.searchPlaceholder')}
                placeholderTextColor={themeColors.mutedText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlignVertical="center"
              />
              <TouchableOpacity
                style={styles.filterIcon}
                activeOpacity={0.7}
                onPress={handleOpenFiltersModal}
              >
                <PlatformIcon
                  sf="slider.horizontal.3"
                  IconComponent={SlidersHorizontal}
                  size={20}
                  color={hasAppliedFilters ? themeColors.primary : themeColors.mutedText}
                />
              </TouchableOpacity>
            </View>
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredClients.map((client, index) => {
                const isLastItem = index === filteredClients.length - 1;
                return (
                  <View key={client.id} style={styles.cardWrapper}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleClientPress(client.id)}>
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
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <ClientsFilterModal
        visible={isFiltersModalVisible}
        onClose={handleCloseFiltersModal}
        selectedCategories={selectedCategories}
        onApplyFilters={handleApplyFilters}
      />
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
  loadingContainer: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 16,
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
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
    paddingBottom: 4,
  },
  filterIcon: {
    marginLeft: 8,
    padding: 4,
  },
});

