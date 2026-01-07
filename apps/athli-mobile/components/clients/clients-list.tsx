import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import type { Client } from '@/services/client-service';

type ClientsListProps = {
  clients: Client[];
  isLoading: boolean;
  onClientPress: (clientId: string) => void;
  showChevron?: boolean;
};

export type ClientsListRef = {
  scrollToTop: () => void;
};

export const ClientsList = forwardRef<ClientsListRef, ClientsListProps>(
  ({ clients, isLoading, onClientPress, showChevron = true }, ref) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const listRef = useRef<any>(null);

    // Expose scroll to top function
    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        setTimeout(() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      },
    }));

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

    const renderClientCard = ({ item, index }: { item: Client; index: number }) => {
      const isLastItem = index === clients.length - 1;

      return (
        <View>
          <Pressable
            onPress={() => onClientPress(item.id)}
            style={({ pressed }) => [
              styles.rowWrapper,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.rowContent}>
              <View style={styles.avatarContainer}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
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
                    {item.fullName}
                  </Text>
                  {showChevron && (
                    <View style={styles.chevronContainer}>
                      <PlatformIcon
                        sf="chevron.right"
                        IconComponent={ChevronRight}
                        size={iconSizes.extraSmallIcons}
                        color={themeColors.mutedText}
                      />
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.clientSubtitle, { color: themeColors.mutedText }]}
                  numberOfLines={2}
                >
                  {formatSubtitle(item)}
                </Text>
              </View>
            </View>
          </Pressable>
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
    };

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      );
    }

    return (
      <FlashList<Client>
        ref={listRef}
        data={clients}
        renderItem={renderClientCard}
        keyExtractor={(item: Client) => item.id}
        // @ts-ignore - estimatedItemSize is a valid FlashList prop but types may be outdated
        estimatedItemSize={88}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  }
);

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});

