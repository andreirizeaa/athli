'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CommandIcon,
  Search,
  FileText,
  BarChart,
  Activity,
  Dumbbell,
  Calendar,
  Layout,
  Layers,
  CheckSquare,
  MessageCircle,
  Users,
  ClipboardList,
  GitBranch,
  Loader2,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/general/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useGlobalSearch, type SearchCategory } from '@/hooks/use-global-search';

const INITIAL_SHOW_COUNT = 3;

const CATEGORY_ICONS: Record<SearchCategory, React.ElementType> = {
  athletes: Users,
  workouts: Dumbbell,
  programs: Layout,
  exercises: Activity,
  sections: Layers,
  checkIns: ClipboardList,
  questionnaires: FileText,
  files: FileText,
  habits: Calendar,
  metrics: BarChart,
  flows: GitBranch,
  todos: CheckSquare,
  messages: MessageCircle,
  clientSection: User,
};

export function SearchComponent() {
  const t = useTranslations();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { results, hasResults, isLoading } = useGlobalSearch(debouncedSearchQuery);
  const isSearching = isLoading || (searchQuery.trim().length > 0 && searchQuery !== debouncedSearchQuery);
  const showResults = hasResults && !isSearching;

  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingFromClick = useRef(false);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Set first category as active when results change
  useEffect(() => {
    if (results.length > 0) {
      setActiveSectionIndex(0);
    } else {
      setActiveSectionIndex(null);
    }
  }, [results]);

  // IntersectionObserver for TOC highlighting
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || results.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingFromClick.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = entry.target.getAttribute('data-section-index');
            if (idx !== null) setActiveSectionIndex(Number(idx));
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [results]);

  const handleTocClick = useCallback((index: number) => {
    const el = sectionRefs.current.get(index);
    if (!el) return;
    isScrollingFromClick.current = true;
    setActiveSectionIndex(index);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      isScrollingFromClick.current = false;
    }, 500);
  }, []);

  const handleResultClick = useCallback(
    (path: string) => {
      router.push(path);
      setIsSearchOpen(false);
      setSearchQuery('');
    },
    [router]
  );

  const handleCommandSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const setSectionRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(index, el);
    } else {
      sectionRefs.current.delete(index);
    }
  }, []);

  const getSectionLabel = (category: { key: SearchCategory; label: string }) => {
    // Client sections use the client name directly, not an i18n key
    if (category.key === 'clientSection') return category.label;
    return t(category.label);
  };

  return (
    <>
      {/* Header search bar trigger */}
      <div className="relative hidden max-w-xl flex-1 lg:block min-w-0">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder={t('sidebar.search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchOpen(true)}
          className="h-9 w-full cursor-pointer rounded-md border bg-sidebar pr-4 pl-10 text-sm shadow-xs"
          readOnly
        />
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          <CommandIcon className="size-3" />
          <span>k</span>
        </div>
      </div>

      {/* Mobile trigger */}
      <div className="block lg:hidden">
        <Button size="icon" variant="ghost" onClick={() => setIsSearchOpen(true)}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* Search dialog */}
      <CommandDialog
        open={isSearchOpen}
        onOpenChange={(open) => {
          setIsSearchOpen(open);
          if (!open) {
            setSearchQuery('');
          }
        }}
        className="sm:max-w-4xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('sidebar.search.placeholder')}
            value={searchQuery}
            onValueChange={handleCommandSearchChange}
          />
          <CommandList className="max-h-[80vh] min-h-[50vh] overflow-hidden">
            {/* Empty state */}
            {!searchQuery.trim() && (
              <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[400px]">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t('sidebar.search.emptyMessage')}
                </p>
              </div>
            )}

            {/* Loading state */}
            {searchQuery.trim() && !showResults && isSearching && (
              <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No results */}
            {searchQuery.trim() && !showResults && !isSearching && (
              <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                <p className="text-sm text-muted-foreground">
                  {t('sidebar.search.noResults')}{' '}
                  <span className="font-medium">&quot;{searchQuery}&quot;</span>.
                </p>
              </div>
            )}

            {/* AWS-style 2-panel layout */}
            {showResults && (
              <div className="flex min-h-[50vh] max-h-[calc(80vh-48px)]">
                {/* Left TOC - hidden on mobile */}
                <nav className="hidden sm:flex sm:flex-col w-44 shrink-0 overflow-y-auto pt-12 pl-6">
                  <div className="border-l border-border">
                    {results.map((category, index) => {
                      const isActive = activeSectionIndex === index;
                      return (
                        <button
                          key={`${category.key}-${index}`}
                          onClick={() => handleTocClick(index)}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-sm transition-colors truncate -ml-px',
                            isActive
                              ? 'border-l-2 border-primary font-bold text-primary'
                              : 'border-l-2 border-transparent text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {getSectionLabel(category)}
                        </button>
                      );
                    })}
                  </div>
                </nav>

                {/* Right scrollable results */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto py-2 pl-3 pr-6"
                >
                  {results.map((category, index) => {
                    const Icon = CATEGORY_ICONS[category.key];
                    const visibleItems = category.items.slice(0, INITIAL_SHOW_COUNT);

                    return (
                      <div
                        key={`${category.key}-${index}`}
                        ref={(el) => setSectionRef(index, el)}
                        data-section-index={index}
                        className="mb-4"
                      >
                        {/* Section header */}
                        <div className="flex items-end justify-between mb-2">
                          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            {category.key === 'clientSection' && category.avatarUrl && (
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={category.avatarUrl} alt={category.label} />
                                <AvatarFallback className="text-xs">
                                  {category.label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {getSectionLabel(category)}
                          </h3>
                          <button
                            onClick={() => handleResultClick(category.sectionPath)}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {t('sidebar.search.showMore')}
                          </button>
                        </div>

                        {/* Result cards */}
                        <div className="space-y-1.5">
                          {visibleItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick(item.path)}
                              className="w-full text-left rounded-md border p-2.5 hover:bg-accent transition-colors cursor-pointer flex items-center gap-2.5"
                            >
                              {item.avatarUrl ? (
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarImage src={item.avatarUrl} alt={item.name} />
                                  <AvatarFallback className="text-xs">
                                    {item.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {item.name}
                                </p>
                                {item.subtitle && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
