import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslations } from '@/contexts/useTranslations';
import { SearchBar } from '@/components/search-bar';
import { ClientsList } from '@/components/clients/clients-list';
import { getClients, type Client } from '@/services/client-service';
import { createNewChat } from '@/services/chats-service';

type NewChatContentProps = {
  onClose: () => void;
};

export const NewChatContent = ({ onClose }: NewChatContentProps) => {
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

  return (
    <View style={styles.pageContainer}>
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
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
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
