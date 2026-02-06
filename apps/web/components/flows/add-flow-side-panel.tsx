'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search } from 'lucide-react';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { createFlow, updateFlow } from '@/api/coach/coach-flow-service';
import { defaultFlowTemplates, type FlowTemplate } from '@/constants/flows';

type AddFlowSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId?: string;
  initialName?: string;
  initialDescription?: string;
  onSave?: (data: { name: string; description?: string }) => Promise<void>;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AddFlowSidePanel = ({
  open,
  onOpenChange,
  flowId,
  initialName,
  initialDescription,
  onSave,
}: AddFlowSidePanelProps) => {
  const t = useTranslations();
  const router = useRouter();
  const isEditing = !!flowId;
  const [activeTab, setActiveTab] = useState<'manual' | 'library'>('library');
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('flows.form.nameRequired'))
      .max(100, t('flows.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const reactForm = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when modal opens with initial values (edit mode)
  useEffect(() => {
    if (open && isEditing) {
      reactForm.reset({
        name: initialName || '',
        description: initialDescription || '',
      });
    }
  }, [open, isEditing, initialName, initialDescription, reactForm]);

  const handleClose = () => {
    reactForm.reset();
    if (!isEditing) {
      setActiveTab('library');
      setLibrarySearchQuery('');
    }
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    setIsSaving(true);
    try {
      if (isEditing && onSave) {
        await onSave({
          name: values.name,
          description: values.description,
        });
        handleClose();
      } else {
        const newFlow = await createFlow({
          name: values.name,
          description: values.description,
        });
        handleClose();
        // Navigate to the new flow
        router.push(`/flows/${newFlow.id}`);
      }
    } catch (error) {
      console.error(isEditing ? 'Failed to update flow details:' : 'Failed to create flow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTemplate = async (template: FlowTemplate) => {
    setIsSaving(true);
    try {
      // Create flow with template name and description
      const newFlow = await createFlow({
        name: template.name,
        description: template.description,
      });

      // Update the flow with template nodes and edges
      await updateFlow({
        id: newFlow.id,
        nodes: template.nodes,
        edges: template.edges,
      });

      handleClose();
      // Navigate to the new flow
      router.push(`/flows/${newFlow.id}`);
    } catch (error) {
      console.error('Failed to create flow from template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return true;
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }

    return queryIndex === normalizedQuery.length;
  };

  const filteredTemplates = useMemo(() => {
    if (!librarySearchQuery.trim()) {
      return defaultFlowTemplates;
    }

    const query = librarySearchQuery.trim().toLowerCase();
    return defaultFlowTemplates.map((section) => ({
      ...section,
      templates: section.templates.filter((template) =>
        isFuzzyMatch(template.name, query) ||
        isFuzzyMatch(template.description, query)
      ),
    })).filter((section) => section.templates.length > 0);
  }, [librarySearchQuery]);

  return (
    <SidePanel
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
      title={isEditing ? t('flows.editFlow') : t('flows.addFlow')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      onSave={(isEditing || activeTab === 'manual') ? reactForm.handleSubmit(handleSave) : undefined}
      isSaving={isSaving}
      isSaveDisabled={!reactForm.formState.isValid}
      onCancel={handleClose}
    >
      {isEditing ? (
        <Form {...reactForm}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reactForm.handleSubmit(handleSave)(e);
            }}
            className="flex flex-col gap-6"
          >
            <FormField
              control={reactForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>
                      {t('flows.form.name')}
                      <RequiredAsterisk />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('flows.form.namePlaceholder')}
                      aria-label={t('flows.form.name')}
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={reactForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('flows.form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('flows.form.descriptionPlaceholder')}
                      aria-label={t('flows.form.description')}
                      rows={3}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'library')} className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger
              value="library"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              Athli library
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              Manual add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search flow templates..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="pl-9"
                  aria-label="Search flow templates"
                />
              </div>
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No templates found matching "{librarySearchQuery}"</p>
                </div>
              ) : (
                filteredTemplates.map((section) => (
                  <div key={section.label} className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {section.templates.map((template) => (
                        <Card
                          key={`${section.label}-${template.name}`}
                          className="p-4 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectTemplate(template)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectTemplate(template);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select template: ${template.name}`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-0">
            <Form {...reactForm}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  reactForm.handleSubmit(handleSave)(e);
                }}
                className="flex flex-col gap-6"
              >
                <FormField
                  control={reactForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span>
                          {t('flows.form.name')}
                          <RequiredAsterisk />
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('flows.form.namePlaceholder')}
                          aria-label={t('flows.form.name')}
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={reactForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('flows.form.description')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('flows.form.descriptionPlaceholder')}
                          aria-label={t('flows.form.description')}
                          rows={3}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      )}
    </SidePanel>
  );
};
