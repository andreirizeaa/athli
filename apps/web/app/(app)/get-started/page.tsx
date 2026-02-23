'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import {
  ChevronDown,
  Dumbbell,
  ClipboardList,
  BarChart3,
  Sprout,
  File,
  Workflow,
  Users,
  MessageCircle,
  CheckSquare,
  ClipboardCheck,
  Bot,
  Copy,
  Zap,
  FileCheck,
  Check,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import Lottie from 'lottie-react';
import { useCoachFlows } from '@/hooks/use-coach-flows';
import { useCoachChecklist } from '@/hooks/use-coach-checklist';
import { useTerminology } from '@/hooks/use-terminology';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppStoreButton, GooglePlayButton } from '@/components/public/app-store-buttons';

interface AccordionCardProps {
  number: number;
  title: string;
  isOpen: boolean;
  onClick: () => void;
  currentProgress: number;
  totalItems: number;
  exploredLabel: string;
  children: React.ReactNode;
}

const ProgressCircle = ({ current, total }: { current: number; total: number }) => {
  const percentage = (current / total) * 100;
  const isComplete = current === total;
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (isComplete) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary">
        <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
      </div>
    );
  }

  return (
    <div className="relative h-5 w-5 flex items-center justify-center">
      <svg className="h-4 w-4 transform -rotate-90">
        <circle
          cx="8"
          cy="8"
          r={radius}
          stroke="currentColor"
          strokeWidth="1.5"
          fill="transparent"
          className="text-muted-foreground/20"
        />
        <circle
          cx="8"
          cy="8"
          r={radius}
          stroke="currentColor"
          strokeWidth="1.5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

/**
 * Animated border effect with two chasing tails
 */
const AnimatedBorder = ({ width, height }: { width: number; height: number }) => {
  const r = 12;

  if (width <= 0 || height <= 0) return null;

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 z-20"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <defs>
        <linearGradient id="border-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="rgb(192,132,252)" />
          <stop offset="100%" stopColor="rgb(165,180,252)" />
        </linearGradient>
      </defs>
      <motion.rect
        x={1.5}
        y={1.5}
        width={width - 3}
        height={height - 3}
        rx={r}
        ry={r}
        pathLength={1}
        stroke="url(#border-gradient)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.15 0.85"
        animate={{ strokeDashoffset: [0, -1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.rect
        x={1.5}
        y={1.5}
        width={width - 3}
        height={height - 3}
        rx={r}
        ry={r}
        pathLength={1}
        stroke="url(#border-gradient)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.15 0.85"
        animate={{ strokeDashoffset: [-0.5, -1.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
};

/**
 * Feature image preview with animated border and purple glow
 */
const FeatureImagePreview = ({ imagePath, alt }: { imagePath: string; alt: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative mt-3 mb-4">
      {/* Purple glow background */}
      <div className="absolute inset-x-0 inset-y-1 bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-purple-500/15 blur-md -z-10" />
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden"
        style={{}}
      >
        <AnimatedBorder width={dims.w} height={dims.h} />
        <img
          src={imagePath}
          alt={alt}
          className="w-full h-auto transition-all duration-300 rounded-xl"
        />
      </div>
    </div>
  );
};

/**
 * Fan layout of 3 mobile screenshots — centre straight in front, left & right tilted behind
 */
const MobileScreenshotFan = ({
  images,
  theme,
}: {
  images: { left: string; center: string; right: string };
  theme: 'light' | 'dark';
}) => {
  const src = (base: string) => `${base}/${theme}.png`;

  return (
    <div className="relative flex items-center justify-center py-4" style={{ height: 260 }}>
      {/* Left – tilted, behind */}
      <img
        src={src(images.left)}
        alt=""
        className="absolute rounded-2xl shadow-lg object-cover"
        style={{
          height: 220,
          width: 'auto',
          transform: 'rotate(-10deg) translateX(-90%) translateY(-4%)',
          zIndex: 1,
        }}
      />
      {/* Centre – straight, in front */}
      <img
        src={src(images.center)}
        alt=""
        className="relative rounded-2xl shadow-xl object-cover"
        style={{
          height: 240,
          width: 'auto',
          zIndex: 3,
        }}
      />
      {/* Right – tilted, behind */}
      <img
        src={src(images.right)}
        alt=""
        className="absolute rounded-2xl shadow-lg object-cover"
        style={{
          height: 220,
          width: 'auto',
          transform: 'rotate(10deg) translateX(90%) translateY(-4%)',
          zIndex: 1,
        }}
      />
    </div>
  );
};

const AccordionCard = ({
  number,
  title,
  isOpen,
  onClick,
  currentProgress,
  totalItems,
  exploredLabel,
  children,
}: AccordionCardProps) => {
  return (
    <div
      className={cn(
        'bg-card rounded-xl shadow-sm border border-border transition-all duration-300 cursor-pointer overflow-hidden',
        isOpen ? 'shadow-md' : 'hover:shadow-md'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-medium text-primary">
            {number}
          </div>
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ProgressCircle current={currentProgress} total={totalItems} />
            <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">
              {exploredLabel}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-muted-foreground transition-transform duration-300',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-5 pb-5 pt-0">{children}</div>
      </div>
    </div>
  );
};

const GetStartedPage = () => {
  const router = useRouter();
  const [openAccordion, setOpenAccordion] = useState<number | null>(1);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<string>('workouts');
  const [isNavigating, setIsNavigating] = useState(false);
  const [giftAnimationData, setGiftAnimationData] = useState<object | null>(null);
  const t = useTranslations('getStarted');
  const { flows } = useCoachFlows();
  const { data: checklist } = useCoachChecklist();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  // Load the gift animation
  useEffect(() => {
    fetch('/animations/gift-animation.json')
      .then(res => res.json())
      .then(data => setGiftAnimationData(data))
      .catch(() => {});
  }, []);

  // Find the New Client Sign Up flow ID dynamically
  const newClientSignUpFlow = flows.find(f => f.name === 'New Client Sign Up');

  // Calculate progress for each accordion
  const clientAppProgress = checklist?.client_app_demo ? 1 : 0;
  const coachAppProgress = checklist?.coach_app_demo ? 1 : 0;

  const featuresProgress = [
    checklist?.workout_ai,
    checklist?.ai_assistant,
    checklist?.powerful_flows,
    checklist?.lifestyle_habits,
    checklist?.track_metrics,
    checklist?.check_ins_forms,
    checklist?.automate_onboardings,
  ].filter(Boolean).length;

  // Check if a checklist item is completed
  const isChecklistItemCompleted = (key: string): boolean => {
    if (!checklist) return false;

    const keyMap: Record<string, keyof typeof checklist> = {
      'workouts': 'workout_ai',
      'aiAssistant': 'ai_assistant',
      'flows': 'powerful_flows',
      'habits': 'lifestyle_habits',
      'metrics': 'track_metrics',
      'forms': 'check_ins_forms',
      'automations': 'automate_onboardings',
    };

    const checklistKey = keyMap[key];
    return checklistKey ? Boolean(checklist[checklistKey]) : false;
  };

  // Feature items configuration
  const featureItems = [
    { icon: Dumbbell, key: 'workouts', image: '/app-screenshots/workouts' },
    { icon: Bot, key: 'aiAssistant', image: '/app-screenshots/ai' },
    { icon: Workflow, key: 'flows', image: '/app-screenshots/flows' },
    { icon: Sprout, key: 'habits', image: '/app-screenshots/client/habits' },
    { icon: BarChart3, key: 'metrics', image: '/app-screenshots/client/metrics' },
    { icon: FileCheck, key: 'forms', image: '/app-screenshots/client/check-ins' },
    { icon: Zap, key: 'automations', image: '/app-screenshots/onboardings' },
  ];

  // Get image path based on theme
  const getFeatureImage = (basePath: string) => {
    const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
    return `${basePath}/${theme}.png`;
  };

  // Get route for a checklist item
  const getRouteForItem = (item: string) => {
    switch (item) {
      case 'workouts':
        return '/training/workouts?ai=true';
      case 'aiAssistant':
        return '/training/workouts?ai=true';
      case 'flows':
        return '/flows';
      case 'habits':
        return '/habits?create=true';
      case 'metrics':
        return '/metrics?create=true';
      case 'forms':
        return '/forms/check-ins?create=true';
      case 'automations':
        return '/onboarding';
      default:
        return '/';
    }
  };

  // Prefetch all routes for faster navigation
  useEffect(() => {
    const routes = [
      '/training/workouts',
      '/library/training/programs',
      '/library/training/exercises',
      '/library/forms/check-ins',
      '/flows',
      '/library/habits',
      '/library/metrics',
      '/library/files',
    ];
    routes.forEach(route => router.prefetch(route));
    if (newClientSignUpFlow) {
      router.prefetch(`/flows/${newClientSignUpFlow.id}`);
    }
  }, [router, newClientSignUpFlow]);

  const handleExploreClick = () => {
    setIsNavigating(true);
    router.push(getRouteForItem(selectedChecklistItem));
  };

  const handleAccordionClick = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div className="relative h-full w-full overflow-auto bg-background p-6">
      {/* Background Decorative Bubbles - hidden in dark mode */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.08] blur-[100px]" />
        <div className="absolute -right-[5%] top-[20%] h-[400px] w-[400px] rounded-full bg-primary/[0.08] blur-[100px]" />
        <div className="absolute bottom-[10%] left-[20%] h-[600px] w-[600px] rounded-full bg-primary/[0.08] blur-[100px]" />
      </div>

      {/* Welcome Section - Centered at 50% on desktop, full width on mobile */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="w-full md:w-[50%] md:min-w-[400px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              <span className="text-2xl">👋</span>
              {t('welcomeTitle')}
            </h1>
            <p className="text-muted-foreground">{t('welcomeSubtitle')}</p>
          </div>

          {/* Accordion Cards */}
          <div className="space-y-3 mb-8">
            <AccordionCard
              number={1}
              title={t('cards.clientApp.title')}
              isOpen={openAccordion === 0}
              onClick={() => handleAccordionClick(0)}
              currentProgress={clientAppProgress}
              totalItems={1}
              exploredLabel={t('explored', { count: clientAppProgress, total: 1 })}
            >
              <div className="text-sm text-muted-foreground text-center">
                <MobileScreenshotFan
                  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                  images={{
                    left: '/mobile/client/workouts',
                    center: '/mobile/client/home',
                    right: '/mobile/client/habits',
                  }}
                />
                <p className="mb-3 leading-relaxed max-w-[90%] mx-auto">
                  {t('cards.clientApp.description')}
                </p>
                <div className="flex justify-center items-center gap-3">
                  <AppStoreButton href="#" />
                  <GooglePlayButton href="#" />
                </div>
              </div>
            </AccordionCard>

            <AccordionCard
              number={2}
              title={t('cards.features.title')}
              isOpen={openAccordion === 1}
              onClick={() => handleAccordionClick(1)}
              currentProgress={featuresProgress}
              totalItems={7}
              exploredLabel={t('explored', { count: featuresProgress, total: 7 })}
            >
              {/* Mobile Layout - Dropdown + Content stacked */}
              {isMobile ? (
                <div className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                  {/* Feature Selector Dropdown */}
                  <Select value={selectedChecklistItem} onValueChange={setSelectedChecklistItem}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {featureItems.map((item) => {
                        const isCompleted = isChecklistItemCompleted(item.key);
                        return (
                          <SelectItem key={item.key} value={item.key}>
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span>{t(`checklist.${item.key}`)}</span>
                              {isCompleted && <Check className="h-3 w-3 text-primary ml-auto" />}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* 3D Image */}
                  <FeatureImagePreview
                    imagePath={getFeatureImage(featureItems.find(f => f.key === selectedChecklistItem)?.image || '')}
                    alt={t(`checklist.details.${selectedChecklistItem}.title`)}
                  />

                  {/* Content */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {t(`checklist.details.${selectedChecklistItem}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t(`checklist.details.${selectedChecklistItem}.subtitle`)}
                    </p>
                    <Button variant="default" className="w-full" onClick={handleExploreClick} disabled={isNavigating}>
                      {t('checklist.explore')}
                      {isNavigating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Desktop Layout - Side by side */
                <div className="flex items-stretch gap-6 min-h-[320px]">
                  {/* Left Side - Checklist Items */}
                  <div className="flex-1 flex flex-col gap-1">
                    {featureItems.map((item) => {
                      const isCompleted = isChecklistItemCompleted(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChecklistItem(item.key);
                          }}
                          className={cn(
                            'flex items-center gap-3 py-3 px-2 rounded-lg cursor-pointer transition-all border border-transparent',
                            selectedChecklistItem === item.key
                              ? 'bg-primary/10 border-primary/20'
                              : 'hover:bg-accent hover:border-border'
                          )}
                        >
                          <item.icon className={cn(
                            'h-4 w-4 shrink-0',
                            selectedChecklistItem === item.key ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <span className={cn(
                            'flex-1 text-sm font-medium',
                            selectedChecklistItem === item.key ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {t(`checklist.${item.key}`)}
                          </span>
                          <div className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            isCompleted
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30'
                          )}>
                            {isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vertical Divider */}
                  <div className="w-px bg-border self-stretch" />

                  {/* Right Side - 3D Image + Content + Explore Button */}
                  <div className="flex-1 flex flex-col justify-between">
                    {/* 3D Image Container */}
                    <FeatureImagePreview
                      imagePath={getFeatureImage(featureItems.find(f => f.key === selectedChecklistItem)?.image || '')}
                      alt={t(`checklist.details.${selectedChecklistItem}.title`)}
                    />

                    {/* Title and Description */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {t(`checklist.details.${selectedChecklistItem}.title`)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(`checklist.details.${selectedChecklistItem}.subtitle`)}
                      </p>
                    </div>

                    {/* Explore Button */}
                    <div className="flex justify-end">
                      <Button variant="default" onClick={(e) => { e.stopPropagation(); handleExploreClick(); }} disabled={isNavigating}>
                        {t('checklist.explore')}
                        {isNavigating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </AccordionCard>

            <AccordionCard
              number={3}
              title={t('cards.coachApp.title')}
              isOpen={openAccordion === 2}
              onClick={() => handleAccordionClick(2)}
              currentProgress={coachAppProgress}
              totalItems={1}
              exploredLabel={t('explored', { count: coachAppProgress, total: 1 })}
            >
              <div className="text-sm text-muted-foreground text-center">
                <MobileScreenshotFan
                  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                  images={{
                    left: '/mobile/coach/training',
                    center: '/mobile/coach/home',
                    right: '/mobile/coach/metrics',
                  }}
                />
                <p className="mb-3 leading-relaxed max-w-[90%] mx-auto">
                  {t('cards.coachApp.description')}
                </p>
                <div className="flex justify-center items-center gap-3">
                  <AppStoreButton href="#" />
                  <GooglePlayButton href="#" />
                </div>
              </div>
            </AccordionCard>
          </div>
        </div>
      </div>

      {/* Live Chat & Referral Section - Centered at 50% on desktop, full width on mobile */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="w-full md:w-[50%] md:min-w-[400px]">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Live Chat Card */}
            <div
              className="group relative flex flex-1 h-[140px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md cursor-pointer"
              onClick={() => { }}
            >
              <div className="relative w-[100px] md:w-[140px] shrink-0 overflow-hidden">
                <img
                  src="/images/live-chat.png"
                  alt={t('liveChat.title')}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                  {t('liveChat.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('liveChat.description')}
                </p>
              </div>
            </div>

            {/* Refer & Earn Card - Full width rectangle on mobile, square on desktop */}
            <div
              className="group relative flex items-center justify-center h-[100px] md:h-[140px] md:w-[140px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md cursor-pointer"
              onClick={() => router.push('/refer-and-earn')}
            >
              {giftAnimationData && (
                <Lottie
                  animationData={giftAnimationData}
                  loop
                  autoplay
                  className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] transition-transform duration-500 group-hover:scale-[1.15]"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Guides Section - Full width with 2 columns on desktop, stacked on mobile */}
      <div className="relative z-10 flex justify-center">
        <div className="w-full md:w-[50%] md:min-w-[400px]">
          <h2 className="text-lg font-bold text-foreground mb-6">{t('productGuides')}</h2>

          <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
            {/* Demo Video Card */}
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <iframe
                  src="https://player.vimeo.com/video/76979871?h=8272103f6e&title=0&byline=0&portrait=0"
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1">{t('demoVideo.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('demoVideo.description')}
                </p>
              </div>
            </div>

            {/* Help Articles Card */}
            <div
              className="relative rounded-xl bg-card border border-border shadow-sm p-6 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group overflow-hidden"
              onClick={() => window.open(process.env.NEXT_PUBLIC_DOCS_URL || 'https://docs.tryathli.com', '_blank')}
            >
              {/* Internal Card Glows */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-[20%] -bottom-[20%] h-[150px] w-[150px] rounded-full bg-primary/15 blur-[40px]" />
                <div className="absolute -left-[10%] top-[10%] h-[100px] w-[100px] rounded-full bg-blue-500/10 blur-[30px]" />
              </div>

              <div className="relative z-10">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  {t('helpArticles.title')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('helpArticles.description')}
                </p>
                <Button variant="default" size="sm" className="mb-6">
                  {t('helpArticles.button')}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative z-10 flex items-center gap-3 mt-auto -ml-11 -mr-6">
                {[
                  { icon: Users, label: 'Athletes' },
                  { icon: MessageCircle, label: 'Inbox' },
                  { icon: Dumbbell, label: 'Training' },
                  { icon: ClipboardList, label: 'Forms' },
                  { icon: BarChart3, label: 'Metrics' },
                  { icon: Sprout, label: 'Habits' },
                  { icon: File, label: 'Files' },
                  { icon: Workflow, label: 'Automations' },
                  { icon: CheckSquare, label: 'Todo' },
                  { icon: ClipboardCheck, label: 'Check-ins' },
                  { icon: Users, label: 'Athletes' },
                  { icon: MessageCircle, label: 'Inbox' },
                  { icon: Dumbbell, label: 'Training' },
                  { icon: ClipboardList, label: 'Forms' },
                  { icon: BarChart3, label: 'Metrics' },
                  { icon: Sprout, label: 'Habits' },
                  { icon: File, label: 'Files' },
                  { icon: Workflow, label: 'Automations' },
                  { icon: CheckSquare, label: 'Todo' },
                  { icon: ClipboardCheck, label: 'Check-ins' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white border border-border text-primary shadow-sm pointer-events-none"
                  >
                    <item.icon className="h-5 w-5 text-black" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStartedPage;

