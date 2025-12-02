'use client';

import { useState, useRef, useEffect } from 'react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { Upload, Trash2, Building2 } from 'lucide-react';
import { updateCompanyDetails, type CompanyDetails } from '@/lib/settings-service';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { useCompanySave } from '../context/company-save-context';
import { toast } from 'sonner';

const countries = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Portugal',
  'Ireland',
  'Greece',
  'Czech Republic',
  'Romania',
  'Hungary',
  'New Zealand',
  'South Africa',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'Japan',
  'South Korea',
  'China',
  'India',
  'Singapore',
  'Hong Kong',
  'United Arab Emirates',
  'Saudi Arabia',
  'Israel',
  'Turkey',
  'Russia',
];

const specialityOptions: Option[] = [
  { label: 'Physiotherapy', value: 'physiotherapy' },
  { label: 'Personal Training', value: 'personal-training' },
  { label: 'Strength', value: 'strength' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Yoga', value: 'yoga' },
  { label: 'Pilates', value: 'pilates' },
  { label: 'CrossFit', value: 'crossfit' },
  { label: 'Weightlifting', value: 'weightlifting' },
  { label: 'Powerlifting', value: 'powerlifting' },
  { label: 'Bodybuilding', value: 'bodybuilding' },
  { label: 'Functional Training', value: 'functional-training' },
  { label: 'Sports Performance', value: 'sports-performance' },
  { label: 'Rehabilitation', value: 'rehabilitation' },
  { label: 'Injury Prevention', value: 'injury-prevention' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Wellness Coaching', value: 'wellness-coaching' },
  { label: 'Group Fitness', value: 'group-fitness' },
  { label: 'Senior Fitness', value: 'senior-fitness' },
  { label: 'Youth Training', value: 'youth-training' },
  { label: 'Athletic Development', value: 'athletic-development' },
  { label: 'Corrective Exercise', value: 'corrective-exercise' },
  { label: 'Flexibility', value: 'flexibility' },
  { label: 'Endurance Training', value: 'endurance-training' },
  { label: 'Speed & Agility', value: 'speed-agility' },
];

const InformationPage = () => {
  const t = useTranslations();
  const { setHasUnsavedChanges: setContextHasUnsavedChanges } = useUnsavedChanges();
  const { setOnSave, setIsSaving: setContextIsSaving } = useCompanySave();
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [location, setLocation] = useState('');
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savedData, setSavedData] = useState<CompanyDetails>({
    companyName: '',
    website: '',
    linkedin: '',
    location: '',
    specialities: [],
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleUploadClick();
    }
  };

  const handleDeleteClick = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDeleteClick();
    }
  };

  // Check if there are unsaved changes
  useEffect(() => {
    const currentData: CompanyDetails = {
      companyName,
      website,
      linkedin,
      location,
      specialities,
      logo: logoPreview || undefined,
    };
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(savedData);
    setHasUnsavedChanges(hasChanges);
    setContextHasUnsavedChanges(hasChanges);
  }, [companyName, website, linkedin, location, specialities, logoPreview, savedData, setContextHasUnsavedChanges]);

  // Handle browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Use refs to access current values without recreating the function
  const companyNameRef = useRef(companyName);
  const websiteRef = useRef(website);
  const linkedinRef = useRef(linkedin);
  const locationRef = useRef(location);
  const specialitiesRef = useRef(specialities);
  const logoPreviewRef = useRef(logoPreview);

  // Update refs when values change
  useEffect(() => {
    companyNameRef.current = companyName;
    websiteRef.current = website;
    linkedinRef.current = linkedin;
    locationRef.current = location;
    specialitiesRef.current = specialities;
    logoPreviewRef.current = logoPreview;
  }, [companyName, website, linkedin, location, specialities, logoPreview]);

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);
    setContextIsSaving(true);
    try {
      const data: CompanyDetails = {
        companyName: companyNameRef.current,
        website: websiteRef.current,
        linkedin: linkedinRef.current,
        location: locationRef.current,
        specialities: specialitiesRef.current,
        logo: logoPreviewRef.current || undefined,
      };
      await updateCompanyDetails(data);
      setSavedData(data);
      setHasUnsavedChanges(false);
      setContextHasUnsavedChanges(false);
      toast.success(t('settings.company.information.savedSuccessfully'));
    } catch (error) {
      toast.error(t('settings.company.information.saveFailed'));
    } finally {
      setIsSaving(false);
      setContextIsSaving(false);
    }
  }, [setContextHasUnsavedChanges, setContextIsSaving, t]);

  // Register save handler with layout - only once
  useEffect(() => {
    setOnSave(handleSave);
    return () => setOnSave(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only register once on mount

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-secondary flex flex-col items-center gap-4">
        <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.company.information.title')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="px-4 pt-6 pb-4">
                <div className="flex flex-col gap-2 mb-6">
                  <Label className="text-sm font-medium">
                    {t('settings.company.information.logo')}
                  </Label>
                  <div className="flex items-start gap-4">
                    <Avatar className="size-20">
                      {logoPreview ? (
                        <AvatarImage src={logoPreview} alt={t('settings.company.information.logo')} />
                      ) : (
                        <AvatarFallback className="bg-muted">
                          <Building2 className="size-10 text-muted-foreground" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUploadClick}
                        onKeyDown={handleUploadKeyDown}
                        tabIndex={0}
                        role="button"
                        aria-label={t('settings.company.information.uploadAria')}
                        className="h-7 px-2 text-xs"
                      >
                        <Upload className="size-3 mr-1.5" />
                        {t('settings.company.information.upload')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteClick}
                        onKeyDown={handleDeleteKeyDown}
                        tabIndex={0}
                        role="button"
                        aria-label={t('settings.company.information.deleteAria')}
                        className="h-7 px-2 text-xs"
                        disabled={!logoPreview}
                      >
                        <Trash2 className="size-3 mr-1.5" />
                        {t('settings.company.information.delete')}
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      aria-label={t('settings.company.information.uploadAria')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="companyName">
                      <span>
                        {t('settings.company.information.companyName')}
                        <RequiredAsterisk />
                      </span>
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t('settings.company.information.companyNamePlaceholder')}
                      className="w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="website">{t('settings.company.information.website')}</Label>
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder={t('settings.company.information.websitePlaceholder')}
                      className="w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="linkedin">{t('settings.company.information.linkedin')}</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder={t('settings.company.information.linkedinPlaceholder')}
                      className="w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="location">{t('settings.company.information.location')}</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger id="location" className="w-full">
                        <SelectValue placeholder={t('settings.company.information.locationPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="specialities">{t('settings.company.information.specialities')}</Label>
                    <MultiAsyncSelect
                      options={specialityOptions}
                      value={specialities}
                      onValueChange={setSpecialities}
                      placeholder={t('settings.company.information.specialitiesPlaceholder')}
                      searchPlaceholder={t('settings.company.information.specialitiesSearchPlaceholder')}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default InformationPage;
