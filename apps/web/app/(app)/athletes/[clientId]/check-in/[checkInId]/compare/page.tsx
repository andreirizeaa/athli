'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const ComparePage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string; checkInId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;

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
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
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

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !checkInId) return;

      setIsLoading(true);
      try {
        const data = await getClientCheckInsForForm(clientId, checkInId);
        const completedInstances = data
          .filter((i) => i.status !== 'assigned')
          .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
        setInstances(completedInstances);

        // Set default selections (first two instances)
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
  }, [clientId, checkInId]);

  // Load instance data when selection changes
  useEffect(() => {
    const loadInstance = async (instanceId: string | null, setInstance: (instance: CheckInInstance | null) => void) => {
      if (!instanceId || !clientId || !checkInId) {
        setInstance(null);
        return;
      }

      try {
        const instanceDetail = await getCheckInInstance(clientId, checkInId, instanceId);
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
  }, [leftInstanceId, rightInstanceId, clientId, checkInId]);

  const handleLeftInstanceChange = (instanceId: string) => {
    setLeftInstanceId(instanceId);
  };

  const handleRightInstanceChange = (instanceId: string) => {
    setRightInstanceId(instanceId);
  };

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

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
    setMediaPreview({
      ...mediaPreview,
      currentIndex: index,
    });
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

  const getAnswerForQuestion = (answers: QuestionAnswer[] | undefined, questionId: string): QuestionAnswer | undefined => {
    return answers?.find((a) => a.questionId === questionId);
  };

  const renderAnswer = (question: Question, answer: QuestionAnswer | undefined, questionIndex: number) => {
    if (!answer || answer.answer === null || answer.answer === undefined) {
      return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
    }

    switch (question.format) {
      case 'text':
        return <p className="text-sm text-foreground whitespace-pre-wrap">{answer.answer as string}</p>;

      case 'number':
        return <p className="text-sm text-foreground">{answer.answer as number}</p>;

      case 'multipleChoice':
        return <p className="text-sm text-foreground">{answer.answer as string}</p>;

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
        return <p className="text-sm text-foreground">{(answer.answer as Date).toLocaleDateString()}</p>;

      case 'rating':
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-5 h-5 ${star <= (answer.answer as number) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`}
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

  const formName = instances.length > 0 ? instances[0].formName : '';

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">No completed check-ins</h1>
          <p className="text-muted-foreground">You need at least one completed check-in to compare.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-background">
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
                <BreadcrumbLink
                  onClick={() => handleBreadcrumbClick(`/athletes/${clientId}/check-in/${checkInId}`)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  {formName}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">Compare</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-[22px] font-semibold">Comparing {formName} responses</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <div className="w-full px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Card */}
          <Card className="w-full">
            <div className="w-full pl-4 pr-4 pb-4 pt-1 border-b">
              <Select
                value={leftInstanceId || ''}
                onValueChange={handleLeftInstanceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.selectCheckin')} />
                </SelectTrigger>
                <SelectContent>
                  {instances
                    .filter((i) => i.id !== rightInstanceId)
                    .map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {formatScheduledDate(instance.scheduledDate)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {leftInstance && (
              <div className="w-full">
                {leftInstance.completedAt && (
                  <>
                    <CardHeader className="px-4 pb-3">
                      <CardTitle className="text-base">{formatCompletionDate(leftInstance.completedAt)}</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-4px]" />
                  </>
                )}
                {leftInstance.questions?.map((question, index) => (
                  <div
                    key={question.id}
                    className={cn('py-4 px-4', index < (leftInstance.questions?.length || 0) - 1 && 'border-b')}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">{index + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium text-foreground">{question.question}</p>
                          {question.required && <span className="text-red-500 text-sm">*</span>}
                        </div>
                        <div className="pl-0">
                          {renderAnswer(question, getAnswerForQuestion(leftInstance.answers, question.id), index)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Right Card */}
          <Card className="w-full">
            <div className="w-full pl-4 pr-4 pb-4 pt-1 border-b">
              <Select
                value={rightInstanceId || ''}
                onValueChange={handleRightInstanceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.selectCheckin')} />
                </SelectTrigger>
                <SelectContent>
                  {instances
                    .filter((i) => i.id !== leftInstanceId)
                    .map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {formatScheduledDate(instance.scheduledDate)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {rightInstance && (
              <div className="w-full">
                {rightInstance.completedAt && (
                  <>
                    <CardHeader className="px-4 pb-3">
                      <CardTitle className="text-base">{formatCompletionDate(rightInstance.completedAt)}</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-4px]" />
                  </>
                )}
                {rightInstance.questions?.map((question, index) => (
                  <div
                    key={question.id}
                    className={cn('py-4 px-4', index < (rightInstance.questions?.length || 0) - 1 && 'border-b')}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">{index + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium text-foreground">{question.question}</p>
                          {question.required && <span className="text-red-500 text-sm">*</span>}
                        </div>
                        <div className="pl-0">
                          {renderAnswer(question, getAnswerForQuestion(rightInstance.answers, question.id), index)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
                        <Image
                          src={url}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComparePage;
