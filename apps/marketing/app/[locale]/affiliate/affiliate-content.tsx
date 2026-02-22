'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { UserPlus, CreditCard, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';
import Lottie from 'lottie-react';

function HowItWorks() {
  const t = useTranslations('affiliate');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const steps = [
    {
      number: '1',
      title: t('howItWorks.steps.share.title'),
      description: t('howItWorks.steps.share.description'),
      icon: UserPlus,
    },
    {
      number: '2',
      title: t('howItWorks.steps.trial.title'),
      description: t('howItWorks.steps.trial.description'),
      icon: CreditCard,
    },
    {
      number: '3',
      title: t('howItWorks.steps.earn.title'),
      description: t('howItWorks.steps.earn.description'),
      icon: DollarSign,
    },
  ];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w } = dims;
  const r = 28;
  const circleY = 50;
  const svgHeight = 200;

  const x1 = 100;
  const x2 = w / 2;
  const x3 = w - 100;

  const path = w > 0 ? [
    `M ${x1 + r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x1} ${circleY + r}`,
    `A ${r} ${r} 0 0 1 ${x1 - r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x1} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x1 + r} ${circleY}`,
    `L ${x2 - r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x2} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x2 + r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x2} ${circleY + r}`,
    `A ${r} ${r} 0 0 1 ${x2 - r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x2} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x2 + r} ${circleY}`,
    `L ${x3 - r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x3} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x3 + r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x3} ${circleY + r}`,
    `A ${r} ${r} 0 0 1 ${x3 - r} ${circleY}`,
  ].join(' ') : '';

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-0">
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl"
        style={{ height: svgHeight }}
      >
        {w > 0 && (
          <svg
            className="absolute inset-0"
            width={w}
            height={svgHeight}
            fill="none"
          >
            <defs>
              <linearGradient id="affiliate-trail-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(168,85,247)" />
                <stop offset="100%" stopColor="rgb(59,130,246)" />
              </linearGradient>
            </defs>

            <circle cx={x1} cy={circleY} r={r - 1} className="fill-background" />
            <circle cx={x2} cy={circleY} r={r - 1} className="fill-background" />
            <circle cx={x3} cy={circleY} r={r - 1} className="fill-background" />

            <path
              d={path}
              className="stroke-border"
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />

            <motion.path
              d={path}
              pathLength={1}
              stroke="url(#affiliate-trail-grad)"
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray="0.12 0.88"
              animate={{ strokeDashoffset: [0, -1] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </svg>
        )}

        {w > 0 && steps.map((step, index) => {
          const xPos = index === 0 ? x1 : index === 1 ? x2 : x3;
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="absolute flex flex-col items-center text-center"
              style={{
                left: xPos,
                top: circleY - r,
                transform: 'translateX(-50%)',
                width: 180,
              }}
            >
              <div
                className="flex items-center justify-center z-10"
                style={{ width: r * 2, height: r * 2 }}
              >
                <Icon className="size-5 text-foreground" />
              </div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-3">
                {t('howItWorks.step')} {step.number}
              </p>
              <p className="text-base font-semibold mt-1">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AffiliateContent() {
  const t = useTranslations('affiliate');
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch('/animations/referral-animation.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(() => {});
  }, []);

  const benefits = [
    t('benefits.items.0'),
    t('benefits.items.1'),
    t('benefits.items.2'),
    t('benefits.items.3'),
  ];

  return (
    <>
      {/* Animation Section */}
      {animationData && (
        <section className="pb-8">
          <div className="mx-auto max-w-6xl px-6 flex justify-center">
            <Lottie
              animationData={animationData}
              loop
              autoplay
              className="w-[280px] h-[280px]"
              rendererSettings={{
                preserveAspectRatio: 'xMidYMid slice',
              }}
            />
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-balance text-3xl font-bold md:text-4xl">{t('howItWorks.title')}</h2>
            <p className="text-muted-foreground mt-4 text-balance">{t('howItWorks.subtitle')}</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-balance text-3xl font-bold md:text-4xl">{t('benefits.title')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border bg-background p-4"
              >
                <div className="size-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="size-2 rounded-full bg-foreground" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border bg-background px-6 py-12 md:py-20">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl font-bold mb-4">$20</div>
            <h2 className="text-balance text-2xl font-semibold md:text-3xl">{t('earnings.headline')}</h2>
            <p className="text-muted-foreground mt-4 text-balance max-w-xl">{t('earnings.description')}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild variant="outline" size="lg">
                <Link href="/#features">
                  <span>{t('hero.learnMore')}</span>
                </Link>
              </Button>
              <Button asChild size="lg">
                <a href="mailto:affiliates@athli.io?subject=Affiliate Program Application">
                  <span>{t('cta.button')}</span>
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
