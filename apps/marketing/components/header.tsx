'use client';

import React from 'react';
import NextLink from 'next/link';
import { Link } from '@/lib/i18n/navigation';
import { ArrowRight, ChevronDown, GitBranch, FileText, Inbox, BarChart3, TrendingUp, Dumbbell, ClipboardList, Menu, X, Smartphone, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { AthliLogo } from '@/components/athli-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { featureKeys } from '@/lib/features-data';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  flows: GitBranch,
  forms: FileText,
  inbox: Inbox,
  metrics: BarChart3,
  progress: TrendingUp,
  training: Dumbbell,
  workouts: ClipboardList,
};

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [featuresOpen, setFeaturesOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileFeatures, setMobileFeatures] = React.useState(false);
  const [mobileMobileApp, setMobileMobileApp] = React.useState(false);
  const featuresTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations('nav');
  const tf = useTranslations('features');

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

              {/* Mobile app store icons - mobile only */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex size-8 items-center justify-center rounded-lg bg-black dark:bg-white">
                  <svg className="size-4 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-black dark:bg-white">
                  <svg className="size-4" viewBox="0 0 512 512">
                    <path fill="#2196F3" d="M325.3 234.3L104.6 13l280.8 161.2z"/>
                    <path fill="#4CAF50" d="M47 0C34.8 0 24.6 10.2 24.6 24.6v462.8c0 14.4 10.2 24.6 24.6 24.6 4.5 0 8.7-1.2 12.4-3.3L275.8 256 59.4 3.3C55.7 1.2 51.5 0 47 0z"/>
                    <path fill="#FFC107" d="M325.3 277.7L104.6 499l280.8-161.2z"/>
                    <path fill="#F44336" d="M450.2 235.8l-93.1-53.7L275.8 256l81.3 73.9 93.1-53.7c14.4-8.3 14.4-32.1 0-40.4z"/>
                  </svg>
                </div>
              </div>

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
                    <span>{t('features')}</span>
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
                            {featureKeys.map((key) => {
                              const Icon = featureIcons[key];
                              return (
                                <Link
                                  key={key}
                                  href={`/features/${key}`}
                                  onClick={() => setFeaturesOpen(false)}
                                  className="flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                                >
                                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                                    <Icon className="size-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{tf(`${key}.label`)}</p>
                                    <p className="text-xs text-muted-foreground leading-snug">{tf(`${key}.headline`)}</p>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-muted-foreground duration-150 hover:text-accent-foreground"
                  >
                    <span>{t('pricing')}</span>
                  </Link>
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
                    <span>{t('mobileApp')}</span>
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
                              <p className="text-sm font-medium">{t('coach')}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{t('coachHeadline')}</p>
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
                              <p className="text-sm font-medium">{t('client')}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{t('clientHeadline')}</p>
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
                <ul className="space-y-4 text-base">
                  {/* Features with sub-menu */}
                  <li>
                    <button
                      onClick={() => setMobileFeatures(!mobileFeatures)}
                      className="flex w-full cursor-pointer items-center justify-between text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>{t('features')}</span>
                      <ChevronDown className={cn('size-4 transition-transform duration-200', mobileFeatures && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {mobileFeatures && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-1 pl-1">
                            {featureKeys.map((key) => {
                              const Icon = featureIcons[key];
                              return (
                                <Link
                                  key={key}
                                  href={`/features/${key}`}
                                  onClick={() => setMenuState(false)}
                                  className="flex items-center gap-3 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                                >
                                  <Icon className="size-4 shrink-0" />
                                  <span>{tf(`${key}.label`)}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      onClick={() => setMenuState(false)}
                      className="text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>{t('pricing')}</span>
                    </Link>
                  </li>
                  {/* Mobile App with sub-menu */}
                  <li>
                    <button
                      onClick={() => setMobileMobileApp(!mobileMobileApp)}
                      className="flex w-full cursor-pointer items-center justify-between text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>{t('mobileApp')}</span>
                      <ChevronDown className={cn('size-4 transition-transform duration-200', mobileMobileApp && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {mobileMobileApp && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-1 pl-1">
                            <Link
                              href="/mobile/coach"
                              onClick={() => setMenuState(false)}
                              className="flex items-center gap-3 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                            >
                              <Smartphone className="size-4 shrink-0" />
                              <span>{t('coach')}</span>
                            </Link>
                            <Link
                              href="/mobile/client"
                              onClick={() => setMenuState(false)}
                              className="flex items-center gap-3 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                            >
                              <Users className="size-4 shrink-0" />
                              <span>{t('client')}</span>
                            </Link>
                          </div>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                </ul>
              </div>
              <div className="flex w-full justify-end md:w-fit">
                <div className="flex items-center gap-2">
                  <NextLink href={`${APP_URL}/auth/login`}>
                    <Button variant="ghost" size="sm">
                      <span>{t('logIn')}</span>
                    </Button>
                  </NextLink>
                  <NextLink href={`${APP_URL}/auth/register`}>
                    <Button size="lg" className="rounded-xl px-5 text-base">
                      <span className="text-nowrap">{t('coachForFree')}</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </NextLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
