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
import { Upload, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { useAccountSave } from '../context/account-save-context';
import { toast } from 'sonner';
import { cn } from '@/lib/general/utils';
import { ProfilePictureDialog } from '@/components/profile/profile-picture-dialog';

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
                <div className="flex items-center justify-between w-full pb-2 border-b px-4">
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
                <div className="flex flex-col w-full pb-2 border-b pt-2 px-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="name" className="text-sm">Full Name</Label>
                    <div className="flex flex-col items-end">
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={cn("w-64", nameError && "border-destructive")}
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
                <div className="flex items-center justify-between w-full pb-2 border-b pt-2 px-4">
                  <Label className="text-sm">Email</Label>
                  <span className="text-sm text-muted-foreground w-64 text-right">
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
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
