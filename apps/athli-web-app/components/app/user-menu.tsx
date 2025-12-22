'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Laptop, LogOut, Moon, Settings, Sun } from 'lucide-react';
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
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';

type UserMenuProps = {
  isThemeMounted: boolean;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
  setIsLoggingOut: (value: boolean) => void;
};

export function UserMenu({
  isThemeMounted,
  currentLanguage,
  setCurrentLanguage,
  setIsLoggingOut,
}: UserMenuProps) {
  const t = useTranslations();
  const { user, signOut } = useSupabaseAuth();
  const router = useRouter();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const { theme: themeConfig, setTheme: setThemeConfig } = useThemeConfig();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : 'User';
  const displayEmail = user?.email;

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

  const handlePreset = (value: string) => {
    setThemeConfig({ ...themeConfig, ...DEFAULT_THEME, preset: value as any });
  };

  return (
    <DropdownMenu open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-sm overflow-hidden hover:opacity-80 transition-opacity"
          aria-label={t('sidebar.profile.openAccountMenuAria')}
        >
          <Avatar className="h-8 w-8 rounded-md">
            {user?.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} alt={displayName} />
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
            {user?.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} alt={displayName} />
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
              <DropdownMenuRadioGroup value={currentTheme} onValueChange={(value) => setTheme(value)}>
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
          <DropdownMenuSubTrigger className="px-3 py-2">
            <span className="mr-2 text-lg leading-none">
              {availableLanguages.find((lang) => lang.code === currentLanguage)?.flag || '🇬🇧'}
            </span>
            <span className="flex-1">{t('sidebar.language.label') || 'Language'}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={currentLanguage} onValueChange={setCurrentLanguage}>
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
        <DropdownMenuItem className="cursor-pointer px-3 py-2 rounded-b-none" asChild>
          <Link href="/settings">
            <Settings className="mr-2 size-4" />
            <span>{t('sidebar.settings.label') || 'Settings'}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="cursor-pointer px-3 py-2 rounded-t-none"
          variant="destructive"
          onClick={async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              setIsLoggingOut(false);
            }
          }}
        >
          <LogOut className="mr-2 size-4" />
          <span>{t('sidebar.profile.logOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

