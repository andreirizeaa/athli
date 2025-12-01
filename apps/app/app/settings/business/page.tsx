'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BusinessPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/business/company/information');
  }, [router]);

  return null;
};

export default BusinessPage;


