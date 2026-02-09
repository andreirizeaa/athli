'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpIcon,
  BrainIcon,
  ChevronsUpDownIcon,
  DribbbleIcon,
  GlobeIcon,
  MicIcon,
  Paperclip,
  SparklesIcon,
  UserIcon,
} from 'lucide-react';
import { CodeIcon } from '@radix-ui/react-icons';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform } from 'motion/react';
import { TextEffect } from '@/components/ui/text-effect';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { HeroHeader } from './header';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

const suggestionGroups = [
  {
    icon: BrainIcon,
    label: 'Training',
    highlight: 'Create',
    items: [
      'Create a workout plan',
      'Create a training program',
      'Create exercise variations',
      'Create a warm-up routine',
    ],
  },
  {
    icon: CodeIcon,
    label: 'Analytics',
    highlight: 'Analyze',
    items: [
      'Analyze client progress',
      'Analyze training load',
      'Analyze recovery metrics',
      'Analyze performance trends',
    ],
  },
  {
    icon: DribbbleIcon,
    label: 'Nutrition',
    highlight: 'Plan',
    items: [
      'Plan a meal prep',
      'Plan macros for cutting',
      'Plan supplements stack',
      'Plan hydration strategy',
    ],
  },
  {
    icon: GlobeIcon,
    label: 'Research',
    highlight: 'Research',
    items: [
      'Research best practices for hypertrophy',
      'Research injury prevention',
      'Research periodization models',
      'Research recovery protocols',
    ],
  },
];

