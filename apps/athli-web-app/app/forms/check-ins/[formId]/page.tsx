'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight, Plus, Trash2, GripVertical, Edit } from 'lucide-react';
import { type Form, addQuestion, reorderQuestions } from '@/lib/forms/form-service';
import { formTemplates } from '@/lib/constants/forms';
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EditCheckInFormSidePanel } from '@/components/forms/edit-check-in-form-side-panel';
import { FormDetailContent } from '@/components/forms/form-detail-content';

// Mock forms data - in production this would come from an API
const mockForms: Form[] = [
  {
    id: 'form-1',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'form-2',
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 3,
  },
];

import type { Question } from '@/components/forms/form-detail-content';

const CheckInFormDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ formId: string }>();
  const router = useRouter();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Load questions from sessionStorage on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check for questions from template in sessionStorage
    const storedQuestions = sessionStorage.getItem(`form-questions-${formId}`);
    if (storedQuestions) {
      try {
        const parsedQuestions = JSON.parse(storedQuestions);
        // Clear the stored questions
        sessionStorage.removeItem(`form-questions-${formId}`);
        // Convert template questions to Question format with IDs
        const convertedQuestions = parsedQuestions.map((q: any, index: number) => ({
          id: `q${Date.now()}-${index}`,
          question: q.question,
          required: q.required,
          format: q.format,
          options: q.options,
          scaleFrom: q.scaleFrom,
          scaleTo: q.scaleTo,
          mediaCount: q.mediaCount,
        }));
        setQuestions(convertedQuestions);
        return;
      } catch (error) {
        console.error('Failed to parse stored questions:', error);
      }
    }
    
    // Mock questions for Weekly Check-in
    if (formId === 'form-2') {
      setQuestions([
        {
          id: 'q1',
          question: 'How would you rate your week overall?',
          required: true,
          format: 'rating',
        },
        {
          id: 'q2',
          question: 'Did you complete all scheduled workouts this week?',
          required: true,
          format: 'yesNo',
        },
        {
          id: 'q3',
          question: 'How are you feeling physically?',
          required: true,
          format: 'scale',
          scaleFrom: '1 / Very poor',
          scaleTo: '10 / Excellent',
        },
      ]);
    }
  }, [formId]);

  const form = mockForms.find((f) => f.id === formId);

  // Determine form type from template
  const formType = useMemo(() => {
    if (!form) return 'check-in';
    const template = formTemplates.find((t) => t.name === form.name);
    return template?.schedule?.type || 'check-in';
  }, [form]);

  useEffect(() => {
    if (form) {
      setCurrentForm(form);
    }
  }, [form]);

  // Ensure preview index is within bounds
  useEffect(() => {
    if (questions.length === 0) {
      setPreviewQuestionIndex(0);
    } else if (previewQuestionIndex >= questions.length) {
      setPreviewQuestionIndex(questions.length - 1);
    }
  }, [questions.length, previewQuestionIndex]);

  if (!form) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('forms.detail.notFound')}</h1>
          <p className="text-muted-foreground">{t('forms.detail.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const handleBreadcrumbClick = (path: string, tabType?: 'check-ins' | 'questionnaires') => {
    if (tabType) {
      router.push(`${path}?tab=${tabType}`);
    } else {
      router.push(path);
    }
  };

  const handleEditForm = (updatedForm: Form) => {
    setCurrentForm(updatedForm);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/forms')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('forms.detail.breadcrumb.forms')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/forms', 'check-ins')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('forms.tabs.checkIns')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {currentForm?.name || form.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold">{currentForm?.name || form.name}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsEditFormOpen(true)}
              className="gap-2"
            >
              <Edit className="size-4" />
              <span>{t('forms.editDetailsAndSchedule')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <FormDetailContent
        formId={formId}
        form={form}
        questions={questions}
        setQuestions={setQuestions}
        previewQuestionIndex={previewQuestionIndex}
        setPreviewQuestionIndex={setPreviewQuestionIndex}
      />

      <EditCheckInFormSidePanel
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        form={currentForm}
        onSave={handleEditForm}
      />
    </div>
  );
};

export default CheckInFormDetailPage;

