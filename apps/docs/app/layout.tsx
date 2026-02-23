import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Athli Help Center',
  description: 'Find answers, guides, and tutorials for the Athli coaching platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
