'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Archive, CommandIcon, Search, FileText, BarChart, Activity, Dumbbell, Calendar, Layout, Layers, CheckSquare, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/general/utils';
import { globalSearch, type SearchResults } from '@/api/settings/search/search-service';
import { useDebounce } from '@/hooks/use-debounce';

export function SearchComponent() {
  const t = useTranslations();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>({
    metrics: [],
    habits: [],
    files: [],
    workouts: [],
    programs: [],
    exercises: [],
    sections: [],
    todosYourList: [],
    todosAthliAssistant: [],
    conversations: [],
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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

  React.useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedSearchQuery.trim()) {
        setResults({
          metrics: [],
          habits: [],
          files: [],
          workouts: [],
          programs: [],
          exercises: [],
          sections: [],
          todosYourList: [],
          todosAthliAssistant: [],
          conversations: [],
        });
        return;
      }

      setIsLoading(true);
      try {
        const data = await globalSearch(debouncedSearchQuery);
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear results immediately when input is cleared
    if (!value.trim()) {
      setResults({
        metrics: [],
        habits: [],
        files: [],
        workouts: [],
        programs: [],
        exercises: [],
        sections: [],
        todosYourList: [],
        todosAthliAssistant: [],
        conversations: [],
      });
    }
  };

  const handleCommandSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear results immediately when input is cleared
    if (!value.trim()) {
      setResults({
        metrics: [],
        habits: [],
        files: [],
        workouts: [],
        programs: [],
        exercises: [],
        sections: [],
        todosYourList: [],
        todosAthliAssistant: [],
        conversations: [],
      });
    }
  };

  const handleWorkoutSearchResultClick = (workoutId: string) => {
    router.push(`/training/workouts/${workoutId}/edit`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleProgramSearchResultClick = (programId: string) => {
    router.push(`/training/programs/${programId}/edit`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleExerciseSearchResultClick = (exerciseId: string) => {
    router.push(`/training/exercises?exerciseId=${exerciseId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleFileSearchResultClick = (fileId: string) => {
    router.push(`/files`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleHabitSearchResultClick = (habitId: string) => {
    router.push(`/habits`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleMetricSearchResultClick = (metricId: string) => {
    router.push(`/metrics`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleSectionSearchResultClick = (sectionId: string) => {
    router.push(`/training/sections?sectionId=${sectionId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleTodoYourListSearchResultClick = () => {
    router.push(`/todo/your-list`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleTodoAthliAssistantSearchResultClick = () => {
    router.push(`/todo/athli-assistant`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleConversationSearchResultClick = (conversationId: string) => {
    router.push(`/inbox?conversationId=${conversationId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const hasResults =
    results.workouts.length > 0 ||
    results.programs.length > 0 ||
    results.exercises.length > 0 ||
    results.files.length > 0 ||
    results.habits.length > 0 ||
    results.metrics.length > 0 ||
    results.sections.length > 0 ||
    results.todosYourList.length > 0 ||
    results.todosAthliAssistant.length > 0 ||
    results.conversations.length > 0;

  const isSearching = isLoading || (searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0);

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
          className="h-9 w-full cursor-pointer rounded-md border bg-sidebar pr-4 pl-10 text-sm shadow-xs"
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
            onValueChange={handleCommandSearchChange}
            isLoading={isSearching}
          />
          <CommandList className="max-h-[80vh] min-h-[50vh]">
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
                {searchQuery.trim() && !hasResults && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                    <p className="text-sm text-muted-foreground">
                      {t('sidebar.search.noResults')}{' '}
                      <span className="font-medium">"{searchQuery}"</span>.
                    </p>
                  </div>
                )}

                {hasResults && (
                  <div className="py-2 space-y-4">
                    {/* Workouts */}
                    {results.workouts.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.workouts')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.workouts.map((workout: any) => (
                              <Card
                                key={workout.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleWorkoutSearchResultClick(workout.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {workout.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    {workout.type && <span>{workout.type}</span>}
                                    {workout.type && workout.equipment && workout.equipment.length > 0 && <span>•</span>}
                                    {workout.equipment && workout.equipment.length > 0 && (
                                      <span className="truncate">{workout.equipment.slice(0, 2).join(', ')}</span>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Programs */}
                    {results.programs.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.programs')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.programs.map((program: any) => (
                              <Card
                                key={program.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleProgramSearchResultClick(program.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <Layout className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {program.name}
                                    </span>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Exercises */}
                    {results.exercises.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.exercises')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.exercises.map((exercise: any) => (
                              <Card
                                key={exercise.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleExerciseSearchResultClick(exercise.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <Activity className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {exercise.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    {exercise.category && <span>{exercise.category}</span>}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    {results.files.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.files')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.files.map((file: any) => (
                              <Card
                                key={file.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleFileSearchResultClick(file.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {file.filename}
                                    </span>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Habits */}
                    {results.habits.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.habits')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.habits.map((habit: any) => (
                              <Card
                                key={habit.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleHabitSearchResultClick(habit.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full"
                              >
                                <div className="flex items-center justify-between gap-2 h-full">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {habit.name}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex-shrink-0">
                                    {habit.schedule_type && <span>{habit.schedule_type}</span>}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    {results.metrics.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            Metrics
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.metrics.map((metric: any) => (
                              <Card
                                key={metric.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleMetricSearchResultClick(metric.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full"
                              >
                                <div className="flex items-center justify-between gap-2 h-full">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <BarChart className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {metric.name}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex-shrink-0">
                                    {metric.unit && <span>{metric.unit}</span>}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sections */}
                    {results.sections.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.sections')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.sections.map((section: any) => (
                              <Card
                                key={section.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSectionSearchResultClick(section.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <Layers className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {section.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    {section.section_type && <span>{section.section_type}</span>}
                                    {section.section_type && section.number_of_exercises && <span>•</span>}
                                    {section.number_of_exercises && (
                                      <span>{section.number_of_exercises} {t('sidebar.search.exercisesCount')}</span>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Todos - Your List */}
                    {results.todosYourList.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.todosYourList')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.todosYourList.map((todo: any) => (
                              <Card
                                key={todo.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleTodoYourListSearchResultClick()}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {todo.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    {todo.type && <span>{todo.type}</span>}
                                    {todo.completed && <span>• Completed</span>}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Todos - Athli Assistant */}
                    {results.todosAthliAssistant.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.todosAthliAssistant')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.todosAthliAssistant.map((todo: any) => (
                              <Card
                                key={todo.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleTodoAthliAssistantSearchResultClick()}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {todo.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    {todo.type && <span>{todo.type}</span>}
                                    {todo.completed && <span>• Completed</span>}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conversations */}
                    {results.conversations.length > 0 && (
                      <div>
                        <div className="px-3 pb-2 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {t('sidebar.search.conversations')}
                          </p>
                          <div className="h-px bg-border" />
                        </div>
                        <div className="px-3">
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                            {results.conversations.map((conversation: any) => (
                              <Card
                                key={conversation.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleConversationSearchResultClick(conversation.id)}
                                className="cursor-pointer hover:bg-accent transition-colors p-3 h-full flex flex-col justify-center"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {conversation.client?.name || 'Unknown'}
                                    </span>
                                  </div>
                                  {conversation.last_message_preview && (
                                    <div className="text-xs text-muted-foreground px-1 truncate">
                                      {conversation.last_message_preview}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
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
