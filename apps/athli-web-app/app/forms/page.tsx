'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FormsPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/forms/check-ins');
  }, [router]);

  return null;
};

export default FormsPage;
