'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Archive, Trash2 } from 'lucide-react';
import { archiveUser } from '@/api/coach/coach-client-service';
import { toast } from 'sonner';
import { mockAthletes } from '@/components/app/app-shell';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';

const AthleteSettingsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const athlete = mockAthletes.find((item) => item.id === clientId);
  const firstName = athlete?.name.split(' ')[0] || '';

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleArchive = async () => {
    if (!clientId) return;

    try {
      await archiveUser(clientId);
      setIsArchiveModalOpen(false);
      toast.success(t('athletes.profile.archivedSuccessfully'), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
      handleNavigateToAthletes();
    } catch (error) {
      toast.error(t('athletes.profile.failedToArchive'), {
        style: {
          background: 'rgb(254 242 242)',
          color: 'rgb(153 27 27)',
          border: '1px solid rgb(254 202 202)',
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!clientId) return;

    // TODO: Implement delete functionality
    console.log('Deleting client:', clientId);
    setIsDeleteModalOpen(false);
    toast.success(t('athletes.profile.settings.danger.deleteSuccess'), {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });
    handleNavigateToAthletes();
  };

  return (
    <div className="flex justify-center items-start px-4 pt-4 pb-2">
      <Card className="bg-background max-w-3xl w-full">
        <CardHeader className="px-4">
          <CardTitle>{t('athletes.profile.settings.danger.cardTitle')}</CardTitle>
        </CardHeader>
        <Separator className="w-full mt-[-8px] mb-[-4px]" />
        <div className="w-full">
          <div className="space-y-0">
            {/* Archive Client */}
            <div className="flex items-center justify-between pb-2 px-4 border-b -mt-0.5">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{t('athletes.profile.settings.danger.archiveTitle')}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('athletes.profile.settings.danger.archiveDescription')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsArchiveModalOpen(true)}
                className="ml-4 gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Archive className="h-4 w-4" />
                {t('athletes.profile.settings.danger.archiveButton')}
              </Button>
            </div>

            {/* Delete Client */}
            <div className="flex items-center justify-between pt-2 px-4">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-destructive">
                  {t('athletes.profile.settings.danger.deleteTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('athletes.profile.settings.danger.deleteDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="ml-4 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('athletes.profile.settings.danger.deleteButton')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Archive Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isArchiveModalOpen}
        onOpenChange={setIsArchiveModalOpen}
        onConfirm={handleArchive}
        title={t('athletes.profile.archiveConfirmTitle', { firstName })}
        description={t('athletes.profile.archiveDescription')}
        confirmText={t('athletes.profile.yes')}
        variant="default"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDelete}
        title={t('athletes.profile.settings.danger.deleteConfirmTitle', { firstName })}
        description={t('athletes.profile.settings.danger.deleteConfirmDescription')}
        confirmText={t('athletes.profile.settings.danger.deleteConfirmButton')}
        variant="destructive"
      />
    </div>
  );
};

export default AthleteSettingsPage;