function HeroChatPreview() {
  const [activeCategory, setActiveCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [animationData, setAnimationData] = useState<object | null>(null);
  const borderRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ w: 0, h: 0, r: 16 });

  const { scrollYProgress: borderProgress } = useScroll({
    target: borderRef,
    offset: ['start 0.35', 'center center'],
  });

  const pathLength = useTransform(borderProgress, [0, 1], [0, 1]);

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

  const activeCategoryData = suggestionGroups.find((group) => group.label === activeCategory);
  const showCategorySuggestions = activeCategory !== '';

  const { w, h, r } = dims;
  const cx = Math.round(w / 2);
  const rightPath = w > 0 ? `M ${cx} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${cx - 1} ${h}` : '';
  const leftPath = w > 0 ? `M ${cx} 0 L ${r} 0 A ${r} ${r} 0 0 0 0 ${r} L 0 ${h - r} A ${r} ${r} 0 0 0 ${r} ${h} L ${cx + 1} ${h}` : '';

  return (
    <div ref={borderRef} className="relative mx-auto h-[700px] w-[80%]">
      {w > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-10" width={w} height={h} fill="none">
          <defs>
            <linearGradient id="border-grad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          <motion.path
            d={rightPath}
            stroke="url(#border-grad)"
            strokeWidth="5"
            strokeLinecap="butt"
            strokeLinejoin="round"
            style={{ pathLength }}
          />
          <motion.path
            d={leftPath}
            stroke="url(#border-grad)"
            strokeWidth="5"
            strokeLinecap="butt"
            strokeLinejoin="round"
            style={{ pathLength }}
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
            Hey Coach <br /> How Can I{' '}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              Assist You Today?
            </span>
          </h1>
        </div>

        {/* Input area */}
        <div className="bg-primary/10 w-full rounded-2xl p-1">
          <div className="bg-background rounded-2xl w-full overflow-hidden shadow-none">
            <div className="min-h-[44px] w-full resize-none border-none bg-transparent p-4 text-sm text-muted-foreground">
              {prompt || 'Ask me anything...'}
            </div>

            <div className="flex items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-2">
                <div className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl">
                  <Paperclip className="text-primary size-5" />
                </div>
                <Button variant="outline" size="sm" className="rounded-full gap-2">
                  <UserIcon className="size-4" />
                  <span className="hidden lg:inline">Generic</span>
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
            {showCategorySuggestions ? (
              <div className="flex w-full flex-col space-y-1">
                {activeCategoryData?.items.map((suggestion) => {
                  const highlight = activeCategoryData.highlight;
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
                {suggestionGroups.map((suggestion) => (
                  <Button
                    key={suggestion.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveCategory(suggestion.label);
                      setPrompt('');
                    }}
                    className="rounded-full capitalize"
                  >
                    {suggestion.icon && <suggestion.icon className="size-3.5" />}
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

type IconId = 'chatgpt' | 'whatsapp' | 'excel' | 'zapier' | 'docs' | 'notion';

const iconDialogs: Record<IconId, { title: string; description: string }> = {
  chatgpt: {
    title: 'No More Generic AI',
    description: 'ChatGPT doesn\'t know your clients, their goals, or their history. Our AI assistant is built specifically for coaching. It plans periodised programs, tracks client progress, generates workouts, and gives evidence-based answers using your actual client data. One conversation replaces hours of manual work.',
  },
  excel: {
    title: 'No More Spreadsheets',
    description: 'Tracking clients in Excel means scattered data, broken formulas, and zero automation. Athli centralises every client\'s profile, metrics, check-ins, and progress in one platform. Searchable, always up to date, and accessible from any device. Your data finally works for you, not against you.',
  },
  notion: {
    title: 'No More Notion Workouts',
    description: 'Copying and pasting workouts between Notion pages doesn\'t scale. Athli gives you a library of 1,743 exercises with built-in video demos, drag-and-drop program building, and one-click assignment to any client. Build better programs in a fraction of the time.',
  },
  zapier: {
    title: 'No More Manual Follow-ups',
    description: 'You shouldn\'t need Zapier to keep clients accountable. Athli has built-in automation flows that trigger reminders, follow-ups, and check-in prompts based on client activity. Set it once and your clients stay on track without you chasing them.',
  },
  whatsapp: {
    title: 'No More App Switching',
    description: 'Managing clients across WhatsApp, email, and spreadsheets means things get missed. Athli puts communication, programming, check-ins, and progress tracking in one place for both you and your clients. One app, zero context switching.',
  },
  docs: {
    title: 'No More Google Drive Chaos',
    description: 'Digging through shared drives for client files wastes your time. Athli\'s Files feature lets you store contracts, meal plans, progress photos, and any resource with unlimited storage, organised per client and accessible instantly.',
  },
};

export default function HeroSection() {
  const [entranceDone, setEntranceDone] = React.useState(false);
  const [activeIcon, setActiveIcon] = React.useState<IconId | null>(null);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const chatRef = React.useRef<HTMLDivElement>(null);
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
                <motion.div
                  initial={{ opacity: 0, x: -60, scale: 0.8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.5 }}
                  style={entranceDone ? { x: leftX, opacity: iconOpacity, scale: iconScale } : undefined}
                  onClick={() => setActiveIcon('chatgpt')}
                  className="absolute top-[12%] left-[6%] pointer-events-auto flex size-24 -rotate-12 cursor-pointer items-center justify-center rounded-[20px] border border-zinc-200 bg-gradient-to-bl from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[0_0_25px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                >
                  <img src="/icons/chatgpt.png" alt="" className="size-[68px] object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:invert dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                </motion.div>
                {/* WhatsApp - top right */}
                <motion.div
                  initial={{ opacity: 0, x: 60, scale: 0.8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.65 }}
                  style={entranceDone ? { x: rightX, opacity: iconOpacity, scale: iconScale } : undefined}
                  onClick={() => setActiveIcon('whatsapp')}
                  className="absolute top-[22%] right-[8%] pointer-events-auto flex size-20 rotate-12 cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-br from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(37,211,102,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                >
                  <img src="/icons/whatsapp.png" alt="" className="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(37,211,102,0.35)]" />
                </motion.div>
                {/* Excel - mid left */}
                <motion.div
                  initial={{ opacity: 0, x: -60, scale: 0.8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.8 }}
                  style={entranceDone ? { x: leftX, opacity: iconOpacity, scale: iconScale } : undefined}
                  onClick={() => setActiveIcon('excel')}
                  className="absolute bottom-[30%] left-[5%] pointer-events-auto flex size-20 -rotate-[18deg] cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-bl from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(33,185,110,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                >
                  <img src="/icons/excel.png" alt="" className="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(33,115,70,0.35)]" />
                </motion.div>
                {/* Zapier - mid right, larger */}
                <motion.div
                  initial={{ opacity: 0, x: 60, scale: 0.8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 0.95 }}
                  style={entranceDone ? { x: rightX, opacity: iconOpacity, scale: iconScale } : undefined}
                  onClick={() => setActiveIcon('zapier')}
                  className="absolute bottom-[22%] right-[12%] pointer-events-auto flex size-24 rotate-6 cursor-pointer items-center justify-center rounded-[20px] border border-zinc-200 bg-gradient-to-br from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(255,159,28,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                >
                  <img src="/icons/zap.png" alt="" className="size-[68px] object-contain drop-shadow-[0_0_8px_rgba(255,159,28,0.35)]" />
                </motion.div>
                {/* Google Docs - right of pill */}
                <motion.div
                  initial={{ opacity: 0, x: 60, scale: 0.8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 1.1 }}
                  style={entranceDone ? { x: rightX, opacity: iconOpacity, scale: iconScale, boxShadow: '-5px -5px 15px rgba(251,188,4,0.12), 5px -5px 15px rgba(234,67,53,0.1), 5px 5px 15px rgba(66,133,244,0.12), -5px 5px 15px rgba(52,168,83,0.12), inset 0 1px 0 rgba(255,255,255,0.06)' } : { boxShadow: '-5px -5px 15px rgba(251,188,4,0.12), 5px -5px 15px rgba(234,67,53,0.1), 5px 5px 15px rgba(66,133,244,0.12), -5px 5px 15px rgba(52,168,83,0.12), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                  onClick={() => setActiveIcon('docs')}
                  className="absolute top-[-6%] right-[14%] pointer-events-auto flex size-20 rotate-3 cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-br from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 hover:scale-110 transition-transform"
                >
                  <img src="/icons/docs.png" alt="" className="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(66,133,244,0.3)]" />
                </motion.div>
                {/* Notion - left of Grow Today button */}
                <motion.div
                  initial={{ opacity: 0, x: -60, scale: 0.8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 1.25 }}
                  onAnimationComplete={() => setEntranceDone(true)}
                  style={entranceDone ? { x: leftX, opacity: iconOpacity, scale: iconScale } : undefined}
                  onClick={() => setActiveIcon('notion')}
                  className="absolute bottom-[6%] left-[15%] pointer-events-auto flex size-20 -rotate-3 cursor-pointer items-center justify-center rounded-[18px] border border-zinc-200 bg-gradient-to-bl from-white to-zinc-100 dark:border-zinc-700/50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_25px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[0_0_25px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.06)] hover:scale-110 transition-transform"
                >
                  <img src="/icons/notion.png" alt="" className="size-[52px] object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:invert dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                </motion.div>
              </div>

              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href={`${APP_URL}/auth/register`}
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                  >
                    <span className="text-foreground text-sm">
                      Introducing our AI-Powered Coaching Assistant
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
                  </Link>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mx-auto max-w-4xl mt-4 text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-6 xl:text-[5.25rem]"
                >
                  Scale Your Coaching Business with Athli
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-balance text-lg"
                >
                  An all-in-one app letting you provide the best experience to your clients regardless of location
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
                      <span className="text-nowrap">Try our AI</span>
                    </Button>
                  </div>
                  <Link key={1} href={`${APP_URL}/auth/register`}>
                    <Button
                      size="lg"
                      className="h-[calc(2.5rem+4px)] rounded-xl px-5 text-base"
                    >
                      <span className="text-nowrap">Grow Today</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
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

      {/* Icon dialogs */}
      <Dialog open={activeIcon !== null} onOpenChange={(open) => !open && setActiveIcon(null)}>
        {activeIcon && (
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <img
                  src={`/icons/${activeIcon === 'zapier' ? 'zap' : activeIcon}.png`}
                  alt=""
                  className={cn('size-10 object-contain', (activeIcon === 'chatgpt' || activeIcon === 'notion') && 'dark:invert')}
                />
                <DialogTitle>{iconDialogs[activeIcon].title}</DialogTitle>
              </div>
            </DialogHeader>
            <DialogDescription className="text-sm leading-relaxed">
              {iconDialogs[activeIcon].description}
            </DialogDescription>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
