import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Library',
};

const LibraryPage = () => {
  redirect('/library/training/workouts');
};

export default LibraryPage;
