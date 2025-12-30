'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { GripVertical, Grid2x2, List, Play, Search, X } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import { searchExercises, type Exercise } from '@/api/exercise/exercise-search';

type ExerciseSelectionPanelProps = {
  onExerciseClick?: (exercise: Exercise) => void;
  onDragStart?: (exercise: Exercise) => void;
  onDragEnd?: () => void;
  activeExerciseIds?: Set<string>;
};

export const ExerciseSelectionPanel = ({
  onExerciseClick,
  onDragStart,
  onDragEnd,
  activeExerciseIds = new Set(),
}: ExerciseSelectionPanelProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const exerciseResults = useMemo(() => searchExercises(searchQuery), [searchQuery]);

  const handleExerciseClick = (exercise: Exercise) => {
    if (onExerciseClick) {
      onExerciseClick(exercise);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search for exercises.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-9 w-full', searchQuery && 'pr-9')}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {exerciseResults.length} {exerciseResults.length === 1 ? 'exercise' : 'exercises'}
          </span>
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  size="sm"
                  className={cn(
                    'h-7',
                    viewMode === 'list' && 'bg-primary text-primary-foreground'
                  )}
                  aria-label="List view"
                >
                  <List className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>List view</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  onClick={() => setViewMode('card')}
                  size="sm"
                  className={cn(
                    'h-7',
                    viewMode === 'card' && 'bg-primary text-primary-foreground'
                  )}
                  aria-label="Card view"
                >
                  <Grid2x2 className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Card view</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </div>
      </div>
      {viewMode === 'list' ? (
        <div className="flex flex-col gap-2 mt-4 overflow-y-auto flex-1 min-h-0 -mr-3 pr-3">
          {exerciseResults.slice(0, 40).map((exercise) => (
            <Card
              key={exercise.exerciseId}
              draggable
              onDragStart={() => onDragStart?.(exercise)}
              onDragEnd={onDragEnd}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-grab active:cursor-grabbing transition-colors overflow-hidden min-h-[60px] h-[60px] rounded-md shadow-none group/card bg-card hover:border-primary border py-0 gap-0"
              )}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                const isThumbnail = target.closest('.group\\/thumbnail');
                if (!isThumbnail) {
                  e.currentTarget.classList.add('bg-accent');
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('bg-accent');
              }}
              aria-label={`Select ${exercise.name} exercise`}
            >
              <div className="flex items-center gap-2 py-2 px-3 h-full">
                <div
                  className="relative w-12 h-12 flex-shrink-0 rounded cursor-pointer group/thumbnail"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExerciseClick(exercise);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExerciseClick(exercise);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                    if (card) {
                      card.classList.remove('bg-accent');
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                    if (card) {
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (!card.contains(relatedTarget)) {
                        card.classList.remove('bg-accent');
                      } else if (!relatedTarget?.closest('.group\\/thumbnail')) {
                        card.classList.add('bg-accent');
                      }
                    }
                  }}
                  aria-label={`Play video for ${exercise.name}`}
                >
                  <Image
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    fill
                    className="object-cover rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumbnail:bg-black/30 transition-colors rounded">
                    <div className="opacity-0 group-hover/thumbnail:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5">
                      <Play className="size-3 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">{exercise.name}</CardTitle>
                </div>
                <GripVertical className="size-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 mt-4 overflow-y-auto flex-1 min-h-0 items-start -mr-3 pr-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', alignContent: 'start' }}>
          {exerciseResults.slice(0, 40).map((exercise) => (
            <Card
              key={exercise.exerciseId}
              draggable
              onDragStart={() => onDragStart?.(exercise)}
              onDragEnd={onDragEnd}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-grab active:cursor-grabbing overflow-hidden rounded-md shadow-none flex flex-col group/card p-0 gap-0 h-[135px] min-w-[100px] bg-card hover:border-primary border"
              )}
              aria-label={`Select ${exercise.name} exercise`}
            >
              <div className="relative w-full h-[80px] flex-shrink-0">
                <Image
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors cursor-pointer group/video"
                  onClick={() => handleExerciseClick(exercise)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleExerciseClick(exercise);
                    }
                  }}
                  aria-label={`Play video for ${exercise.name}`}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                    if (card) {
                      card.classList.add('bg-accent');
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                    if (card) {
                      card.classList.remove('bg-accent');
                    }
                  }}
                >
                  <div className="opacity-0 group-hover/video:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
                    <Play className="size-4 text-white fill-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 flex-shrink-0 px-2 py-2 flex items-start min-h-0">
                <CardTitle className="text-sm font-medium line-clamp-2 break-words">{exercise.name}</CardTitle>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

