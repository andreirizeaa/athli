'use client';

import { useState, useRef, useEffect } from 'react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Upload, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUnsavedChanges } from '@/app/(app)/settings/context/unsaved-changes-context';
import { useAccountSave } from '../context/account-save-context';
import { toast } from 'sonner';
import { cn } from '@/lib/general/utils';
import { ProfilePictureDialog } from '@/components/profile/profile-picture-dialog';
import { TIMEZONE_GROUPS, TIMEZONE_OPTIONS } from '@athli/shared-types';

const TimezoneCard = () => {
  const { user, updateProfile, isUpdating } = useUserProfile();
  const [timezone, setTimezone] = useState(user?.timezone || '');
  const [savedTimezone, setSavedTimezone] = useState(user?.timezone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setTimezone(user.timezone || '');
      setSavedTimezone(user.timezone || '');
    }
  }, [user]);

  const hasChanges = timezone !== savedTimezone;

  const selectedLabel = TIMEZONE_OPTIONS.find((tz) => tz.value === timezone)?.label;

  const handleSaveTimezone = async () => {
    if (!timezone) return;
    setIsSaving(true);
    try {
      await updateProfile({ timezone });
      setSavedTimezone(timezone);
      toast.success('Timezone updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update timezone');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-background max-w-3xl w-full">
      <CardHeader className="px-4">
        <CardTitle>Timezone</CardTitle>
      </CardHeader>
      <Separator className="w-full mt-[-8px]" />
      <CardContent className="px-0">
        <div className="space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pb-2 border-b px-4 -mt-1 gap-2">
            <Label className="text-sm">Timezone</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full sm:w-64 justify-between font-normal"
                  disabled={isSaving}
                >
                  <span className="truncate">
                    {selectedLabel || 'Select timezone...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search timezone..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    {TIMEZONE_GROUPS.map((group) => (
                      <CommandGroup key={group.label} heading={group.label}>
                        {group.options.map((tz) => (
                          <CommandItem
                            key={tz.value}
                            value={tz.label}
                            onSelect={() => {
                              setTimezone(tz.value);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                timezone === tz.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {tz.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end pt-2 px-4">
            <Button
              onClick={handleSaveTimezone}
              disabled={!hasChanges || isSaving || isUpdating}
            >
              {(isSaving || isUpdating) ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProfilePage = () => {
  const t = useTranslations();
  const { user, isUpdating, isUploadingImage, updateProfile, uploadAndSetProfilePicture } = useUserProfile();
  const router = useRouter();
  const { setHasUnsavedChanges: setContextHasUnsavedChanges } = useUnsavedChanges();
  const { setOnSave, setIsSaving: setContextIsSaving } = useAccountSave();

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePictureUrl || '');

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);

  // Saved state for comparison
  const [savedData, setSavedData] = useState({
    name: user?.name || '',
    profilePictureUrl: user?.profilePictureUrl || '',
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setProfilePictureUrl(user.profilePictureUrl || '');
      setSavedData({
        name: user.name || '',
        profilePictureUrl: user.profilePictureUrl || '',
      });
    }
  }, [user]);

  // Validate name field
  const validateName = () => {
    const nameValid = name.trim().length > 0;
    setNameError(nameValid ? null : 'Name is required');
    return nameValid;
  };

  // Check if there are unsaved changes
  useEffect(() => {
    const hasChanges = name !== savedData.name || profilePictureUrl !== savedData.profilePictureUrl;
    setHasUnsavedChanges(hasChanges);
    setContextHasUnsavedChanges(hasChanges);

    // Clear errors when field is valid
    if (name.trim().length > 0) {
      setNameError(null);
    }
  }, [name, profilePictureUrl, savedData, setContextHasUnsavedChanges]);

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
  const nameRef = useRef(name);
  const profilePictureUrlRef = useRef(profilePictureUrl);

  // Update refs when values change
  useEffect(() => {
    nameRef.current = name;
    profilePictureUrlRef.current = profilePictureUrl;
  }, [name, profilePictureUrl]);

  const handleImageSave = async (file: File) => {
    const publicUrl = await uploadAndSetProfilePicture(file);
    setProfilePictureUrl(publicUrl);
    setSavedData(prev => ({ ...prev, profilePictureUrl: publicUrl }));
    toast.success('Profile picture updated successfully');
  };

  const handleSave = React.useCallback(async () => {
    if (!user?.id) return;

    // Validate name before saving
    if (!validateName()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    setContextIsSaving(true);
    try {
      // Update profile via backend API
      await updateProfile({
        name: nameRef.current.trim(),
      });

      toast.success('Profile updated successfully');

      setSavedData({
        name: nameRef.current.trim(),
        profilePictureUrl: profilePictureUrlRef.current,
      });
      setHasUnsavedChanges(false);
      setContextHasUnsavedChanges(false);
      setNameError(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
      setContextIsSaving(false);
    }
  }, [user, updateProfile, setContextHasUnsavedChanges, setContextIsSaving, router]);

  // Register save handler with layout
  useEffect(() => {
    setOnSave(handleSave);
    return () => setOnSave(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = user?.name || user?.email || 'User';

  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'U';

  return (
    <>
      <ProfilePictureDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleImageSave}
      />

      <div className="w-full h-full flex flex-col overflow-auto">
        <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-1 bg-background flex flex-col items-center gap-4">
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.profile.profileInformation')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="space-y-0">
                {/* Profile Image */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pb-2 border-b px-4 gap-3">
                  <Label className="text-sm">{t('settings.profile.profilePicture')}</Label>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      {profilePictureUrl && (
                        <AvatarImage src={profilePictureUrl} alt={displayName} />
                      )}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDialogOpen(true)}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {t('settings.profile.uploading')}</>
                      ) : (
                        <><Upload className="mr-2 h-4 w-4" /> {t('settings.profile.upload')}</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="flex flex-col w-full pb-2 border-b pt-2 px-4 gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Label htmlFor="name" className="text-sm">Full Name</Label>
                    <div className="flex flex-col sm:items-end w-full sm:w-auto">
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={cn("w-full sm:w-64", nameError && "border-destructive")}
                        disabled={isSaving}
                        placeholder="Enter your full name"
                      />
                      {nameError && (
                        <span className="text-xs text-destructive mt-1">{nameError}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pb-2 border-b pt-2 px-4 gap-1">
                  <Label className="text-sm">Email</Label>
                  <span className="text-sm text-muted-foreground sm:w-64 sm:text-right break-all">
                    {user?.email || ''}
                  </span>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2 px-4">
                  <Button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isSaving || isUpdating || name.trim().length === 0}
                  >
                    {(isSaving || isUpdating) ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t('settings.profile.saving')}</>
                    ) : (
                      t('settings.profile.saveChanges')
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <TimezoneCard />
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
