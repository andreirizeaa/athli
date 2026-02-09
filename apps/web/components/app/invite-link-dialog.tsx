'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import { getOrCreateInviteCode } from '@/api/coach/coach-invite-code-service';

interface InviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueCode: string;
}

export function copyToClipboard(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Ignore
    }
    document.body.removeChild(textArea);
  }
}

export const InviteLinkDialog = ({ open, onOpenChange, uniqueCode }: InviteLinkDialogProps) => {
  const t = useTranslations();
  const { onboardings } = useCoachOnboardings();
  const [step, setStep] = useState<'ask' | 'select'>('ask');
  const [selectedOnboardingId, setSelectedOnboardingId] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  const getInviteLink = (code: string) => {
    return `${window.location.origin}/invite/${code}`;
  };

  const handleCopyLink = async (onboardingId?: string) => {
    try {
      setIsCopying(true);
      let code = uniqueCode;
      if (onboardingId) {
        code = await getOrCreateInviteCode(onboardingId);
      }
      copyToClipboard(getInviteLink(code));
      toast.success(t('athletes.inviteDialog.linkCopied'));
      onOpenChange(false);
    } catch {
      toast.error('Failed to generate invite link');
    } finally {
      setIsCopying(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setStep('ask');
      setSelectedOnboardingId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('athletes.inviteDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'ask'
              ? t('athletes.inviteDialog.askDescription')
              : t('athletes.inviteDialog.copyDescription')}
          </DialogDescription>
        </DialogHeader>

        {step === 'ask' ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={() => handleCopyLink()} className="w-full">
              {t('athletes.inviteDialog.noJustCopy')}
            </Button>
            <Button onClick={() => setStep('select')} className="w-full">
              {t('athletes.inviteDialog.yesSelect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Select
              value={selectedOnboardingId}
              onValueChange={setSelectedOnboardingId}
            >
              <SelectTrigger clearable className="w-full">
                <SelectValue placeholder={t('athletes.inviteDialog.selectOnboarding')} />
              </SelectTrigger>
              <SelectContent>
                {onboardings.map((onboarding) => (
                  <SelectItem key={onboarding.id} value={onboarding.id} description={onboarding.description}>
                    {onboarding.name || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => handleCopyLink(selectedOnboardingId)} disabled={!selectedOnboardingId || isCopying} className="w-full gap-2">
              <Copy className="size-4" />
              {t('athletes.inviteDialog.copyLink')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
