import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslations } from '@/contexts/useTranslations';
import { SearchBar } from '@/components/search-bar';
import { ClientsList } from '@/components/clients/clients-list';
import { getClients, type Client } from '@/services/client-service';
import { createNewChat } from '@/services/chats-service';

type NewChatContentProps = {
  onClose: () => void;
  headerHeight?: number;
};

export const NewChatContent = ({ onClose, headerHeight = 56 }: NewChatContentProps) => {
  const { t } = useTranslations();

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
        client.fullName.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleClientPress = async (clientId: string) => {
    try {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        await createNewChat(clientId, {
          clientName: client.fullName,
          clientAvatar: client.avatar,
        });
        onClose();
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  // Search bar as list header so the whole screen scrolls with proper top padding
  const ListHeader = (
    <View style={[styles.searchBarContainer, { paddingTop: headerHeight + 16 }]}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('chats.newChat.searchPlaceholder')}
      />
    </View>
  );

  return (
    <View style={styles.pageContainer}>
      <ClientsList
        clients={filteredClients}
        isLoading={isLoading}
        onClientPress={handleClientPress}
        ListHeaderComponent={ListHeader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
