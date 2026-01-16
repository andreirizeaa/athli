'use client';

import { useState, useRef, useEffect } from 'react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { useAccountSave } from '../context/account-save-context';
import { toast } from 'sonner';
import { createClient } from '@/supabase/client';
import { PasswordConfirmationDialog } from './components/password-confirmation-dialog';
import { EmailChangeDialog } from './components/email-change-dialog';

const SecurityPage = () => {
  const t = useTranslations();
  const { user, updatePassword } = useSupabaseAuth();
  const { setHasUnsavedChanges: setContextHasUnsavedChanges } = useUnsavedChanges();
  const { setOnSave, setIsSaving: setContextIsSaving } = useAccountSave();

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSavedData, setPasswordSavedData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [hasPasswordChanges, setHasPasswordChanges] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Email form state
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  // Password confirmation state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Check if there are unsaved changes for password
  useEffect(() => {
    const currentData = {
      newPassword,
      confirmPassword,
    };
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(passwordSavedData);
    setHasPasswordChanges(hasChanges);
  }, [newPassword, confirmPassword, passwordSavedData]);

  // Update context with combined changes for navigation warnings
  useEffect(() => {
    setContextHasUnsavedChanges(hasPasswordChanges);
  }, [hasPasswordChanges, setContextHasUnsavedChanges]);

  // Handle browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPasswordChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPasswordChanges]);

  // Use refs to access current values without recreating the function
  const newPasswordRef = useRef(newPassword);
  const confirmPasswordRef = useRef(confirmPassword);

  // Update refs when values change
  useEffect(() => {
    newPasswordRef.current = newPassword;
    confirmPasswordRef.current = confirmPassword;
  }, [newPassword, confirmPassword]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return t('settings.security.passwordTooShort');
    if (!/[a-z]/.test(password)) return t('settings.security.passwordMissingLowercase');
    if (!/[A-Z]/.test(password)) return t('settings.security.passwordMissingUppercase');
    if (!/[0-9]/.test(password)) return t('settings.security.passwordMissingDigit');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return t('settings.security.passwordMissingSpecial');
    return null;
  };

  const handleVerifyCurrentPassword = async (currentPassword: string) => {
    if (!user?.email) {
      toast.error(t('settings.security.passwordConfirmation.verifyFailed'));
      return;
    }

    setIsVerifyingPassword(true);
    try {
      const supabase = createClient();
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        throw new Error('No active session');
      }

      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (error) {
        throw new Error(t('settings.security.currentPasswordIncorrect'));
      }

      // Restore original session
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token || '',
      });

      // Password verified, proceed with password update
      setIsPasswordDialogOpen(false);
      await executePasswordUpdate();
    } catch (error: any) {
      throw error; // Let the dialog handle the error display
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const executePasswordUpdate = async () => {
    setIsSavingPassword(true);
    try {
      await updatePassword(newPasswordRef.current);
      toast.success(t('settings.security.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSavedData({
        newPassword: '',
        confirmPassword: '',
      });
      setHasPasswordChanges(false);
    } catch (error: any) {
      toast.error(error.message || t('settings.security.passwordUpdateFailed'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCompleteEmailChange = async (currentPassword: string, newEmailValue: string) => {
    if (!user?.id || !user?.email) return;

    setIsSavingEmail(true);
    try {
      const supabase = createClient();

      // Update email - Supabase will send a confirmation link to the new address
      const { error: emailError } = await supabase.auth.updateUser(
        { email: newEmailValue },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=email_change`,
        }
      );
      if (emailError) throw emailError;

      // Show success message and close dialog
      toast.success('Please confirm your new email address via the link sent to your inbox');
      setIsEmailDialogOpen(false);

      // Log out the user and redirect to login page immediately
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error: any) {
      toast.error(error.message || t('settings.security.emailUpdateFailed'));
      throw error;
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSavePassword = React.useCallback(async () => {
    if (newPasswordRef.current !== confirmPasswordRef.current) {
      toast.error(t('settings.security.passwordsDoNotMatch'));
      return;
    }

    const passwordError = validatePassword(newPasswordRef.current);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    // Open password confirmation dialog
    setIsPasswordDialogOpen(true);
  }, [t]);

  const handleEditEmail = React.useCallback(() => {
    // Open the email change dialog
    setIsEmailDialogOpen(true);
  }, []);

  // Don't register save handler with layout - each card has its own save button
  useEffect(() => {
    setOnSave(undefined);
    return () => setOnSave(undefined);
  }, [setOnSave]);

  const isGoogleProvider = user?.signinMethod === 'google';
  const isEmailProvider = user?.signinMethod === 'email';

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-1 bg-background flex flex-col items-center gap-4">
        {/* Google Account Card */}
        {isGoogleProvider && (
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.security.googleAccount.title')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="space-y-0">
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.security.googleAccount.description')}
                  </p>
                </div>
                <div className="flex justify-end pt-2 px-4">
                  <Button
                    asChild
                  >
                    <a
                      href="https://myaccount.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('settings.security.googleAccount.manageAccount')}
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Password Card - Only show for email provider */}
        {isEmailProvider && (
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.security.password')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <form onSubmit={(e) => { e.preventDefault(); handleSavePassword(); }}>
                <div className="space-y-0">
                  {/* New Password */}
                  <div className="flex items-center justify-between w-full pb-2 border-b px-4">
                    <div>
                      <Label htmlFor="newPassword" className="text-sm block mb-1">{t('settings.security.newPassword')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.security.passwordRequirements')}
                      </p>
                    </div>
                    <div className="relative w-64">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSavingPassword}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={0}
                        role="button"
                        aria-label={showNewPassword ? t('settings.security.hidePasswordAria') : t('settings.security.showPasswordAria')}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex items-center justify-between w-full pb-2 border-b pt-2 px-4">
                    <Label htmlFor="confirmPassword" className="text-sm">{t('settings.security.confirmPassword')}</Label>
                    <div className="relative w-64">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSavingPassword}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={0}
                        role="button"
                        aria-label={showConfirmPassword ? t('settings.security.hidePasswordAria') : t('settings.security.showPasswordAria')}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2 px-4">
                    <Button
                      type="submit"
                      onClick={handleSavePassword}
                      disabled={!hasPasswordChanges || isSavingPassword}
                    >
                      {isSavingPassword ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {t('settings.profile.saving')}</>
                      ) : (
                        t('settings.profile.saveChanges')
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Email Card - Only show for email provider */}
        {isEmailProvider && (
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.security.email')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="space-y-0">
                {/* Email Address */}
                <div className="flex items-center justify-between w-full pb-2 border-b px-4">
                  <Label className="text-sm">{t('settings.security.emailAddress')}</Label>
                  <span className="text-sm text-muted-foreground">{user?.email || ''}</span>
                </div>

                {/* Edit Button */}
                <div className="flex justify-end pt-2 px-4">
                  <Button
                    onClick={handleEditEmail}
                    disabled={isSavingEmail}
                  >
                    {t('settings.security.editEmail')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Password Confirmation Dialog for Password Changes */}
      {user?.email && (
        <PasswordConfirmationDialog
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          email={user.email}
          onVerify={handleVerifyCurrentPassword}
          isVerifying={isVerifyingPassword}
        />
      )}

      {/* Email Change Dialog */}
      {user?.email && (
        <EmailChangeDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          currentEmail={user.email}
          onComplete={handleCompleteEmailChange}
          isProcessing={isSavingEmail}
        />
      )}
    </div>
  );
};

export default SecurityPage;
