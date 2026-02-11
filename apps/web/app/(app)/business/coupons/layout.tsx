import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coupons',
};

export default function CouponsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
