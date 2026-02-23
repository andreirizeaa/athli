import fs from 'fs';
import path from 'path';
import { articleFiles } from './content';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export function getArticleContent(slug: string, locale: string = 'en'): string | null {
  const filePath = articleFiles[slug];
  if (!filePath) return null;

  // Try localized version first
  const localizedPath = path.join(CONTENT_DIR, locale, filePath);
  try {
    return fs.readFileSync(localizedPath, 'utf-8');
  } catch {
    // Fall back to English
    if (locale !== 'en') {
      const englishPath = path.join(CONTENT_DIR, 'en', filePath);
      try {
        return fs.readFileSync(englishPath, 'utf-8');
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Extract title from markdown
export function extractTitle(markdown: string): string {
  const match = markdown.match(/^# (.+)$/m);
  return match ? match[1] : 'Untitled';
}

// Build search index
export function buildSearchIndex(locale: string = 'en'): { slug: string; title: string; content: string; collectionSlug: string }[] {
  const { getAllArticles } = require('./content');
  const articles = getAllArticles();
  const index: { slug: string; title: string; content: string; collectionSlug: string }[] = [];

  for (const article of articles) {
    const content = getArticleContent(article.slug, locale);
    if (content) {
      index.push({
        slug: article.slug,
        title: extractTitle(content),
        content: content.replace(/[#*`|>\[\]()_-]/g, ' ').replace(/\s+/g, ' ').trim(),
        collectionSlug: article.collectionSlug,
      });
    }
  }

  return index;
}
