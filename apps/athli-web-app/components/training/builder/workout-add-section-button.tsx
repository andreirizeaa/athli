'use client';

import { Dumbbell, NotebookPen, Plus, Zap, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SectionType = 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom' | 'circuits' | 'auxiliary';

type WorkoutAddSectionButtonProps = {
  onSectionSelect: (type: SectionType) => void;
  variant?: 'default' | 'centered';
  size?: 'sm' | 'default';
};

export const WorkoutAddSectionButton = ({
  onSectionSelect,
  variant = 'default',
  size = 'sm',
}: WorkoutAddSectionButtonProps) => {
  const buttonContent = (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={size === 'sm' ? 'gap-1.5 text-xs h-7 px-2' : 'gap-2'}
      aria-label="Add new section"
    >
      <Plus className={size === 'sm' ? 'size-3' : 'size-4'} />
      <span>Add section</span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'centered' ? 'center' : 'start'}>
        <DropdownMenuItem onClick={() => onSectionSelect('auxiliary')}>
          <Zap className="mr-2 size-4 text-foreground" />
          Warm up / Cool down / Mobility
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSectionSelect('regular')}>
          <Dumbbell className="mr-2 size-4 text-foreground" />
          Regular
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSectionSelect('amrap')}>
          <NotebookPen className="mr-2 size-4 text-foreground" />
          AMRAP
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSectionSelect('tabata')}>
          <Activity className="mr-2 size-4 text-foreground" />
          Tabata
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSectionSelect('hiit')}>
          <Zap className="mr-2 size-4 text-foreground" />
          HIIT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSectionSelect('emom')}>
          <Clock className="mr-2 size-4 text-foreground" />
          EMOM
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
