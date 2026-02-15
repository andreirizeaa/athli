'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { BookOpen, Check, CreditCard, Laptop, LogOut, Moon, Rocket, Settings, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/general/utils';
import { availableLanguages } from '@/lib/providers/intl-provider';
import { useThemeConfig } from '@/components/app/active-theme';
import { DEFAULT_THEME, THEMES } from '@/lib/theme';
import { useLogout } from '@/lib/providers/logout-provider';
import { useGlobalData } from '@/providers/global-data-provider';
import { useCoachChecklist } from '@/hooks/use-coach-checklist';

type UserMenuProps = {
  isThemeMounted: boolean;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export function UserMenu({
  isThemeMounted,
  currentLanguage,
  setCurrentLanguage,
}: UserMenuProps) {
  const t = useTranslations();
  const { triggerLogout } = useLogout();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const { theme: themeConfig, setTheme: setThemeConfig } = useThemeConfig();
  const { user: globalUser, preferences, updatePreferences } = useGlobalData();
  const { data: checklist } = useCoachChecklist();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);

  const isChecklistComplete = checklist
    ? checklist.client_app_demo &&
      checklist.coach_app_demo &&
      checklist.workout_ai &&
      checklist.program_templates &&
      checklist.custom_exercises &&
      checklist.automate_onboardings &&
      checklist.check_ins_forms &&
      checklist.powerful_flows &&
      checklist.lifestyle_habits &&
      checklist.track_metrics &&
      checklist.on_demand_resources
    : false;

  const displayName = globalUser
    ? globalUser.name || globalUser.email
    : 'User';
  const displayEmail = globalUser?.email;

  const [initials, setInitials] = React.useState('U');

  React.useEffect(() => {
    const calculatedInitials =
      displayName
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || 'U';
    setInitials(calculatedInitials);
  }, [displayName]);

  const currentTheme = theme || 'system';

  const syncPreferences = async (overrides: {
    theme?: string;
    language?: string;
    colorPreset?: string;
  }) => {
    // Calculate new values merging current state with overrides
    const newTheme = overrides.theme || theme || 'system';
    const newLanguage = overrides.language || currentLanguage;
    const newColorPreset = overrides.colorPreset || themeConfig.preset;
    const currentTerminology = preferences?.client_terminology || 'athlete';

    try {
      await updatePreferences({
        theme: newTheme as 'light' | 'dark' | 'system',
        language: newLanguage,
        color_preset: newColorPreset,
        client_terminology: currentTerminology as 'athlete' | 'client' | 'member'
      });
    } catch (error) {
      console.error('Failed to sync preferences:', error);
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    syncPreferences({ theme: value });
  };

  const handleLanguageChange = (value: string) => {
    setCurrentLanguage(value);
    syncPreferences({ language: value });
  };

  const handlePreset = (value: string) => {
    setThemeConfig({ ...themeConfig, ...DEFAULT_THEME, preset: value as any });
    syncPreferences({ colorPreset: value });
  };

  return (
    <DropdownMenu open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-md overflow-hidden hover:opacity-80 transition-opacity h-9 w-9 flex items-center justify-center"
          aria-label={t('sidebar.profile.openAccountMenuAria')}
        >
          <Avatar className="h-9 w-9 rounded-md">
            {globalUser?.profilePictureUrl && (
              <AvatarImage src={globalUser.profilePictureUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        collisionPadding={{ bottom: 8 }}
        className="w-64 rounded-2xl p-0"
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="h-10 w-10 rounded-md">
            {globalUser?.profilePictureUrl && (
              <AvatarImage src={globalUser.profilePictureUrl} alt={displayName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="text-foreground truncate text-sm font-medium">{displayName}</span>
            {displayEmail && (
              <span className="text-muted-foreground truncate text-xs">{displayEmail}</span>
            )}
          </div>
        </div>
        {/* Section: Appearance & Language */}
        <DropdownMenuSeparator className="my-0" />
        {isThemeMounted && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="px-3 py-2 rounded-t-none">
              {currentTheme === 'dark' ? (
                <Moon className="mr-2 size-4" />
              ) : currentTheme === 'light' ? (
                <Sun className="mr-2 size-4" />
              ) : (
                <Laptop className="mr-2 size-4" />
              )}
              <span className="flex-1">{t('sidebar.theme.label') || 'Theme'}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={currentTheme} onValueChange={handleThemeChange}>
                <DropdownMenuRadioItem
                  value="light"
                  className={cn(currentTheme === 'light' && 'bg-accent')}
                >
                  <Sun className="mr-2 size-4" />
                  <span className="flex-1">{t('sidebar.theme.light')}</span>
                  {currentTheme === 'light' && <Check className="ml-2 size-4" />}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="dark"
                  className={cn(currentTheme === 'dark' && 'bg-accent')}
                >
                  <Moon className="mr-2 size-4" />
                  <span className="flex-1">{t('sidebar.theme.dark')}</span>
                  {currentTheme === 'dark' && <Check className="ml-2 size-4" />}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="system"
                  className={cn(currentTheme === 'system' && 'bg-accent')}
                >
                  <Laptop className="mr-2 size-4" />
                  <span className="flex-1">{t('sidebar.theme.system')}</span>
                  {currentTheme === 'system' && <Check className="ml-2 size-4" />}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {isThemeMounted && (() => {
          const currentThemePreset =
            THEMES.find((t) => t.value === themeConfig.preset) || THEMES[0];
          return (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-3 py-2">
                <div className="flex shrink-0 items-center gap-1 mr-2 h-4">
                  {currentThemePreset.colors.map((color, key) => (
                    <span
                      key={key}
                      className="size-2 rounded-full ml-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="flex-1 ml-1.5">{currentThemePreset.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={themeConfig.preset}
                  onValueChange={(value) => handlePreset(value)}
                >
                  {THEMES.map((theme) => (
                    <DropdownMenuRadioItem
                      key={theme.name}
                      value={theme.value}
                      className={cn(themeConfig.preset === theme.value && 'bg-accent')}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex shrink-0 gap-1">
                          {theme.colors.map((color, key) => (
                            <span
                              key={key}
                              className="size-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="flex-1">{theme.name}</span>
                      </div>
                      {themeConfig.preset === theme.value && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })()}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="px-3 py-2 rounded-b-none">
            <span className="mr-2 text-lg leading-none">
              {availableLanguages.find((lang) => lang.code === currentLanguage)?.flag || '🇬🇧'}
            </span>
            <span className="flex-1">{t('sidebar.language.label') || 'Language'}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={currentLanguage} onValueChange={handleLanguageChange}>
              {availableLanguages.map((language) => (
                <DropdownMenuRadioItem
                  key={language.code}
                  value={language.code}
                  className={cn(currentLanguage === language.code && 'bg-accent')}
                >
                  <span className="mr-2 text-lg leading-none">{language.flag}</span>
                  <span className="flex-1">{language.label}</span>
                  {currentLanguage === language.code && <Check className="ml-2 size-4" />}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {/* Section: Get Started & Help */}
        <DropdownMenuSeparator className="my-0" />
        {isChecklistComplete && (
          <DropdownMenuItem className="cursor-pointer px-3 py-2 rounded-t-none" asChild>
            <Link href="/get-started">
              <Rocket className="mr-2 size-4" />
              <span>{t('sidebar.links.getStarted')}</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className={cn("cursor-pointer px-3 py-2", isChecklistComplete ? "" : "rounded-t-none", "rounded-b-none")}>
          <BookOpen className="mr-2 size-4" />
          <span>{t('sidebar.profile.helpArticles')}</span>
        </DropdownMenuItem>
        {/* Section: Billing & Settings */}
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem className="cursor-pointer px-3 py-2 rounded-t-none" asChild>
          <Link href="/settings/billing">
            <CreditCard className="mr-2 size-4" />
            <span>{t('sidebar.profile.billing') || 'Billing'}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer px-3 py-2 rounded-b-none" asChild>
          <Link href="/settings">
            <Settings className="mr-2 size-4" />
            <span>{t('sidebar.settings.label') || 'Settings'}</span>
          </Link>
        </DropdownMenuItem>
        {/* Section: Logout */}
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="cursor-pointer px-3 py-2 rounded-t-none"
          variant="destructive"
          onClick={triggerLogout}
        >
          <LogOut className="mr-2 size-4" />
          <span>{t('sidebar.profile.logOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

