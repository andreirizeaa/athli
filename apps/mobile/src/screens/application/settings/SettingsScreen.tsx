import React from 'react';
import { View } from 'react-native';

interface SettingsScreenProps {
  onPersonalDetailsPress?: () => void;
  onUnitsPress?: () => void;
  onLanguagePress?: () => void;
  onSharePress?: () => void;
  onEditNamePress?: () => void;
  onAppIconPress?: () => void;
}

export function SettingsScreen(_props: SettingsScreenProps) {
  return <View style={{ flex: 1 }} />;
}
