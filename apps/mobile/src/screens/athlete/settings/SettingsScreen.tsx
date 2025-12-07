import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useView } from '../../../context/ViewContext';

interface SettingsScreenProps {
  onPersonalDetailsPress?: () => void;
  onUnitsPress?: () => void;
  onLanguagePress?: () => void;
  onSharePress?: () => void;
  onEditNamePress?: () => void;
  onAppIconPress?: () => void;
}

export function SettingsScreen(_props: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { switchView } = useView();

  const handleSwitchView = () => {
    switchView();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.switchCard} onPress={handleSwitchView} activeOpacity={0.7}>
          <Text style={styles.switchCardText}>Switch to coach view</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  switchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  switchCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

