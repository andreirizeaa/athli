'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AccountPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/account/profile');
  }, [router]);

  return null;
};

export default AccountPage;

