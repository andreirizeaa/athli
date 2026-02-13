'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Link, Loader2, UserPlus, CreditCard, Gift, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { useGlobalData } from '@/providers/global-data-provider';
import { toast } from 'sonner';
import { sendReferralInvite, type Referral, type ReferralStatus, type ReferredBy } from '@/api/billing/billing-service';
import { useReferrals } from '@/hooks/use-referrals';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Lottie from 'lottie-react';
import { motion } from 'motion/react';

// HowItWorks component with SVG path animation
function HowItWorks({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const steps = [
    {
      number: '1',
      title: 'Sign up',
      description: 'Your friend signs up using your referral link or code',
      icon: UserPlus,
    },
    {
      number: '2',
      title: 'Subscribe',
      description: 'They pay for a monthly or annual subscription',
      icon: CreditCard,
    },
    {
      number: '3',
      title: 'Receive credit',
      description: 'You both get $20 added to your balance',
      icon: Gift,
    },
  ];

  // Measure container
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
  const r = 28; // circle radius
  const circleY = 50; // Y position of circle centers
  const svgHeight = 200;

  // Circle X positions - evenly spaced
  const x1 = 100;
  const x2 = w / 2;
  const x3 = w - 100;

  // Build path that traces through all circles
  const path = w > 0 ? [
    // Start at circle 1, 3 o'clock (right side)
    `M ${x1 + r} ${circleY}`,
    // Circle 1: full clockwise loop (3→6→9→12→3)
    `A ${r} ${r} 0 0 1 ${x1} ${circleY + r}`,
    `A ${r} ${r} 0 0 1 ${x1 - r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x1} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x1 + r} ${circleY}`,
    // Line to circle 2 (9 o'clock)
    `L ${x2 - r} ${circleY}`,
    // Circle 2: 1.5 loops (9→12→3→6→9→12→3)
    `A ${r} ${r} 0 0 1 ${x2} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x2 + r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x2} ${circleY + r}`,
    `A ${r} ${r} 0 0 1 ${x2 - r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x2} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x2 + r} ${circleY}`,
    // Line to circle 3 (9 o'clock)
    `L ${x3 - r} ${circleY}`,
    // Circle 3: full clockwise loop back to 9 o'clock
    `A ${r} ${r} 0 0 1 ${x3} ${circleY - r}`,
    `A ${r} ${r} 0 0 1 ${x3 + r} ${circleY}`,
    `A ${r} ${r} 0 0 1 ${x3} ${circleY + r}`,
    `A ${r} ${r} 0 0 1 ${x3 - r} ${circleY}`,
  ].join(' ') : '';

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-0">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">Three simple steps</p>
      </div>
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
              <linearGradient id="trail-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(168,85,247)" />
                <stop offset="100%" stopColor="rgb(59,130,246)" />
              </linearGradient>
            </defs>

            {/* Circle fills first (no stroke) - these create the white interior */}
            <circle cx={x1} cy={circleY} r={r - 1} fill="white" />
            <circle cx={x2} cy={circleY} r={r - 1} fill="white" />
            <circle cx={x3} cy={circleY} r={r - 1} fill="white" />

            {/* Static background path - this IS the circle borders + connecting lines */}
            <path
              d={path}
              stroke="#d4d4d4"
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />

            {/* Animated trail on top */}
            <motion.path
              d={path}
              pathLength={1}
              stroke="url(#trail-grad)"
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

        {/* Icons and labels */}
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
              {/* Icon */}
              <div
                className="flex items-center justify-center z-10"
                style={{ width: r * 2, height: r * 2 }}
              >
                <Icon className="size-5 text-zinc-700" />
              </div>
              {/* Step label */}
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-3">
                Step {step.number}
              </p>
              {/* Title */}
              <p className="text-base font-semibold mt-1">{step.title}</p>
              {/* Description */}
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

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '--';
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
};

const formatCurrency = (cents: number): string => {
  if (cents === 0) return '$0';
  return `$${(cents / 100).toFixed(2)}`;
};

// Email validation regex - checks for valid format with @ and domain
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email.trim());
};

