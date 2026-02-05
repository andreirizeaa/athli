'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useTranslations } from 'next-intl';
import { useCoachFlows } from '@/hooks/use-coach-flows';
import { useCoachChecklist } from '@/hooks/use-coach-checklist';

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
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<string>('workoutAi');
  const [isNavigating, setIsNavigating] = useState(false);
  const t = useTranslations('getStarted');
  const { flows } = useCoachFlows();
  const { data: checklist } = useCoachChecklist();

  // Find the New Client Sign Up flow ID dynamically
  const newClientSignUpFlow = flows.find(f => f.name === 'New Client Sign Up');

  // Calculate progress for each accordion
  const clientAppProgress = checklist?.client_app_demo ? 1 : 0;
  const coachAppProgress = checklist?.coach_app_demo ? 1 : 0;

  const featuresProgress = [
    checklist?.workout_ai,
    checklist?.program_templates,
    checklist?.custom_exercises,
    checklist?.automate_onboardings,
    checklist?.check_ins_forms,
    checklist?.powerful_flows,
    checklist?.lifestyle_habits,
    checklist?.track_metrics,
    checklist?.on_demand_resources,
  ].filter(Boolean).length;

  // Check if a checklist item is completed
  const isChecklistItemCompleted = (key: string): boolean => {
    if (!checklist) return false;

    const keyMap: Record<string, keyof typeof checklist> = {
      'workoutAi': 'workout_ai',
      'programTemplates': 'program_templates',
      'customExercises': 'custom_exercises',
      'automateOnboardings': 'automate_onboardings',
      'checkInsForms': 'check_ins_forms',
      'powerfulFlows': 'powerful_flows',
      'lifestyleHabits': 'lifestyle_habits',
      'trackMetrics': 'track_metrics',
      'onDemandResources': 'on_demand_resources',
    };

    const checklistKey = keyMap[key];
    return checklistKey ? Boolean(checklist[checklistKey]) : false;
  };

  // Get route for a checklist item
  const getRouteForItem = (item: string) => {
    switch (item) {
      case 'workoutAi':
        return '/training/workouts?ai=true';
      case 'programTemplates':
        return '/training/programs?create=true';
      case 'customExercises':
        return '/training/exercises?create=true';
      case 'automateOnboardings':
        return newClientSignUpFlow ? `/flows/${newClientSignUpFlow.id}` : '/flows';
      case 'checkInsForms':
        return '/forms/check-ins?create=true';
      case 'powerfulFlows':
        return '/flows';
      case 'lifestyleHabits':
        return '/habits?create=true';
      case 'trackMetrics':
        return '/metrics?create=true';
      case 'onDemandResources':
        return '/files?create=true';
      default:
        return '/';
    }
  };

  // Prefetch all routes for faster navigation
  useEffect(() => {
    const routes = [
      '/training/workouts',
      '/training/programs',
      '/training/exercises',
      '/forms/check-ins',
      '/flows',
      '/habits',
      '/metrics',
      '/files',
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
      {/* Background Decorative Bubbles - hidden in dark mode for cleaner appearance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.08] blur-[100px]" />
        <div className="absolute -right-[5%] top-[20%] h-[400px] w-[400px] rounded-full bg-primary/[0.08] blur-[100px]" />
        <div className="absolute bottom-[10%] left-[20%] h-[600px] w-[600px] rounded-full bg-primary/[0.08] blur-[100px]" />
      </div>

      {/* Welcome Section - Centered at 50% */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="w-[50%] min-w-[400px]">
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
                <p className="mb-3 leading-relaxed max-w-[90%] mx-auto">
                  {t('cards.clientApp.description')}
                </p>
                <div className="flex justify-center flex-col items-center gap-2">
                  <Button size="sm" variant="default">
                    {t('cards.clientApp.button')}
                  </Button>
                </div>
              </div>
            </AccordionCard>

            <AccordionCard
              number={2}
              title={t('cards.features.title')}
              isOpen={openAccordion === 1}
              onClick={() => handleAccordionClick(1)}
              currentProgress={featuresProgress}
              totalItems={9}
              exploredLabel={t('explored', { count: featuresProgress, total: 9 })}
            >
              <div className="flex items-stretch gap-6 min-h-[400px]">
                {/* Left Side - Checklist Items */}
                <div className="flex-1 flex flex-col gap-1">
                  {[
                    { icon: Bot, key: 'workoutAi', route: '/training' },
                    { icon: Copy, key: 'programTemplates', route: '/training' },
                    { icon: Dumbbell, key: 'customExercises', route: '/training' },
                    { icon: Zap, key: 'automateOnboardings', route: '/flows' },
                    { icon: FileCheck, key: 'checkInsForms', route: '/forms' },
                    { icon: Workflow, key: 'powerfulFlows', route: '/flows' },
                    { icon: Sprout, key: 'lifestyleHabits', route: '/habits' },
                    { icon: BarChart3, key: 'trackMetrics', route: '/metrics' },
                    { icon: File, key: 'onDemandResources', route: '/files' },
                  ].map((item) => {
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
                          {isCompleted && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-border self-stretch" />

                {/* Right Side - Dynamic Content + Explore Button */}
                <div className="flex-1 flex flex-col justify-between">
                  <div />
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {t(`checklist.details.${selectedChecklistItem}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`checklist.details.${selectedChecklistItem}.subtitle`)}
                    </p>
                  </div>
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
                <p className="mb-3 leading-relaxed max-w-[90%] mx-auto">
                  {t('cards.coachApp.description')}
                </p>
                <div className="flex justify-center flex-col items-center gap-2">
                  <Button size="sm" variant="default">
                    {t('cards.coachApp.button')}
                  </Button>
                </div>
              </div>
            </AccordionCard>
          </div>
        </div>
      </div>

      {/* Live Chat Section - Centered at 50% */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="w-[50%] min-w-[400px]">
          <div
            className="group relative flex h-[140px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md cursor-pointer"
            onClick={() => { }}
          >
            <div className="relative w-[140px] shrink-0 overflow-hidden">
              <img
                src="/images/live-chat.png"
                alt="Live Chat"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center p-6">
              <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                {t('liveChat.title')}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('liveChat.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Guides Section - Full width with 2 columns */}
      <div className="relative z-10 flex justify-center">
        <div className="w-[50%] min-w-[400px]">
          <h2 className="text-lg font-bold text-foreground mb-6">{t('productGuides')}</h2>

          <div className="grid grid-cols-2 gap-6">
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
              onClick={() => window.open('https://help.athli.com', '_blank')}
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
                    <item.icon className="h-5 w-5" />
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

