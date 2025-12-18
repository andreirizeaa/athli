'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TrainingPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/training/workouts');
  }, [router]);

  return null;
};

export default TrainingPage;
