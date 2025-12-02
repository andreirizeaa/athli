'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import { Edit } from 'lucide-react';
import { getAthleteBio, saveAthleteBio } from '@/lib/athletes/athlete-service';

type ClientBioCardProps = {
  clientId: string;
};

export const ClientBioCard = ({ clientId }: ClientBioCardProps) => {
  const t = useTranslations();
  const [bio, setBio] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditBioOpen, setIsEditBioOpen] = useState(false);
  const [editingBio, setEditingBio] = useState('');
  const [hasBioChanges, setHasBioChanges] = useState(false);
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchBio = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const fetchedBio = await getAthleteBio(clientId);
        setBio(fetchedBio);
        setEditingBio(fetchedBio);
      } catch (error) {
        console.error('Failed to fetch bio:', error);
        setBio('');
        setEditingBio('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBio();
  }, [clientId]);

  useEffect(() => {
    if (isEditBioOpen && bioTextareaRef.current) {
      setTimeout(() => {
        bioTextareaRef.current?.focus();
      }, 100);
    }
  }, [isEditBioOpen]);

  useEffect(() => {
    setHasBioChanges(editingBio !== bio);
  }, [editingBio, bio]);

  const handleSaveBio = async () => {
    if (!clientId) return;

    try {
      await saveAthleteBio(clientId, editingBio);
      setBio(editingBio);
      setHasBioChanges(false);
      setIsEditBioOpen(false);
    } catch (error) {
      console.error('Failed to save bio:', error);
    }
  };

  const handleCancelBioEdit = () => {
    setEditingBio(bio);
    setHasBioChanges(false);
    setIsEditBioOpen(false);
  };

  const handleEditBio = () => {
    setEditingBio(bio);
    setHasBioChanges(false);
    setIsEditBioOpen(true);
  };

  return (
    <>
      <Card className="bg-background flex flex-col" style={{ width: '50vw', minWidth: '50vw', maxWidth: '50vw', height: '20vh', minHeight: '20vh', maxHeight: '20vh' }}>
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.athleteBio')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditBio}
              className="h-7 text-xs gap-2"
              aria-label={t('general.edit')}
            >
              <Edit className="h-3 w-3" />
              {t('general.edit')}
            </Button>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px] flex-shrink-0" />
        <CardContent
          className="px-4 py-0 flex-1 mt-[-12px] -mb-[12px] flex items-center justify-center overflow-y-auto cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={handleEditBio}
          role="button"
          tabIndex={0}
          aria-label={t('athletes.profile.editBio')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEditBio();
            }
          }}
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('general.loading')}</p>
          ) : bio ? (
            <p className="text-sm text-foreground">{bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('athletes.profile.noBio')}</p>
          )}
        </CardContent>
        <Separator className="w-full" />
      </Card>

      <SidePanel
        open={isEditBioOpen}
        onOpenChange={setIsEditBioOpen}
        title={t('athletes.profile.editBio')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button onClick={handleSaveBio} disabled={!hasBioChanges}>
              {t('general.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelBioEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <Textarea
              ref={bioTextareaRef}
              value={editingBio}
              onChange={(e) => setEditingBio(e.target.value)}
              placeholder={t('athletes.profile.bioPlaceholder')}
              className="flex-1 resize-none"
              autoFocus={false}
              tabIndex={0}
            />
          </div>
        </div>
      </SidePanel>
    </>
  );
};

