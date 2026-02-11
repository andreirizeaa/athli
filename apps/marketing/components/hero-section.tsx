'use client';
import React, { useEffect, useState } from 'react';
import NextLink from 'next/link';
import {
  ArrowRight,
  ArrowUpIcon,
  BrainIcon,
  Check,
  ChevronsUpDownIcon,
  DribbbleIcon,
  GlobeIcon,
  MicIcon,
  Paperclip,
  SparklesIcon,
  UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { CodeIcon } from '@radix-ui/react-icons';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { TextEffect } from '@/components/ui/text-effect';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { HeroHeader } from './header';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
    },
  },
};

const suggestionIcons = [BrainIcon, CodeIcon, DribbbleIcon, GlobeIcon] as const;
const suggestionKeys = ['training', 'analytics', 'nutrition', 'research'] as const;

type IconId = 'chatgpt' | 'whatsapp' | 'excel' | 'zapier' | 'docs' | 'notion';

// Stagger animation variants for benefit items
const benefitVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.1 + i * 0.08,
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  }),
};

function IntegrationPopoverContent({
  iconId,
  t,
}: {
  iconId: IconId;
  t: ReturnType<typeof useTranslations<'hero'>>;
}) {
  const title = t(`iconDialogs.${iconId}.title`);
  const problem = t(`iconDialogs.${iconId}.problem`);
  const benefits = t.raw(`iconDialogs.${iconId}.benefits`) as string[];
  const highlight = t(`iconDialogs.${iconId}.highlight`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={`/icons/${iconId}.png`}
          alt=""
          className={cn(
            'size-10 object-contain shrink-0',
            (iconId === 'chatgpt' || iconId === 'notion') && 'dark:invert'
          )}
        />
        <h4 className="font-semibold text-foreground leading-tight">{title}</h4>
      </div>

      {/* Problem & Benefits */}
      <div className="space-y-2">
        {/* Problem row */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={benefitVariants}
          custom={0}
          className="flex items-center gap-2"
        >
          <div className="size-5 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center shrink-0">
            <X className="size-3 text-red-600 dark:text-red-400" />
          </div>
          <span className="text-sm text-foreground">{problem}</span>
        </motion.div>
        {/* Benefit rows */}
        {benefits.map((benefit, i) => (
          <motion.div
            key={benefit}
            custom={i + 1}
            initial="hidden"
            animate="visible"
            variants={benefitVariants}
            className="flex items-center gap-2"
          >
            <div className="size-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-foreground">{benefit}</span>
          </motion.div>
        ))}
      </div>

      {/* Highlight Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.2 }}
      >
        <Badge
          variant="outline"
          className="w-full justify-center py-1.5 text-xs bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
        >
          <Zap className="size-3 mr-1" />
          {highlight}
        </Badge>
      </motion.div>
    </div>
  );
}

// Component for each floating icon with popover
function FloatingIconWithPopover({
  iconId,
  className,
  iconClassName,
  iconSrc,
  motionProps,
  t,
}: {
  iconId: IconId;
  className: string;
  iconClassName: string;
  iconSrc: string;
  motionProps: React.ComponentProps<typeof motion.div>;
  t: ReturnType<typeof useTranslations<'hero'>>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.div {...motionProps} className={className}>
          <img src={iconSrc} alt="" className={iconClassName} />
        </motion.div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4"
        sideOffset={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <IntegrationPopoverContent iconId={iconId} t={t} />
      </PopoverContent>
    </Popover>
  );
}

function HeroChatPreview() {
  const [activeCategory, setActiveCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [animationData, setAnimationData] = useState<object | null>(null);
  const borderRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ w: 0, h: 0, r: 16 });
  const t = useTranslations('hero');

  React.useEffect(() => {
    const el = borderRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const inner = containerRef.current;
      const computedR = inner ? parseFloat(getComputedStyle(inner).borderRadius) || 16 : 16;
      setDims({ w: rect.width, h: rect.height, r: computedR });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch('/animations/ai-sphere-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load animation:', err));
  }, []);

  const activeCategoryData = suggestionKeys.find((key) => key === activeCategory);
  const showCategorySuggestions = activeCategory !== '';

  const { w, h, r } = dims;

  return (
    <div ref={borderRef} className="relative mx-auto h-[700px] w-[80%] max-w-[1100px]">
      {w > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-10" width={w} height={h} fill="none">
          <defs>
            <linearGradient id="border-grad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          {/* Trail 1 */}
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [0, -1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          {/* Trail 2 */}
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [-0.5, -1.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      )}
      <div ref={containerRef} className="h-full overflow-y-auto rounded-2xl border bg-background" style={{ boxShadow: '0 0 40px rgba(192,132,252,0.16), 0 0 40px rgba(165,180,252,0.16)' }}>
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center space-y-4 p-4">
        {/* Welcome message */}
        <div className="mb-10">
          <div className="mx-auto -mt-24 hidden w-48 mask-b-from-100% mask-radial-[50%_50%] mask-radial-from-0% md:block">
            {animationData && <Lottie className="w-full" animationData={animationData} loop autoplay />}
          </div>

          <h1 className="text-center text-2xl leading-normal font-medium lg:text-4xl">
            {t('chatGreeting')} <br /> {t('chatAssist')}{' '}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              {t('chatAssistHighlight')}
            </span>
          </h1>
        </div>

        {/* Input area */}
        <div className="bg-primary/10 w-full rounded-2xl p-1">
          <div className="bg-background rounded-2xl w-full overflow-hidden shadow-none">
            <div className="min-h-[44px] w-full resize-none border-none bg-transparent p-4 text-sm text-muted-foreground">
              {prompt || t('chatPlaceholder')}
            </div>

            <div className="flex items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-2">
                <div className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl">
                  <Paperclip className="text-primary size-5" />
                </div>
                <Button variant="outline" size="sm" className="rounded-full gap-2">
                  <UserIcon className="size-4" />
                  <span className="hidden lg:inline">{t('generic')}</span>
                  <ChevronsUpDownIcon className="size-3.5 opacity-50" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="size-9 rounded-full">
                  <MicIcon size={18} />
                </Button>
                <Button variant="default" size="icon" className="size-8 rounded-full" disabled>
                  <ArrowUpIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="relative flex w-full flex-col items-center justify-center space-y-2">
          <div className="h-[70px] w-full">
            {showCategorySuggestions && activeCategoryData ? (
              <div className="flex w-full flex-col space-y-1">
                {(t.raw(`suggestions.${activeCategoryData}.items`) as string[]).map((suggestion) => {
                  const highlight = t(`suggestions.${activeCategoryData}.highlight`);
                  const lower = suggestion.toLowerCase();
                  const hlLower = highlight.toLowerCase();
                  const idx = lower.indexOf(hlLower);

                  return (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setPrompt(suggestion);
                        setActiveCategory('');
                      }}
                      className="hover:bg-muted w-full cursor-pointer justify-start gap-0 rounded-xl px-3 py-2 text-start text-sm"
                    >
                      {idx !== -1 ? (
                        <>
                          {suggestion.substring(0, idx) && (
                            <span className="text-muted-foreground">{suggestion.substring(0, idx)}</span>
                          )}
                          <span className="text-primary font-medium">
                            {suggestion.substring(idx, idx + highlight.length)}
                          </span>
                          <span className="text-muted-foreground">
                            {suggestion.substring(idx + highlight.length)}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{suggestion}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="relative flex w-full flex-wrap items-stretch justify-center gap-2">
                {suggestionKeys.map((key, i) => {
                  const Icon = suggestionIcons[i];
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveCategory(key);
                        setPrompt('');
                      }}
                      className="rounded-full capitalize"
                    >
                      <Icon className="size-3.5" />
                      {t(`suggestions.${key}.label`)}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const [entranceDone, setEntranceDone] = React.useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const chatRef = React.useRef<HTMLDivElement>(null);
  const t = useTranslations('hero');
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const leftX = useTransform(scrollYProgress, [0, 0.15], [0, -120]);
  const rightX = useTransform(scrollYProgress, [0, 0.15], [0, 120]);
  const iconOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const iconScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <section ref={sectionRef}>
          <div className="relative pt-24 md:pt-36">

            <div className="relative mx-auto max-w-7xl px-6">
              {/* Floating icon containers */}
              <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
                {/* ChatGPT - top left, larger */}
                <FloatingIconWithPopover
                  iconId="chatgpt"
                  iconSrc="/icons/chatgpt.png"
                  className="absolute top-[12%] left-[6%] pointer-events-auto flex size-24 -rotate-12 cursor-pointer items-center justify-center rounded-[20px] border border-zinc-200 bg-gradient-to-bl from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[0_0_25px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                  iconClassName="size-[68px] object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:invert dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                  motionProps={{
                    initial: { opacity: 0, x: -60, scale: 0.8, filter: 'blur(8px)' },
                    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
                    transition: { type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.5 },
                    style: entranceDone ? { x: leftX, opacity: iconOpacity, scale: iconScale } : undefined,
                  }}
                  t={t}
                />
                {/* WhatsApp - top right */}
                <FloatingIconWithPopover
                  iconId="whatsapp"
                  iconSrc="/icons/whatsapp.png"
                  className="absolute top-[22%] right-[8%] pointer-events-auto flex size-20 rotate-12 cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-br from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(37,211,102,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                  iconClassName="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(37,211,102,0.35)]"
                  motionProps={{
                    initial: { opacity: 0, x: 60, scale: 0.8, filter: 'blur(8px)' },
                    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
                    transition: { type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.65 },
                    style: entranceDone ? { x: rightX, opacity: iconOpacity, scale: iconScale } : undefined,
                  }}
                  t={t}
                />
                {/* Excel - mid left */}
                <FloatingIconWithPopover
                  iconId="excel"
                  iconSrc="/icons/excel.png"
                  className="absolute bottom-[30%] left-[5%] pointer-events-auto flex size-20 -rotate-[18deg] cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-bl from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(33,185,110,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                  iconClassName="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(33,115,70,0.35)]"
                  motionProps={{
                    initial: { opacity: 0, x: -60, scale: 0.8, filter: 'blur(8px)' },
                    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
                    transition: { type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.8 },
                    style: entranceDone ? { x: leftX, opacity: iconOpacity, scale: iconScale } : undefined,
                  }}
                  t={t}
                />
                {/* Zapier - mid right, larger */}
                <FloatingIconWithPopover
                  iconId="zapier"
                  iconSrc="/icons/zapier.png"
                  className="absolute bottom-[22%] right-[12%] pointer-events-auto flex size-24 rotate-6 cursor-pointer items-center justify-center rounded-[20px] border border-zinc-200 bg-gradient-to-br from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(255,159,28,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                  iconClassName="size-[68px] object-contain drop-shadow-[0_0_8px_rgba(255,159,28,0.35)]"
                  motionProps={{
                    initial: { opacity: 0, x: 60, scale: 0.8, filter: 'blur(8px)' },
                    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
                    transition: { type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.95 },
                    style: entranceDone ? { x: rightX, opacity: iconOpacity, scale: iconScale } : undefined,
                  }}
                  t={t}
                />
                {/* Google Docs - right of pill */}
                <FloatingIconWithPopover
                  iconId="docs"
                  iconSrc="/icons/drive.png"
                  className="absolute top-[-6%] right-[14%] pointer-events-auto flex size-20 rotate-3 cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-br from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 hover:scale-110 transition-transform"
                  iconClassName="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(66,133,244,0.3)]"
                  motionProps={{
                    initial: { opacity: 0, x: 60, scale: 0.8, filter: 'blur(8px)' },
                    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
                    transition: { type: 'spring', bounce: 0.3, duration: 1.2, delay: 1.1 },
                    style: entranceDone
                      ? { x: rightX, opacity: iconOpacity, scale: iconScale, boxShadow: '-5px -5px 15px rgba(251,188,4,0.12), 5px -5px 15px rgba(234,67,53,0.1), 5px 5px 15px rgba(66,133,244,0.12), -5px 5px 15px rgba(52,168,83,0.12), inset 0 1px 0 rgba(255,255,255,0.06)' }
                      : { boxShadow: '-5px -5px 15px rgba(251,188,4,0.12), 5px -5px 15px rgba(234,67,53,0.1), 5px 5px 15px rgba(66,133,244,0.12), -5px 5px 15px rgba(52,168,83,0.12), inset 0 1px 0 rgba(255,255,255,0.06)' },
                  }}
                  t={t}
                />
                {/* Notion - left of Grow Today button */}
                <FloatingIconWithPopover
                  iconId="notion"
                  iconSrc="/icons/notion.png"
                  className="absolute bottom-[6%] left-[15%] pointer-events-auto flex size-20 -rotate-3 cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-bl from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[0_0_25px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                  iconClassName="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:invert dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                  motionProps={{
                    initial: { opacity: 0, x: -60, scale: 0.8, filter: 'blur(8px)' },
                    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
                    transition: { type: 'spring', bounce: 0.3, duration: 1.2, delay: 1.25 },
                    onAnimationComplete: () => setEntranceDone(true),
                    style: entranceDone ? { x: leftX, opacity: iconOpacity, scale: iconScale } : undefined,
                  }}
                  t={t}
                />
              </div>

              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <NextLink
                    href={`${APP_URL}/auth/register`}
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                  >
                    <span className="text-foreground text-sm">
                      {t('pill')}
                    </span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </NextLink>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mx-auto max-w-4xl mt-4 text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-6 xl:text-[5.25rem]"
                >
                  {t('heading')}
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-balance text-lg"
                >
                  {t('subheading')}
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={0}
                    className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5"
                  >
                    <Button
                      size="lg"
                      variant="ghost"
                      className="rounded-xl px-5 text-base !bg-transparent"
                      onClick={() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    >
                      <SparklesIcon className="size-4" />
                      <span className="text-nowrap">{t('tryAi')}</span>
                    </Button>
                  </div>
                  <NextLink key={1} href={`${APP_URL}/auth/register`}>
                    <Button
                      size="lg"
                      className="h-[calc(2.5rem+4px)] rounded-xl px-5 text-base"
                    >
                      <span className="text-nowrap">{t('growToday')}</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </NextLink>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
              className="relative"
            >
              <div ref={chatRef} className="relative mt-8 pb-16 sm:mt-12 md:mt-20">
                <HeroChatPreview />
              </div>
            </AnimatedGroup>
          </div>
        </section>
      </main>
    </>
  );
}
