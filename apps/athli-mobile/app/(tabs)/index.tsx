import { Redirect } from 'expo-router';

import { useAppView } from '@/contexts/useAppView';

export default function TabsIndex() {
  const { appView } = useAppView();

  if (appView === 'coach') {
    return <Redirect href="/clients" />;
  }

  return <Redirect href="/training" />;
}

