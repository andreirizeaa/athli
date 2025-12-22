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
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { useAccountSave } from '../context/account-save-context';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/general/utils';

const ProfilePage = () => {
  const t = useTranslations();
  const { user, supabaseUser } = useSupabaseAuth();
  const router = useRouter();
  const { setHasUnsavedChanges: setContextHasUnsavedChanges } = useUnsavedChanges();
  const { setOnSave, setIsSaving: setContextIsSaving } = useAccountSave();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Validation errors
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  // Saved state for comparison
  const [savedData, setSavedData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    profileImageUrl: user?.profileImageUrl || '',
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setProfileImageUrl(user.profileImageUrl || '');
      setSavedData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImageUrl: user.profileImageUrl || '',
      });
    }
  }, [user]);

  // Validate name fields
  const validateNames = () => {
    const firstNameValid = firstName.trim().length > 0;
    const lastNameValid = lastName.trim().length > 0;
    
    setFirstNameError(firstNameValid ? null : t('settings.profile.firstNameRequiredError'));
    setLastNameError(lastNameValid ? null : t('settings.profile.lastNameRequiredError'));
    
    return firstNameValid && lastNameValid;
  };

  // Check if there are unsaved changes
  useEffect(() => {
    const currentData = {
      firstName,
      lastName,
      profileImageUrl,
    };
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(savedData);
    setHasUnsavedChanges(hasChanges);
    setContextHasUnsavedChanges(hasChanges);
    
    // Clear errors when fields are valid
    if (firstName.trim().length > 0) {
      setFirstNameError(null);
    }
    if (lastName.trim().length > 0) {
      setLastNameError(null);
    }
  }, [firstName, lastName, profileImageUrl, savedData, setContextHasUnsavedChanges, t]);

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
  const firstNameRef = useRef(firstName);
  const lastNameRef = useRef(lastName);
  const profileImageUrlRef = useRef(profileImageUrl);

  // Update refs when values change
  useEffect(() => {
    firstNameRef.current = firstName;
    lastNameRef.current = lastName;
    profileImageUrlRef.current = profileImageUrl;
  }, [firstName, lastName, profileImageUrl]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.profile.imageFileRequired'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.profile.imageSizeError'));
      return;
    }

    setIsUploadingImage(true);

    try {
      const supabase = createClient();

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      setProfileImageUrl(publicUrl);
      toast.success(t('settings.profile.imageUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.imageUploadFailed'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = React.useCallback(async () => {
    if (!user?.id) return;

    // Validate names before saving
    if (!validateNames()) {
      const errors = [];
      if (firstName.trim().length === 0) {
        errors.push(t('settings.profile.firstNameRequiredError'));
      }
      if (lastName.trim().length === 0) {
        errors.push(t('settings.profile.lastNameRequiredError'));
      }
      toast.error(errors.join(', '));
      return;
    }

    setIsSaving(true);
    setContextIsSaving(true);
    try {
      const supabase = createClient();

      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstNameRef.current.trim(),
          last_name: lastNameRef.current.trim(),
          profile_image_url: profileImageUrlRef.current || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success(t('settings.profile.updatedSuccessfully'));

      setSavedData({
        firstName: firstNameRef.current.trim(),
        lastName: lastNameRef.current.trim(),
        profileImageUrl: profileImageUrlRef.current,
      });
      setHasUnsavedChanges(false);
      setContextHasUnsavedChanges(false);
      setFirstNameError(null);
      setLastNameError(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.updateFailed'));
    } finally {
      setIsSaving(false);
      setContextIsSaving(false);
    }
  }, [user, setContextHasUnsavedChanges, setContextIsSaving, router, t]);

  // Register save handler with layout
  useEffect(() => {
    setOnSave(handleSave);
    return () => setOnSave(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : 'User';

  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'U';

  return (
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
                <Label htmlFor="profileImageInput" className="text-sm">{t('settings.profile.profilePicture')}</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    {profileImageUrl && (
                      <AvatarImage src={profileImageUrl} alt={displayName} />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    id="profileImageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('settings.profile.uploading')}</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" /> {t('settings.profile.upload')}</>
                    )}
                  </Button>
                </div>
              </div>

              {/* First Name */}
              <div className="flex flex-col w-full pb-2 border-b pt-2 px-4">
                <div className="flex items-center justify-between">
                <Label htmlFor="firstName" className="text-sm">First Name</Label>
                  <div className="flex flex-col items-end">
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                      className={cn("w-64", firstNameError && "border-destructive")}
                  disabled={isSaving}
                />
                    {firstNameError && (
                      <span className="text-xs text-destructive mt-1">{firstNameError}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Name */}
              <div className="flex flex-col w-full pb-2 border-b pt-2 px-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lastName" className="text-sm">{t('settings.profile.lastName')}</Label>
                  <div className="flex flex-col items-end">
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                      className={cn("w-64", lastNameError && "border-destructive")}
                  disabled={isSaving}
                />
                    {lastNameError && (
                      <span className="text-xs text-destructive mt-1">{lastNameError}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2 px-4">
                <Button 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving || firstName.trim().length === 0 || lastName.trim().length === 0}
                >
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('settings.profile.saving')}</>
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
  );
};

export default ProfilePage;
