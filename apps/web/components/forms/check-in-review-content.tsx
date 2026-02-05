'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import {
    getCheckInInstance,
    getCoachReview,
    addCoachReview,
    updateCoachReview,
    type CheckInInstance,
    type Question,
    type QuestionAnswer
} from '@/api/client/client-form-service';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { cn } from '@/lib/general/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MediaPreview {
    urls: string[];
    currentIndex: number;
    questionNumber: number;
    questionText: string;
}

interface CheckInReviewContentProps {
    clientId: string;
    checkInId: string;
    instanceId: string;
    onReviewSaved?: () => void;
    showBreadcrumb?: boolean; // Keep for flexibility but maybe handle outside
}

export const CheckInReviewContent = ({
    clientId,
    checkInId,
    instanceId,
    onReviewSaved,
}: CheckInReviewContentProps) => {
    const t = useTranslations();
    const [instance, setInstance] = useState<CheckInInstance | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
    const [reviewText, setReviewText] = useState<string>('');
    const [originalReviewText, setOriginalReviewText] = useState<string>('');
    const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
    const [isEditingReview, setIsEditingReview] = useState<boolean>(false);

    useEffect(() => {
        const fetchInstance = async () => {
            if (!clientId || !checkInId || !instanceId) return;

            setIsLoading(true);
            try {
                const data = await getCheckInInstance(clientId, checkInId, instanceId);
                setInstance(data);

                if (data.status === 'reviewed') {
                    try {
                        const review = await getCoachReview(clientId, checkInId, instanceId);
                        if (review && review.review) {
                            setReviewText(review.review);
                            setOriginalReviewText(review.review);
                        } else {
                            setReviewText('');
                            setOriginalReviewText('');
                        }
                    } catch (error) {
                        setReviewText('');
                        setOriginalReviewText('');
                    }
                } else {
                    setReviewText('');
                    setOriginalReviewText('');
                }
            } catch (error) {
                console.error('Failed to fetch check-in instance:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInstance();
    }, [clientId, checkInId, instanceId]);

    const getAnswerForQuestion = (questionId: string): QuestionAnswer | undefined => {
        return instance?.answers?.find((a) => a.questionId === questionId);
    };

    const handleSaveReview = async () => {
        if (!clientId || !checkInId || !instanceId || !reviewText.trim() || isSavingReview || !instance) return;

        setIsSavingReview(true);
        try {
            if (instance.status === 'reviewed' && isEditingReview) {
                await updateCoachReview({
                    clientId,
                    checkInId,
                    instanceId,
                    review: reviewText.trim(),
                });
                setOriginalReviewText(reviewText.trim());
                setIsEditingReview(false);
            } else {
                await addCoachReview({
                    clientId,
                    checkInId,
                    instanceId,
                    review: reviewText.trim(),
                });
                setOriginalReviewText(reviewText.trim());
                setInstance({ ...instance, status: 'reviewed' });
            }
            onReviewSaved?.();
        } catch (error) {
            console.error('Failed to save review:', error);
        } finally {
            setIsSavingReview(false);
        }
    };

    const handleEditReview = () => {
        setIsEditingReview(true);
        setReviewText(originalReviewText);
    };

    const handleCancelEdit = () => {
        setIsEditingReview(false);
        setReviewText(originalReviewText);
    };

    const formatCompletionDate = (date: Date): string => {
        const day = date.getDate();
        const suffix = (d: number) => {
            if (d >= 11 && d <= 13) return 'th';
            const lastDigit = d % 10;
            switch (lastDigit) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        };

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();

        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');

        return `Completed on ${day}${suffix(day)} ${month}, ${year} at ${displayHours}:${displayMinutes} ${ampm}`;
    };

    const renderAnswer = (question: Question, questionIndex: number) => {
        const answer = getAnswerForQuestion(question.id);

        if (!answer || answer.answer === null || answer.answer === undefined) {
            return <span className="text-sm text-muted-foreground italic">No answer provided</span>;
        }

        switch (question.format) {
            case 'text':
            case 'multipleChoice':
            case 'yesNo':
                return <p className="text-sm text-foreground whitespace-pre-wrap">{String(answer.answer)}</p>;

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
            <div className="h-full w-full flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!instance) {
        return (
            <div className="h-full w-full flex items-center justify-center py-10">
                <div className="text-center">
                    <h3 className="text-lg font-medium mb-1">Check-in not found</h3>
                    <p className="text-sm text-muted-foreground">The check-in instance you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            {instance.status === 'assigned' ? (
                <Card className="w-full">
                    <CardHeader className="px-4">
                        <CardTitle className="text-base">Awaiting Response</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-4px]" />
                    <div className="px-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            This check-in has been assigned but not yet completed by the client.
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    <Card className="w-full">
                        <div className="w-full">
                            {instance.completedAt && (
                                <>
                                    <CardHeader className="px-4 pb-3">
                                        <CardTitle className="text-base">{formatCompletionDate(instance.completedAt)}</CardTitle>
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

                    {/* Review Check-in Card */}
                    {(instance.status === 'review' || instance.status === 'reviewed') && (
                        <Card className="w-full">
                            <CardHeader className="px-4 pb-0">
                                <CardTitle className="text-base">
                                    {instance.status === 'reviewed'
                                        ? t('athletes.profile.checkIns.reviewCompletedTitle')
                                        : t('athletes.profile.checkIns.reviewTitle')}
                                </CardTitle>
                            </CardHeader>
                            <Separator className="w-full mt-[-8px] mb-[-4px]" />
                            <div className="px-4 py-2 space-y-4">
                                <Textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder={t('athletes.profile.checkIns.reviewPlaceholder')}
                                    className="min-h-[120px] w-full resize-none"
                                    rows={5}
                                    disabled={instance.status === 'reviewed' && !isEditingReview}
                                />
                                <div className="flex justify-end gap-2 pb-2">
                                    {instance.status === 'reviewed' && !isEditingReview ? (
                                        <Button onClick={handleEditReview} className="gap-2" variant="outline">
                                            <span>{t('athletes.profile.checkIns.editReview')}</span>
                                        </Button>
                                    ) : (
                                        <>
                                            {isEditingReview && (
                                                <Button
                                                    onClick={handleCancelEdit}
                                                    variant="outline"
                                                    className="gap-2"
                                                    disabled={isSavingReview}
                                                >
                                                    <span>{t('general.cancel')}</span>
                                                </Button>
                                            )}
                                            <Button
                                                onClick={handleSaveReview}
                                                disabled={!reviewText.trim() || isSavingReview}
                                                className="gap-2"
                                            >
                                                {isSavingReview ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin" />
                                                        <span>
                                                            {instance.status === 'reviewed' && isEditingReview
                                                                ? t('athletes.profile.checkIns.updatingReview')
                                                                : t('athletes.profile.checkIns.completingReview')}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span>
                                                        {instance.status === 'reviewed' && isEditingReview
                                                            ? t('athletes.profile.checkIns.updateReview')
                                                            : t('athletes.profile.checkIns.completeReview')}
                                                    </span>
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            )}

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
                                            onClick={() => setMediaPreview({
                                                ...mediaPreview,
                                                currentIndex: mediaPreview.currentIndex === 0 ? mediaPreview.urls.length - 1 : mediaPreview.currentIndex - 1
                                            })}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg transition-colors"
                                        >
                                            <ChevronLeft className="size-6" />
                                        </button>
                                        <button
                                            onClick={() => setMediaPreview({
                                                ...mediaPreview,
                                                currentIndex: mediaPreview.currentIndex === mediaPreview.urls.length - 1 ? 0 : mediaPreview.currentIndex + 1
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
                                    <div className="flex gap-1.5 overflow-x-auto pb-2">
                                        {mediaPreview.urls.map((url, index) => (
                                            <div
                                                key={index}
                                                onClick={() => setMediaPreview({ ...mediaPreview, currentIndex: index })}
                                                className={cn(
                                                    'relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 cursor-pointer transition-all',
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
