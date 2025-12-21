'use client';

import * as React from 'react';
import { cn } from '@/lib/general/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Plus, Star } from 'lucide-react';

type QuestionFormat =
  | 'text'
  | 'number'
  | 'multipleChoice'
  | 'scale'
  | 'yesNo'
  | 'images'
  | 'videos'
  | 'date'
  | 'rating'
  | 'signature'
  | 'progressPhoto';

type PreviewQuestionProps = {
  question: string;
  format: QuestionFormat;
  required: boolean;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
};

export const PreviewQuestion = ({
  question,
  format,
  required,
  options = [],
  scaleFrom = '1',
  scaleTo = '10',
  mediaCount = 1,
}: PreviewQuestionProps) => {
  const [selectedValue, setSelectedValue] = React.useState<string | null>(null);
  const [ratingValue, setRatingValue] = React.useState<number>(0);
  const [sliderValue, setSliderValue] = React.useState<number>(
    Math.floor((parseInt(scaleTo) - parseInt(scaleFrom)) / 2) + parseInt(scaleFrom)
  );

  const renderQuestionContent = () => {
    switch (format) {
      case 'text':
        return (
          <div className="w-full">
            <Input
              placeholder="Your answer..."
              className="w-full"
            />
          </div>
        );

      case 'number':
        return (
          <div className="w-full">
            <Input
              type="number"
              placeholder="Enter a number..."
              className="w-full"
            />
          </div>
        );

      case 'date':
        return (
          <div className="w-full">
            <Input
              type="date"
              className="w-full"
            />
          </div>
        );

      case 'multipleChoice':
        return (
          <div className="flex flex-col gap-2 w-full items-center justify-center">
            {options.map((option, index) => (
              <Button
                key={index}
                variant={selectedValue === option ? 'default' : 'outline'}
                className="w-full h-12 text-sm rounded-[28px]"
                onClick={() => setSelectedValue(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        );

      case 'yesNo':
        return (
          <div className="flex flex-col gap-2 w-full items-center justify-center">
            <Button
              variant={selectedValue === 'yes' ? 'default' : 'outline'}
              className="w-full h-12 text-sm rounded-[28px]"
              onClick={() => setSelectedValue('yes')}
            >
              Yes
            </Button>
            <Button
              variant={selectedValue === 'no' ? 'default' : 'outline'}
              className="w-full h-12 text-sm rounded-[28px]"
              onClick={() => setSelectedValue('no')}
            >
              No
            </Button>
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
                  className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                  aria-label={`Rate ${rating} ${rating === 1 ? 'star' : 'stars'}`}
                >
                  <Star
                    className={cn(
                      "h-12 w-12 transition-colors",
                      rating <= ratingValue
                        ? "fill-primary text-primary"
                        : "fill-none text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        );

      case 'scale':
        return (
          <div className="w-full flex flex-col items-center gap-4 px-4">
            <div className="w-full max-w-[280px]">
              <input
                type="range"
                min={scaleFrom}
                max={scaleTo}
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{scaleFrom}</span>
                <span className="font-semibold text-foreground">{sliderValue}</span>
                <span>{scaleTo}</span>
              </div>
            </div>
          </div>
        );

      case 'images':
      case 'videos':
        return (
          <div className="w-full flex justify-center">
            <Button
              variant="outline"
              className="w-full h-12 gap-2 rounded-[28px]"
            >
              <Upload className="h-4 w-4" />
              Upload {format === 'images' ? `Image${mediaCount > 1 ? 's' : ''}` : `Video${mediaCount > 1 ? 's' : ''}`}
            </Button>
          </div>
        );

      case 'signature':
        return (
          <div className="w-full flex justify-center">
            <div className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Sign here</span>
            </div>
          </div>
        );

      case 'progressPhoto':
        return (
          <div className="w-full flex flex-col gap-3 items-start px-4">
            <div className="grid grid-cols-3 gap-3 w-full">
              {['Front', 'Back', 'Side'].map((label) => (
                <Button
                  key={label}
                  variant="outline"
                  className="aspect-square h-24 text-sm rounded-lg flex flex-col items-center justify-center gap-2 bg-muted"
                  disabled
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full">
            <Input
              placeholder="Your answer..."
              className="w-full"
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
