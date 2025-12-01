'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CompanyPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/business/company/information');
  }, [router]);

  return null;
};

export default CompanyPage;


