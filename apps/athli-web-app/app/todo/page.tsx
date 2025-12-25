'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TodoPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/todo/your-list');
  }, [router]);

  return null;
};

export default TodoPage;
