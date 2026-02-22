'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, Plus, GripVertical, Download, Loader2, Edit, Play, Send } from 'lucide-react';
import { PageTabs } from '@/components/page-tabs';
import {
  getClientQuestionnaireById,
  getClientQuestionnaire,
  updateClientQuestionnaire,
  sendClientQuestionnaire,
  getQuestionnaireMediaUrl,
  type ClientQuestionnaireDetail as SharedClientQuestionnaireDetail,
} from '@/api/client/client-form-service';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { FormBuilder, type Question } from '@/components/forms/form-builder';
import { EditClientQuestionnaireFormSidePanel } from '@/components/forms/edit-client-questionnaire-form-side-panel';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useClientProfileContext } from '../../client-profile-context';

interface LocalClientQuestionnaireDetail {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  status?: 'draft' | 'pending' | 'completed';
}

interface QuestionAnswer {
  questionId: string;
  answer: any;
}

interface MediaPreview {
  urls: string[];
  currentIndex: number;
  questionNumber: number;
  questionText: string;
  type?: 'image' | 'video';
}

type TabType = 'builder' | 'response';

const ClientQuestionnaireDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; questionnaireId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserProfile();
  const { athlete } = useClientProfileContext();

  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const questionnaireId = Array.isArray(params.questionnaireId) ? params.questionnaireId[0] : params.questionnaireId;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('builder');

  // Builder tab state
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [currentForm, setCurrentForm] = useState<LocalClientQuestionnaireDetail | null>(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const reorderedQuestionsRef = useRef<Question[] | null>(null);

  // Submissions tab state
  const [submissionData, setSubmissionData] = useState<SharedClientQuestionnaireDetail | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<string, string>>({});
  const fetchedMediaPathsRef = useRef<Set<string>>(new Set());

  // Send form dialog
  const [isSendDialogOpen, setIsSendDialogOpen] = useState<boolean>(false);

  const isValidMediaPath = (path: string): boolean => {
    return !!(path && !path.startsWith('__') && path !== '__FILE_UPLOAD__' && !path.startsWith('http'));
  };

  const fetchMediaUrl = useCallback(async (path: string, bucket: 'form_files' | 'client_photos' = 'form_files') => {
    if (fetchedMediaPathsRef.current.has(path) || !isValidMediaPath(path)) return;
    fetchedMediaPathsRef.current.add(path);
    try {
      const url = await getQuestionnaireMediaUrl(bucket, path);
      setResolvedMediaUrls(prev => ({ ...prev, [path]: url }));
    } catch (error) {
      console.error('Failed to fetch media URL:', error);
      fetchedMediaPathsRef.current.delete(path);
    }
  }, []);

  // Fetch signed URLs for all media answers when submission data loads
  useEffect(() => {
    if (!submissionData?.answers) return;
    const questions = submissionData.questions || [];
    submissionData.answers.forEach((answer: QuestionAnswer) => {
      if (!answer.answer) return;
      const question = questions.find((q: Question) => q.id === answer.questionId);
      const format = (question as any)?.format || (question as any)?.type;
      if ((format === 'images' || format === 'videos') && Array.isArray(answer.answer)) {
        answer.answer.forEach((path: string) => {
          if (isValidMediaPath(path)) fetchMediaUrl(path);
        });
      }
      if (format === 'signature' && typeof answer.answer === 'string') {
        if (isValidMediaPath(answer.answer) && !answer.answer.startsWith('data:')) {
          fetchMediaUrl(answer.answer);
        }
      }
      if (format === 'progressPhoto' && typeof answer.answer === 'object' && answer.answer) {
        const progressAnswer = answer.answer as { front?: string; back?: string; side?: string };
        ['front', 'back', 'side'].forEach((angle) => {
          const path = progressAnswer[angle as keyof typeof progressAnswer];
          if (path && isValidMediaPath(path)) {
            fetchMediaUrl(path, 'client_photos');
          }
        });
      }
    });
  }, [submissionData, fetchMediaUrl]);

  const fetchForm = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const foundForm = await getClientQuestionnaireById(clientId, user.id, questionnaireId);
      setCurrentForm(foundForm);
      setQuestions(foundForm.questions || []);
    } catch (error) {
      console.error('Failed to fetch questionnaire:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubmission = async () => {
    if (!clientId || !questionnaireId || !user?.id) return;

    setSubmissionLoading(true);
    try {
      const data = await getClientQuestionnaire(clientId, user.id, questionnaireId);
      setSubmissionData(data);
    } catch (error) {
      console.error('Failed to fetch questionnaire submission:', error);
    } finally {
      setSubmissionLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchForm();
    }
  }, [clientId, questionnaireId, user?.id]);

  useEffect(() => {
    if (activeTab === 'response' && user?.id) {
      fetchSubmission();
    }
  }, [activeTab, clientId, questionnaireId, user?.id]);

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

  const formatCompletionDate = (date: Date): string => {
    const day = date.getDate();
    const suffix = getDateSuffix(day);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `Completed on ${day}${suffix} ${month}, ${year} at ${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Media preview handlers
  const handlePreviousMedia = () => {
    if (!mediaPreview) return;
    setMediaPreview({
      ...mediaPreview,
      currentIndex: mediaPreview.currentIndex === 0 ? mediaPreview.urls.length - 1 : mediaPreview.currentIndex - 1,
    });
  };

  const handleNextMedia = () => {
    if (!mediaPreview) return;
    setMediaPreview({
      ...mediaPreview,
      currentIndex: mediaPreview.currentIndex === mediaPreview.urls.length - 1 ? 0 : mediaPreview.currentIndex + 1,
    });
  };

  const handleThumbnailClick = (index: number) => {
    if (!mediaPreview) return;
    setMediaPreview({ ...mediaPreview, currentIndex: index });
  };

  // Download handler
  const handleDownload = async () => {
    if (!submissionData || isDownloading) return;

    setIsDownloading(true);
    try {
      const { downloadQuestionnaire } = await import('@/lib/general/pdf-service');
      await downloadQuestionnaire({
        questionnaire: submissionData,
        clientName: athlete?.name || 'Client',
        clientEmail: athlete?.email,
        clientId,
        coachId: user!.id,
        resolvedMediaUrls,
      });
    } catch (error) {
      console.error('Failed to download questionnaire:', error);
    } finally {
      setIsDownloading(false);
    }
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
        await updateClientQuestionnaire({
          clientId,
          coachId: user.id,
          questionnaireId,
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
      await updateClientQuestionnaire({
        clientId,
        coachId: user.id,
        questionnaireId,
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
      await updateClientQuestionnaire({
        clientId,
        coachId: user.id,
        questionnaireId,
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
      await updateClientQuestionnaire({
        clientId,
        coachId: user.id,
        questionnaireId,
        questions: updatedQuestions,
      });
    } catch (error) {
      console.error('Failed to edit question:', error);
      toast.error(t('general.error'));
      throw error;
    }
  };

  const handleEditForm = async (updatedForm: LocalClientQuestionnaireDetail) => {
    // Update local state immediately for responsive UI
    setCurrentForm(updatedForm);
    // Invalidate queries to ensure data consistency
    queryClient.invalidateQueries({ queryKey: ['client-questionnaires', clientId] });
  };

  const handleDeleteForm = () => {
    // Navigate back to questionnaires list after deletion
    router.push(`/athletes/${clientId}/questionnaires`);
  };

  // Send form handler
  const handleConfirmSend = async () => {
    if (!currentForm || !clientId || !user?.id) return;

    try {
      await sendClientQuestionnaire({
        questionnaireId: currentForm.id,
        clientId: clientId,
        coachId: user.id,
      });
      toast.success(t('athletes.profile.questionnaires.sendSuccess'));
      setCurrentForm({ ...currentForm, status: 'pending' });
      queryClient.invalidateQueries({ queryKey: ['client-questionnaires', clientId] });
    } catch (error) {
      console.error('Failed to send questionnaire:', error);
      toast.error(t('general.error'));
      throw error;
    }
  };

  // Render answer helper
  const getAnswerForQuestion = (questionId: string): QuestionAnswer | undefined => {
    return submissionData?.answers?.find((a: QuestionAnswer) => a.questionId === questionId);
  };

  const renderAnswer = (question: Question, questionIndex: number) => {
    const answer = getAnswerForQuestion(question.id);

    if (!answer || answer.answer === null || answer.answer === undefined) {
      return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
    }

    // Support both 'format' and 'type' field names
    const questionFormat = (question as any).format || (question as any).type;

    switch (questionFormat) {
      case 'text':
        return <p className="text-sm text-foreground whitespace-pre-wrap">{answer.answer as string}</p>;
      case 'number':
        return <p className="text-sm text-foreground">{answer.answer as number}</p>;
      case 'multipleChoice':
      case 'select':
        return <p className="text-sm text-foreground">{answer.answer as string}</p>;
      case 'multiselect':
        const selections = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
        return <p className="text-sm text-foreground">{selections.join(', ')}</p>;
      case 'scale':
        return (
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground">{answer.answer as number}</p>
            <span className="text-xs text-muted-foreground">
              (Scale: {question.scaleFrom} - {question.scaleTo})
            </span>
          </div>
        );
      case 'yesNo':
        return <p className="text-sm text-foreground">{answer.answer as string}</p>;
      case 'date':
        return <p className="text-sm text-foreground">{new Date(answer.answer as string).toLocaleDateString()}</p>;
      case 'rating':
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-5 h-5 ${star <= (answer.answer as number) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm text-muted-foreground ml-2">{answer.answer as number}/5</span>
          </div>
        );
      case 'images': {
        const imagePaths = answer.answer as string[];
        const imageResolvedUrls = imagePaths.map(path =>
          path.startsWith('http') ? path : resolvedMediaUrls[path]
        );
        return (
          <div className="flex flex-wrap gap-2">
            {imagePaths.map((path, index) => {
              const resolvedUrl = imageResolvedUrls[index];
              return (
                <div
                  key={index}
                  className="relative w-24 h-24 rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    const validUrls = imageResolvedUrls.filter((u): u is string => !!u);
                    if (validUrls.length > 0) {
                      setMediaPreview({
                        urls: validUrls,
                        currentIndex: Math.min(index, validUrls.length - 1),
                        questionNumber: questionIndex + 1,
                        questionText: question.question,
                      });
                    }
                  }}
                >
                  {resolvedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolvedUrl} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      case 'videos': {
        const videoPaths = answer.answer as string[];
        const videoResolvedUrls = videoPaths.map(path =>
          path.startsWith('http') ? path : resolvedMediaUrls[path]
        );
        return (
          <div className="flex flex-wrap gap-2">
            {videoPaths.map((path, index) => {
              const resolvedUrl = videoResolvedUrls[index];
              return (
                <div
                  key={index}
                  className="relative w-24 h-24 rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    const validUrls = videoResolvedUrls.filter((u): u is string => !!u);
                    if (validUrls.length > 0) {
                      setMediaPreview({
                        urls: validUrls,
                        currentIndex: Math.min(index, validUrls.length - 1),
                        questionNumber: questionIndex + 1,
                        questionText: question.question,
                        type: 'video',
                      });
                    }
                  }}
                >
                  {resolvedUrl ? (
                    <>
                      <video src={resolvedUrl} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="size-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      case 'signature': {
        if (typeof answer.answer === 'string' && answer.answer.length > 0) {
          const sigPath = answer.answer as string;
          const sigUrl = sigPath.startsWith('http') || sigPath.startsWith('data:')
            ? sigPath
            : resolvedMediaUrls[sigPath];

          if (!sigUrl && isValidMediaPath(sigPath)) {
            return (
              <div className="w-full h-[120px] rounded-md border border-border bg-muted flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            );
          }

          return (
            <div className="w-full h-[120px] rounded-md border border-border bg-white overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sigUrl} alt="Signature" className="w-full h-full object-contain" />
            </div>
          );
        }
        return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
      }
      case 'progressPhoto': {
        if (typeof answer.answer === 'object' && answer.answer) {
          const progressAnswer = answer.answer as { front?: string; back?: string; side?: string };
          const hasAnyPhoto = progressAnswer.front || progressAnswer.back || progressAnswer.side;

          if (!hasAnyPhoto) {
            return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
          }

          const renderProgressCard = (path: string | undefined, label: string) => {
            const url = path
              ? (path.startsWith('http') ? path : resolvedMediaUrls[path])
              : undefined;
            const isLoading = path ? !url && isValidMediaPath(path) : false;

            return (
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold text-center">{label}</span>
                <div
                  className={cn(
                    "relative aspect-square border-2 border-dashed rounded-xl overflow-hidden",
                    path ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                  )}
                >
                  {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : url ? (
                    <div
                      className="w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setMediaPreview({
                          urls: [url],
                          currentIndex: 0,
                          questionNumber: questionIndex + 1,
                          questionText: question.question,
                        });
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={label} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-lg">-</span>
                    </div>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="grid grid-cols-3 gap-4">
              {renderProgressCard(progressAnswer.front, t('photos.form.front'))}
              {renderProgressCard(progressAnswer.side, t('photos.form.side'))}
              {renderProgressCard(progressAnswer.back, t('photos.form.back'))}
            </div>
          );
        }
        return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
      }
      default:
        return <p className="text-sm text-foreground">{String(answer.answer)}</p>;
    }
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
      <div className="w-full relative flex-shrink-0 border-b">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => handleBreadcrumbClick(`/athletes/${clientId}/questionnaires`)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  {t('athletes.profile.questionnaires.title')}
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
          {activeTab === 'builder' && currentForm?.status !== 'pending' && currentForm?.status !== 'completed' && (
            <ButtonGroup className="flex-shrink-0">
              {/* Send form button - only show if there are questions */}
              {currentForm?.status === 'draft' && questions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIsSendDialogOpen(true)}
                  className="gap-2"
                >
                  <Send className="size-4" />
                  <span>{t('athletes.profile.questionnaires.sendForm')}</span>
                </Button>
              )}
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
          {activeTab === 'response' && submissionData?.status === 'completed' && (
            <Button onClick={handleDownload} disabled={isDownloading} className="flex-shrink-0 gap-2 min-w-[120px]">
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Download className="size-4" />
                  <span>{t('common.download')}</span>
                </>
              )}
            </Button>
          )}
        </div>
        {/* Tabs */}
        <div className="px-4">
          <PageTabs
            tabs={[
              { value: 'builder', label: currentForm?.name || '' },
              ...(currentForm?.status === 'pending' || currentForm?.status === 'completed' ? [{ value: 'response', label: t('forms.detail.tabs.response') }] : []),
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
          formId={questionnaireId}
          formType="questionnaire"
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
          readOnly={currentForm?.status === 'pending' || currentForm?.status === 'completed'}
          onQuestionsChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['client-questionnaires', clientId] });
          }}
        />
      )}

      {activeTab === 'response' && (
        <div className="w-full h-full flex-1 min-h-0 py-4 px-4 flex flex-col items-center overflow-auto gap-4 relative">
          {/* Loading overlay */}
          {submissionLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <Loader2 className="h-10 w-10 animate-spin text-foreground" />
            </div>
          )}
          {!submissionLoading && !submissionData ? (
            <p className="text-muted-foreground">{t('athletes.profile.questionnaires.noSubmission')}</p>
          ) : !submissionLoading && submissionData && submissionData.status !== 'completed' ? (
            <div className="text-center">
              <p className="text-muted-foreground">{t('athletes.profile.questionnaires.notYetCompleted')}</p>
            </div>
          ) : !submissionLoading && submissionData && submissionData.status === 'completed' ? (
            <Card className="w-full max-w-2xl pt-0 gap-0">
              <div className="w-full">
                {submissionData.completedAt && (
                  <>
                    <CardHeader className="px-4 pt-3 pb-1">
                      <CardTitle>{formatCompletionDate(submissionData.completedAt)}</CardTitle>
                    </CardHeader>
                    <Separator className="w-full" />
                  </>
                )}
                {submissionData.questions.map((question: Question, index: number) => (
                  <div
                    key={question.id}
                    className={cn(index > 0 && 'border-t border-border')}
                  >
                    <div className="flex items-start gap-2 px-4 pt-2 pb-2 bg-muted/50">
                      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                        {index + 1}.
                      </span>
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {question.question}
                        </p>
                        {question.required && (
                          <span className="text-red-500 text-sm">*</span>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-border" />
                    <div className="px-4 pt-2 pb-2">
                      {renderAnswer(question, index)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {/* Media preview dialog */}
      <Dialog open={!!mediaPreview} onOpenChange={(open) => !open && setMediaPreview(null)}>
        <DialogContent className="max-w-[90vw] w-full">
          {mediaPreview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                      {mediaPreview.questionNumber}.
                    </span>
                    <span className="text-sm font-medium">
                      {mediaPreview.questionText}
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted/10">
                {mediaPreview.type === 'video' ? (
                  <video
                    key={mediaPreview.urls[mediaPreview.currentIndex]}
                    src={mediaPreview.urls[mediaPreview.currentIndex]}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaPreview.urls[mediaPreview.currentIndex]}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                {mediaPreview.urls.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousMedia}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg transition-colors"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    <button
                      onClick={handleNextMedia}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg transition-colors"
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  </>
                )}
              </div>
              {mediaPreview.urls.length > 1 && (
                <div className="flex justify-start">
                  <div className="flex gap-1.5">
                    {mediaPreview.urls.map((url, index) => (
                      <div
                        key={index}
                        onClick={() => handleThumbnailClick(index)}
                        className={cn(
                          "relative w-12 h-12 rounded-md overflow-hidden cursor-pointer transition-all",
                          index === mediaPreview.currentIndex
                            ? "ring-2 ring-primary ring-offset-2"
                            : "opacity-60 hover:opacity-100"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit form side panel */}
      {user?.id && (
        <EditClientQuestionnaireFormSidePanel
          open={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
          form={currentForm}
          clientId={clientId}
          coachId={user.id}
          onSave={handleEditForm}
          onDelete={handleDeleteForm}
        />
      )}

      {/* Send form confirmation dialog */}
      <ConfirmDeleteDialog
        open={isSendDialogOpen}
        onOpenChange={setIsSendDialogOpen}
        onConfirm={handleConfirmSend}
        title={t('athletes.profile.questionnaires.sendConfirmTitle')}
        description={t('athletes.profile.questionnaires.sendConfirmDescription')}
        confirmText={t('athletes.profile.questionnaires.sendForm')}
        variant="default"
      />
    </div>
  );
};

export default ClientQuestionnaireDetailPage;
