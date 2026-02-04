'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/general/utils';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, Plus, GripVertical, Download, Loader2, GitCompare, ChevronDown, Edit } from 'lucide-react';
import { PageTabs } from '@/components/page-tabs';
import {
  getClientCheckInById,
  updateClientCheckIn,
  getClientCheckInsForForm,
  getCheckInInstance,
  type ClientCheckInDetail,
  type CheckInInstance,
} from '@/api/client/client-form-service';
import { FormBuilder, type Question } from '@/components/forms/form-builder';
import { CheckInReviewContent } from '@/components/forms/check-in-review-content';
import { EditClientCheckInFormSidePanel } from '@/components/forms/edit-client-check-in-form-side-panel';
import { useUserProfile } from '@/hooks/use-user-profile';

type TabType = 'builder' | 'submissions';

const ClientCheckInDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; checkInId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserProfile();

  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('builder');

  // Builder tab state
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [currentForm, setCurrentForm] = useState<ClientCheckInDetail | null>(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const reorderedQuestionsRef = useRef<Question[] | null>(null);

  // Submissions tab state
  const [instances, setInstances] = useState<CheckInInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState<boolean>(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const fetchForm = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const foundForm = await getClientCheckInById(clientId, user.id, checkInId);
      setCurrentForm(foundForm);
      setQuestions(foundForm.questions || []);
    } catch (error) {
      console.error('Failed to fetch check-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstances = async () => {
    if (!clientId || !checkInId) return;

    setInstancesLoading(true);
    try {
      const data = await getClientCheckInsForForm(clientId, checkInId);
      setInstances(data);
      // Auto-select the first instance if none selected
      if (data.length > 0 && !selectedInstanceId) {
        setSelectedInstanceId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch check-in instances:', error);
    } finally {
      setInstancesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchForm();
    }
  }, [clientId, checkInId, user?.id]);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchInstances();
    }
  }, [activeTab, clientId, checkInId]);

  // Sorted instances (newest first)
  const sortedInstances = useMemo(() => {
    return [...instances].sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }, [instances]);

  const completedInstances = instances.filter((i) => i.status !== 'assigned');

  // Helper functions
  const getDateSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    const lastDigit = day % 10;
    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatScheduledDate = (date: Date): string => {
    const day = date.getDate();
    const suffix = getDateSuffix(day);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}${suffix} ${month}, ${year}`;
  };

  const getStatusVariant = (status: CheckInInstance['status']) => {
    switch (status) {
      case 'assigned': return 'outline';
      case 'review':
      case 'completed': return 'outline';
      case 'reviewed': return 'default';
      default: return 'outline';
    }
  };

  const getStatusClassName = (status: CheckInInstance['status']) => {
    switch (status) {
      case 'review':
      case 'completed': return 'border-primary text-primary';
      case 'reviewed': return 'bg-primary text-primary-foreground border-transparent';
      default: return '';
    }
  };

  const getStatusLabel = (status: CheckInInstance['status']) => {
    switch (status) {
      case 'assigned': return t('athletes.profile.checkIns.status.assigned');
      case 'review': return t('athletes.profile.checkIns.status.review');
      case 'reviewed': return t('athletes.profile.checkIns.status.reviewed');
      case 'completed': return t('athletes.profile.checkIns.status.review');
      default: return status;
    }
  };

  // Download handlers
  const handleDownload = async (downloadInstanceId: string) => {
    if (!downloadInstanceId || isDownloading) return;

    const targetInstance = instances.find((i) => i.id === downloadInstanceId);
    if (!targetInstance || targetInstance.status === 'assigned') return;

    setIsDownloading(true);
    try {
      const instanceDetail = await getCheckInInstance(clientId, checkInId, downloadInstanceId);
      const { downloadQuestionnaire } = await import('@/lib/general/pdf-service');

      await downloadQuestionnaire({
        questionnaire: {
          id: instanceDetail.id,
          name: instanceDetail.formName,
          description: '',
          status: instanceDetail.status === 'assigned' ? 'pending' : 'completed',
          sentAt: instanceDetail.scheduledDate,
          completedAt: instanceDetail.completedAt,
          questions: instanceDetail.questions || [],
          answers: instanceDetail.answers || [],
        },
        clientName: 'Client',
      });
    } catch (error) {
      console.error('Failed to download check-in:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadLatest = () => {
    if (completedInstances.length === 0) return;
    const latestInstance = completedInstances.sort(
      (a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime()
    )[0];
    handleDownload(latestInstance.id);
  };

  const handleCompare = () => {
    router.push(`/athletes/${clientId}/check-in/${checkInId}/compare`);
  };

  // Builder handlers
  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleToggleReorder = async () => {
    const wasInReorderMode = isReorderMode;
    setIsReorderMode(!isReorderMode);

    if (wasInReorderMode && user?.id) {
      try {
        const questionsToReorder = reorderedQuestionsRef.current || questions;
        await updateClientCheckIn({
          clientId,
          coachId: user.id,
          checkInId,
          questions: questionsToReorder,
        });
        toast.success(t('forms.reorder.success'));
        reorderedQuestionsRef.current = null;
      } catch (error) {
        console.error('Failed to reorder questions:', error);
        toast.error(t('general.error'));
      }
    }
  };

  const handleOpenAddQuestion = () => {
    setIsAddQuestionOpen(true);
  };

  const handleReorder = (newData: any[]) => {
    const filteredData = newData.filter((item) => !item._isAddRow) as Question[];
    setQuestions(filteredData);
    reorderedQuestionsRef.current = filteredData;
  };

  const handleAddQuestion = async (questionData: any): Promise<Question> => {
    if (!user?.id) throw new Error('User not authenticated');

    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question: questionData.question,
      required: questionData.required,
      format: questionData.format,
      options: questionData.options,
      scaleFrom: questionData.scaleFrom,
      scaleTo: questionData.scaleTo,
      mediaCount: questionData.mediaCount,
      metricId: questionData.metricId,
    };

    const updatedQuestions = [...questions, newQuestion];

    try {
      await updateClientCheckIn({
        clientId,
        coachId: user.id,
        checkInId,
        questions: updatedQuestions,
      });
      toast.success(t('forms.detail.addQuestion.success'));
      return newQuestion;
    } catch (error) {
      console.error('Failed to add question:', error);
      toast.error(t('general.error'));
      throw error;
    }
  };

  const handleDeleteQuestion = async (questionId: string): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    const updatedQuestions = questions.filter((q) => q.id !== questionId);

    try {
      await updateClientCheckIn({
        clientId,
        coachId: user.id,
        checkInId,
        questions: updatedQuestions,
      });
      toast.success(t('forms.detail.deleteQuestion.success'));
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast.error(t('general.error'));
      throw error;
    }
  };

  const handleEditQuestion = async (questionData: Question): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    const updatedQuestions = questions.map((q) =>
      q.id === questionData.id ? questionData : q
    );

    try {
      await updateClientCheckIn({
        clientId,
        coachId: user.id,
        checkInId,
        questions: updatedQuestions,
      });
    } catch (error) {
      console.error('Failed to edit question:', error);
      toast.error(t('general.error'));
      throw error;
    }
  };

  const handleEditForm = async (updatedForm: ClientCheckInDetail) => {
    // Update local state immediately for responsive UI
    setCurrentForm(updatedForm);
    // Invalidate queries to ensure data consistency
    queryClient.invalidateQueries({ queryKey: ['client-check-ins', clientId] });
  };

  const handleDeleteForm = () => {
    // Navigate back to check-ins list after deletion
    router.push(`/athletes/${clientId}/check-in`);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-foreground" />
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('forms.detail.notFound')}</h1>
          <p className="text-muted-foreground">{t('forms.detail.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const formForContent = {
    id: currentForm.id,
    name: currentForm.name,
    description: currentForm.description || '',
    questions: questions,
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header with breadcrumb and tabs */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => handleBreadcrumbClick(`/athletes/${clientId}/check-in`)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  {t('athletes.profile.checkIns.title')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  {currentForm?.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {/* Action buttons - positioned at top right */}
        <div className="absolute top-2 right-4 flex items-center gap-2">
          {activeTab === 'builder' && (
            <ButtonGroup className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsEditFormOpen(true)}
                className="gap-2"
              >
                <Edit className="size-4" />
                <span>{t('general.edit')}</span>
              </Button>
              <Button
                variant={isReorderMode ? 'default' : 'outline'}
                onClick={handleToggleReorder}
                className="gap-2"
              >
                <GripVertical className="size-4" />
                <span>{isReorderMode ? t('forms.detail.actions.done') : t('forms.detail.actions.reorder')}</span>
              </Button>
              <Button onClick={handleOpenAddQuestion} className="gap-2" disabled={isReorderMode}>
                <Plus className="size-4" />
                <span>{t('forms.detail.actions.addQuestion')}</span>
              </Button>
            </ButtonGroup>
          )}
          {activeTab === 'submissions' && completedInstances.length > 0 && (
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <Button
                variant="outline"
                onClick={handleCompare}
                className="gap-2 rounded-r-none border-r-0"
              >
                <GitCompare className="size-4" />
                <span>Compare</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={isDownloading} className="gap-2 min-w-[120px] rounded-l-none">
                    {isDownloading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="size-4" />
                        <span>Download</span>
                        <ChevronDown className="size-4 ml-1" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleDownloadLatest}>
                    <span className="font-medium">Latest</span>
                  </DropdownMenuItem>
                  {completedInstances.length > 0 && <DropdownMenuSeparator />}
                  {completedInstances
                    .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())
                    .map((instance) => (
                      <DropdownMenuItem
                        key={instance.id}
                        onClick={() => handleDownload(instance.id)}
                      >
                        {formatScheduledDate(instance.scheduledDate)}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="px-4">
          <PageTabs
            tabs={[
              { value: 'builder', label: currentForm?.name || '' },
              { value: 'submissions', label: t('forms.detail.tabs.submissions') },
            ]}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabType)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'builder' && (
        <FormBuilder
          formId={checkInId}
          formType="check-in"
          form={formForContent as any}
          questions={questions}
          setQuestions={setQuestions}
          previewQuestionIndex={previewQuestionIndex}
          setPreviewQuestionIndex={setPreviewQuestionIndex}
          isReorderMode={isReorderMode}
          onToggleReorder={handleToggleReorder}
          onOpenAddQuestion={handleOpenAddQuestion}
          onReorder={handleReorder}
          isAddQuestionOpen={isAddQuestionOpen}
          onAddQuestionOpenChange={setIsAddQuestionOpen}
          clientId={clientId}
          onAddQuestion={handleAddQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onEditQuestion={handleEditQuestion}
          onQuestionsChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['client-check-ins', clientId] });
          }}
        />
      )}

      {activeTab === 'submissions' && (
        <div className="flex h-full w-full flex-1 min-h-0 relative">
          {/* Loading overlay */}
          {instancesLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <Loader2 className="h-10 w-10 animate-spin text-foreground" />
            </div>
          )}
          {/* Left sidebar navigation */}
          <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-y-auto flex flex-col">
              {sortedInstances.length === 0 && !instancesLoading ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">{t('athletes.profile.checkIns.noSubmissions')}</p>
                </div>
              ) : (
                <div className="space-y-0 flex-1 overflow-y-auto">
                  {sortedInstances.map((instance, index) => {
                    const isActive = selectedInstanceId === instance.id;
                    const isLast = index === sortedInstances.length - 1;

                    return (
                      <React.Fragment key={instance.id}>
                        <button
                          onClick={() => setSelectedInstanceId(instance.id)}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-sm transition-colors text-left',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-sm font-medium">{formatScheduledDate(instance.scheduledDate)}</span>
                            <span className="text-xs text-muted-foreground">
                              {getStatusLabel(instance.status)}
                            </span>
                          </div>
                          <Badge
                            variant={getStatusVariant(instance.status)}
                            className={cn("text-xs flex-shrink-0", getStatusClassName(instance.status))}
                          >
                            {getStatusLabel(instance.status)}
                          </Badge>
                        </button>
                        {!isLast && <Separator className="w-full" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedInstanceId ? (
              <div className="h-full w-full flex flex-col bg-background overflow-hidden">
                <div className="w-full h-full flex-1 min-h-0 py-4 flex flex-col items-center overflow-auto gap-4">
                  <div className="w-full max-w-2xl">
                    <CheckInReviewContent
                      clientId={clientId}
                      checkInId={checkInId}
                      instanceId={selectedInstanceId}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-muted-foreground">{t('athletes.profile.checkIns.selectSubmission')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit form side panel */}
      {user?.id && (
        <EditClientCheckInFormSidePanel
          open={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
          form={currentForm}
          clientId={clientId}
          coachId={user.id}
          onSave={handleEditForm}
          onDelete={handleDeleteForm}
        />
      )}
    </div>
  );
};

export default ClientCheckInDetailPage;
