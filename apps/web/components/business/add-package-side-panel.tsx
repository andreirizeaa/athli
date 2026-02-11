'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Plus, Upload, X, Check, Loader2, ImageIcon, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageCropDialog } from '@/components/app/image-crop-dialog';
import { useCoachSequencesDropdown } from '@/hooks/use-coach-packages';
import { useGlobalData } from '@/providers/global-data-provider';
import { uploadPackagePhoto } from '@/api/payments/payment-service';
import { PACKAGE_PRESET_IMAGES } from '@/lib/constants/package-presets';
import type { CoachPackage } from '@athli/shared-types';

function toBillingType(interval: string, intervalCount: number | null): string {
  if (interval === 'month' && intervalCount === 3) return 'month_3';
  if (interval === 'month' && intervalCount === 6) return 'month_6';
  return interval;
}

function fromBillingType(billingType: string): { interval: string; interval_count: number } {
  if (billingType === 'month_3') return { interval: 'month', interval_count: 3 };
  if (billingType === 'month_6') return { interval: 'month', interval_count: 6 };
  return { interval: billingType, interval_count: 1 };
}

function formatPreviewAmount(amountCents: number, currency: string): string {
  if (amountCents <= 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatPreviewInterval(interval: string, intervalCount?: number | null): string {
  if (interval === 'one_time') return '';
  const count = intervalCount ?? 1;
  if (count > 1) return `/ ${count} ${interval}s`;
  if (interval === 'day') return '/ day';
  if (interval === 'week') return '/ week';
  if (interval === 'month') return '/ month';
  if (interval === 'year') return '/ year';
  return '';
}

type AddPackageSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PackageFormData) => Promise<void>;
  package?: CoachPackage | null;
};

export type PackageFormData = {
  name: string;
  description: string;
  features: string[];
  currency: string;
  interval: string;
  interval_count: number;
  free_trial_days: number;
  initial_fee_cents: number;
  amount_cents: number;
  sequence_id: string | null;
  image_url: string;
};

