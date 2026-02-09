'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Plus } from 'lucide-react';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCoachSequencesDropdown } from '@/hooks/use-coach-packages';
import type { CoachPackage } from '@athli/shared-types';

type AddPackageSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PackageFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  package?: CoachPackage | null;
};

export type PackageFormData = {
  name: string;
  description: string;
  benefits: string[];
  currency: string;
  interval: string;
  duration_months: number | null;
  free_trial_days: number;
  initial_fee_cents: number;
  amount_cents: number;
  sequence_id: string | null;
};

export const AddPackageSidePanel = ({
  open,
  onOpenChange,
  onSave,
  onDelete,
  package: pkg,
}: AddPackageSidePanelProps) => {
  const t = useTranslations();
  const { data: sequences } = useCoachSequencesDropdown();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasBenefits, setHasBenefits] = useState(false);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [interval, setInterval] = useState('month');
  const [durationMonths, setDurationMonths] = useState<string>('null');
  const [hasFreeTrial, setHasFreeTrial] = useState(false);
  const [freeTrialDays, setFreeTrialDays] = useState(7);
  const [hasInitialFee, setHasInitialFee] = useState(false);
  const [initialFeeDisplay, setInitialFeeDisplay] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [sequenceId, setSequenceId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditing = !!pkg;
  const hasSequences = sequences && sequences.length > 0;
  const isRecurring = interval !== 'one_time';

  useEffect(() => {
    if (open) {
      if (pkg) {
        setName(pkg.name);
        setDescription(pkg.description || '');
        setHasBenefits((pkg.benefits || []).length > 0);
        setBenefits(pkg.benefits || []);
        setCurrency(pkg.currency);
        setInterval(pkg.interval);
        setDurationMonths(pkg.duration_months != null ? String(pkg.duration_months) : 'null');
        setHasFreeTrial((pkg.free_trial_days || 0) > 0);
        setFreeTrialDays(pkg.free_trial_days || 7);
        setHasInitialFee((pkg.initial_fee_cents || 0) > 0);
        setInitialFeeDisplay((pkg.initial_fee_cents || 0) > 0 ? String(pkg.initial_fee_cents / 100) : '');
        setPriceDisplay(String(pkg.amount_cents / 100));
        setSequenceId((pkg as any).sequence_id || 'none');
      } else {
        setName('');
        setDescription('');
        setHasBenefits(false);
        setBenefits([]);
        setNewBenefit('');
        setCurrency('usd');
        setInterval('month');
        setDurationMonths('null');
        setHasFreeTrial(false);
        setFreeTrialDays(7);
        setHasInitialFee(false);
        setInitialFeeDisplay('');
        setPriceDisplay('');
        setSequenceId('none');
      }
      setIsSaving(false);
      setIsDeleting(false);
    }
  }, [open, pkg]);

  const handleAddBenefit = () => {
    const trimmed = newBenefit.trim();
    if (trimmed) {
      setBenefits((prev) => [...prev, trimmed]);
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const amountCents = Math.round(parseFloat(priceDisplay || '0') * 100);
    if (!name.trim() || !description.trim() || amountCents < 0) return;
    if (isRecurring && hasFreeTrial && freeTrialDays < 1) return;

    const initialFeeCents = isRecurring && hasInitialFee
      ? Math.round(parseFloat(initialFeeDisplay || '0') * 100)
      : 0;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        benefits: hasBenefits ? benefits : [],
        currency,
        interval,
        duration_months: isRecurring ? (durationMonths === 'null' ? null : parseInt(durationMonths)) : null,
        free_trial_days: isRecurring && hasFreeTrial ? freeTrialDays : 0,
        initial_fee_cents: initialFeeCents,
        amount_cents: amountCents,
        sequence_id: sequenceId !== 'none' ? sequenceId : null,
      });
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pkg || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(pkg.id);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const amountCents = Math.round(parseFloat(priceDisplay || '0') * 100);
  const payoutLabel = (() => {
    if (!priceDisplay || amountCents <= 0) return null;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
    const initialFeeCents = isRecurring && hasInitialFee
      ? Math.round(parseFloat(initialFeeDisplay || '0') * 100)
      : 0;
    const feeFormatted = initialFeeCents > 0
      ? ` + ${new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(initialFeeCents / 100)}`
      : '';
    if (interval === 'one_time') return `${formatted} one time`;
    return `${formatted}/${interval}${feeFormatted}`;
  })();

  const canSave =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    priceDisplay &&
    parseFloat(priceDisplay) >= 0 &&
    (!hasBenefits || benefits.length > 0) &&
    (!isRecurring || !hasFreeTrial || freeTrialDays >= 1) &&
    (!isRecurring || !hasInitialFee || (initialFeeDisplay && parseFloat(initialFeeDisplay) > 0));

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('business.packages.editPackage') : t('business.packages.addPackage')}
      onSave={handleSave}
      isSaving={isSaving}
      isSaveDisabled={!canSave}
      onDelete={isEditing && onDelete ? handleDelete : undefined}
      isDeleting={isDeleting}
      footerLeft={payoutLabel ? (
        <p className="text-sm text-muted-foreground truncate">
          Payout: <span className="font-medium text-foreground">{payoutLabel}</span>
        </p>
      ) : undefined}
    >
      <div className="flex-1 overflow-y-auto">
        <PackageDetailsForm
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          hasBenefits={hasBenefits}
          setHasBenefits={setHasBenefits}
          benefits={benefits}
          newBenefit={newBenefit}
          setNewBenefit={setNewBenefit}
          onAddBenefit={handleAddBenefit}
          onRemoveBenefit={handleRemoveBenefit}
          currency={currency}
          setCurrency={setCurrency}
          interval={interval}
          setInterval={setInterval}
          durationMonths={durationMonths}
          setDurationMonths={setDurationMonths}
          hasFreeTrial={hasFreeTrial}
          setHasFreeTrial={setHasFreeTrial}
          freeTrialDays={freeTrialDays}
          setFreeTrialDays={setFreeTrialDays}
          hasInitialFee={hasInitialFee}
          setHasInitialFee={setHasInitialFee}
          initialFeeDisplay={initialFeeDisplay}
          setInitialFeeDisplay={setInitialFeeDisplay}
          priceDisplay={priceDisplay}
          setPriceDisplay={setPriceDisplay}
          isRecurring={isRecurring}
        />

        {/* Sequence */}
        <div className="space-y-2 py-2">
          <Label>{t('business.packages.form.sequence')}</Label>
          {hasSequences ? (
            <>
              <Select value={sequenceId} onValueChange={setSequenceId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('business.packages.form.sequenceNone')}</SelectItem>
                  {sequences?.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('business.packages.form.sequenceDescription')}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('business.packages.form.noSequences')}{' '}
              <a href="/business/sequences" className="text-primary underline">
                {t('business.packages.form.noSequencesLink')}
              </a>
            </p>
          )}
        </div>
      </div>
    </SidePanel>
  );
};

