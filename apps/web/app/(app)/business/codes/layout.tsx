import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discount Codes',
};

export default function CodesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
