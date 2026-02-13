import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Training',
};

export default function TrainingPage() {
  redirect('/library/training/workouts');
}