export const AddPackageSidePanel = ({
  open,
  onOpenChange,
  onSave,
  package: pkg,
}: AddPackageSidePanelProps) => {
  const t = useTranslations();
  const { user } = useGlobalData();
  const { data: sequences } = useCoachSequencesDropdown();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasFeatures, setHasFeatures] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [billingType, setBillingType] = useState('month');
  const [hasFreeTrial, setHasFreeTrial] = useState(false);
  const [freeTrialDays, setFreeTrialDays] = useState(7);
  const [hasInitialFee, setHasInitialFee] = useState(false);
  const [initialFeeDisplay, setInitialFeeDisplay] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [sequenceId, setSequenceId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);

  // Image state
  const [imageUrl, setImageUrl] = useState('');
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isEditing = !!pkg;
  const hasSequences = sequences && sequences.length > 0;
  const { interval, interval_count } = fromBillingType(billingType);
  const isRecurring = interval !== 'one_time';

  useEffect(() => {
    if (open) {
      if (pkg) {
        setName(pkg.name);
        setDescription(pkg.description || '');
        setHasFeatures((pkg.features || []).length > 0);
        setFeatures(pkg.features || []);
        setCurrency(pkg.currency);
        setBillingType(toBillingType(pkg.interval, pkg.interval_count));
        setHasFreeTrial((pkg.free_trial_days || 0) > 0);
        setFreeTrialDays(pkg.free_trial_days || 7);
        setHasInitialFee((pkg.initial_fee_cents || 0) > 0);
        setInitialFeeDisplay((pkg.initial_fee_cents || 0) > 0 ? String(pkg.initial_fee_cents / 100) : '');
        setPriceDisplay(String(pkg.amount_cents / 100));
        setSequenceId((pkg as any).sequence_id || 'none');
        setImageUrl(pkg.image_url || '');
      } else {
        setName('');
        setDescription('');
        setHasFeatures(false);
        setFeatures([]);
        setNewFeature('');
        setCurrency('usd');
        setBillingType('month');
        setHasFreeTrial(false);
        setFreeTrialDays(7);
        setHasInitialFee(false);
        setInitialFeeDisplay('');
        setPriceDisplay('');
        setSequenceId('none');
        setImageUrl('');
      }
      setIsSaving(false);
      setIsUploadingImage(false);
    }
  }, [open, pkg]);

  const handleAddFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed) {
      setFeatures((prev) => [...prev, trimmed]);
      setNewFeature('');
    }
  };

  const handleUpdateFeature = (index: number, value: string) => {
    setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
  };

  const handleBlurFeature = (index: number) => {
    if (!features[index]?.trim()) {
      setFeatures((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadImage = async (file: File) => {
    if (!user?.id) return;
    setIsUploadingImage(true);
    try {
      const packageId = pkg?.id || 'new';
      const url = await uploadPackagePhoto(file, user.id, packageId);
      setImageUrl(url);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    const amountCents = Math.round(parseFloat(priceDisplay || '0') * 100);
    if (!name.trim() || amountCents < 0 || !imageUrl) return;
    if (isRecurring && hasFreeTrial && freeTrialDays < 1) return;

    const initialFeeCents = isRecurring && hasInitialFee
      ? Math.round(parseFloat(initialFeeDisplay || '0') * 100)
      : 0;

    // Auto-include any pending feature text that hasn't been explicitly added
    const allFeatures = hasFeatures
      ? [...features, ...(newFeature.trim() ? [newFeature.trim()] : [])]
      : [];

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        features: allFeatures,
        currency,
        interval,
        interval_count,
        free_trial_days: isRecurring && hasFreeTrial ? freeTrialDays : 0,
        initial_fee_cents: initialFeeCents,
        amount_cents: amountCents,
        sequence_id: sequenceId !== 'none' ? sequenceId : null,
        image_url: imageUrl,
      });
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const amountCents = Math.round(parseFloat(priceDisplay || '0') * 100);
  const initialFeeCents = isRecurring && hasInitialFee
    ? Math.round(parseFloat(initialFeeDisplay || '0') * 100)
    : 0;

  const payoutLabel = (() => {
    if (!priceDisplay || amountCents <= 0) return null;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
    const feeFormatted = initialFeeCents > 0
      ? ` + ${new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(initialFeeCents / 100)}`
      : '';
    if (interval === 'one_time') return `${formatted} one time`;
    const intervalLabel = billingType === 'month_3' ? '3 months' : billingType === 'month_6' ? '6 months' : interval;
    return `${formatted}/${intervalLabel}${feeFormatted}`;
  })();

  const canSave =
    name.trim().length > 0 &&
    imageUrl.length > 0 &&
    priceDisplay &&
    parseFloat(priceDisplay) >= 0 &&
    (!hasFeatures || features.length > 0 || newFeature.trim().length > 0) &&
    (!isRecurring || !hasFreeTrial || freeTrialDays >= 1) &&
    (!isRecurring || !hasInitialFee || (initialFeeDisplay && parseFloat(initialFeeDisplay) > 0));

  // Compute preview values
  const previewFeatures = hasFeatures
    ? [...features, ...(newFeature.trim() ? [newFeature.trim()] : [])]
    : [];

  const coachName = user?.name || '';
  const coachAvatar = user?.profilePictureUrl || null;

  return (
    <>
      <SidePanel
        open={open}
        onOpenChange={onOpenChange}
        title={isEditing ? t('business.packages.editPackage') : t('business.packages.addPackage')}
        contentClassName="sm:w-[750px] sm:max-w-[750px] [&>div:nth-child(3)]:px-0 [&>div:nth-child(3)]:overflow-hidden"
        onSave={handleSave}
        isSaving={isSaving}
        isSaveDisabled={!canSave}
        footerLeft={payoutLabel ? (
          <p className="text-sm text-muted-foreground truncate">
            Payout: <span className="font-medium text-foreground">{payoutLabel}</span>
          </p>
        ) : undefined}
      >
        <div className="flex-1 flex min-h-0">
          {/* Left column: Form — only this scrolls */}
          <div className="w-[450px] flex-shrink-0 px-4 overflow-y-auto">
            {/* Image Picker — same card style as preview */}
            <div className="space-y-2 py-2">
              <Label><span>{t('business.packages.form.image')}<RequiredAsterisk /></span></Label>
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden max-w-[248px]">
                {imageUrl ? (
                  <div className="relative group">
                    <div className="w-full aspect-[3/2] bg-muted relative">
                      <img
                        src={imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCropDialogOpen(true)}
                      >
                        <Upload className="size-3 mr-1" />
                        {t('business.packages.form.imageUpload')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setImageUrl('')}
                      >
                        <X className="size-3 mr-1" />
                        {t('business.packages.form.imageRemove')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCropDialogOpen(true)}
                    className="w-full aspect-[3/2] bg-muted hover:bg-muted/80 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="size-5" />
                        <span className="text-xs">{t('business.packages.form.imageUpload')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('business.packages.form.imagePresets')}</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {PACKAGE_PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`flex-shrink-0 w-16 h-11 rounded overflow-hidden border-2 transition-colors ${
                        imageUrl === preset.url ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <PackageDetailsForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              hasFeatures={hasFeatures}
              setHasFeatures={setHasFeatures}
              features={features}
              newFeature={newFeature}
              setNewFeature={setNewFeature}
              onAddFeature={handleAddFeature}
              onUpdateFeature={handleUpdateFeature}
              onBlurFeature={handleBlurFeature}
              onRemoveFeature={handleRemoveFeature}
              currency={currency}
              setCurrency={setCurrency}
              billingType={billingType}
              setBillingType={setBillingType}
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

          {/* Vertical Divider — full height, touching header and footer separators */}
          <div className="w-px bg-border flex-shrink-0" />

          {/* Right column: Preview Card — fixed, no scroll */}
          <div className="w-[280px] flex-shrink-0 px-4 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Preview</p>
            <PackagePreviewCard
              name={name}
              description={description}
              imageUrl={imageUrl}
              amountCents={amountCents}
              currency={currency}
              interval={interval}
              intervalCount={interval_count}
              freeTrialDays={isRecurring && hasFreeTrial ? freeTrialDays : 0}
              initialFeeCents={initialFeeCents}
              features={previewFeatures}
              coachName={coachName}
              coachAvatar={coachAvatar}
            />
          </div>
        </div>
      </SidePanel>

      <ImageCropDialog
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        onSave={handleUploadImage}
        title={t('business.packages.form.image')}
        description={t('business.packages.form.imageUpload')}
        cropWidth={320}
        cropHeight={200}
        cropBorderRadius={8}
      />
    </>
  );
};

// Preview card matching the public packages page design
function PackagePreviewCard({
  name,
  description,
  imageUrl,
  amountCents,
  currency,
  interval,
  intervalCount,
  freeTrialDays,
  initialFeeCents,
  features,
  coachName,
  coachAvatar,
}: {
  name: string;
  description: string;
  imageUrl: string;
  amountCents: number;
  currency: string;
  interval: string;
  intervalCount: number;
  freeTrialDays: number;
  initialFeeCents: number;
  features: string[];
  coachName: string;
  coachAvatar: string | null;
}) {
  const initials = coachName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Image — edge-to-edge, top corners rounded via card overflow-hidden */}
      <div className="w-full aspect-[3/2] bg-muted relative">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="size-6 mx-auto mb-1" />
              <p className="text-[10px]">Package image</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Coach avatar + Package name */}
        <div className="flex items-center gap-2">
          {coachAvatar ? (
            <img
              src={coachAvatar}
              alt=""
              className="size-6 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="size-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-medium text-muted-foreground">{initials}</span>
            </div>
          )}
          <h3 className="text-sm font-semibold truncate">
            {name || <span className="text-muted-foreground italic">Package name</span>}
          </h3>
        </div>

        {/* Description */}
        {(description || !name) && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {description || <span className="italic">Description goes here</span>}
          </p>
        )}

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold">
            {amountCents > 0
              ? formatPreviewAmount(amountCents, currency)
              : <span className="text-muted-foreground">$0</span>
            }
          </span>
          {interval !== 'one_time' && (
            <span className="text-muted-foreground text-xs">
              {formatPreviewInterval(interval, intervalCount)}
            </span>
          )}
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-medium ml-auto">
            {currency}
          </Badge>
        </div>

        {/* Initial fee */}
        {initialFeeCents > 0 && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            + {formatPreviewAmount(initialFeeCents, currency)} initial fee
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {interval === 'one_time' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">One-time</Badge>
          )}
          {freeTrialDays > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{freeTrialDays}-day free trial</Badge>
          )}
        </div>

        {/* Button */}
        <Button className="w-full mt-3" size="sm">
          Get Started
          <ArrowRight className="size-3.5" />
        </Button>

        {/* Features — below the button */}
        {features.length > 0 && (
          <ul className="mt-3 space-y-1">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <Check className="size-3 text-green-500 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Extracted form fields component
function PackageDetailsForm({
  name, setName,
  description, setDescription,
  hasFeatures, setHasFeatures,
  features, newFeature, setNewFeature, onAddFeature, onUpdateFeature, onBlurFeature, onRemoveFeature,
  currency, setCurrency,
  billingType, setBillingType,
  hasFreeTrial, setHasFreeTrial,
  freeTrialDays, setFreeTrialDays,
  hasInitialFee, setHasInitialFee,
  initialFeeDisplay, setInitialFeeDisplay,
  priceDisplay, setPriceDisplay,
  isRecurring,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  hasFeatures: boolean; setHasFeatures: (v: boolean) => void;
  features: string[]; newFeature: string; setNewFeature: (v: string) => void;
  onAddFeature: () => void; onUpdateFeature: (i: number, v: string) => void; onBlurFeature: (i: number) => void; onRemoveFeature: (i: number) => void;
  currency: string; setCurrency: (v: string) => void;
  billingType: string; setBillingType: (v: string) => void;
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
        <Label htmlFor="pkg-desc">{t('business.packages.form.description')}</Label>
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

      {/* Billing Type */}
      <div className="space-y-2">
        <Label><span>{t('business.packages.form.billingType')}<RequiredAsterisk /></span></Label>
        <Select value={billingType} onValueChange={setBillingType}>
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t('business.packages.form.daily')}</SelectItem>
            <SelectItem value="week">{t('business.packages.form.weekly')}</SelectItem>
            <SelectItem value="month">{t('business.packages.form.monthly')}</SelectItem>
            <SelectItem value="year">{t('business.packages.form.yearly')}</SelectItem>
            <SelectItem value="month_3">{t('business.packages.form.every3Months')}</SelectItem>
            <SelectItem value="month_6">{t('business.packages.form.every6Months')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="features-toggle"
            checked={hasFeatures}
            onCheckedChange={(checked) => setHasFeatures(checked === true)}
          />
          <Label htmlFor="features-toggle" className="cursor-pointer">
            <span>{t('business.packages.form.features')}<RequiredAsterisk className={hasFeatures ? '' : 'invisible'} /></span>
          </Label>
        </div>
        {hasFeatures && (
          <>
            {features.map((feature, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => onUpdateFeature(i, e.target.value)}
                  onBlur={() => onBlurFeature(i)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => onRemoveFeature(i)} className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder={t('business.packages.form.featurePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddFeature();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={onAddFeature} className="shrink-0 h-9 w-9">
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
