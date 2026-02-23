'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { findArticle } from '@/lib/content';

type SearchResult = {
  slug: string;
  title: string;
  snippet: string;
  collectionSlug: string;
};

export function SearchBar({ variant = 'hero' }: { variant?: 'hero' | 'header' }) {
  const t = useTranslations();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState<{ slug: string; title: string; content: string; collectionSlug: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search index
  useEffect(() => {
    fetch(`/api/search-index?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => setSearchIndex(data))
      .catch(() => {});
  }, [locale]);

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

  // Fuzzy match - checks if query words match the start of any words in text
  const fuzzyMatch = (text: string, query: string): boolean => {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase().trim();

    // Direct inclusion check first
    if (textLower.includes(queryLower)) return true;

    // Split query into words and check if each word matches start of any word in text
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    const textWords = textLower.split(/\s+/);

    return queryWords.every(qWord =>
      textWords.some(tWord => tWord.startsWith(qWord))
    );
  };

  // Find the sentence containing the match
  const findMatchingSentence = (content: string, query: string): string => {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

    // Split into sentences (roughly)
    const sentences = content.split(/(?<=[.!?])\s+/);

    // Find first sentence that contains any query word
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const hasMatch = queryWords.some(qWord => {
        // Check if any word in sentence starts with query word
        const words = sentenceLower.split(/\s+/);
        return words.some(w => w.startsWith(qWord)) || sentenceLower.includes(qWord);
      });

      if (hasMatch) {
        // Trim to reasonable length, never start with ellipsis
        if (sentence.length > 150) {
          return sentence.slice(0, 150).trim() + '...';
        }
        return sentence.trim();
      }
    }

    // Fallback to first 150 chars
    return content.slice(0, 150).trim() + (content.length > 150 ? '...' : '');
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    // Score and filter results
    const scored = searchIndex
      .map((item) => {
        let score = 0;
        const queryLower = q.toLowerCase();

        // Title exact match (highest priority)
        if (item.title.toLowerCase().includes(queryLower)) {
          score += 100;
        }
        // Title fuzzy match
        else if (fuzzyMatch(item.title, q)) {
          score += 50;
        }

        // Content exact match
        if (item.content.toLowerCase().includes(queryLower)) {
          score += 30;
        }
        // Content fuzzy match
        else if (fuzzyMatch(item.content, q)) {
          score += 10;
        }

        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        snippet: findMatchingSentence(item.content, q),
        collectionSlug: item.collectionSlug,
      }));

    setResults(scored);
    setIsOpen(true);
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

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border bg-background shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            results.map((result) => {
              const info = findArticle(result.slug);
              return (
                <Link
                  key={result.slug}
                  href={`/articles/${result.slug}`}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground text-left">{result.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-left line-clamp-2">{result.snippet}</p>
                    {info && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-left">{t(info.collection.titleKey)}</p>
                    )}
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground mt-1 shrink-0" />
                </Link>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
