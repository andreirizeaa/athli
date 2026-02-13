import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Forms',
};

export default function FormsPage() {
  redirect('/library/forms/check-ins');
}
