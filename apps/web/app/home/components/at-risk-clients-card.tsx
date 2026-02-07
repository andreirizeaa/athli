'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TriangleAlert, Info, ChevronRight, Loader2 } from 'lucide-react';
import { useAtRiskClients, type AtRiskClient } from '@/hooks/use-at-risk-clients';

export const AtRiskClientsCard = () => {
  const t = useTranslations();
  const router = useRouter();
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const { atRiskClients, isFetching } = useAtRiskClients();

  const handleClientClick = useCallback((client: AtRiskClient) => {
    router.push(`/athletes/${client.id}/overview`);
  }, [router]);

  const formatLastActivity = (lastActivity: string | null): string => {
    if (!lastActivity) return t('home.atRiskClients.noActivity');

    const lastDate = new Date(lastActivity);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return t('home.atRiskClients.lastActivityOne');
    }
    return t('home.atRiskClients.lastActivityOther', { count: diffDays });
  };

  if (!isFetching && atRiskClients.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-background flex flex-col w-full">
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4" />
              <CardTitle>{t('home.atRiskClients.title')}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowInfoDialog(true)}
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px] flex-shrink-0" />
        <CardContent className="px-0 py-0 flex-1 overflow-y-auto">
          {isFetching ? (
            <div className="flex items-center justify-center px-4 py-4">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {atRiskClients.map((client) => (
                <React.Fragment key={client.id}>
                  <button
                    type="button"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left w-full"
                    onClick={() => handleClientClick(client)}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={client.avatarUrl || undefined} alt={client.name} />
                      <AvatarFallback className="text-xs">{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatLastActivity(client.lastActivity)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                  <Separator />
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('home.atRiskClients.infoDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('home.atRiskClients.infoDialogMessage')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
