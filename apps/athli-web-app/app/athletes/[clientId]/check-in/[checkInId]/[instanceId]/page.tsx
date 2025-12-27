'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, Loader2 } from 'lucide-react';
import { getCheckInInstance, addCoachReview, updateCoachReview, getCoachReview, type CheckInInstance, type Question, type QuestionAnswer } from '@/api/client/client-form-service';
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
import { CheckInReviewContent } from '@/components/forms/check-in-review-content';

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
  const [reviewText, setReviewText] = useState<string>('');
  const [originalReviewText, setOriginalReviewText] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);
  const [hasReview, setHasReview] = useState<boolean>(false);

  if (!clientId || !checkInId || !instanceId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      <div className="w-full h-full flex-1 min-h-0 py-4 flex flex-col items-center overflow-auto gap-4">
        <div className="w-full max-w-2xl">
          <CheckInReviewContent
            clientId={clientId}
            checkInId={checkInId}
            instanceId={instanceId}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckInInstancePage;
