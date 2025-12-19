'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { PreviewQuestion } from './preview-question';

type Question = {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
};

type FormPreviewContainerProps = {
  questions: Question[];
  currentQuestionIndex: number;
  onNavigate: (index: number) => void;
};

export const FormPreviewContainer = ({
  questions,
  currentQuestionIndex,
  onNavigate,
}: FormPreviewContainerProps) => {
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      onNavigate(currentQuestionIndex - 1);
    }
  };

  const handleContinue = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      onNavigate(currentQuestionIndex + 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full w-full p-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Add questions to preview your form
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header with back button and progress bar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Question title */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold leading-tight">
          {currentQuestion.question}
          {currentQuestion.required && (
            <span className="text-destructive ml-1">*</span>
          )}
        </h2>
      </div>

      {/* Content area - scrollable and centered */}
      <div className="flex-1 overflow-y-auto py-4 flex items-center justify-center">
        <div className="w-full">
          <PreviewQuestion
            question={currentQuestion.question}
            format={currentQuestion.format as any}
            required={currentQuestion.required}
            options={currentQuestion.options}
            scaleFrom={currentQuestion.scaleFrom}
            scaleTo={currentQuestion.scaleTo}
            mediaCount={currentQuestion.mediaCount}
          />
        </div>
      </div>

      {/* Bottom Continue button */}
      <div className="flex-shrink-0 bg-background pb-8">
        <div className="px-4">
          <Button
            onClick={handleContinue}
            className="w-full h-11 rounded-[28px]"
            disabled={currentQuestionIndex >= totalQuestions - 1}
          >
            {currentQuestionIndex < totalQuestions - 1 ? 'Continue' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};
