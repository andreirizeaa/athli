import { Smartphone } from 'lucide-react';
import { AthliLogo } from '@/components/athli-logo';
import { AppStoreButton, GooglePlayButton } from '@/components/public/app-store-buttons';

export default function DownloadClientPage() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Logo */}
      <div className="absolute left-6 top-6 z-20">
        <AthliLogo />
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="absolute inset-0 hidden opacity-40 dark:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Smartphone className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Your experience is waiting
          </h1>
          <p className="text-muted-foreground mb-8">
            Download the Athli app to access your personalized training, track your progress, and connect with your coach.
          </p>
          <div className="flex items-center justify-center gap-3">
            <AppStoreButton href="#" />
            <GooglePlayButton href="#" />
          </div>
        </div>
      </div>
    </div>
  );
}
