'use client';

import * as React from 'react';
import { cn } from '@/lib/general/utils';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  ChevronRight,
  Camera,
  Image,
  Video,
} from 'lucide-react';

type QuestionFormat =
  | 'text'
  | 'number'
  | 'multipleChoice'
  | 'select'
  | 'multiselect'
  | 'scale'
  | 'yesNo'
  | 'images'
  | 'videos'
  | 'date'
  | 'rating'
  | 'signature'
  | 'progressPhoto'
  | 'metrics';

type PreviewQuestionProps = {
  question: string;
  format: QuestionFormat;
  required: boolean;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
  metricId?: string;
  metricUnit?: string;
};

export const PreviewQuestion = ({
  question,
  format,
  required,
  options = [],
  scaleFrom = '1',
  scaleTo = '10',
  mediaCount = 1,
  metricId,
  metricUnit,
}: PreviewQuestionProps) => {
  const [selectedValue, setSelectedValue] = React.useState<string | null>(null);
  const [ratingValue, setRatingValue] = React.useState<number>(0);

  const renderQuestionContent = () => {
    switch (format) {
      case 'text':
        return (
          <div className="w-full">
            <textarea
              placeholder="Type here..."
              className="w-full min-h-[120px] rounded-lg bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              readOnly
            />
          </div>
        );

      case 'number':
        return (
          <div className="w-full flex justify-center">
            <div className="w-full rounded-lg bg-muted h-12 flex items-center justify-center">
              <span className="text-lg text-muted-foreground">0</span>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="w-full">
            <div className="rounded-2xl bg-muted h-12 flex items-center justify-center text-muted-foreground text-sm">
              Select a date
            </div>
          </div>
        );

      case 'multipleChoice':
      case 'select':
      case 'multiselect':
        return (
          <div className="flex flex-col gap-4 w-full">
            {options.map((option, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  'w-full h-[72px] rounded-2xl px-5 text-left font-semibold text-base transition-colors',
                  selectedValue === option
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
                onClick={() => setSelectedValue(option)}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'yesNo':
        return (
          <div className="flex flex-col gap-4 w-full">
            <button
              type="button"
              className={cn(
                'w-full h-[72px] rounded-2xl px-5 flex items-center gap-4 font-semibold text-base transition-colors',
                selectedValue === 'yes'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
              onClick={() => setSelectedValue('yes')}
            >
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                  selectedValue === 'yes'
                    ? 'bg-primary-foreground/20'
                    : 'bg-background'
                )}
              >
                <ThumbsUp className="h-5 w-5" />
              </div>
              Yes
            </button>
            <button
              type="button"
              className={cn(
                'w-full h-[72px] rounded-2xl px-5 flex items-center gap-4 font-semibold text-base transition-colors',
                selectedValue === 'no'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
              onClick={() => setSelectedValue('no')}
            >
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                  selectedValue === 'no'
                    ? 'bg-primary-foreground/20'
                    : 'bg-background'
                )}
              >
                <ThumbsDown className="h-5 w-5" />
              </div>
              No
            </button>
          </div>
        );

      case 'rating':
        return (
          <div className="w-full flex justify-center">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setRatingValue(rating)}
                  className="focus:outline-none"
                  aria-label={`Rate ${rating} ${rating === 1 ? 'star' : 'stars'}`}
                >
                  <Star
                    className={cn(
                      'h-11 w-11 transition-colors',
                      rating <= ratingValue
                        ? 'fill-primary text-primary'
                        : 'fill-none text-muted-foreground'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        );

      case 'scale': {
        const from = parseInt(scaleFrom);
        const to = parseInt(scaleTo);
        const values = Array.from({ length: to - from + 1 }, (_, i) => from + i);
        return (
          <div className="w-full px-1">
            <div className="grid grid-cols-2 gap-3">
              {values.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'h-16 rounded-2xl font-semibold text-base transition-colors',
                    selectedValue === String(value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                  onClick={() => setSelectedValue(String(value))}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'images':
      case 'videos': {
        const Icon = format === 'images' ? Image : Video;
        const label = format === 'images'
          ? `Add Image${mediaCount > 1 ? 's' : ''}`
          : `Add Video${mediaCount > 1 ? 's' : ''}`;
        return (
          <div className="w-full">
            <div className="w-full rounded-2xl bg-muted flex items-center px-5 h-[72px] gap-4">
              <Icon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-base font-semibold text-foreground">
                {label}
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        );
      }

      case 'signature':
        return (
          <div className="w-full">
            <div className="w-full h-[200px] border-2 border-dashed rounded-xl bg-white flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Sign here</span>
            </div>
          </div>
        );

      case 'progressPhoto':
        return (
          <div className="w-full px-1">
            <div className="grid grid-cols-3 gap-3 w-full">
              {['Front', 'Back', 'Side'].map((label) => (
                <div
                  key={label}
                  className="aspect-square rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted flex flex-col items-center justify-center gap-2"
                >
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'metrics':
        return (
          <div className="w-full flex justify-center">
            <div className="w-full rounded-lg bg-muted h-12 flex items-center justify-center gap-2">
              <span className="text-lg text-muted-foreground">0</span>
              {metricUnit && (
                <span className="text-sm text-muted-foreground">
                  {metricUnit}
                </span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full">
            <textarea
              placeholder="Type here..."
              className="w-full min-h-[120px] rounded-lg bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none resize-none"
              readOnly
            />
          </div>
        );
    }
  };

  return (
    <div className="w-full px-4 flex items-center justify-center min-h-full">
      <div className="w-full">
        {renderQuestionContent()}
      </div>
    </div>
  );
};
