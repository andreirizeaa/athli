import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Business',
};

export default function BusinessPage() {
  redirect('/business/summary');
}
