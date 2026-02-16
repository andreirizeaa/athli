import Link from 'next/link';
import Image from 'next/image';
import { AthliIcon, AthliLogo } from '@/components/athli-logo';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';

interface AuthLayoutProps {
  children: React.ReactNode;
  showHomeButton?: boolean;
  rightContent?: React.ReactNode;
  singleColumn?: boolean;
}

export function AuthLayout({ children, showHomeButton = true, rightContent, singleColumn = false }: AuthLayoutProps) {
  const landingPageUrl = process.env.NEXT_PUBLIC_LANDING_PAGE || '/';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Column - Form */}
      <div className={`relative w-full h-full overflow-y-auto bg-white dark:bg-black ${singleColumn ? '' : 'lg:w-1/2'}`}>
        {/* Grid Background */}
        <div
          className={`fixed inset-0 z-0 opacity-40 pointer-events-none ${singleColumn ? '' : 'lg:w-1/2'}`}
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className={`fixed inset-0 z-0 hidden opacity-40 pointer-events-none dark:block ${singleColumn ? '' : 'lg:w-1/2'}`}
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Mobile Header - Sticky centered logo */}
        {showHomeButton && (
          <div className="sticky top-0 z-20 flex items-center justify-center border-b bg-white/80 px-6 py-4 backdrop-blur-sm dark:bg-black/80 lg:hidden">
            <Link href={landingPageUrl}>
              <AthliIcon className="size-8 text-black dark:text-white" />
            </Link>
          </div>
        )}

        {/* Desktop Home Button - Fixed top left */}
        {showHomeButton && (
          <div className="fixed left-6 top-6 z-20 hidden lg:block">
            <Link href={landingPageUrl}>
              <AthliLogo />
            </Link>
          </div>
        )}

        {/* Content Container */}
        <div className="relative z-10 flex min-h-full w-full items-center justify-center px-4 py-12 lg:py-20">
          <div className="w-full max-w-lg">
            {children}
          </div>
        </div>
      </div>

      {/* Right Column */}
      {!singleColumn && (
      <div className="hidden items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 lg:flex lg:w-1/2">
        {rightContent || (
          <div className="flex flex-col items-center gap-8">
            <div className="relative flex size-[500px] items-center justify-center">
              {/* Center Icon */}
              <AthliIcon className="size-16 text-black dark:text-white" />

              {/* Inner orbit ring */}
              <div
                className="absolute left-1/2 top-1/2 rounded-full border border-black/10 dark:border-white/10"
                style={{ width: 260, height: 260, marginLeft: -130, marginTop: -130 }}
              />

              {/* Outer orbit ring */}
              <div
                className="absolute left-1/2 top-1/2 rounded-full border border-black/[0.06] dark:border-white/[0.06]"
                style={{ width: 420, height: 420, marginLeft: -210, marginTop: -210 }}
              />

              {/* Inner orbit - 3 icons */}
              <OrbitingCircles radius={130} duration={30}>
                <Image src="/icons/chatgpt.png" alt="" width={40} height={40} className="size-10 object-contain dark:invert" />
              </OrbitingCircles>
              <OrbitingCircles radius={130} duration={30} delay={10}>
                <Image src="/icons/whatsapp.png" alt="" width={40} height={40} className="size-10 object-contain" />
              </OrbitingCircles>
              <OrbitingCircles radius={130} duration={30} delay={20}>
                <Image src="/icons/excel.png" alt="" width={40} height={40} className="size-10 object-contain" />
              </OrbitingCircles>

              {/* Outer orbit - 5 icons */}
              <OrbitingCircles radius={210} duration={45} reverse>
                <Image src="/icons/zapier.png" alt="" width={40} height={40} className="size-10 object-contain" />
              </OrbitingCircles>
              <OrbitingCircles radius={210} duration={45} delay={9} reverse>
                <Image src="/icons/drive.png" alt="" width={40} height={40} className="size-10 object-contain" />
              </OrbitingCircles>
              <OrbitingCircles radius={210} duration={45} delay={18} reverse>
                <Image src="/icons/notion.png" alt="" width={40} height={40} className="size-10 object-contain dark:invert" />
              </OrbitingCircles>
              <OrbitingCircles radius={210} duration={45} delay={27} reverse>
                <Image src="/icons/stripe-icon.png" alt="" width={40} height={40} className="size-10 object-contain" />
              </OrbitingCircles>
              <OrbitingCircles radius={210} duration={45} delay={36} reverse>
                <Image src="/icons/docusign.png" alt="" width={40} height={40} className="size-10 object-contain" />
              </OrbitingCircles>
            </div>

            <div className="w-full px-8 text-center">
              <h2 className="text-balance text-5xl font-semibold text-black dark:text-white">All your tools, one platform</h2>
              <p className="mt-8 text-balance text-lg text-black/50 dark:text-white/50">
                Replace the clutter of multiple apps and run your entire coaching business from one place.
              </p>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
