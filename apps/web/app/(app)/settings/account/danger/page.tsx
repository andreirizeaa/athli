'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useEntitlements, useSubscription } from '@/hooks/use-entitlements';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/api-client';
import { toast } from 'sonner';
import { createClient } from '@/supabase/client';
import { authService } from '@/api/auth/auth-service';

interface Invoice {
  id: string;
  period_end: number;
}

interface InvoicesResponse {
  invoices: Invoice[];
}

// Format date for display
const formatDate = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format time remaining
const formatTimeRemaining = (date: Date | null) => {
  if (!date) return '';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return '0 days';
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return '1 week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
  if (diffDays < 60) return '1 month';
  return `${Math.floor(diffDays / 30)} months`;
};

const DangerPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { user, signOut } = useSupabaseAuth();
  const { plan, isTrial } = useEntitlements();
  const { isCancelling, nextBillingDate } = useSubscription();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showCancelPlanDialog, setShowCancelPlanDialog] = useState(false);
  const [step1ButtonDisabled, setStep1ButtonDisabled] = useState(true);

  // Fetch invoices to get period_end date (fallback when subscription.current_period_end is null)
  const { data: invoicesData } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => apiFetch<InvoicesResponse>('/billing/invoices'),
    staleTime: 5 * 60 * 1000,
  });

  // Get the cancellation date from subscription or latest invoice
  const cancellationDate = useMemo(() => {
    if (nextBillingDate) return nextBillingDate;
    const latestInvoice = invoicesData?.invoices?.[0];
    if (latestInvoice?.period_end) {
      return new Date(latestInvoice.period_end * 1000);
    }
    return null;
  }, [nextBillingDate, invoicesData]);

  // Check if user has an active paid subscription (not starter, not trial)
  const hasActivePaidSubscription = (plan === 'pro' || plan === 'max') && !isTrial;

  // User can delete if: no paid subscription OR subscription is being cancelled
  const canDelete = !hasActivePaidSubscription || isCancelling;

  // Reset dialog state when closed
  useEffect(() => {
    if (!isDeleteDialogOpen) {
      setDeleteStep(1);
      setConfirmInput('');
      setStep1ButtonDisabled(true);
    }
  }, [isDeleteDialogOpen]);

  // Enable step 1 button after 1 second delay
  useEffect(() => {
    if (isDeleteDialogOpen && deleteStep === 1) {
      setStep1ButtonDisabled(true);
      const timer = setTimeout(() => {
        setStep1ButtonDisabled(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDeleteDialogOpen, deleteStep]);

  const handleDeleteClick = () => {
    if (!canDelete) {
      setShowCancelPlanDialog(true);
    } else {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleGoToBilling = () => {
    setShowCancelPlanDialog(false);
    router.push('/settings/billing/update');
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeletingAccount(true);

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      await authService.deleteAccount(session.access_token);

      setIsDeleteDialogOpen(false);
      await signOut();
      toast.success(t('settings.danger.accountDeleted'));
    } catch (error: any) {
      toast.error(error.message || t('settings.danger.accountDeleteFailed'));
      setIsDeletingAccount(false);
    }
  };

  const isConfirmInputCorrect = confirmInput === 'Delete my account';

  return (
    <div className="flex justify-center items-start px-4 pt-4 pb-2">
      <Card className="bg-background max-w-3xl w-full">
        <CardHeader className="px-4">
          <CardTitle>{t('settings.danger.dangerZone')}</CardTitle>
        </CardHeader>
        <Separator className="w-full mt-[-8px] mb-[-4px]" />
        <div className="w-full">
          <div className="space-y-0">
            {/* Delete Account */}
            <div className="flex items-center justify-between pt-2 px-4">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-destructive">
                  {t('settings.danger.deleteAccount')}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('settings.danger.deleteAccountDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteClick}
                className="ml-4 gap-2"
                disabled={isDeletingAccount}
              >
                <Trash2 className="h-4 w-4" />
                {t('settings.danger.deleteAccount')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Multi-step Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingAccount) setIsDeleteDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {/* Step 1: Warning */}
          {deleteStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.danger.confirmDeletion')}</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">{t('settings.danger.pleaseReadCarefully')}</p>
                    <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                      {hasActivePaidSubscription && isCancelling && cancellationDate && (
                        <li>{t('settings.danger.activePlanCancelsOn', { date: formatDate(cancellationDate) })}</li>
                      )}
                      <li>{t('settings.danger.loseAccessImmediately')}</li>
                      <li>{t('settings.danger.clientsLoseAccess')}</li>
                      <li>{t('settings.danger.dataErased')}</li>
                      <li className="font-medium text-destructive">{t('settings.danger.cannotBeUndone')}</li>
                    </ul>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  {t('settings.danger.cancel')}
                </Button>
                <Button variant="destructive" onClick={() => setDeleteStep(2)} disabled={step1ButtonDisabled}>
                  {t('settings.danger.iUnderstand')}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 2: Type confirmation */}
          {deleteStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.danger.typeToConfirm')}</DialogTitle>
                <DialogDescription>
                  {t('settings.danger.pleaseType')} <span className="font-bold text-destructive text-base">{t('settings.danger.deleteMyAccountQuoted')}</span> {t('settings.danger.exactlyToContinue')}
                </DialogDescription>
              </DialogHeader>
              <div className="pt-1 pb-2">
                <Label htmlFor="confirm-input" className="sr-only">
                  {t('settings.danger.deleteMyAccountPlaceholder')}
                </Label>
                <Input
                  id="confirm-input"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  placeholder={t('settings.danger.deleteMyAccountPlaceholder')}
                  className="text-destructive border-destructive bg-destructive/5 focus-visible:ring-destructive focus-visible:border-destructive focus:border-destructive"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteStep(1)}>
                  {t('settings.danger.back')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteStep(3)}
                  disabled={!isConfirmInputCorrect}
                >
                  {t('settings.danger.continue')}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 3: Final confirmation with time remaining */}
          {deleteStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.danger.finalConfirmation')}</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-2">
                    {hasActivePaidSubscription && isCancelling && cancellationDate && (
                      <>
                        <p className="text-sm text-muted-foreground">{t('settings.danger.beforeYouProceed')}</p>
                        <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                          <li>{t('settings.danger.timeLeftOnPlan', { time: formatTimeRemaining(cancellationDate) })}</li>
                          <li>{t('settings.danger.useAppUntil', { date: formatDate(cancellationDate) })}</li>
                          <li>{t('settings.danger.wontBeBilled')}</li>
                        </ul>
                      </>
                    )}
                    <p className="text-sm font-medium text-destructive pt-1">
                      {t('settings.danger.sureDeleteToday')}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteStep(2)}>
                  {t('settings.danger.back')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? t('settings.danger.deleting') : t('settings.danger.deleteMyAccount')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Subscription Dialog - shown when subscription is NOT cancelled */}
      <Dialog open={showCancelPlanDialog} onOpenChange={setShowCancelPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.danger.activeSubscription')}</DialogTitle>
            <DialogDescription>
              {t('settings.danger.cancelPlanFirst')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelPlanDialog(false)}>
              {t('settings.danger.cancel')}
            </Button>
            <Button onClick={handleGoToBilling}>
              {t('settings.danger.goToBilling')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DangerPage;
