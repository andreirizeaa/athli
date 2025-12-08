import React from 'react';
import { useRouter } from 'expo-router';
import { SettingsScreen as CoachSettingsScreen } from '../../src/screens/coach/settings/SettingsScreen';

export default function CoachSettingsRoute() {
  const router = useRouter();

  const handleLanguagePress = () => {
    router.push('/edit-language');
  };

  const handleUnitsPress = () => {
    router.push('/edit-units');
  };

  const handleColorSchemePress = () => {
    router.push('/edit-color-scheme');
  };

  return (
    <CoachSettingsScreen
      onLanguagePress={handleLanguagePress}
      onUnitsPress={handleUnitsPress}
      onColorSchemePress={handleColorSchemePress}
    />
  );
}


