import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';
import { ClientsList } from '@/components/features/clients/clients-list';
import { getClients, type Client } from '@/services/client-service';
import { IconButton } from '@/components/ui/icon-button';

export default function SearchClientModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { triggerClientSelect } = useModalCallbacks();

  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load clients when component mounts
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      try {
        const clientsData = await getClients();
        setClients(clientsData);
      } catch (error) {
        console.error('Failed to load clients:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadClients();
  }, []);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        client.name.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleClientPress = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      triggerClientSelect(client);
      router.back();
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.backgroundSecondary }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{t('calendar.newSession.selectClient')}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Fixed Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.inputGroup}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('chats.newChat.searchPlaceholder')}
            />
          </View>
        </View>

        {/* Scrollable Client List */}
        <View style={styles.listContainer}>
          <ClientsList
            clients={filteredClients}
            isLoading={isLoading}
            onClientPress={handleClientPress}
            showChevron={false}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  inputGroup: {
    width: '100%',
  },
  listContainer: {
    flex: 1,
  },
});
