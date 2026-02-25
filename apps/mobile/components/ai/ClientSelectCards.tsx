import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import type { ClientSelectOption } from '@/services/ai/ai-service';

interface ClientSelectCardsProps {
  clients: ClientSelectOption[];
  onSelect: (client: { id: string; name: string }) => void;
  selectedClientId?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ClientSelectCards({ clients, onSelect, selectedClientId }: ClientSelectCardsProps) {
  const { colors: themeColors } = useThemePreference();
  const [selectedId, setSelectedId] = useState<string | null>(selectedClientId ?? null);

  const handleSelect = (client: ClientSelectOption) => {
    if (selectedId) return;
    setSelectedId(client.id);
    onSelect({ id: client.id, name: client.name });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: themeColors.mutedText }]}>Select a client:</Text>
      <View style={styles.grid}>
        {clients.map((client) => {
          const isSelected = selectedId === client.id;
          const isDisabled = selectedId !== null && !isSelected;

          return (
            <PressableOpacity
              key={client.id}
              onPress={() => handleSelect(client)}
              disabled={isDisabled}
              style={[
                styles.clientCard,
                { borderColor: isSelected ? themeColors.primary : themeColors.border },
                isSelected && { backgroundColor: themeColors.primary + '0A' },
                isDisabled && { opacity: 0.4 },
              ]}
            >
              {client.avatarUrl ? (
                <Image source={{ uri: client.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: themeColors.primary + '18' }]}>
                  <Text style={[styles.initials, { color: themeColors.primary }]}>
                    {getInitials(client.name)}
                  </Text>
                </View>
              )}
              <Text style={[styles.clientName, { color: themeColors.text }]} numberOfLines={1}>
                {client.name}
              </Text>
            </PressableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    gap: 8,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientName: {
    ...typography.p2,
    fontWeight: '500',
    flex: 1,
  },
});
