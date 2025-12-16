import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/card';
import { PlatformIcon } from '@/components/platform-icon';
import type { Client } from '@/services/client-service';

type ClientsListProps = {
  clients: Client[];
  isLoading: boolean;
  onClientPress: (clientId: string) => void;
};

export type ClientsListRef = {
  scrollToTop: () => void;
};

export const ClientsList = forwardRef<ClientsListRef, ClientsListProps>(
  ({ clients, isLoading, onClientPress }, ref) => {
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
      <View style={styles.cardWrapper}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onClientPress(item.id)}>
          <Card style={[isLastItem ? { marginBottom: 60 } : undefined, styles.cardContainer]}>
            <View style={styles.cardContent}>
              {item.avatar ? (
                <Image
                  source={{ uri: item.avatar }}
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
  cardWrapper: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});

