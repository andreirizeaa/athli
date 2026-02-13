import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { getClients, type Client } from '@/services/client-service';
import { IconButton } from '@/components/ui/icon-button';
import { hexToRgba } from '@/utils/colorUtils';

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

  const handleClientPress = useCallback((clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      triggerClientSelect(client);
      router.back();
    }
  }, [clients, triggerClientSelect, router]);

  const handleClose = () => {
    router.back();
  };

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  const renderClientItem = useCallback(({ item }: { item: Client }) => {
    return (
      <PressableOpacity
        onPress={() => handleClientPress(item.id)}
        style={styles.clientItem}
      >
        <View style={styles.avatarContainer}>
          <SquircleView cornerSmoothing={1} style={styles.avatarCircle}>
            <Avatar
              uri={item.avatarUrl}
              size={48}
              borderRadius={8}
              fallback={
                <View
                  style={[
                    styles.avatarImage,
                    styles.avatarPlaceholder,
                    { backgroundColor: themeColors.border },
                  ]}
                />
              }
            />
          </SquircleView>
        </View>
        <View style={styles.clientInfo}>
          <Text
            style={[styles.clientName, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
      </PressableOpacity>
    );
  }, [handleClientPress, themeColors]);

  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12 }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('calendar.newSession.selectClient')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('chats.newChat.searchPlaceholder')}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Fixed Header Gradient */}
      <View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={[
            hexToRgba(themeColors.backgroundSecondary, 1),
            hexToRgba(themeColors.backgroundSecondary, 0.85),
            hexToRgba(themeColors.backgroundSecondary, 0.5),
            hexToRgba(themeColors.backgroundSecondary, 0),
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={[styles.headerGradient, { height: gradientHeight }]}
          pointerEvents="none"
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlashList<Client>
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={renderClientItem}
          ItemSeparatorComponent={() => <Separator style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                  {searchQuery ? t('clients.noResults') : t('clients.empty')}
                </Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
  },
  clientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clientName: {
    ...typography.p1,
    fontWeight: '600',
  },
  separator: {
    marginLeft: 76,
    marginRight: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.p1,
  },
});
