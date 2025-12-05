'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Archive, CommandIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { isFuzzyMatch } from './utils';
import {
  mockAthletes,
  mockContacts,
  mockWorkouts,
  mockPrograms,
  mockExercises,
  mockMessages,
} from './mock-data';
import type { Athlete, Contact, Workout, Program, Exercise } from './types';

export function SearchComponent() {
  const t = useTranslations();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isClient, setIsClient] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const messageSearchResults = React.useMemo(
    () =>
      mockContacts.reduce<Array<{ contact: Contact }>>((results, contact) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const contactMessages = mockMessages[contact.id] ?? [];
        const hasMatchInContact =
          isFuzzyMatch(contact.name, query) || isFuzzyMatch(contact.lastMessage, query);

        const matchingMessage = contactMessages.find((message) =>
          isFuzzyMatch(message.text, query)
        );

        if (!hasMatchInContact && !matchingMessage) {
          return results;
        }

        results.push({
          contact,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const athleteSearchResults = React.useMemo(
    () =>
      mockAthletes.reduce<Array<{ athlete: Athlete }>>((results, athlete) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInAthlete =
          isFuzzyMatch(athlete.name, query) ||
          isFuzzyMatch(athlete.email, query) ||
          isFuzzyMatch(athlete.phone, query) ||
          isFuzzyMatch(athlete.country, query) ||
          isFuzzyMatch(athlete.category, query);

        if (!hasMatchInAthlete) {
          return results;
        }

        results.push({
          athlete,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const workoutSearchResults = React.useMemo(
    () =>
      mockWorkouts.reduce<Array<{ workout: Workout }>>((results, workout) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInWorkout =
          isFuzzyMatch(workout.program, query) ||
          isFuzzyMatch(workout.description, query) ||
          isFuzzyMatch(workout.type, query) ||
          isFuzzyMatch(workout.equipment, query);

        if (!hasMatchInWorkout) {
          return results;
        }

        results.push({
          workout,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const programSearchResults = React.useMemo(
    () =>
      mockPrograms.reduce<Array<{ program: Program }>>((results, program) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInProgram =
          isFuzzyMatch(program.program, query) ||
          isFuzzyMatch(program.description, query) ||
          isFuzzyMatch(program.type, query) ||
          isFuzzyMatch(program.equipment, query);

        if (!hasMatchInProgram) {
          return results;
        }

        results.push({
          program,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const exerciseSearchResults = React.useMemo(
    () =>
      mockExercises.reduce<Array<{ exercise: Exercise }>>((results, exercise) => {
        const query = searchQuery.trim();

        if (!query) {
          return results;
        }

        const hasMatchInExercise =
          isFuzzyMatch(exercise.program, query) ||
          isFuzzyMatch(exercise.description, query) ||
          isFuzzyMatch(exercise.category, query) ||
          isFuzzyMatch(exercise.equipment, query) ||
          isFuzzyMatch(exercise.modality, query) ||
          exercise.muscleGroup.some((group) => isFuzzyMatch(group, query));

        if (!hasMatchInExercise) {
          return results;
        }

        results.push({
          exercise,
        });

        return results;
      }, []),
    [searchQuery]
  );

  const handleSearchResultClick = (contactId: string) => {
    router.push(`/messaging/${contactId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleAthleteSearchResultClick = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/overview`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleWorkoutSearchResultClick = (workoutId: string) => {
    router.push(`/library/workouts/${workoutId}/edit/standard`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleProgramSearchResultClick = (programId: string) => {
    router.push(`/library/programs/${programId}/edit`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleExerciseSearchResultClick = (exerciseId: string) => {
    router.push(`/library/exercises`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <div className="relative hidden max-w-xl flex-1 lg:block min-w-0">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder={t('sidebar.search.placeholder')}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setIsSearchOpen(true)}
          className="h-9 w-full cursor-pointer rounded-md border pr-4 pl-10 text-sm shadow-xs"
        />
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          <CommandIcon className="size-3" />
          <span>k</span>
        </div>
      </div>
      <div className="block lg:hidden">
        <Button size="icon" variant="ghost" onClick={() => setIsSearchOpen(true)}>
          <Search className="size-4" />
        </Button>
      </div>
      <CommandDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        className="sm:max-w-3xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('sidebar.search.placeholder') || 'Type a command or search...'}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[80vh]">
            <div className="flex flex-col">
              <div className="flex flex-col max-h-[80vh] overflow-y-auto">
                {!searchQuery.trim() && (
                  <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[400px]">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {t('sidebar.search.emptyMessage')}
                    </p>
                  </div>
                )}
                {searchQuery.trim() &&
                  messageSearchResults.length === 0 &&
                  athleteSearchResults.length === 0 &&
                  workoutSearchResults.length === 0 &&
                  programSearchResults.length === 0 &&
                  exerciseSearchResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                      <p className="text-sm text-muted-foreground">
                        {t('sidebar.search.noResults')}{' '}
                        <span className="font-medium">"{searchQuery}"</span>.
                      </p>
                    </div>
                  )}
                {searchQuery.trim() &&
                  (messageSearchResults.length > 0 ||
                    athleteSearchResults.length > 0 ||
                    workoutSearchResults.length > 0 ||
                    programSearchResults.length > 0 ||
                    exerciseSearchResults.length > 0) && (
                    <div className="py-2">
                      {athleteSearchResults.length > 0 && (
                        <>
                          <div className="px-3 pb-1 pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('sidebar.search.athletes')}
                            </p>
                          </div>
                          <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                            <div
                              className={cn(
                                'grid gap-2',
                                athleteSearchResults.length === 1
                                  ? 'grid-cols-1'
                                  : athleteSearchResults.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2 sm:grid-cols-3'
                              )}
                            >
                              {athleteSearchResults.map((result) => {
                                const initials = result.athlete.name
                                  .split(' ')
                                  .map((part) => part.charAt(0).toUpperCase())
                                  .slice(0, 2)
                                  .join('');
                                return (
                                  <Card
                                    key={result.athlete.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      handleAthleteSearchResultClick(result.athlete.id)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleAthleteSearchResultClick(result.athlete.id);
                                      }
                                    }}
                                    className="cursor-pointer hover:bg-accent transition-colors p-3"
                                    aria-label={t('sidebar.search.openProfileAria', {
                                      name: result.athlete.name,
                                    })}
                                  >
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8 rounded-md">
                                          <AvatarImage
                                            src={result.athlete.avatar}
                                            alt={result.athlete.name}
                                          />
                                          <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium truncate">
                                          {result.athlete.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{result.athlete.category}</span>
                                        <span>•</span>
                                        <span>{result.athlete.country}</span>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                      {workoutSearchResults.length > 0 && (
                        <>
                          {athleteSearchResults.length > 0 && (
                            <div className="px-3 pt-4 pb-1">
                              <div className="h-px bg-border" />
                            </div>
                          )}
                          <div className="px-3 pb-1 pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('sidebar.search.workouts')}
                            </p>
                          </div>
                          <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                            <div
                              className={cn(
                                'grid gap-2',
                                workoutSearchResults.length === 1
                                  ? 'grid-cols-1'
                                  : workoutSearchResults.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2 sm:grid-cols-3'
                              )}
                            >
                              {workoutSearchResults.map((result) => (
                                <Card
                                  key={result.workout.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    handleWorkoutSearchResultClick(result.workout.id)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleWorkoutSearchResultClick(result.workout.id);
                                    }
                                  }}
                                  className="cursor-pointer hover:bg-accent transition-colors p-3"
                                  aria-label={t('sidebar.search.openWorkoutAria', {
                                    name: result.workout.program,
                                  })}
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                        <Archive className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <span className="text-sm font-medium truncate">
                                        {result.workout.program}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{result.workout.type}</span>
                                      <span>•</span>
                                      <span>{result.workout.length}</span>
                                      <span>•</span>
                                      <span>
                                        {result.workout.totalExercises}{' '}
                                        {t('sidebar.search.exercises')}
                                      </span>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      {programSearchResults.length > 0 && (
                        <>
                          {(athleteSearchResults.length > 0 ||
                            workoutSearchResults.length > 0) && (
                            <div className="px-3 pt-4 pb-1">
                              <div className="h-px bg-border" />
                            </div>
                          )}
                          <div className="px-3 pb-1 pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('sidebar.search.programs')}
                            </p>
                          </div>
                          <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                            <div
                              className={cn(
                                'grid gap-2',
                                programSearchResults.length === 1
                                  ? 'grid-cols-1'
                                  : programSearchResults.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2 sm:grid-cols-3'
                              )}
                            >
                              {programSearchResults.map((result) => (
                                <Card
                                  key={result.program.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    handleProgramSearchResultClick(result.program.id)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleProgramSearchResultClick(result.program.id);
                                    }
                                  }}
                                  className="cursor-pointer hover:bg-accent transition-colors p-3"
                                  aria-label={t('sidebar.search.openProgramAria', {
                                    name: result.program.program,
                                  })}
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                        <Archive className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <span className="text-sm font-medium truncate">
                                        {result.program.program}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{result.program.type}</span>
                                      <span>•</span>
                                      <span>{result.program.length}</span>
                                      <span>•</span>
                                      <span>
                                        {result.program.totalExercises}{' '}
                                        {t('sidebar.search.exercisesCount')}
                                      </span>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      {exerciseSearchResults.length > 0 && (
                        <>
                          {(athleteSearchResults.length > 0 ||
                            workoutSearchResults.length > 0 ||
                            programSearchResults.length > 0) && (
                            <div className="px-3 pt-4 pb-1">
                              <div className="h-px bg-border" />
                            </div>
                          )}
                          <div className="px-3 pb-1 pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('sidebar.search.exercises')}
                            </p>
                          </div>
                          <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                            <div
                              className={cn(
                                'grid gap-2',
                                exerciseSearchResults.length === 1
                                  ? 'grid-cols-1'
                                  : exerciseSearchResults.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2 sm:grid-cols-3'
                              )}
                            >
                              {exerciseSearchResults.map((result) => (
                                <Card
                                  key={result.exercise.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    handleExerciseSearchResultClick(result.exercise.id)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleExerciseSearchResultClick(result.exercise.id);
                                    }
                                  }}
                                  className="cursor-pointer hover:bg-accent transition-colors p-3"
                                  aria-label={t('sidebar.search.openExerciseAria', {
                                    name: result.exercise.program,
                                  })}
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                        <Archive className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <span className="text-sm font-medium truncate">
                                        {result.exercise.program}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{result.exercise.modality}</span>
                                      <span>•</span>
                                      <span>{result.exercise.equipment}</span>
                                      <span>•</span>
                                      <span>{result.exercise.muscleGroup.slice(0, 2).join(', ')}</span>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      {messageSearchResults.length > 0 && (
                        <>
                          {(athleteSearchResults.length > 0 ||
                            workoutSearchResults.length > 0 ||
                            programSearchResults.length > 0 ||
                            exerciseSearchResults.length > 0) && (
                            <div className="px-3 pt-4 pb-1">
                              <div className="h-px bg-border" />
                            </div>
                          )}
                          <div className="px-3 pb-1 pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('sidebar.search.messages')}
                            </p>
                          </div>
                          <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                            <div
                              className={cn(
                                'grid gap-2',
                                messageSearchResults.length === 1
                                  ? 'grid-cols-1'
                                  : messageSearchResults.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2 sm:grid-cols-3'
                              )}
                            >
                              {messageSearchResults.map((result) => {
                                const initials = result.contact.name
                                  .split(' ')
                                  .map((part) => part.charAt(0).toUpperCase())
                                  .slice(0, 2)
                                  .join('');
                                return (
                                  <Card
                                    key={result.contact.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSearchResultClick(result.contact.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSearchResultClick(result.contact.id);
                                      }
                                    }}
                                    className="cursor-pointer hover:bg-accent transition-colors p-3"
                                    aria-label={t('sidebar.search.openConversationAria', {
                                      name: result.contact.name,
                                    })}
                                  >
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8 rounded-md">
                                          <AvatarImage
                                            src={result.contact.avatar}
                                            alt={result.contact.name}
                                          />
                                          <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium truncate">
                                          {result.contact.name}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {result.contact.lastMessage}
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

