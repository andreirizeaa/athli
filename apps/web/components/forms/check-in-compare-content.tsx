'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getClientCheckInsForForm, getCheckInInstance, type CheckInInstance } from '@/api/client/client-form-service';
import type { Question, QuestionAnswer } from '@/api/client/client-form-service';
import { cn } from '@/lib/general/utils';
import Image from 'next/image';

interface MediaPreview {
  urls: string[];
  currentIndex: number;
  questionNumber: number;
  questionText: string;
}

interface CheckInCompareContentProps {
  clientId: string;
  checkInId: string;
  coachId: string;
}

export const CheckInCompareContent = ({ clientId, checkInId, coachId }: CheckInCompareContentProps) => {
  const t = useTranslations();

  const [instances, setInstances] = useState<CheckInInstance[]>([]);
  const [leftInstance, setLeftInstance] = useState<CheckInInstance | null>(null);
  const [rightInstance, setRightInstance] = useState<CheckInInstance | null>(null);
  const [leftInstanceId, setLeftInstanceId] = useState<string | null>(null);
  const [rightInstanceId, setRightInstanceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);

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

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !checkInId) return;

      setIsLoading(true);
      try {
        const data = await getClientCheckInsForForm(clientId, checkInId, coachId);
        const completedInstances = data
          .filter((i) => i.status !== 'assigned')
          .sort((a, b) => (a.completedAt || a.scheduledDate).getTime() - (b.completedAt || b.scheduledDate).getTime());
        setInstances(completedInstances);

        if (completedInstances.length >= 2) {
          setLeftInstanceId(completedInstances[completedInstances.length - 2].id);
          setRightInstanceId(completedInstances[completedInstances.length - 1].id);
        } else if (completedInstances.length === 1) {
          setLeftInstanceId(completedInstances[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch check-in data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId, checkInId, coachId]);

  useEffect(() => {
    const loadInstance = async (instanceId: string | null, setInstance: (instance: CheckInInstance | null) => void) => {
      if (!instanceId || !clientId || !checkInId) {
        setInstance(null);
        return;
      }

      try {
        const instanceDetail = await getCheckInInstance(clientId, checkInId, instanceId, coachId);
        setInstance(instanceDetail);
      } catch (error) {
        console.error('Failed to fetch instance:', error);
        setInstance(null);
      }
    };

    if (leftInstanceId) {
      loadInstance(leftInstanceId, setLeftInstance);
    }
    if (rightInstanceId) {
      loadInstance(rightInstanceId, setRightInstance);
    }
  }, [leftInstanceId, rightInstanceId, clientId, checkInId, coachId]);

  const getAnswerForQuestion = (answers: QuestionAnswer[] | undefined, questionId: string, questionIndex: number): QuestionAnswer | undefined => {
    if (!answers || !Array.isArray(answers)) return undefined;
    const byId = answers.find((a: any) => (a.questionId || a.question_id) === questionId);
    if (byId) return { questionId, answer: byId.answer ?? (byId as any).value };
    const byIndex = answers[questionIndex];
    if (byIndex) return { questionId, answer: byIndex.answer ?? (byIndex as any).value };
    return undefined;
  };

  const renderAnswer = (question: Question, answer: QuestionAnswer | undefined, questionIndex: number) => {
    if (!answer || answer.answer === null || answer.answer === undefined) {
      return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
    }

    switch (question.format) {
      case 'text':
      case 'multipleChoice':
        return <p className="text-sm text-foreground whitespace-pre-wrap">{String(answer.answer)}</p>;

      case 'yesNo': {
        const yesNoVal = answer.answer;
        const displayVal = yesNoVal === true || yesNoVal === 'yes' || yesNoVal === 'Yes' ? 'Yes' : 'No';
        return <p className="text-sm text-foreground">{displayVal}</p>;
      }

      case 'number':
        return <p className="text-sm text-foreground">{answer.answer as number}</p>;

      case 'scale':
        return (
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground">{answer.answer as number}</p>
            <span className="text-xs text-muted-foreground">
              (Scale: {question.scaleFrom} - {question.scaleTo})
            </span>
          </div>
        );

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
          </div>
        );

      case 'images':
      case 'videos':
        const mediaUrls = answer.answer as string[];
        return (
          <div className="flex flex-wrap gap-2">
            {mediaUrls.map((url, index) => (
              <div
                key={index}
                className="relative w-24 h-24 rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setMediaPreview({
                  urls: mediaUrls,
                  currentIndex: index,
                  questionNumber: questionIndex + 1,
                  questionText: question.question
                })}
              >
                <Image src={url} alt={`Media ${index + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-sm text-foreground">{String(answer.answer)}</p>;
    }
  };

  const renderInstanceCard = (
    instanceId: string | null,
    instance: CheckInInstance | null,
    onInstanceChange: (id: string) => void,
    excludeId: string | null,
  ) => (
    <Card className="w-full pt-0 gap-0">
      <div className="w-full px-4 py-3 border-b">
        <Select value={instanceId || ''} onValueChange={onInstanceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('common.selectCheckin')} />
          </SelectTrigger>
          <SelectContent>
            {instances
              .filter((i) => i.id !== excludeId)
              .map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {formatScheduledDate(inst.completedAt || inst.scheduledDate)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {instance && (
        <div className="w-full">
          {instance.completedAt && (
            <>
              <CardHeader className="px-4 pt-3 pb-1">
                <CardTitle>{formatCompletionDate(instance.completedAt)}</CardTitle>
              </CardHeader>
              <Separator className="w-full" />
            </>
          )}
          {instance.questions?.map((question, index) => (
            <div
              key={question.id || `q-${index}`}
              className={cn(index > 0 && 'border-t border-border')}
            >
              <div className="flex items-start gap-2 px-4 pt-2 pb-2 bg-muted/50">
                <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                  {index + 1}.
                </span>
                <div className="flex items-start gap-2">
                  <p className="text-sm font-medium text-foreground">{question.question}</p>
                  {question.required && <span className="text-red-500 text-sm">*</span>}
                </div>
              </div>
              <div className="border-t border-border" />
              <div className="px-4 pt-2 pb-2">
                {renderAnswer(question, getAnswerForQuestion(instance.answers, question.id, index), index)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-foreground" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center py-10">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-1">No completed check-ins</h3>
          <p className="text-sm text-muted-foreground">You need at least one completed check-in to compare.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          {renderInstanceCard(leftInstanceId, leftInstance, setLeftInstanceId, rightInstanceId)}
          {renderInstanceCard(rightInstanceId, rightInstance, setRightInstanceId, leftInstanceId)}
        </div>
      </div>

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
                <Image
                  src={mediaPreview.urls[mediaPreview.currentIndex]}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
                {mediaPreview.urls.length > 1 && (
                  <>
                    <button
                      onClick={() => setMediaPreview({
                        ...mediaPreview,
                        currentIndex: mediaPreview.currentIndex === 0 ? mediaPreview.urls.length - 1 : mediaPreview.currentIndex - 1,
                      })}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg transition-colors"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    <button
                      onClick={() => setMediaPreview({
                        ...mediaPreview,
                        currentIndex: mediaPreview.currentIndex === mediaPreview.urls.length - 1 ? 0 : mediaPreview.currentIndex + 1,
                      })}
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
                        onClick={() => setMediaPreview({ ...mediaPreview, currentIndex: index })}
                        className={cn(
                          "relative w-12 h-12 rounded-md overflow-hidden cursor-pointer transition-all",
                          index === mediaPreview.currentIndex
                            ? "ring-2 ring-primary ring-offset-2"
                            : "opacity-60 hover:opacity-100"
                        )}
                      >
                        <Image src={url} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
