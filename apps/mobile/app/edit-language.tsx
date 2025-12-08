import React from 'react';
import { useRouter } from 'expo-router';
import { EditLanguageScreen } from '../src/screens/edit/EditLanguageScreen';

export default function EditLanguageRoute() {
  const router = useRouter();

  return <EditLanguageScreen onBack={() => router.back()} />;
}


