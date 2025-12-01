'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const IntegrationsPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/app/integrations/email');
  }, [router]);

  return null;
};

export default IntegrationsPage;

