'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';

interface FolderSearchButtonProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const FolderSearchButton = forwardRef<HTMLButtonElement, FolderSearchButtonProps>(({
  value,
  onChange,
  placeholder = 'Search across folders',
  className,
}, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCollapse();
    }
  };

  // When expanded, render the search input
  if (isExpanded) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'relative flex items-center w-[200px] transition-all duration-200 ease-in-out',
          className
        )}
      >
        <Search className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-8 pr-8 h-9 text-sm border-primary rounded-r-none bg-transparent"
        />
        <button
          type="button"
          onClick={handleCollapse}
          className="absolute right-2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  // When collapsed, render just the button (no wrapper) so ButtonGroup styles work
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          className={cn("h-9 w-9 border border-primary", className)}
        >
          <Search className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Search across folders</TooltipContent>
    </Tooltip>
  );
});

FolderSearchButton.displayName = 'FolderSearchButton';
