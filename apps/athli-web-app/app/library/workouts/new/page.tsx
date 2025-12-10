'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NewWorkoutRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.push('/library/workouts');
  }, [router]);

  return null;
};

export default NewWorkoutRedirectPage;
