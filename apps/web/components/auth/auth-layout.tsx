import Link from 'next/link';
import { AthliLogo } from '@/components/athli-logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  showHomeButton?: boolean;
}

export function AuthLayout({ children, showHomeButton = true }: AuthLayoutProps) {
  const landingPageUrl = process.env.NEXT_PUBLIC_LANDING_PAGE || '/';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black">
      {/* Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Home Button */}
      {showHomeButton && (
        <div className="absolute left-6 top-6 z-20">
          <Link href={landingPageUrl}>
            <AthliLogo className="!text-white" />
          </Link>
        </div>
      )}

      {/* Content Container - No card wrapper */}
      <div className="relative z-10 w-full max-w-lg px-4">
        {children}
      </div>
    </div>
  );
}
