'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AppPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/app/customisations');
  }, [router]);

  return null;
};

export default AppPage;

