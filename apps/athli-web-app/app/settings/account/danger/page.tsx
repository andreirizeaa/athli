'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const DangerPage = () => {
  const t = useTranslations();
  const { user, signOut } = useSupabaseAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeletingAccount(true);

    try {
      const supabase = createClient();

      // Delete user profile (cascade will handle related data)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      setIsDeleteModalOpen(false);
      // Sign out and redirect
      await signOut();
      toast.success(t('settings.danger.accountDeleted'));
    } catch (error: any) {
      toast.error(error.message || t('settings.danger.accountDeleteFailed'));
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex justify-center items-start px-4 pt-4 pb-2">
      <Card className="bg-background max-w-3xl w-full">
        <CardHeader className="px-4">
          <CardTitle>{t('settings.danger.dangerZone')}</CardTitle>
        </CardHeader>
        <Separator className="w-full mt-[-8px] mb-[-4px]" />
        <div className="w-full">
          <div className="space-y-0">
            {/* Delete Account */}
            <div className="flex items-center justify-between pt-2 px-4">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-destructive">
                  {t('settings.danger.deleteAccount')}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('settings.danger.deleteAccountDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="ml-4"
                disabled={isDeletingAccount}
              >
                {t('settings.danger.deleteAccount')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className="w-full max-w-[500px] sm:max-w-[500px] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left text-destructive">
                {t('settings.danger.deleteAccountConfirmTitle')}
              </DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={t('general.close')}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4">
            <p className="text-sm text-muted-foreground">
              {t('settings.danger.deleteAccountConfirmDescription')}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {t('settings.danger.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings.danger.deleting')}
                </>
              ) : (
                t('settings.danger.deleteAccount')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DangerPage;
