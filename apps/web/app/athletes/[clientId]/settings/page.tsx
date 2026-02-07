'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Archive, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { useClientProfileContext } from '../client-profile-context';
import { EditClientDetailsSidePanel } from '../components/edit-client-details-side-panel';
import { TIMEZONE_OPTIONS } from '@athli/shared-types';

const AthleteSettingsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string; contactId: string }>();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;

  const { athlete, details } = useClientProfileContext();
  const clientName = details?.name || athlete?.name || '';

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

  const { deleteClient, archiveClient } = useCoachClients();

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleArchive = async () => {
    if (!clientId) return;

    try {
      await archiveClient(clientId);
      setIsArchiveModalOpen(false);
      toast.success(t('athletes.profile.archivedSuccessfully'));
      handleNavigateToAthletes();
    } catch (error) {
      toast.error(t('athletes.profile.failedToArchive'));
    }
  };

  const handleDelete = async () => {
    if (!clientId) return;

    try {
      await deleteClient(clientId);
      setIsDeleteModalOpen(false);
      toast.success(t('athletes.profile.settings.danger.deleteSuccess'));
      handleNavigateToAthletes();
    } catch (error) {
      toast.error(t('athletes.profile.settings.danger.deleteFailed'));
    }
  };

  const detailRows = [
    { label: t('athletes.profile.athleteName'), value: clientName },
    { label: t('athletes.profile.email'), value: details?.email || athlete?.email || '' },
    { label: t('athletes.profile.birthDate'), value: details?.birthDate ? format(new Date(details.birthDate), 'd MMM, yyyy') : '' },
    { label: t('athletes.profile.gender'), value: details?.gender ? t(`athletes.profile.${details.gender === 'prefer-not-to-say' ? 'preferNotToSay' : details.gender}`) : '' },
    { label: t('athletes.profile.category'), value: details?.category ? t(`athletes.profile.${details.category === 'in-person' ? 'inPerson' : details.category}`) : '' },
    { label: t('athletes.profile.phone'), value: details?.phone || '' },
    { label: t('athletes.profile.country'), value: details?.country || '' },
    { label: 'Timezone', value: details?.timezone ? (TIMEZONE_OPTIONS.find((tz) => tz.value === details.timezone)?.label || details.timezone) : '' },
  ];

  return (
    <div className="flex flex-col items-center px-4 pt-4 pb-2 gap-4">
      {/* Client Details Card */}
      <Card className="bg-background max-w-3xl w-full">
        <CardHeader className="px-4">
          <div className="flex items-center justify-between">
            <CardTitle>Client Details</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-2"
              onClick={() => setIsEditPanelOpen(true)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px]" />
        <div className="w-full">
          <div className="space-y-0">
            {detailRows.map((row, index) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-4 py-1.5 ${index === 0 ? '-mt-3' : ''} ${index === detailRows.length - 1 ? '-mb-3' : ''} ${index < detailRows.length - 1 ? 'border-b' : ''}`}
              >
                <Label className="text-sm">{row.label}</Label>
                <span className="text-sm text-muted-foreground text-right max-w-[60%] truncate">
                  {row.value || '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Danger Zone Card */}
      <Card className="bg-background max-w-3xl w-full">
        <CardHeader className="px-4">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.settings.danger.cardTitle')}</CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-2 invisible">
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>
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
                className="ml-4 gap-2"
              >
                <Archive className="h-4 w-4" />
                {t('athletes.profile.settings.danger.archiveButton')}
              </Button>
            </div>

            {/* Delete Client */}
            <div className="flex items-center justify-between pt-2 px-4">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-primary">
                  {t('athletes.profile.settings.danger.deleteTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('athletes.profile.settings.danger.deleteDescription')}
                </p>
              </div>
              <Button
                variant="default"
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

      {/* Edit Details Side Panel */}
      <EditClientDetailsSidePanel
        open={isEditPanelOpen}
        onOpenChange={setIsEditPanelOpen}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isArchiveModalOpen}
        onOpenChange={setIsArchiveModalOpen}
        onConfirm={handleArchive}
        title={`Archive ${clientName}`}
        description={t('athletes.profile.archiveDescription')}
        confirmText={t('athletes.profile.yes')}
        variant="default"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDelete}
        title={`Delete ${clientName}`}
        description={t('athletes.profile.settings.danger.deleteConfirmDescription')}
        confirmText={t('athletes.profile.settings.danger.deleteConfirmButton')}
        variant="default"
      />
    </div>
  );
};

export default AthleteSettingsPage;
