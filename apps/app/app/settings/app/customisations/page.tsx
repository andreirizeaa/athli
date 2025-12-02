'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { availableLanguages } from '@/lib/intl-provider';

const CustomisationsPage = () => {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState('en');
  const [units, setUnits] = useState('metric');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <div className="w-full relative bg-background">
        <div className="pl-4 pr-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">
            {t('settings.sections.customisations')}
          </h1>
          <Button className="mb-2 mt-2 invisible" aria-hidden="true">
            {t('general.save')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-secondary flex justify-center items-start">
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>{t('settings.customisations.preferences.title')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px] mb-[-4px]" />
          <div className="w-full">
            <div className="space-y-0">
              <div className="grid grid-cols-[1fr_auto] gap-4 pb-2 px-4 border-b items-center -mt-0.5">
                <label htmlFor="language" className="text-sm">
                  {t('settings.customisations.preferences.language.label')}
                </label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language" className="w-[180px]">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>
                          {availableLanguages.find((lang) => lang.code === language)?.flag || '🇬🇧'}
                        </span>
                        <span>
                          {availableLanguages.find((lang) => lang.code === language)?.label || 'English'}
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
                <label htmlFor="theme" className="text-sm">
                  {t('settings.customisations.preferences.theme.label')}
                </label>
                <Select value={isMounted ? (theme || 'system') : 'system'} onValueChange={(value) => setTheme(value)}>
                  <SelectTrigger id="theme" className="w-[180px]">
                    <SelectValue>
                      {isMounted ? (
                        <div className="flex items-center gap-2">
                          {theme === 'light' ? (
                            <Sun className="size-4" />
                          ) : theme === 'dark' ? (
                            <Moon className="size-4" />
                          ) : (
                            <Laptop className="size-4" />
                          )}
                          <span>
                            {theme === 'light'
                              ? t('sidebar.theme.light')
                              : theme === 'dark'
                                ? t('sidebar.theme.dark')
                                : t('sidebar.theme.system')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Laptop className="size-4" />
                          <span>{t('sidebar.theme.system')}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="size-4" />
                        <span>{t('sidebar.theme.light')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="size-4" />
                        <span>{t('sidebar.theme.dark')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Laptop className="size-4" />
                        <span>{t('sidebar.theme.system')}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-4 items-center">
                <label htmlFor="units" className="text-sm">
                  {t('settings.customisations.preferences.units.label')}
                </label>
                <Select value={units} onValueChange={setUnits}>
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


