import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Athletes',
};

export default function AthletesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
