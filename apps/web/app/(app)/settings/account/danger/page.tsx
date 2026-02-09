'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { toast } from 'sonner';
import { createClient } from '@/supabase/client';
import { authService } from '@/api/auth/auth-service';

const DangerPage = () => {
  const t = useTranslations();
  const { user, signOut } = useSupabaseAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeletingAccount(true);

    try {
      // Get Supabase access token
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Delete account via backend API
      await authService.deleteAccount(session.access_token);

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
                variant="default"
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
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          if (!isDeletingAccount) setIsDeleteModalOpen(open);
        }}
        onConfirm={handleDeleteAccount}
        title={t('settings.danger.deleteAccountConfirmTitle')}
        description={t('settings.danger.deleteAccountConfirmDescription')}
        confirmText={isDeletingAccount ? t('settings.danger.deleting') : t('settings.danger.deleteAccount')}
        variant="default"
      />
    </div>
  );
};

export default DangerPage;
