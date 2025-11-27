'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LibraryPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/library/workouts');
  }, [router]);

  return null;
};

export default LibraryPage;
