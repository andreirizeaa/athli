'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowUpIcon, Expand, MicIcon, Paperclip, SquareIcon, X } from 'lucide-react';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import {
  Input,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/custom/prompt/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import { useAIPanel } from '@/lib/providers/ai-panel-provider';
import { useAiUsage } from '@/hooks/use-ai-usage';
import { toast } from 'sonner';

type AIAssistantPanelProps = {
  isOpen: boolean;
};

export function AIAssistantPanel({ isOpen }: AIAssistantPanelProps) {
  const t = useTranslations();
  const { setIsOpen } = useAIPanel();
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { checkBeforePrompt, remaining, isLimited, hasReachedLimit } = useAiUsage();

  useEffect(() => {
    fetch('/animations/ai-sphere-animation.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (prompt.trim() || files.length > 0) {
      // Check AI usage limit during trial
      if (isLimited) {
        const { allowed, message } = await checkBeforePrompt();
        if (!allowed) {
          toast.error(message || "Daily AI prompt limit reached. Upgrade for unlimited access.");
          return;
        }
      }

      // TODO: Handle submit
      setHasMessages(true);
      setPrompt('');
      setFiles([]);
    }
  };

  const InputBox = (
    <div className="bg-primary/10 w-full rounded-2xl p-1">
      <Input
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={handleSubmit}
        className="w-full overflow-hidden border-0 p-0"
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 px-3 pt-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <Paperclip className="size-4" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="hover:bg-secondary/50 rounded-full p-1"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <PromptInputTextarea
          placeholder="Ask me anything..."
          className="min-h-auto p-3 text-sm"
        />

        <PromptInputActions className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-2">
            <PromptInputAction tooltip="Attach files">
              <label
                htmlFor="ai-panel-file-upload"
                className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl"
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="ai-panel-file-upload"
                />
                <Paperclip className="text-primary size-5" />
              </label>
            </PromptInputAction>
          </div>

          <div className="flex items-center gap-2">
            {/* Trial prompt limit indicator */}
            {isLimited && (
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                hasReachedLimit
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}>
                {remaining} left
              </span>
            )}
            <PromptInputAction tooltip="Voice input">
              <Button variant="outline" size="icon" className="size-8 rounded-full">
                <MicIcon size={16} />
              </Button>
            </PromptInputAction>
            <PromptInputAction tooltip={isStreaming ? 'Stop generation' : 'Send message'}>
              <Button
                variant="default"
                size="icon"
                className="size-8 rounded-full"
                onClick={handleSubmit}
                disabled={(!prompt.trim() && files.length === 0) || hasReachedLimit}
              >
                {isStreaming ? <SquareIcon className="size-4" /> : <ArrowUpIcon className="size-4" />}
              </Button>
            </PromptInputAction>
          </div>
        </PromptInputActions>
      </Input>
    </div>
  );

  return (
    <div
      className={cn(
        'h-full bg-background border-l border-sidebar-border overflow-hidden flex-shrink-0',
        isOpen ? 'w-[28rem]' : 'w-0 border-l-0'
      )}
    >
      <div className="h-full w-[28rem] flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-2 p-2 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center justify-between gap-2 px-2 py-0.5">
            <h2 className="text-sm font-semibold">Lyra</h2>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    aria-label="Expand Lyra"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link href="/assistant">
                      <Expand className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Expand</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close Lyra"
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {hasMessages ? (
          <>
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {/* AI Panel messages/content goes here */}
            </div>

            {/* Input at bottom */}
            <div className="flex-shrink-0 p-3">
              {InputBox}
            </div>
          </>
        ) : (
          /* Welcome state - centered */
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-40 -mt-8 mb-2 mask-b-from-100% mask-radial-[50%_50%] mask-radial-from-0%">
              {animationData && (
                <Lottie className="w-full" animationData={animationData} loop autoplay />
              )}
            </div>
            <h3 className="text-center text-base font-medium mb-6">
              Ask{' '}
              <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                Lyra
              </span>
            </h3>
            <div className="w-full">
              {InputBox}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
