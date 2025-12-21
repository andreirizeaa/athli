'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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
import { cn } from '@/lib/general/utils';

type AddAthleteFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  coachingType: 'online' | 'in-person' | 'hybrid';
};

interface AddClientSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddClientSidePanel = ({ open, onOpenChange }: AddClientSidePanelProps) => {
  const t = useTranslations();
  const addAthleteSchema = z.object({
    firstName: z.string().min(1, t('athletes.addClient.firstNameRequiredError')),
    lastName: z.string().min(1, t('athletes.addClient.lastNameRequiredError')),
    email: z.string().email(t('athletes.addClient.emailInvalidError')),
    coachingType: z.union([z.literal('online'), z.literal('in-person'), z.literal('hybrid')]),
  });
  const form = useForm<AddAthleteFormValues>({
    resolver: zodResolver(addAthleteSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      coachingType: 'online',
    },
  });

  const handleSubmitInvitation = async (values: AddAthleteFormValues) => {
    // Handle form submission here
    console.log('Form values:', values);
    onOpenChange(false);
    form.reset();
    toast.success(t('athletes.addClient.invitationSent'), {
      description: t('athletes.addClient.invitationSentDescription', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
      }),
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });
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
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmitInvitation)}
            disabled={!form.formState.isValid}
            aria-label={t('athletes.addClient.sendInvitationAria')}
          >
            {t('athletes.addClient.sendInvitation')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            aria-label={t('athletes.addClient.cancelAria')}
          >
            {t('general.cancel')}
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
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('athletes.addClient.firstName')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('athletes.addClient.firstNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('athletes.addClient.lastName')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('athletes.addClient.lastNamePlaceholder')} {...field} />
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
        </form>
      </Form>
    </SidePanel>
  );
};
