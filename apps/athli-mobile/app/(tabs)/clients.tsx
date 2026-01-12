import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Share } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { getClients, type Athlete } from '@/services/coach/coach-client-service';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';

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
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch clients directly with TanStack Query
  const { data: clients = [], isLoading, isError } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('[ClientsScreen] Fetching clients...');
      const data = await getClients();
      console.log('[ClientsScreen] Received clients:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }

    return clients.filter((client) => {
      const fullName = client.name.toLowerCase(); // API returns 'name' not 'fullName'
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

  console.log('[ClientsScreen] Render:', {
    isAuthenticated,
    isLoading,
    isError,
    totalClients: clients.length,
    filteredClients: filteredClients.length,
    searchQuery
  });

  const handleClientPress = (clientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/client/${clientId}`);
  };

  const formatSubtitle = (client: Athlete): string => {
    const parts: string[] = [];

    if (client.age) {
      parts.push(`${client.age} ${t('clients.years')}`);
    }

    // Note: Client type comes as coachingType from API
    if (client.coachingType) {
      const typeLabel =
        client.coachingType === 'in-person'
          ? t('clients.addClientModal.inPerson')
          : client.coachingType === 'online'
            ? t('clients.addClientModal.online')
            : t('clients.addClientModal.hybrid');
      parts.push(typeLabel);
    }

    return parts.join(' · ');
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: 'YOUR INVITE LINE HERE',
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('clients.title')}</Text>
          <View style={styles.headerButtonContainer}>
            <IconButton
              icon={{ sf: 'paperplane', IconComponent: Send }}
              onPress={handleShare}
              size="md"
              color={themeColors.text}
            />
          </View>
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('clients.searchPlaceholder')}
        />
      </View>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <EmptyState
          message={t('clients.empty')}
        />
      )}

      {/* Client List */}
      <View style={styles.listContainer}>
        {filteredClients.map((client, index) => {
          const isLastItem = index === filteredClients.length - 1;
          return (
            <View key={client.id}>
              <PressableOpacity
                onPress={() => handleClientPress(client.id)}
                style={styles.rowWrapper}
              >
                <View style={styles.rowContent}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarCircle}>
                      {client.avatarUrl ? (
                        <Image
                          source={{ uri: client.avatarUrl }}
                          style={styles.avatarImage}
                          contentFit="cover"
                          contentPosition="center"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarImage,
                            styles.avatarPlaceholder,
                            { backgroundColor: themeColors.border },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text
                      style={[styles.clientName, { color: themeColors.text }]}
                      numberOfLines={1}
                    >
                      {client.name}
                    </Text>
                    <Text
                      style={[styles.clientSubtitle, { color: themeColors.mutedText }]}
                      numberOfLines={2}
                    >
                      {formatSubtitle(client)}
                    </Text>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableOpacity>
              <View style={styles.separatorContainer}>
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: themeColors.mutedText, opacity: 0.3 },
                  ]}
                />
              </View>
              {isLastItem && <View style={{ height: 60 }} />}
            </View>
          );
        })}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 60,
    paddingTop: 16,
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  clientInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  clientName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientSubtitle: {
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 82,
    paddingRight: 16,
  },
  separator: {
    height: 0.75,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingRight: 52,
  },
  titleRow: {
    position: 'relative',
    marginBottom: 12,
  },
  headerButtonContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -22 }],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...typography.p2,
    marginTop: 12,
  },
  errorText: {
    ...typography.p2,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

