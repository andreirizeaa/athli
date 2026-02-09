import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'To-do',
};

export default function TodoPage() {
  redirect('/todo/your-list');
}
