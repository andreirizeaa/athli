'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/general/utils';
import { availableLanguages, useLanguage } from '@/lib/providers/intl-provider';
import { useThemeConfig } from '@/components/app/active-theme';
import { THEMES, DEFAULT_THEME } from '@/lib/theme';
import { useGlobalData } from '@/providers/global-data-provider';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const CustomisationsPage = () => {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const { theme: themeConfig, setTheme: setThemeConfig } = useThemeConfig();
  const { locale, setLocale } = useLanguage();
  const { preferences, updatePreferences } = useGlobalData();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const [units, setUnits] = useState('metric');
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Ensure unsaved changes context is clear since this page is now auto-save
    setHasUnsavedChanges(false);
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Sync from global preferences on load
  useEffect(() => {
    if (preferences) {
      const savedUnits = preferences.units || 'metric';
      setUnits(savedUnits);
    }
  }, [preferences]);

  const persistPreferences = async (overrides: {
    theme?: string;
    language?: string;
    units?: string;
    colorPreset?: string;
  }) => {
    setIsSaving(true);

    // Calculate new values merging current state with overrides
    const newTheme = overrides.theme || theme || 'system';
    const newLanguage = overrides.language || locale;
    const newUnits = overrides.units || units;
    const newColorPreset = overrides.colorPreset || themeConfig.preset;

    try {
      await updatePreferences({
        theme: newTheme as 'light' | 'dark' | 'system',
        language: newLanguage,
        units: newUnits as 'metric' | 'imperial',
        color_preset: newColorPreset
      });
      // toast.success(t('settings.customisations.savedSuccessfully')); // Optional: might be too noisy
    } catch (error) {
      console.error(error);
      toast.error(t('settings.customisations.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    persistPreferences({ theme: value });
  };

  const handleLanguageChange = (value: string) => {
    setLocale(value);
    persistPreferences({ language: value });
  };

  const handleColorPresetChange = (value: string) => {
    setThemeConfig({ ...themeConfig, ...DEFAULT_THEME, preset: value as any });
    persistPreferences({ colorPreset: value });
  };

  const handleUnitsChange = (value: string) => {
    setUnits(value);
    persistPreferences({ units: value });
  };

  return (
    <>
      <div className="w-full relative bg-background">
        <div className="pl-4 pr-4 flex items-center justify-between h-[52px]">
          <h1 className="text-[22px] font-semibold">
            {t('settings.sections.customisations')}
          </h1>
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{t('general.saving')}</span>
              </div>
            )}
          </div>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex justify-center items-start">
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>{t('settings.customisations.preferences.title')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px] mb-[-4px]" />
          <div className="w-full">
            <div className="space-y-0">
              <div className="pb-2 px-4 border-b">
                <div className="space-y-1">
                  <label className="text-sm">
                    {t('settings.customisations.preferences.theme.label')}
                  </label>
                  <div className="flex justify-center items-center pt-2 w-full">
                    <RadioGroup
                      value={isMounted ? (theme || 'system') : 'system'}
                      onValueChange={handleThemeChange}
                      className="flex gap-6 justify-center"
                    >
                      <div className="flex flex-col">
                        <Label
                          htmlFor="theme-light"
                          className="flex flex-col cursor-pointer"
                        >
                          <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                          <div
                            className={cn(
                              'items-center rounded-lg border-2 p-1 transition-colors',
                              (isMounted ? (theme || 'system') : 'system') === 'light'
                                ? 'border-primary bg-white'
                                : 'border-border bg-white hover:border-accent'
                            )}
                          >
                            <div className="space-y-2 rounded-lg bg-[#ecedef] p-2">
                              <div className="space-y-2 rounded-md bg-white p-2 shadow-xs">
                                <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                              </div>
                              <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs">
                                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                              </div>
                              <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs">
                                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                              </div>
                            </div>
                          </div>
                          <span className="block w-full p-2 text-center font-normal">
                            {t('sidebar.theme.light')}
                          </span>
                        </Label>
                      </div>
                      <div className="flex flex-col">
                        <Label
                          htmlFor="theme-dark"
                          className="flex flex-col cursor-pointer"
                        >
                          <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                          <div
                            className={cn(
                              'items-center rounded-lg border-2 p-1 transition-colors',
                              (isMounted ? (theme || 'system') : 'system') === 'dark'
                                ? 'border-primary bg-white'
                                : 'border-border bg-white hover:border-accent'
                            )}
                          >
                            <div className="space-y-2 rounded-lg bg-slate-950 p-2">
                              <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-xs">
                                <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                              </div>
                              <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
                                <div className="h-4 w-4 rounded-full bg-slate-400" />
                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                              </div>
                              <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
                                <div className="h-4 w-4 rounded-full bg-slate-400" />
                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                              </div>
                            </div>
                          </div>
                          <span className="block w-full p-2 text-center font-normal">
                            {t('sidebar.theme.dark')}
                          </span>
                        </Label>
                      </div>
                      <div className="flex flex-col">
                        <Label
                          htmlFor="theme-system"
                          className="flex flex-col cursor-pointer"
                        >
                          <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                          <div
                            className={cn(
                              'items-center rounded-lg border-2 p-1 transition-colors',
                              (isMounted ? (theme || 'system') : 'system') === 'system'
                                ? 'border-primary bg-white'
                                : 'border-border bg-white hover:border-accent'
                            )}
                          >
                            <div className="space-y-2 rounded-lg bg-slate-950 p-2">
                              <div className="space-y-2 rounded-md bg-white p-2 shadow-xs">
                                <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                              </div>
                              <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
                                <div className="h-4 w-4 rounded-full bg-slate-400" />
                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                              </div>
                              <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
                                <div className="h-4 w-4 rounded-full bg-slate-400" />
                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                              </div>
                            </div>
                          </div>
                          <span className="block w-full p-2 text-center font-normal">
                            {t('sidebar.theme.system')}
                          </span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 pb-2 px-4 border-b items-center -mt-0.5">
                <label htmlFor="language" className="text-sm">
                  {t('settings.customisations.preferences.language.label')}
                </label>
                <Select value={locale} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language" className="w-[180px]">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>
                          {availableLanguages.find((lang) => lang.code === locale)?.flag || '🇬🇧'}
                        </span>
                        <span>
                          {availableLanguages.find((lang) => lang.code === locale)?.label || 'English'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="mr-2">{lang.flag}</span>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 px-4 border-b items-center">
                <label htmlFor="colorTheme" className="text-sm">
                  {t('settings.customisations.preferences.color.label')}
                </label>
                <Select
                  value={themeConfig.preset}
                  onValueChange={handleColorPresetChange}
                >
                  <SelectTrigger id="colorTheme" className="w-[180px]">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-4 rounded-full border border-border"
                          style={{
                            backgroundColor: THEMES.find((t) => t.value === themeConfig.preset)?.colors[0] || THEMES[0].colors[0],
                          }}
                        />
                        <span>
                          {THEMES.find((t) => t.value === themeConfig.preset)?.name || THEMES[0].name}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((themeOption) => (
                      <SelectItem key={themeOption.value} value={themeOption.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="size-4 rounded-full border border-border"
                            style={{
                              backgroundColor: themeOption.colors[0],
                            }}
                          />
                          <span>{themeOption.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-4 items-center">
                <label htmlFor="units" className="text-sm">
                  {t('settings.customisations.preferences.units.label')}
                </label>
                <Select value={units} onValueChange={handleUnitsChange}>
                  <SelectTrigger id="units" className="w-[180px]">
                    <SelectValue>
                      {units === 'metric'
                        ? t('settings.customisations.preferences.units.metric')
                        : t('settings.customisations.preferences.units.imperial')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">
                      {t('settings.customisations.preferences.units.metric')}
                    </SelectItem>
                    <SelectItem value="imperial">
                      {t('settings.customisations.preferences.units.imperial')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default CustomisationsPage;
