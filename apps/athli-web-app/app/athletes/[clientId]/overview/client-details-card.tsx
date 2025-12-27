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
import { Edit, User, Mail, Users, Phone, MapPin, ArrowUp10 } from 'lucide-react';
import { getAthleteDetails, saveAthleteDetails, type AthleteDetails } from '@/api/client/client-service';
import { parsePhoneNumber } from 'react-phone-number-input';
import type { Value as PhoneValue, Country } from 'react-phone-number-input';

type ClientDetailsCardProps = {
  clientId: string;
};

export const ClientDetailsCard = ({ clientId }: ClientDetailsCardProps) => {
  const t = useTranslations();
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [details, setDetails] = useState<AthleteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const athlete = mockAthletes.find((item) => item.id === clientId); // Removed mock
  const [formData, setFormData] = useState<AthleteDetails>({
    firstName: '',
    lastName: '',
    email: '',
    age: null,
    category: 'online',
    gender: null,
    phone: '',
    country: '',
    weight: null,
    height: null,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  const convertPhoneToE164 = (phone: string): PhoneValue | undefined => {
    if (!phone) return undefined;
    try {
      // If it's already in E.164 format, return it
      const cleaned = phone.replace(/\s/g, '').replace(/[()-]/g, '');
      if (cleaned.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(cleaned)) {
        return cleaned as PhoneValue;
      }
      // Try to parse the formatted phone number
      const parsed = parsePhoneNumber(phone);
      return parsed?.number as PhoneValue | undefined;
    } catch {
      // If parsing fails, return undefined
      return undefined;
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const fetchedDetails = await getAthleteDetails(clientId);
        setDetails(fetchedDetails);
        setFormData(fetchedDetails);
      } catch (error) {
        console.error('Failed to fetch details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [clientId]);

  useEffect(() => {
    if (isEditDetailsOpen && firstNameInputRef.current) {
      setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 100);
    }
  }, [isEditDetailsOpen]);

  useEffect(() => {
    if (details) {
      const hasChanged =
        formData.firstName !== details.firstName ||
        formData.lastName !== details.lastName ||
        formData.email !== details.email ||
        formData.age !== details.age ||
        formData.category !== details.category ||
        formData.gender !== details.gender ||
        formData.phone !== details.phone ||
        formData.country !== details.country;
      setHasChanges(hasChanged);
    }
  }, [formData, details]);

  const handleSaveDetails = async () => {
    if (!clientId) return;

    try {
      await saveAthleteDetails(clientId, formData);
      setDetails(formData);
      setHasChanges(false);
      setIsEditDetailsOpen(false);
    } catch (error) {
      console.error('Failed to save details:', error);
    }
  };

  const handleCancelEdit = () => {
    if (details) {
      setFormData(details);
    }
    setHasChanges(false);
    setIsEditDetailsOpen(false);
  };

  const handleEditDetails = () => {
    if (details) {
      setFormData(details);
    }
    setHasChanges(false);
    setIsEditDetailsOpen(true);
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
          ) : details ? (
            <div className="flex flex-col gap-4 text-sm mt-2">
              <div className="flex justify-start mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={details.avatar} alt={`${details.firstName} ${details.lastName}`} />
                  <AvatarFallback className="text-lg">
                    {details.firstName && details.lastName
                      ? `${details.firstName.charAt(0).toUpperCase()}${details.lastName.charAt(0).toUpperCase()}`
                      : details.firstName
                        ? details.firstName.charAt(0).toUpperCase()
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
                    {`${details.firstName || ''} ${details.lastName || ''}`.trim() || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUp10 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.age')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {details.age !== null && details.age !== undefined ? details.age : '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.gender')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {details.gender === 'male' ? t('athletes.profile.male') :
                      details.gender === 'female' ? t('athletes.profile.female') :
                        details.gender === 'prefer-not-to-say' ? t('athletes.profile.preferNotToSay') : '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.category')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {details.category === 'online'
                      ? t('athletes.profile.online')
                      : details.category === 'in-person'
                        ? t('athletes.profile.inPerson')
                        : details.category === 'hybrid'
                          ? t('athletes.profile.hybrid')
                          : details.category || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.country')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {details.country || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.phone')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium text-right">
                    {details.phone || '--'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('athletes.profile.email')}</span>
                  </div>
                  <div className="text-right">
                    {details.email ? (
                      <a
                        href={`mailto:${details.email}`}
                        className="text-xs text-primary underline hover:text-primary/80 font-medium"
                      >
                        {details.email}
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
            <Button onClick={handleSaveDetails} disabled={!hasChanges}>
              {t('general.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto px-1">
          <div className="w-full flex mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={details?.avatar} alt={`${details?.firstName} ${details?.lastName}`} />
              <AvatarFallback className="text-lg">
                {details?.firstName && details?.lastName
                  ? `${details.firstName.charAt(0).toUpperCase()}${details.lastName.charAt(0).toUpperCase()}`
                  : details?.firstName
                    ? details.firstName.charAt(0).toUpperCase()
                    : 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">
                <span>{t('athletes.profile.firstName')}<RequiredAsterisk /></span>
              </Label>
              <Input
                id="first-name"
                ref={firstNameInputRef}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder={t('athletes.profile.firstNamePlaceholder')}
                autoFocus={false}
                tabIndex={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">
                <span>{t('athletes.profile.lastName')}<RequiredAsterisk /></span>
              </Label>
              <Input
                id="last-name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder={t('athletes.profile.lastNamePlaceholder')}
                autoFocus={false}
                tabIndex={0}
              />
            </div>
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
            <Label htmlFor="age">
              <span>{t('athletes.profile.age')}<RequiredAsterisk /></span>
            </Label>
            <Input
              id="age"
              type="number"
              min="0"
              max="150"
              value={formData.age || ''}
              onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value, 10) : null })}
              placeholder={t('athletes.profile.agePlaceholder')}
              autoFocus={false}
              tabIndex={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                <span>{t('athletes.profile.category')}<RequiredAsterisk /></span>
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
                <span>{t('athletes.profile.gender')}<RequiredAsterisk /></span>
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
              placeholder={t('athletes.profile.countryPlaceholder')}
            />
          </div>
        </div>
      </SidePanel>
    </>
  );
};

