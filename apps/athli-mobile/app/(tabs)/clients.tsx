import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Share } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { getClients, type Client } from '@/services/client-service';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';
import { SearchBar } from '@/components/search-bar';
import { ScreenWrapper } from '@/components/screen-wrapper';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    {client.avatar ? (
                      <Image source={{ uri: client.avatar }} style={styles.avatar} />
                    ) : (
                      <View
                        style={[
                          styles.avatar,
                          styles.avatarPlaceholder,
                          { backgroundColor: themeColors.border },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.clientInfo}>
                    <View style={styles.clientHeaderRow}>
                      <Text
                        style={[styles.clientName, { color: themeColors.text }]}
                        numberOfLines={1}
                      >
                        {client.fullName}
                      </Text>
                      <View style={styles.chevronContainer}>
                        <PlatformIcon
                          sf="chevron.right"
                          IconComponent={ChevronRight}
                          size={iconSizes.extraSmallIcons}
                          color={themeColors.mutedText}
                        />
                      </View>
                    </View>
                    <Text
                      style={[styles.clientSubtitle, { color: themeColors.mutedText }]}
                      numberOfLines={2}
                    >
                      {formatSubtitle(client)}
                    </Text>
                  </View>
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
    paddingBottom: 16,
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
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
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
  clientHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  clientName: {
    ...typography.h7,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  clientSubtitle: {
    ...typography.p3,
  },
  chevronContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
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
});

