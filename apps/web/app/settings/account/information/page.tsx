'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Copy, Check } from 'lucide-react';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { toast } from 'sonner';

const InformationPage = () => {
  const t = useTranslations();
  const { user, supabaseUser } = useSupabaseAuth();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyAccountId = async () => {
    if (!user?.id) return;

    try {
      await navigator.clipboard.writeText(user.id);
      setIsCopied(true);
      toast.success(t('settings.information.accountIdCopied'));
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = user.id;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        toast.success(t('settings.information.accountIdCopied'));
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        toast.error(t('settings.information.copyFailed'));
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopyAccountId();
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-1 bg-background flex flex-col items-center gap-4">
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>{t('settings.information.accountInformation')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          <CardContent className="px-0">
            <div className="space-y-0">
              <div className="flex items-center justify-between w-full pb-2 border-b px-4">
                <Label className="text-sm">{t('settings.information.accountId')}</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{user?.id}</p>
                  <button
                    type="button"
                    onClick={handleCopyAccountId}
                    onKeyDown={handleCopyKeyDown}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={0}
                    role="button"
                    aria-label={t('settings.information.copyAccountIdAria')}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between w-full pb-2 border-b pt-2 px-4">
                <Label className="text-sm">{t('settings.information.email')}</Label>
                <p className="text-sm">{user?.email}</p>
              </div>

              <div className="flex items-center justify-between w-full pb-2 border-b pt-2 px-4">
                <Label className="text-sm">{t('settings.information.provider')}</Label>
                {user?.signinMethod === 'google' ? (
                  <Image
                    src="/icons/google.png"
                    alt="Google"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                ) : (
                  <p className="text-sm">{t('settings.information.providerEmail')}</p>
                )}
              </div>

              <div className="flex items-center justify-between w-full pb-2 border-b pt-2 px-4">
                <Label className="text-sm">{t('settings.information.emailVerified')}</Label>
                <p className="text-sm">{supabaseUser?.email_confirmed_at ? t('settings.information.yes') : t('settings.information.no')}</p>
              </div>

              {supabaseUser?.created_at && (
                <div className="flex items-center justify-between w-full pb-2 pt-2 px-4">
                  <Label className="text-sm">{t('settings.information.accountCreated')}</Label>
                  <p className="text-sm">
                    {new Date(supabaseUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InformationPage;
