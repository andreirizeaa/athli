'use client';

import { useState, useRef, useEffect } from 'react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CountrySelect } from '@/components/ui/country-select';
import type { Country } from 'react-phone-number-input';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { Upload, Building2, Loader2 } from 'lucide-react';
import { type CoachCompanyInfo } from '@/api/settings/coach/coach-company-service';
import { useGlobalData } from '@/providers/global-data-provider';
import { useUnsavedChanges } from '@/app/(app)/settings/context/unsaved-changes-context';
import { useCompanySave } from '../context/company-save-context';
import { toast } from 'sonner';
import { ImageCropDialog } from '@/components/app/image-crop-dialog';

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
  const { setIsSaving: setContextIsSaving } = useCompanySave();
  const { company, updateCompany, uploadAndSetCompanyLogo, isUploadingLogo, isLoading } = useGlobalData();

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [location, setLocation] = useState<Country | undefined>(undefined);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [savedData, setSavedData] = useState<CoachCompanyInfo | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with company data when it loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.company_name || '');
      setWebsite(company.website || '');
      setLinkedin(company.linkedin || '');
      setLocation((company.location as Country) || undefined);
      setSpecialities(company.specialities || []);
      setLogoPreview(company.logo_url || null);

      setSavedData({
        company_name: company.company_name || '',
        website: company.website || '',
        linkedin: company.linkedin || '',
        location: company.location || '',
        specialities: company.specialities || [],
        logo_url: company.logo_url || undefined
      });
    } else if (!isLoading && !company) {
      // Handle case where no company exists yet (Create mode) - defaults are already set to empty
      setSavedData({
        company_name: '',
        website: '',
        linkedin: '',
        location: '',
        specialities: [],
      });
    }
  }, [company, isLoading]);

  const handleImageSave = async (file: File) => {
    try {
      const publicUrl = await uploadAndSetCompanyLogo(file);
      setLogoPreview(publicUrl);

      // Update savedData to include the new logo URL so it doesn't count as an unsaved change
      if (savedData) {
        setSavedData(prev => prev ? { ...prev, logo_url: publicUrl } : prev);
      }

      toast.success(t('settings.company.information.savedSuccessfully'));
    } catch (error) {
      console.error(error);
      toast.error(t('settings.company.information.saveFailed'));
    }
  };

  // Check if there are unsaved changes
  useEffect(() => {
    if (!savedData) return;

    const currentData: CoachCompanyInfo = {
      company_name: companyName,
      website: website,
      linkedin: linkedin,
      location: location || '',
      specialities: specialities,
      logo_url: logoPreview || undefined,
    };

    // We need to compare properties carefully because savedData might have more fields or nulls
    const isDifferent =
      currentData.company_name !== (savedData.company_name || '') ||
      currentData.website !== (savedData.website || '') ||
      currentData.linkedin !== (savedData.linkedin || '') ||
      (currentData.location || '') !== (savedData.location || '') ||
      (currentData.specialities.length !== (savedData.specialities || []).length ||
        currentData.specialities.some((s, i) => s !== (savedData.specialities || [])[i])) ||
      currentData.logo_url !== (savedData.logo_url || undefined);

    setHasUnsavedChanges(isDifferent);
    setContextHasUnsavedChanges(isDifferent);
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
  const locationRef = useRef<Country | undefined>(location);
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
      const data: CoachCompanyInfo = {
        company_name: companyNameRef.current,
        website: websiteRef.current,
        linkedin: linkedinRef.current,
        location: locationRef.current || '',
        specialities: specialitiesRef.current,
        logo_url: logoPreviewRef.current || undefined,
      };

      await updateCompany(data);

      setSavedData(data);
      setHasUnsavedChanges(false);
      setContextHasUnsavedChanges(false);
      toast.success(t('settings.company.information.savedSuccessfully'));
    } catch (error) {
      console.error(error);
      toast.error(t('settings.company.information.saveFailed'));
    } finally {
      setIsSaving(false);
      setContextIsSaving(false);
    }
  }, [setContextHasUnsavedChanges, setContextIsSaving, t, updateCompany]);

  return (
    <>
      <ImageCropDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleImageSave}
        title={t('settings.company.information.logoDialog.title')}
        description={t('settings.company.information.logoDialog.description')}
      />

      <div className="w-full h-full flex flex-col overflow-auto">
        <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.company.information.title')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="space-y-0">
                {/* Company Logo Row */}
                <div className="flex items-center justify-between w-full pb-2 border-b px-4">
                  <Label className="text-sm font-medium">
                    {t('settings.company.information.logo')}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      {logoPreview ? (
                        <AvatarImage src={logoPreview} alt={t('settings.company.information.logo')} />
                      ) : (
                        <AvatarFallback className="bg-muted">
                          <Building2 className="size-8 text-muted-foreground" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDialogOpen(true)}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('settings.profile.uploading')}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {t('settings.company.information.upload')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="px-4 pt-4 space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="companyName">
                      <span>
                        {t('settings.company.information.companyName')}
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
                    <CountrySelect
                      value={location}
                      onChange={setLocation}
                      placeholder={t('settings.company.information.locationPlaceholder')}
                    />
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

                {/* Save Button */}
                <div className="flex justify-end pt-4 px-4 pb-4">
                  <Button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('general.saving')}
                      </>
                    ) : (
                      t('general.save')
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default InformationPage;
