import React from 'react';
import { useRouter } from 'expo-router';
import { SettingsScreen as AthleteSettingsScreen } from '../../src/screens/athlete/settings/SettingsScreen';

export default function AthleteSettingsRoute() {
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
    <AthleteSettingsScreen
      onLanguagePress={handleLanguagePress}
      onUnitsPress={handleUnitsPress}
      onColorSchemePress={handleColorSchemePress}
    />
  );
}


