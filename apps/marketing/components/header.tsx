'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, GitBranch, FileText, Inbox, BarChart3, TrendingUp, Dumbbell, ClipboardList, Menu, X, Smartphone, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { AthliLogo } from '@/components/athli-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

const featureItems = [
  { label: 'Flows', headline: 'Automated accountability, beyond just check-ins', icon: GitBranch },
  { label: 'Forms', headline: 'Fully customizable forms that feed your data', icon: FileText },
  { label: 'Inbox', headline: 'Message clients with their full profile in view', icon: Inbox },
  { label: 'Metrics', headline: 'Track any metric that matters to you', icon: BarChart3 },
  { label: 'Progress', headline: 'Detailed tracking across every exercise and variant', icon: TrendingUp },
  { label: 'Training', headline: 'Plan everything from one calendar view', icon: Dumbbell },
  { label: 'Workouts', headline: 'Over 1,700 exercises, fully customizable', icon: ClipboardList },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [featuresOpen, setFeaturesOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const featuresTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openFeatures = () => {
    if (featuresTimeout.current) clearTimeout(featuresTimeout.current);
    setFeaturesOpen(true);
  };

  const closeFeatures = () => {
    featuresTimeout.current = setTimeout(() => setFeaturesOpen(false), 150);
  };

  const openMobile = () => {
    if (mobileTimeout.current) clearTimeout(mobileTimeout.current);
    setMobileOpen(true);
  };

  const closeMobile = () => {
    mobileTimeout.current = setTimeout(() => setMobileOpen(false), 150);
  };

  const scrollTo = (id: string) => {
    setMenuState(false);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header>
      <nav data-state={menuState && 'active'} className="fixed z-20 w-full px-2">
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
            isScrolled && 'max-w-4xl rounded-2xl border bg-background/50 backdrop-blur-lg lg:px-5'
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between lg:w-auto">
              <Link href="/" aria-label="home">
                <AthliLogo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState === true ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            {/* Desktop nav */}
            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex items-center gap-8 text-sm">
                <li
                  className="relative"
                  onMouseEnter={openFeatures}
                  onMouseLeave={closeFeatures}
                >
                  <button
                    className="flex cursor-pointer items-center gap-1 text-muted-foreground duration-150 hover:text-accent-foreground"
                    onClick={() => scrollTo('features')}
                  >
                    <span>Features</span>
                    <ChevronDown className={cn('size-3.5 transition-transform duration-200', featuresOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {featuresOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-1/2 top-full z-50 pt-4 -translate-x-1/2"
                      >
                        <div className="w-[520px] overflow-hidden rounded-2xl border bg-background p-2 shadow-lg shadow-zinc-950/10 dark:shadow-zinc-950/40">
                          <div className="grid grid-cols-2 gap-1">
                            {featureItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={item.label}
                                  onClick={() => {
                                    setFeaturesOpen(false);
                                    window.dispatchEvent(new CustomEvent('set-feature', { detail: item.label.toLowerCase() }));
                                    scrollTo('features');
                                  }}
                                  className="flex cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                                >
                                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                                    <Icon className="size-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-xs text-muted-foreground leading-snug">{item.headline}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo('pricing')}
                    className="cursor-pointer text-muted-foreground duration-150 hover:text-accent-foreground"
                  >
                    <span>Pricing</span>
                  </button>
                </li>
                <li
                  className="relative"
                  onMouseEnter={openMobile}
                  onMouseLeave={closeMobile}
                >
                  <button
                    className="flex cursor-pointer items-center gap-1 text-muted-foreground duration-150 hover:text-accent-foreground"
                    onClick={() => scrollTo('mobile-apps')}
                  >
                    <span>Mobile App</span>
                    <ChevronDown className={cn('size-3.5 transition-transform duration-200', mobileOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {mobileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-1/2 top-full z-50 pt-4 -translate-x-1/2"
                      >
                        <div className="w-[280px] overflow-hidden rounded-2xl border bg-background p-2 shadow-lg shadow-zinc-950/10 dark:shadow-zinc-950/40">
                          <Link
                            href="/mobile/coach"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                          >
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                              <Smartphone className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Coach</p>
                              <p className="text-xs text-muted-foreground leading-snug">Your full coaching toolkit on mobile</p>
                            </div>
                          </Link>
                          <Link
                            href="/mobile/client"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                          >
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                              <Users className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Client</p>
                              <p className="text-xs text-muted-foreground leading-snug">Your clients' main app experience</p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              </ul>
            </div>

            {/* Mobile nav */}
            <div className="bg-background mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 in-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  <li>
                    <button
                      onClick={() => scrollTo('features')}
                      className="cursor-pointer text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>Features</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollTo('pricing')}
                      className="cursor-pointer text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>Pricing</span>
                    </button>
                  </li>
                  <li>
                    <Link
                      href="/mobile/coach"
                      onClick={() => setMenuState(false)}
                      className="text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>Coach App</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/mobile/client"
                      onClick={() => setMenuState(false)}
                      className="text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>Client App</span>
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="flex w-full justify-end md:w-fit">
                <div className="flex items-center gap-2">
                  <Link href={`${APP_URL}/auth/login`}>
                    <Button variant="ghost" size="sm">
                      <span>Log in</span>
                    </Button>
                  </Link>
                  <Link href={`${APP_URL}/auth/register`}>
                    <Button size="default">
                      <span>Sign up</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
