import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature Requests',
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
