import React from 'react';
import { useRouter } from 'expo-router';
import { EditColorSchemeScreen } from '../src/screens/edit/EditColorSchemeScreen';

export default function EditColorSchemeRoute() {
  const router = useRouter();

  return <EditColorSchemeScreen onBack={() => router.back()} />;
}