// Extracted form fields component
function PackageDetailsForm({
  name, setName,
  description, setDescription,
  hasBenefits, setHasBenefits,
  benefits, newBenefit, setNewBenefit, onAddBenefit, onRemoveBenefit,
  currency, setCurrency,
  interval, setInterval,
  durationMonths, setDurationMonths,
  hasFreeTrial, setHasFreeTrial,
  freeTrialDays, setFreeTrialDays,
  hasInitialFee, setHasInitialFee,
  initialFeeDisplay, setInitialFeeDisplay,
  priceDisplay, setPriceDisplay,
  isRecurring,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  hasBenefits: boolean; setHasBenefits: (v: boolean) => void;
  benefits: string[]; newBenefit: string; setNewBenefit: (v: string) => void;
  onAddBenefit: () => void; onRemoveBenefit: (i: number) => void;
  currency: string; setCurrency: (v: string) => void;
  interval: string; setInterval: (v: string) => void;
  durationMonths: string; setDurationMonths: (v: string) => void;
  hasFreeTrial: boolean; setHasFreeTrial: (v: boolean) => void;
  freeTrialDays: number; setFreeTrialDays: (v: number) => void;
  hasInitialFee: boolean; setHasInitialFee: (v: boolean) => void;
  initialFeeDisplay: string; setInitialFeeDisplay: (v: string) => void;
  priceDisplay: string; setPriceDisplay: (v: string) => void;
  isRecurring: boolean;
}) {
  const t = useTranslations();

  return (
    <div className="space-y-4 py-2">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="pkg-name"><span>{t('business.packages.form.name')}<RequiredAsterisk /></span></Label>
        <Input
          id="pkg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('business.packages.form.namePlaceholder')}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="pkg-desc"><span>{t('business.packages.form.description')}<RequiredAsterisk /></span></Label>
        <Textarea
          id="pkg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('business.packages.form.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      {/* Currency & Price */}
      <div className="space-y-2">
        <Label htmlFor="pkg-price"><span>{t('business.packages.form.price')}<RequiredAsterisk /></span></Label>
        <CurrencyInput
          id="pkg-price"
          currency={currency}
          onCurrencyChange={setCurrency}
          value={priceDisplay}
          onValueChange={setPriceDisplay}
          placeholder={t('business.packages.form.pricePlaceholder')}
        />
      </div>

      {/* Plan Type & Duration */}
      <div className="flex gap-2">
        <div className="space-y-2 flex-1 min-w-0">
          <Label><span>{t('business.packages.form.planType')}<RequiredAsterisk /></span></Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">{t('business.packages.form.oneTime')}</SelectItem>
              <SelectItem value="week">{t('business.packages.form.weekly')}</SelectItem>
              <SelectItem value="month">{t('business.packages.form.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isRecurring && (
          <div className="space-y-2 flex-1 min-w-0">
            <Label><span>{t('business.packages.form.duration')}<RequiredAsterisk /></span></Label>
            <Select value={durationMonths} onValueChange={setDurationMonths}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t('business.packages.form.untilCancelled')}</SelectItem>
                <SelectItem value="1">{t('business.packages.form.month', { count: 1 })}</SelectItem>
                <SelectItem value="2">{t('business.packages.form.months', { count: 2 })}</SelectItem>
                <SelectItem value="3">{t('business.packages.form.months', { count: 3 })}</SelectItem>
                <SelectItem value="6">{t('business.packages.form.months', { count: 6 })}</SelectItem>
                <SelectItem value="12">{t('business.packages.form.months', { count: 12 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="benefits-toggle"
            checked={hasBenefits}
            onCheckedChange={(checked) => setHasBenefits(checked === true)}
          />
          <Label htmlFor="benefits-toggle" className="cursor-pointer">
            <span>{t('business.packages.form.benefits')}<RequiredAsterisk className={hasBenefits ? '' : 'invisible'} /></span>
          </Label>
        </div>
        {hasBenefits && (
          <>
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-2">
                <Input value={benefit} readOnly className="flex-1" />
                <Button type="button" variant="outline" size="icon" onClick={() => onRemoveBenefit(i)} className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder={t('business.packages.form.benefitPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddBenefit();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={onAddBenefit} className="shrink-0 h-9 w-9">
                <Plus className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Free Trial (recurring only) */}
      {isRecurring && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="free-trial"
              checked={hasFreeTrial}
              disabled={hasInitialFee}
              onCheckedChange={(checked) => setHasFreeTrial(checked === true)}
            />
            <Label htmlFor="free-trial" className="cursor-pointer">
              {t('business.packages.form.freeTrial')}
            </Label>
          </div>
          {hasFreeTrial && (
            <div className="space-y-2">
              <Label><span>{t('business.packages.form.freeTrialDays')}<RequiredAsterisk /></span></Label>
              <Select value={String(freeTrialDays)} onValueChange={(v) => setFreeTrialDays(parseInt(v))}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 {t('business.packages.form.days')}</SelectItem>
                  <SelectItem value="7">7 {t('business.packages.form.days')}</SelectItem>
                  <SelectItem value="14">14 {t('business.packages.form.days')}</SelectItem>
                  <SelectItem value="30">30 {t('business.packages.form.days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Initial Fee (recurring only) */}
      {isRecurring && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="initial-fee"
              checked={hasInitialFee}
              disabled={hasFreeTrial}
              onCheckedChange={(checked) => setHasInitialFee(checked === true)}
            />
            <Label htmlFor="initial-fee" className="cursor-pointer">
              {t('business.packages.form.initialFee')}
            </Label>
          </div>
          {hasInitialFee && (
            <div className="space-y-2">
              <Label><span>{t('business.packages.form.initialFeeAmount')}<RequiredAsterisk /></span></Label>
              <CurrencyInput
                currency={currency}
                currencyDisabled
                value={initialFeeDisplay}
                onValueChange={(val) => {
                  if (val.includes('.') && val.split('.')[1]?.length > 2) return;
                  setInitialFeeDisplay(val);
                }}
                placeholder="0.00"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
