'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { CountrySelect } from '@/components/ui/country-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Edit, User, Mail, Users, Phone, MapPin, ArrowUp10, Camera, Upload, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { useClientProfileContext } from '../client-profile-context';
import { useUpdateClientDetails } from '@/hooks/use-client-details';
import type { AthleteDetails } from '@/api/client/client-service';
import { parsePhoneNumber } from 'react-phone-number-input';
import type { Value as PhoneValue, Country } from 'react-phone-number-input';
import { toast } from 'sonner';

type ClientDetailsCardProps = {
  clientId: string;
};

export const ClientDetailsCard = ({ clientId }: ClientDetailsCardProps) => {
  const t = useTranslations();
  const { details, athlete, isLoading } = useClientProfileContext();
  const updateDetailsMutation = useUpdateClientDetails();
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [formData, setFormData] = useState<AthleteDetails>({
    name: '',
    email: '',
    birthDate: null,
    category: 'online',
    gender: null,
    phone: '',
    country: '',
    avatarUrl: null,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const clientName = details?.name || athlete?.name || '';
  const clientEmail = details?.email || athlete?.email || '';
  const clientCategory = (details?.category || athlete?.coachingType || 'online') as 'online' | 'in-person' | 'hybrid';
  const clientGender = details?.gender || null;
  const clientPhone = details?.phone || athlete?.phone || '';
  const clientCountry = details?.country || athlete?.country || '';
  const clientAvatar = previewUrl || athlete?.avatarUrl || null;


  const convertPhoneToE164 = (phone: string): PhoneValue | undefined => {
    if (!phone) return undefined;
    try {
      const cleaned = phone.replace(/\s/g, '').replace(/[()-]/g, '');
      if (cleaned.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(cleaned)) {
        return cleaned as PhoneValue;
      }
      const parsed = parsePhoneNumber(phone);
      return parsed?.number as PhoneValue | undefined;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    if (isEditDetailsOpen && firstNameInputRef.current) {
      setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 100);
    }
  }, [isEditDetailsOpen]);

  useEffect(() => {
    if (details || athlete) {
      const hasImageChange = !!uploadedFile;
      const hasFieldChanges =
        formData.name !== clientName ||
        formData.email !== clientEmail ||
        formData.birthDate !== (details?.birthDate || null) ||
        formData.category !== clientCategory ||
        formData.gender !== clientGender ||
        formData.phone !== clientPhone ||
        formData.country !== clientCountry;

      const hasRequiredFields =
        formData.name.trim() !== '' &&
        formData.email.trim() !== '';

      setHasChanges((hasFieldChanges || hasImageChange) && hasRequiredFields);
    }
  }, [formData, details, athlete, uploadedFile, clientName, clientEmail, clientCategory, clientGender, clientPhone, clientCountry]);

  const handleSaveDetails = async () => {
    if (!clientId) return;

    try {
      await updateDetailsMutation.mutateAsync({
        clientId,
        details: {
          ...formData,
          avatarFile: uploadedFile
        }
      });

      toast.success(t('athletes.profile.detailsUpdated'));
      setHasChanges(false);
      setUploadedFile(null);
      setPreviewUrl(null);
      setIsEditDetailsOpen(false);
    } catch (error) {
      console.error('Failed to save details:', error);
      toast.error(t('general.errorOccurred'));
    }
  };

  const handleCancelEdit = () => {
    if (details || athlete) {
      setFormData({
        name: clientName,
        email: clientEmail,
        birthDate: details?.birthDate || null,
        category: clientCategory,
        gender: clientGender,
        phone: clientPhone,
        country: clientCountry,
        avatarUrl: athlete?.avatarUrl || null,
      });
    }
    setHasChanges(false);
    setPreviewUrl(null);
    setUploadedFile(null);
    setIsEditDetailsOpen(false);
  };

  const handleEditDetails = () => {
    if (details || athlete) {
      setFormData({
        name: clientName,
        email: clientEmail,
        birthDate: details?.birthDate || null,
        category: clientCategory,
        gender: clientGender,
        phone: clientPhone,
        country: clientCountry,
        avatarUrl: athlete?.avatarUrl || null,
      });
    }
    setHasChanges(false);
    setPreviewUrl(null);
    setUploadedFile(null);
    setIsEditDetailsOpen(true);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <>
      <Card className="bg-background flex flex-col flex-1 min-w-0 w-full h-full">
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.athleteDetails')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditDetails}
              className="h-7 text-xs gap-2"
              aria-label={t('general.edit')}
            >
              <Edit className="h-3 w-3" />
              {t('general.edit')}
            </Button>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px] flex-shrink-0" />
        <CardContent className="px-4 py-2 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : (details || athlete) ? (
            <div className="flex flex-col gap-4 text-sm mt-2">
              <div className="flex justify-start mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={athlete?.avatarUrl} alt={clientName} />
                  <AvatarFallback className="text-lg">
                    {clientName
                      ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="grid grid-cols-1 gap-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.athleteName')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {clientName || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUp10 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.birthDate', { defaultValue: 'Birth Date' })}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {details?.birthDate ? format(new Date(details.birthDate), "d MMM, yyyy") : '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.gender')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {clientGender === 'male' ? t('athletes.profile.male') :
                      clientGender === 'female' ? t('athletes.profile.female') :
                        clientGender === 'prefer-not-to-say' ? t('athletes.profile.preferNotToSay') : '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.category')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {clientCategory === 'online'
                      ? t('athletes.profile.online')
                      : clientCategory === 'in-person'
                        ? t('athletes.profile.inPerson')
                        : clientCategory === 'hybrid'
                          ? t('athletes.profile.hybrid')
                          : clientCategory || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.country')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {clientCountry || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.phone')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {clientPhone || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.email')}</span>
                  </div>
                  <div className="text-right">
                    {clientEmail ? (
                      <a
                        href={`mailto:${clientEmail}`}
                        className="text-xs text-primary underline hover:text-primary/80 font-medium"
                      >
                        {clientEmail}
                      </a>
                    ) : (
                      <p className="text-xs text-foreground font-medium">--</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('athletes.profile.detailsComingSoon')}</p>
            </div>
          )}
        </CardContent>
        <Separator className="w-full" />
      </Card>

      <SidePanel
        open={isEditDetailsOpen}
        onOpenChange={setIsEditDetailsOpen}
        title={t('athletes.profile.editDetails')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button onClick={handleSaveDetails} disabled={!hasChanges || updateDetailsMutation.isPending} className="gap-2">
              {updateDetailsMutation.isPending ? (
                t('general.saving', { defaultValue: 'Saving...' })
              ) : (
                t('general.save')
              )}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div
          className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto px-1 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background border-2 border-dashed border-primary rounded-lg pointer-events-none">
              <p className="text-lg font-semibold text-primary">Drop image here</p>
            </div>
          )}
          <div className="w-full flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={clientAvatar || undefined} alt={clientName} />
                  <AvatarFallback className="text-lg">
                    {clientName
                      ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  aria-label="Change profile picture"
                >
                  <Camera className="size-3" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Profile picture</p>
                <p className="text-xs text-muted-foreground">Drag and drop an image to change</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs flex-shrink-0"
            >
              Change Picture
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">
              <span>{t('athletes.profile.athleteName')}<RequiredAsterisk /></span>
            </Label>
            <Input
              id="full-name"
              ref={firstNameInputRef}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('athletes.profile.athleteName')}
              autoFocus={false}
              tabIndex={0}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <span>{t('athletes.profile.email')}<RequiredAsterisk /></span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('athletes.profile.emailPlaceholder')}
              autoFocus={false}
              tabIndex={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth-date">
              <span>{t('athletes.profile.birthDate', { defaultValue: 'Birth Date' })}</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="birth-date"
                  className={cn(
                    "w-full justify-between text-left font-normal h-10 px-3 bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors",
                    !formData.birthDate && "text-muted-foreground"
                  )}
                >
                  {formData.birthDate ? (
                    format(new Date(formData.birthDate), "d MMM, yyyy")
                  ) : (
                    <span>{t('athletes.profile.selectBirthDate', { defaultValue: 'Select birth date' })}</span>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.birthDate ? new Date(formData.birthDate) : undefined}
                  onSelect={(date) => {
                    setFormData({ ...formData, birthDate: date ? format(date, 'yyyy-MM-dd') : null });
                  }}
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                <span>{t('athletes.profile.category')}</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: 'online' | 'in-person' | 'hybrid') => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder={t('athletes.profile.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">{t('athletes.profile.online')}</SelectItem>
                  <SelectItem value="in-person">{t('athletes.profile.inPerson')}</SelectItem>
                  <SelectItem value="hybrid">{t('athletes.profile.hybrid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">
                <span>{t('athletes.profile.gender')}</span>
              </Label>
              <Select
                value={formData.gender || undefined}
                onValueChange={(value: 'male' | 'female' | 'prefer-not-to-say') => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder={t('athletes.profile.selectGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('athletes.profile.male')}</SelectItem>
                  <SelectItem value="female">{t('athletes.profile.female')}</SelectItem>
                  <SelectItem value="prefer-not-to-say">{t('athletes.profile.preferNotToSay')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              <span>{t('athletes.profile.phone')}</span>
            </Label>
            <PhoneInput
              id="phone"
              value={convertPhoneToE164(formData.phone)}
              onChange={(value) => setFormData({ ...formData, phone: value || '' })}
              placeholder={t('athletes.profile.phonePlaceholder')}
              autoFocus={false}
              tabIndex={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">
              <span>{t('athletes.profile.country')}</span>
            </Label>
            <CountrySelect
              value={formData.country as Country | undefined}
              onChange={(country) => setFormData({ ...formData, country })}
            />
          </div>
        </div>
      </SidePanel>
    </>
  );
};

