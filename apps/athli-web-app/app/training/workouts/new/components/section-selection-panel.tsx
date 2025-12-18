'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, NotebookPen, Repeat, Sparkles, Timer } from 'lucide-react';

type SectionType = 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';

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
        onClick={() => onSectionSelect('auxiliary')}
        onKeyDown={(e) => handleKeyDown(e, 'auxiliary')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select Warm up / Cool down / Mobility section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-foreground" />
            Warm up / Cool down / Mobility
          </CardTitle>
          <CardDescription>
            Warm up, cool down, or mobility exercises. Follow the sets and reps specified.
          </CardDescription>
        </CardHeader>
      </Card>
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
        onClick={() => onSectionSelect('timed')}
        onKeyDown={(e) => handleKeyDown(e, 'timed')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select Timed section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="size-4 text-foreground" />
            Timed
          </CardTitle>
          <CardDescription>
            Track total duration until completion of assigned rounds.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSectionSelect('circuits')}
        onKeyDown={(e) => handleKeyDown(e, 'circuits')}
        className="cursor-pointer transition-colors hover:bg-accent"
        aria-label="Select Circuits section type"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="size-4 text-foreground" />
            Circuits
          </CardTitle>
          <CardDescription>
            Complete all exercises in the circuit for the specified number of rounds. One set per exercise.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
