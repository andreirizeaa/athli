'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Info } from 'lucide-react';
import { addForm, type AddFormData } from '@/lib/forms/form-service';
import { formTemplates, type FormTemplate } from '@/lib/constants/forms';
import { cn } from '@/lib/utils';

type AddFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (form: ReturnType<typeof addForm> extends Promise<infer T> ? T : never, questions?: FormTemplate['questions']) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AddFormSidePanel = ({ open, onOpenChange, onSave }: AddFormSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'new' | 'templates'>('new');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [formType, setFormType] = useState<'check-in' | 'questionnaire'>('check-in');
  const [checkInFrequency, setCheckInFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<'first' | 'last' | 'specific'>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('forms.form.nameRequired'))
      .max(100, t('forms.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const form = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleClose = () => {
    form.reset();
    setActiveTab('new');
    setSelectedTemplate(null);
    setFormType('check-in');
    setCheckInFrequency('daily');
    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
    setMonthlyOption('last');
    setSpecificDay(1);
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    try {
      const newForm = await addForm(values);
      if (onSave) {
        onSave(newForm);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    form.setValue('name', template.name, { shouldValidate: true });
    form.setValue('description', template.description || '', { shouldValidate: true });
    
    // Apply scheduling defaults from template
    if (template.schedule) {
      setFormType(template.schedule.type);
      
      if (template.schedule.type === 'check-in' && template.schedule.frequency) {
        setCheckInFrequency(template.schedule.frequency);
        
        if (template.schedule.selectedDays) {
          setSelectedDays(new Set(template.schedule.selectedDays));
        } else if (template.schedule.frequency === 'daily') {
          setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
        } else if (template.schedule.frequency === 'weekly' || template.schedule.frequency === 'biweekly') {
          setSelectedDays(new Set(['sunday']));
        }
        
        if (template.schedule.monthlyOption) {
          setMonthlyOption(template.schedule.monthlyOption);
        }
        
        if (template.schedule.specificDay) {
          setSpecificDay(template.schedule.specificDay);
        }
      }
    } else {
      // Default to check-in if no schedule specified
      setFormType('check-in');
      setCheckInFrequency('daily');
      setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
      setMonthlyOption('last');
      setSpecificDay(1);
    }
  };

  const handleChangeTemplate = () => {
    setActiveTab('templates');
  };

  const handleEditTemplate = () => {
    setActiveTab('templates');
  };

  const handleSaveFromTemplate = async () => {
    if (selectedTemplate) {
      const values: AddFormData = {
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
      };
      try {
        const newForm = await addForm(values);
        if (onSave) {
          onSave(newForm, selectedTemplate.questions);
        }
        handleClose();
      } catch (error) {
        console.error('Failed to save form:', error);
      }
    }
  };

  const getScheduleExplanation = (): string => {
    if (checkInFrequency === 'daily') {
      const daysArray = Array.from(selectedDays);
      const dayNames = daysArray.map(day => t(`habits.form.${day}`)).join(', ');
      return t('athletes.profile.checkIns.schedule.explanation.daily', { days: dayNames });
    } else if (checkInFrequency === 'weekly') {
      const daysArray = Array.from(selectedDays);
      const dayName = daysArray.length > 0 ? t(`habits.form.${daysArray[0]}`) : '';
      return t('athletes.profile.checkIns.schedule.explanation.weekly', { day: dayName });
    } else if (checkInFrequency === 'biweekly') {
      const daysArray = Array.from(selectedDays);
      const dayName = daysArray.length > 0 ? t(`habits.form.${daysArray[0]}`) : '';
      return t('athletes.profile.checkIns.schedule.explanation.biweekly', { day: dayName });
    } else if (checkInFrequency === 'monthly') {
      if (monthlyOption === 'first') {
        return t('athletes.profile.checkIns.schedule.explanation.monthlyFirst');
      } else if (monthlyOption === 'last') {
        return t('athletes.profile.checkIns.schedule.explanation.monthlyLast');
      } else if (monthlyOption === 'specific') {
        return t('athletes.profile.checkIns.schedule.explanation.monthlySpecific', {
          day: `${specificDay}${specificDay === 1 ? 'st' : specificDay === 2 ? 'nd' : specificDay === 3 ? 'rd' : 'th'}`,
        });
      }
    }
    return '';
  };

  const isValid = activeTab === 'new' 
    ? form.formState.isValid && form.watch('name').trim() !== ''
    : selectedTemplate !== null;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('forms.addFormTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={activeTab === 'new' ? form.handleSubmit(handleSave) : handleSaveFromTemplate}
            disabled={!isValid}
          >
            {t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'templates')} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="new"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('forms.newForm')}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('forms.athliTemplates')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-0">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSave)(e);
              }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span>
                          {t('forms.form.name')}
                          <RequiredAsterisk />
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('forms.form.namePlaceholder')}
                          aria-label={t('forms.form.name')}
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('forms.form.descriptionPlaceholder')}
                        aria-label={t('forms.form.description')}
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTemplate && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium leading-none">
                    {t('forms.template')}
                  </Label>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {selectedTemplate.name}
                        </span>
                        {selectedTemplate.description && (
                          <span className="text-xs text-muted-foreground">
                            {selectedTemplate.description}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {selectedTemplate.questions.length} {selectedTemplate.questions.length === 1 ? 'question' : 'questions'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEditTemplate}
                        className="h-8 w-8 flex-shrink-0"
                        aria-label={t('general.change')}
                      >
                        <Edit className="size-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              <div className="space-y-4">
                <Label>
                  <span>
                    {t('forms.type.label')}
                    <span className="text-destructive">*</span>
                  </span>
                </Label>
                <ToggleGroup
                  type="single"
                  value={formType}
                  onValueChange={(value) => {
                    if (value) {
                      setFormType(value as 'check-in' | 'questionnaire');
                    }
                  }}
                  variant="outline"
                  spacing={0}
                  className="w-full"
                >
                  <ToggleGroupItem value="check-in" aria-label={t('forms.type.checkIn')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {t('forms.type.checkIn')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="questionnaire" aria-label={t('forms.type.questionnaire')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {t('forms.type.questionnaire')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {formType === 'questionnaire' ? (
                <Alert className="bg-primary/5 border-primary/20 text-primary">
                  <Info className="size-4" />
                  <AlertDescription className="min-w-0 line-clamp-4">
                    {t('forms.type.questionnaireInfo')}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-4">
                    <Label>
                      <span>
                        {t('athletes.profile.checkIns.schedule.frequency.label')}
                        <span className="text-destructive">*</span>
                      </span>
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={checkInFrequency}
                      onValueChange={(value) => {
                        if (value) {
                          const newFrequency = value as 'daily' | 'weekly' | 'biweekly' | 'monthly';
                          setCheckInFrequency(newFrequency);
                          // Reset selected days based on frequency
                          if (newFrequency === 'daily') {
                            setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
                          } else if (newFrequency === 'weekly' || newFrequency === 'biweekly') {
                            setSelectedDays(new Set(['sunday']));
                          }
                        }
                      }}
                      variant="outline"
                      spacing={0}
                      className="w-full"
                    >
                      <ToggleGroupItem value="daily" aria-label={t('athletes.profile.checkIns.schedule.frequency.daily')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {t('athletes.profile.checkIns.schedule.frequency.daily')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="weekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.weekly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {t('athletes.profile.checkIns.schedule.frequency.weekly')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="biweekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.biweekly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {t('athletes.profile.checkIns.schedule.frequency.biweekly')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="monthly" aria-label={t('athletes.profile.checkIns.schedule.frequency.monthly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {t('athletes.profile.checkIns.schedule.frequency.monthly')}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-4 w-full">
                    <Label>
                      <span>
                        {checkInFrequency === 'daily' && t('athletes.profile.checkIns.schedule.selectDays')}
                        {(checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && t('athletes.profile.checkIns.schedule.selectDay')}
                        {checkInFrequency === 'monthly' && t('athletes.profile.checkIns.schedule.dayOfMonth')}
                        <span className="text-destructive">*</span>
                      </span>
                    </Label>
                    {(checkInFrequency === 'daily' || checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && (
                      <div className="flex gap-2 flex-wrap w-full justify-between">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <div key={day} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedDays.has(day)}
                              onCheckedChange={(checked) => {
                                const newSelectedDays = new Set(selectedDays);
                                if (checked) {
                                  newSelectedDays.add(day);
                                } else {
                                  newSelectedDays.delete(day);
                                }
                                setSelectedDays(newSelectedDays);
                              }}
                              aria-label={t(`habits.form.${day}`)}
                            />
                            <Label className="text-sm font-normal cursor-pointer" onClick={() => {
                              const newSelectedDays = new Set(selectedDays);
                              if (selectedDays.has(day)) {
                                newSelectedDays.delete(day);
                              } else {
                                newSelectedDays.add(day);
                              }
                              setSelectedDays(newSelectedDays);
                            }}>
                              {t(`habits.form.${day}`)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {checkInFrequency === 'monthly' && (
                      <div className="space-y-4">
                        <ToggleGroup
                          type="single"
                          value={monthlyOption}
                          onValueChange={(value) => {
                            if (value) {
                              setMonthlyOption(value as 'first' | 'last' | 'specific');
                            }
                          }}
                          variant="outline"
                          spacing={0}
                          className="w-full"
                        >
                          <ToggleGroupItem value="first" aria-label={t('athletes.profile.checkIns.schedule.monthly.first')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                            {t('athletes.profile.checkIns.schedule.monthly.first')}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="last" aria-label={t('athletes.profile.checkIns.schedule.monthly.last')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                            {t('athletes.profile.checkIns.schedule.monthly.last')}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="specific" aria-label={t('athletes.profile.checkIns.schedule.monthly.specific')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                            {t('athletes.profile.checkIns.schedule.monthly.specific')}
                          </ToggleGroupItem>
                        </ToggleGroup>
                        {monthlyOption === 'specific' && (
                          <div className="flex flex-col gap-2 w-full">
                            <Label>
                              <span>
                                {t('athletes.profile.checkIns.schedule.monthly.selectDay')}
                                <span className="text-destructive">*</span>
                              </span>
                            </Label>
                            <Select value={specificDay.toString()} onValueChange={(value) => setSpecificDay(parseInt(value, 10))}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                  <SelectItem key={day} value={day.toString()}>
                                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Alert className="bg-primary/5 border-primary/20 text-primary">
                    <Info className="size-4" />
                    <AlertDescription className="min-w-0 line-clamp-4">
                      {getScheduleExplanation()}
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <span>
                  {t('forms.template')}
                  <RequiredAsterisk />
                </span>
              </label>
              <div className="flex flex-col gap-3 max-h-[calc(100vh-300px)] overflow-y-auto px-1 pt-1">
                {formTemplates.map((template) => (
                  <Card
                    key={template.name}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-accent transition-colors w-full',
                      selectedTemplate?.name === template.name && 'ring-2 ring-primary'
                    )}
                    onClick={() => {
                      handleSelectTemplate(template);
                      setActiveTab('new');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectTemplate(template);
                        setActiveTab('new');
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select template: ${template.name}`}
                  >
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {template.questions.length} {template.questions.length === 1 ? 'question' : 'questions'}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};

