'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { SidePanel } from '@/components/app/side-panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/general/utils';

type AddAthleteFormValues = {
  fullName: string;
  email: string;
  coachingType: 'online' | 'in-person' | 'hybrid';
  onboardingId: string;
};

interface AddClientSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { addClient } from '@/api/coach/coach-client-service';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';

export const AddClientSidePanel = ({ open, onOpenChange }: AddClientSidePanelProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const addAthleteSchema = z.object({
    fullName: z.string().min(1, t('athletes.addClient.fullNameRequiredError')),
    email: z.string().email(t('athletes.addClient.emailInvalidError')),
    coachingType: z.union([z.literal('online'), z.literal('in-person'), z.literal('hybrid')]),
    onboardingId: z.string().optional(),
  });
  const form = useForm<AddAthleteFormValues>({
    resolver: zodResolver(addAthleteSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      coachingType: 'online',
      onboardingId: '',
    },
  });
  const { onboardings } = useCoachOnboardings();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitInvitation = async (values: AddAthleteFormValues) => {
    setIsSubmitting(true);
    try {
      await addClient(values);
      // Invalidate the coach-clients query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
      onOpenChange(false);
      form.reset();
      toast.success(t('athletes.addClient.invitationSent'), {
        description: t('athletes.addClient.invitationSentDescription', {
          fullName: values.fullName,
          email: values.email,
        }),
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
    } catch (error) {
      toast.error(t('general.error'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('athletes.addClient.title')}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            aria-label={t('athletes.addClient.cancelAria')}
          >
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmitInvitation)}
            disabled={!form.formState.isValid || isSubmitting}
            aria-label={t('athletes.addClient.sendInvitationAria')}
            className="gap-2"
          >
            {isSubmitting ? <Spinner className="size-4" /> : null}
            {t('athletes.addClient.sendInvitation')}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(handleSubmitInvitation)(e);
          }}
          className="flex flex-col gap-6"
        >
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('athletes.addClient.fullName')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('athletes.addClient.fullNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('athletes.addClient.email')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('athletes.addClient.emailPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="coachingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('athletes.addClient.coachingType')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Tabs
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value as 'online' | 'in-person' | 'hybrid');
                    }}
                    className="w-full"
                  >
                    <TabsList className="w-full">
                      <TabsTrigger
                        value="online"
                        className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        aria-label={t('athletes.addClient.onlineAria')}
                      >
                        {t('athletes.addClient.online')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="in-person"
                        className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        aria-label={t('athletes.addClient.inPersonAria')}
                      >
                        {t('athletes.addClient.inPerson')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="hybrid"
                        className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        aria-label={t('athletes.addClient.hybridAria')}
                      >
                        {t('athletes.addClient.hybrid')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {onboardings.length > 0 && (
            <FormField
              control={form.control}
              name="onboardingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('athletes.addClient.onboardingFlow')}</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger clearable className="w-full">
                        <SelectValue placeholder={t('general.none')} />
                      </SelectTrigger>
                      <SelectContent>
                        {onboardings.map((onboarding) => (
                          <SelectItem key={onboarding.id} value={onboarding.id} description={onboarding.description}>
                            {onboarding.name || 'Untitled'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>
    </SidePanel>
  );
};
