import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
            <Button
              variant="outline"
              size="sm"
              className="!bg-zinc-900 !border-white/20 !text-white hover:!bg-white hover:!text-black hover:!border-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
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