const ReferAndEarnPage = () => {
  const t = useTranslations('referAndEarn');
  const { uniqueCode } = useGlobalData();
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [referralsDialogOpen, setReferralsDialogOpen] = useState(false);

  // Load the animation
  useEffect(() => {
    fetch('/animations/referral-animation.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(() => {});
  }, []);

  const { referrals, referredBy, credits, isLoading } = useReferrals();

  // Extend Referral type with isReferrer flag for display
  type ReferralItem = Referral & { isReferrer?: boolean };

  // Combine referrals made and credit received from being referred into one list
  const allReferralItems = useMemo(() => {
    const items: ReferralItem[] = referrals.map(r => ({ ...r, isReferrer: false }));
    // Add the "referred by" entry if it exists
    if (referredBy) {
      items.push({
        id: referredBy.id,
        coach_name: referredBy.coach_name,
        profile_picture_url: referredBy.profile_picture_url,
        status: referredBy.status,
        credit_earned_cents: referredBy.credit_earned_cents,
        converted_at: referredBy.converted_at,
        created_at: referredBy.created_at,
        isReferrer: true,
      });
    }
    return items;
  }, [referrals, referredBy]);

  const copyToClipboard = async (text: string, onSuccess: () => void, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess();
      toast.success(successMessage);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        onSuccess();
        toast.success(successMessage);
      } catch (fallbackErr) {
        toast.error(t('copyFailed'));
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyReferralLink = async () => {
    if (!uniqueCode) {
      toast.error('Unable to generate referral link. Please try again.');
      return;
    }
    const referralLink = `${window.location.origin}/referral/${uniqueCode}`;
    await copyToClipboard(referralLink, () => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    }, t('referralLinkCopied'));
  };

  const handleCopyReferralCode = async () => {
    if (!uniqueCode) {
      toast.error('Unable to generate referral code. Please try again.');
      return;
    }
    await copyToClipboard(uniqueCode, () => {
      setIsCodeCopied(true);
      setTimeout(() => setIsCodeCopied(false), 2000);
    }, t('referralCodeCopied'));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();

    if (!email) {
      setEmailError(t('enterEmail'));
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError(t('invalidEmail'));
      return;
    }

    setEmailError('');
    setIsSendingInvite(true);
    try {
      await sendReferralInvite(email);
      toast.success(t('inviteSent'));
      setInviteEmail('');
    } catch (err) {
      toast.error(t('inviteFailed'));
    } finally {
      setIsSendingInvite(false);
    }
  };

  const getStatusLabel = (status: ReferralStatus): string => {
    switch (status) {
      case 'trial_started':
        return t('status.trialStarted');
      case 'trial_ended':
        return t('status.trialEnded');
      case 'trial_cancelled':
        return t('status.trialCancelled');
      case 'converted':
        return t('status.converted');
      case 'credit_received':
        return t('status.creditReceived');
      case 'accepted':
        return t('status.accepted');
      default:
        return status;
    }
  };

  const getStatusPillClasses = (status: ReferralStatus): string => {
    switch (status) {
      case 'trial_started':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'trial_ended':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case 'trial_cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      case 'converted':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
      case 'credit_received':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
      case 'accepted':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getEventDate = (referral: Referral): string => {
    switch (referral.status) {
      case 'converted':
      case 'credit_received':
        return formatDate(referral.converted_at ?? null);
      case 'trial_ended':
        return formatDate(referral.trial_ended_at ?? null);
      case 'trial_cancelled':
        return formatDate(referral.trial_cancelled_at ?? null);
      case 'accepted':
        return formatDate(referral.created_at);
      case 'trial_started':
      default:
        return formatDate(referral.trial_started_at ?? null);
    }
  };

  const columns: ColumnDefinition<ReferralItem>[] = [
    {
      id: 'coach',
      label: t('columns.coach'),
      width: { class: 'flex-1', pixel: 'auto' },
      sortable: true,
      getSortValue: (row) => row.coach_name.toLowerCase(),
      renderCell: (row) => (
        <div className="flex items-center gap-3 w-full">
          <Avatar className="size-8">
            {row.profile_picture_url ? (
              <AvatarImage src={row.profile_picture_url} alt={row.coach_name} />
            ) : null}
            <AvatarFallback className="text-sm font-medium">
              {row.coach_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {row.coach_name}
            {row.isReferrer && <span className="text-muted-foreground font-normal"> ({t('referrer')})</span>}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      label: t('columns.status'),
      width: { class: 'w-[140px]', pixel: '140px' },
      sortable: true,
      getSortValue: (row) => row.status,
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusPillClasses(row.status)}`}>
            {getStatusLabel(row.status)}
          </span>
        </div>
      ),
    },
    {
      id: 'credits',
      label: t('columns.credits'),
      width: { class: 'w-[100px]', pixel: '100px' },
      sortable: true,
      getSortValue: (row) => row.credit_earned_cents,
      renderCell: (row) => (
        <div className="flex items-center w-full justify-center">
          {(row.status === 'converted' || row.status === 'credit_received') && row.credit_earned_cents > 0 ? (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              +${(row.credit_earned_cents / 100).toFixed(0)}
            </span>
          ) : (
            <span className="text-sm">--</span>
          )}
        </div>
      ),
    },
    {
      id: 'date',
      label: t('columns.date'),
      width: { class: 'w-[120px]', pixel: '120px' },
      sortable: true,
      getSortValue: (row) => new Date(row.created_at).getTime(),
      renderCell: (row) => (
        <div className="flex items-center w-full justify-end">
          <span className="text-sm">{getEventDate(row)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Hero Section with decorative bubbles */}
      <div className="relative flex-shrink-0">
        {/* Background Decorative Bubbles - hidden in dark mode */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden">
          <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.08] blur-[100px]" />
          <div className="absolute -right-[5%] top-[20%] h-[400px] w-[400px] rounded-full bg-primary/[0.08] blur-[100px]" />
          <div className="absolute bottom-[10%] left-[20%] h-[600px] w-[600px] rounded-full bg-primary/[0.08] blur-[100px]" />
        </div>

        <div className="relative z-10 p-6 pb-12">
          <div className="flex justify-center">
            <div className="w-full max-w-5xl">
              <div className="flex items-center gap-12">
                {/* Left Column - Content */}
                <div className="flex-1 max-w-md">
                  <h1 className="text-balance text-3xl font-semibold md:text-4xl lg:text-5xl mb-4">
                    {t('hero.title')}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-6">
                    {t('hero.description')}
                  </p>

                  {/* Email Invite Input */}
                  <div className="mb-3">
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        value={inviteEmail}
                        onChange={handleEmailChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                        className={`h-12 pr-28 text-base ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {inviteEmail.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setInviteEmail('');
                              setEmailError('');
                            }}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                        <Button
                          onClick={handleSendInvite}
                          disabled={isSendingInvite}
                          className="h-9 px-4"
                        >
                          {isSendingInvite ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            t('invite')
                          )}
                        </Button>
                      </div>
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-500 mt-1.5">{emailError}</p>
                    )}
                  </div>

                  {/* Copy Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyReferralLink}
                      variant="outline"
                      className="flex-1 h-11 gap-2"
                    >
                      {isLinkCopied ? (
                        <Check className="size-4" />
                      ) : (
                        <Link className="size-4" />
                      )}
                      <span>{t('copyLink')}</span>
                    </Button>
                    <Button
                      onClick={handleCopyReferralCode}
                      variant="outline"
                      className="flex-1 h-11 gap-2"
                    >
                      {isCodeCopied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      <span>{t('copyCode')}</span>
                    </Button>
                    {allReferralItems.length > 0 && (
                      <Button
                        onClick={() => setReferralsDialogOpen(true)}
                        variant="outline"
                        className="flex-1 h-11 gap-2"
                      >
                        <span>{t('viewReferrals')}</span>
                        <ChevronRight className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right Column - Animation */}
                <div className="flex-1 flex justify-center items-center">
                  {animationData && (
                    <Lottie
                      animationData={animationData}
                      loop
                      autoplay
                      className="w-[350px] h-[350px]"
                      rendererSettings={{
                        preserveAspectRatio: 'xMidYMid slice',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bg-background border-t p-6 flex-1 min-h-0 flex flex-col overflow-auto">
        <div className="flex justify-center flex-1 min-h-0">
          <div className="w-full max-w-5xl flex flex-col min-h-0">
            <HowItWorks title={t('howItWorks.title')} />
          </div>
        </div>
      </div>

      {/* Referrals Dialog */}
      <Dialog open={referralsDialogOpen} onOpenChange={setReferralsDialogOpen}>
        <DialogContent className="w-[800px] h-[70vh] !max-w-none flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('yourReferrals')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            {/* Credit Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6 flex-shrink-0">
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('credits.totalEarned')}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(credits.total_earned_cents)}</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('credits.active')}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(credits.active_cents)}</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('credits.used')}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(credits.used_cents)}</p>
              </div>
            </div>

            {/* Referrals Grid */}
            <div className="flex-1 min-h-0 overflow-auto">
              <DataGrid
                data={allReferralItems}
                columns={columns}
                getRowId={(row) => row.id}
                gridKey="referrals-dialog"
                enableSearch={false}
                showPagination={false}
                gridPadding={false}
                emptyMessage={t('noReferrals')}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferAndEarnPage;
