'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, NotebookPen, Activity, Zap, Clock } from 'lucide-react';

type SectionType = 'regular' | 'amrap' | 'tabata' | 'hiit' | 'emom';

type SectionSelectionPanelProps = {
  onSectionSelect: (type: SectionType) => void;
};

export const SectionSelectionPanel = ({ onSectionSelect }: SectionSelectionPanelProps) => {
  const handleKeyDown = (e: React.KeyboardEvent, type: SectionType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSectionSelect(type);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSectionSelect('regular')}
        onKeyDown={(e) => handleKeyDown(e, 'regular')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select Regular section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="size-4 text-foreground" />
            Regular
          </CardTitle>
          <CardDescription>
            Exercise for exercise. Follow the sets and reps specified.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSectionSelect('amrap')}
        onKeyDown={(e) => handleKeyDown(e, 'amrap')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select AMRAP section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotebookPen className="size-4 text-foreground" />
            AMRAP
          </CardTitle>
          <CardDescription>
            Track the total amount of rounds completed in the allocated time.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSectionSelect('tabata')}
        onKeyDown={(e) => handleKeyDown(e, 'tabata')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select Tabata section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-foreground" />
            Tabata
          </CardTitle>
          <CardDescription>
            High-intensity intervals: 20s work, 10s rest, 8 rounds.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSectionSelect('hiit')}
        onKeyDown={(e) => handleKeyDown(e, 'hiit')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select HIIT section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-4 text-foreground" />
            HIIT
          </CardTitle>
          <CardDescription>
            High-intensity interval training with customizable work/rest periods.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSectionSelect('emom')}
        onKeyDown={(e) => handleKeyDown(e, 'emom')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select EMOM section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-foreground" />
            EMOM
          </CardTitle>
          <CardDescription>
            Every Minute On the Minute with set duration.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
