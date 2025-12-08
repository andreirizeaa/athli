import React from 'react';
import { useRouter } from 'expo-router';
import { EditUnitsScreen } from '../src/screens/edit/EditUnitsScreen';

export default function EditUnitsRoute() {
  const router = useRouter();

  return <EditUnitsScreen onBack={() => router.back()} />;
}


