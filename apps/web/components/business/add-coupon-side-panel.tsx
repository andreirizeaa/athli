'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/general/utils';
import type { Coupon } from '@athli/shared-types';

type AddCouponSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CouponFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  coupon?: Coupon | null;
};

export type CouponFormData = {
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  duration_months: number | null;
  max_redemptions: number | null;
  expires_at: string | null;
};

export const AddCouponSidePanel = ({
  open,
  onOpenChange,
  onSave,
  onDelete,
  coupon,
}: AddCouponSidePanelProps) => {
  const t = useTranslations();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [durationMonths, setDurationMonths] = useState<string>('null');
  const [hasRedemptionLimit, setHasRedemptionLimit] = useState(false);
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditing = !!coupon;

  useEffect(() => {
    if (open) {
      if (coupon) {
        setName(coupon.name);
        setCode(coupon.code);
        setDiscountType(coupon.discount_type);
        setDiscountValue(String(coupon.discount_value));
        setCurrency(coupon.currency);
        setDurationMonths(coupon.duration_months != null ? String(coupon.duration_months) : 'null');
        setHasRedemptionLimit(coupon.max_redemptions != null);
        setMaxRedemptions(coupon.max_redemptions != null ? String(coupon.max_redemptions) : '');
        setHasExpiration(!!coupon.expires_at);
        setExpiresAt(coupon.expires_at ? new Date(coupon.expires_at) : undefined);
      } else {
        setName('');
        setCode('');
        setDiscountType('percentage');
        setDiscountValue('');
        setCurrency('usd');
        setDurationMonths('null');
        setHasRedemptionLimit(false);
        setMaxRedemptions('');
        setHasExpiration(false);
        setExpiresAt(undefined);
      }
      setIsSaving(false);
      setIsDeleting(false);
    }
  }, [open, coupon]);

  const handleSave = async () => {
    const value = parseFloat(discountValue || '0');
    if (!name.trim() || !code.trim() || value <= 0) return;
    if (hasRedemptionLimit && (!maxRedemptions || parseInt(maxRedemptions) < 1)) return;
    if (hasExpiration && !expiresAt) return;


    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        discount_type: discountType,
        discount_value: value,
        currency,
        duration_months: durationMonths === 'null' ? null : parseInt(durationMonths),
        max_redemptions: hasRedemptionLimit && maxRedemptions ? parseInt(maxRedemptions) : null,
        expires_at: hasExpiration && expiresAt ? expiresAt.toISOString() : null,
      });
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!coupon || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(coupon.id);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const parsedDiscount = parseFloat(discountValue || '0');
  const canSave =
    name.trim().length > 0 &&
    code.trim().length > 0 &&
    parsedDiscount > 0 &&
    (discountType !== 'percentage' || parsedDiscount <= 100) &&
    (!hasRedemptionLimit || (maxRedemptions && parseInt(maxRedemptions) >= 1)) &&
    (!hasExpiration || !!expiresAt);

  const discountLabel = (() => {
    const value = parseFloat(discountValue || '0');
    if (value <= 0) return null;
    if (discountType === 'percentage') return `${value}% off`;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(value);
    return `${formatted} off`;
  })();

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('business.coupons.editCoupon') : t('business.coupons.addCoupon')}
      onSave={handleSave}
      isSaving={isSaving}
      isSaveDisabled={!canSave}
      onDelete={isEditing && onDelete ? handleDelete : undefined}
      isDeleting={isDeleting}
      footerLeft={discountLabel ? (
        <p className="text-sm text-muted-foreground truncate">
          Discount: <span className="font-medium text-foreground">{discountLabel}</span>
        </p>
      ) : undefined}
    >
      <div className="space-y-4 py-2">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="coupon-name"><span>{t('business.coupons.form.name')}<RequiredAsterisk /></span></Label>
          <Input
            id="coupon-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('business.coupons.form.namePlaceholder')}
          />
        </div>

        {/* Code */}
        <div className="space-y-2">
          <Label htmlFor="coupon-code"><span>{t('business.coupons.form.code')}<RequiredAsterisk /></span></Label>
          <Input
            id="coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder={t('business.coupons.form.codePlaceholder')}
            className="font-mono"
          />
        </div>

        {/* Discount Type & Duration */}
        <div className="flex gap-2">
          <div className="space-y-2 flex-1 min-w-0">
            <Label><span>{t('business.coupons.form.discountType')}<RequiredAsterisk /></span></Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t('business.coupons.form.percentage')}</SelectItem>
                <SelectItem value="fixed">{t('business.coupons.form.fixedAmount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <Label><span>{t('business.coupons.form.duration')}<RequiredAsterisk /></span></Label>
            <Select value={durationMonths} onValueChange={setDurationMonths}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t('business.coupons.form.oneTime')}</SelectItem>
                {[1, 2, 3, 6, 12].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m === 1 ? t('business.coupons.form.month', { count: 1 }) : t('business.coupons.form.months', { count: m })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Discount Value */}
        <div className="space-y-2">
          <Label htmlFor="discount-value"><span>{t('business.coupons.form.discountValue')}<RequiredAsterisk /></span></Label>
          {discountType === 'fixed' ? (
            <CurrencyInput
              id="discount-value"
              currency={currency}
              onCurrencyChange={setCurrency}
              value={discountValue}
              onValueChange={setDiscountValue}
              placeholder={t('business.coupons.form.valuePlaceholder')}
            />
          ) : (
            <Input
              id="discount-value"
              type="number"
              min={0}
              max={100}
              value={discountValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (val > 100) return;
                setDiscountValue(e.target.value);
              }}
              placeholder={t('business.coupons.form.valuePlaceholder')}
            />
          )}
        </div>

        {/* Limit Redemptions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="redemption-limit"
              checked={hasRedemptionLimit}
              onCheckedChange={(checked) => setHasRedemptionLimit(checked === true)}
            />
            <Label htmlFor="redemption-limit" className="cursor-pointer">
              {t('business.coupons.form.limitRedemptions')}
            </Label>
          </div>
          {hasRedemptionLimit && (
            <div className="space-y-2">
              <Label><span>{t('business.coupons.form.maxRedemptions')}<RequiredAsterisk /></span></Label>
              <Input
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder={t('business.coupons.form.valuePlaceholder')}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Expiration Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="expiration-toggle"
              checked={hasExpiration}
              onCheckedChange={(checked) => setHasExpiration(checked === true)}
            />
            <Label htmlFor="expiration-toggle" className="cursor-pointer">
              {t('business.coupons.form.expirationDate')}
            </Label>
          </div>
          {hasExpiration && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors"
                >
                  <span className={cn('text-sm', !expiresAt && 'text-muted-foreground')}>
                    {expiresAt ? expiresAt.toLocaleDateString() : t('business.coupons.form.selectDate')}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => {
                    setExpiresAt(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </SidePanel>
  );
};
