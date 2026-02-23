'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { collections, findArticle } from '@/lib/content';

type SearchResult = {
  slug: string;
  title: string;
  snippet: string;
  collectionSlug: string;
};

export function SearchBar({ variant = 'hero' }: { variant?: 'hero' | 'header' }) {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState<{ slug: string; title: string; content: string; collectionSlug: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search index
  useEffect(() => {
    fetch('/api/search-index')
      .then((res) => res.json())
      .then((data) => setSearchIndex(data))
      .catch(() => {});
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const lower = q.toLowerCase();
    const matched = searchIndex
      .filter((item) => item.title.toLowerCase().includes(lower) || item.content.toLowerCase().includes(lower))
      .slice(0, 8)
      .map((item) => {
        const idx = item.content.toLowerCase().indexOf(lower);
        const start = Math.max(0, idx - 40);
        const end = Math.min(item.content.length, idx + q.length + 60);
        const snippet = (start > 0 ? '...' : '') + item.content.slice(start, end) + (end < item.content.length ? '...' : '');
        return { slug: item.slug, title: item.title, snippet, collectionSlug: item.collectionSlug };
      });

    setResults(matched);
    setIsOpen(matched.length > 0);
  };

  const isHero = variant === 'hero';

  return (
    <div className={`relative ${isHero ? 'w-full max-w-2xl mx-auto' : 'w-full max-w-md'}`} ref={containerRef}>
      <div className={`relative flex items-center ${isHero ? 'rounded-xl border bg-background shadow-sm' : 'rounded-lg border bg-background/80'}`}>
        <Search className={`${isHero ? 'ml-4 size-5' : 'ml-3 size-4'} text-muted-foreground shrink-0`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder={t('search.placeholder')}
          className={`flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground ${isHero ? 'px-3 py-4 text-base' : 'px-2.5 py-2.5 text-sm'}`}
        />
        {query ? (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="mr-3 p-1 rounded hover:bg-muted">
            <X className="size-4 text-muted-foreground" />
          </button>
        ) : (
          <kbd className={`mr-3 hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground ${isHero ? '' : 'text-[10px]'}`}>
            ⌘K
          </kbd>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border bg-background shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
          {results.map((result) => {
            const info = findArticle(result.slug);
            return (
              <Link
                key={result.slug}
                href={`/articles/${result.slug}`}
                onClick={() => { setIsOpen(false); setQuery(''); }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{result.snippet}</p>
                  {info && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{t(info.collection.titleKey)}</p>
                  )}
                </div>
                <ArrowRight className="size-4 text-muted-foreground mt-1 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
