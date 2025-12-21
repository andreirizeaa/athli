'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { getCheckInInstance, type CheckInInstance, type Question, type QuestionAnswer } from '@/lib/client/client-form-service';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/general/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MediaPreview {
  urls: string[];
  currentIndex: number;
  questionNumber: number;
  questionText: string;
}

const CheckInInstancePage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string; checkInId: string; instanceId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;
  const instanceId = Array.isArray(params.instanceId) ? params.instanceId[0] : params.instanceId;

  const [instance, setInstance] = useState<CheckInInstance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);

  useEffect(() => {
    const fetchInstance = async () => {
      if (!clientId || !checkInId || !instanceId) return;

      setIsLoading(true);
      try {
        const data = await getCheckInInstance(clientId, checkInId, instanceId);
        setInstance(data);
      } catch (error) {
        console.error('Failed to fetch check-in instance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstance();
  }, [clientId, checkInId, instanceId]);

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleDownload = async () => {
    if (!instance || isDownloading) return;

    setIsDownloading(true);
    try {
      const { downloadQuestionnaire } = await import('@/lib/general/pdf-service');

      const clientName = 'Client Name';

      await downloadQuestionnaire({
        questionnaire: {
          id: instance.id,
          name: instance.formName,
          description: '',
          status: instance.status === 'assigned' ? 'pending' : 'completed',
          sentAt: instance.scheduledDate,
          completedAt: instance.completedAt,
          questions: instance.questions || [],
          answers: instance.answers || [],
        },
        clientName,
      });
    } catch (error) {
      console.error('Failed to download check-in:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getAnswerForQuestion = (questionId: string): QuestionAnswer | undefined => {
    return instance?.answers?.find((a) => a.questionId === questionId);
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

  const renderAnswer = (question: Question, questionIndex: number) => {
    const answer = getAnswerForQuestion(question.id);

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
                className={`w-5 h-5 ${
                  star <= (answer.answer as number) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
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
                onClick={() =>
                  setMediaPreview({
                    urls: mediaUrls,
                    currentIndex: index,
                    questionNumber: questionIndex + 1,
                    questionText: question.question,
                  })
                }
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Check-in not found</h1>
          <p className="text-muted-foreground">The check-in instance you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      <div className="w-full h-full flex-1 min-h-0 py-4 flex items-start justify-center overflow-auto">
        {instance.status === 'assigned' ? (
          <Card className="w-full max-w-2xl">
            <CardHeader className="px-4">
              <CardTitle>Awaiting Response</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px] mb-[-4px]" />
            <div className="px-4 py-4">
              <p className="text-sm text-muted-foreground">
                This check-in has been assigned but not yet completed by the client.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="w-full max-w-2xl">
            <div className="w-full">
              {instance.completedAt && (
                <>
                  <CardHeader className="px-4 pb-3">
                    <CardTitle>{formatCompletionDate(instance.completedAt)}</CardTitle>
                  </CardHeader>
                  <Separator className="w-full mt-[-8px] mb-[-4px]" />
                </>
              )}
              {instance.questions?.map((question, index) => (
                <div
                  key={question.id}
                  className={cn('py-4 px-4', index < (instance.questions?.length || 0) - 1 && 'border-b')}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground flex-shrink-0">{index + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-foreground">{question.question}</p>
                        {question.required && <span className="text-red-500 text-sm">*</span>}
                      </div>
                      <div className="pl-0">{renderAnswer(question, index)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
                    <span className="text-sm font-medium">{mediaPreview.questionText}</span>
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
                          'relative w-12 h-12 rounded-md overflow-hidden cursor-pointer transition-all',
                          index === mediaPreview.currentIndex
                            ? 'ring-2 ring-primary ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
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
    </div>
  );
};

export default CheckInInstancePage;
