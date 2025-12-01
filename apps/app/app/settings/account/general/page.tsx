'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const GeneralPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/account/general/profile');
  }, [router]);

  return null;
};

export default GeneralPage;


