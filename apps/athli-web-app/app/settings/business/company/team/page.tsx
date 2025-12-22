'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserPlus } from 'lucide-react';

type Role = 'admin' | 'non-admin';

const TeamPage = () => {
  const t = useTranslations();
  const { user } = useSupabaseAuth();
  const [role, setRole] = useState<Role>('admin');

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
    : 'User';

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0].toUpperCase() || 'U'
    : 'U';

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t('settings.company.team.title')}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="px-4 pb-2 pt-6">
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {t('settings.company.team.teamMember')}
                  </div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {t('settings.company.team.role')}
                  </div>
                </div>
              </div>
              <Separator className="w-full" />
              <div className="w-full">
                <div className="space-y-0">
                  <div className="border-b">
                    <div className="grid grid-cols-[1fr_auto] gap-4 py-4 px-4 items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{displayName}</span>
                        </div>
                      </div>
                      <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t('settings.company.team.admin')}</SelectItem>
                          <SelectItem value="non-admin">{t('settings.company.team.nonAdmin')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4 pt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-fit">
                      <UserPlus className="size-4 mr-2" />
                      {t('settings.company.team.addTeamMember')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto">
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t('sidebar.footer.comingSoon')}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default TeamPage;
