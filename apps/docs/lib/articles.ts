import fs from 'fs';
import path from 'path';
import { articleFiles, collections } from './content';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg']);

// Build a map from "collectionSlug/articleSlug" to the prefixed screenshot folder path.
// e.g. "training/workout-builder" → "02-training/01-workout-builder"
const screenshotPathMap: Record<string, string> = {};
collections.forEach((collection, collectionIndex) => {
  const collectionPrefix = String(collectionIndex + 1).padStart(2, '0');
  let articleIndex = 1;
  const mapArticles = (articles: { slug: string }[]) => {
    for (const article of articles) {
      const articlePrefix = String(articleIndex).padStart(2, '0');
      screenshotPathMap[`${collection.slug}/${article.slug}`] =
        `${collectionPrefix}-${collection.slug}/${articlePrefix}-${article.slug}`;
      articleIndex++;
    }
  };
  if (collection.articles) mapArticles(collection.articles);
  if (collection.sections) {
    for (const section of collection.sections) {
      mapArticles(section.articles);
    }
  }
});

/**
 * Resolves screenshot placeholders in markdown content.
 * Replaces `> [Screenshot N: description]` with actual image markdown
 * by finding the first image file in `public/screenshots/{collection}/{NN-article}/N/`.
 */
export function resolveScreenshots(content: string, collectionSlug: string, articleSlug: string): string {
  const basePath = screenshotPathMap[`${collectionSlug}/${articleSlug}`];
  if (!basePath) return content;

  // Resolve side-by-side screenshots: > [Screenshot N+M: desc1 | desc2]
  let resolved = content.replace(
    /^> \[Screenshot (\d+)\+(\d+): (.+) \| (.+)\]$/gm,
    (_match, id1: string, id2: string, desc1: string, desc2: string) => {
      const srcs: string[] = [];
      for (const id of [id1, id2]) {
        const dir = path.join(SCREENSHOTS_DIR, basePath, id);
        try {
          const files = fs.readdirSync(dir);
          const image = files.find((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
          if (image) {
            srcs.push(`/screenshots/${basePath}/${id}/${encodeURIComponent(image)}`);
            continue;
          }
        } catch { /* empty */ }
        return _match; // Keep original if any image missing
      }
      return `![${desc1};;${desc2}](${srcs[0]};;${srcs[1]})`;
    },
  );

  // Resolve single screenshots: > [Screenshot N: description]
  resolved = resolved.replace(
    /^> \[Screenshot (\d+): (.+)\]$/gm,
    (_match, id: string, description: string) => {
      const dir = path.join(SCREENSHOTS_DIR, basePath, id);
      try {
        const files = fs.readdirSync(dir);
        const image = files.find((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
        if (image) {
          return `![${description}](/screenshots/${basePath}/${id}/${encodeURIComponent(image)})`;
        }
      } catch {
        // Folder doesn't exist or can't be read
      }
      // Keep as placeholder if no image found
      return `> [Screenshot: ${description}]`;
    },
  );

  return resolved;
}

// Reverse map: markdown filename (e.g. "02-creating-your-account.md") → article slug
const fileNameToSlug: Record<string, string> = {};
for (const [slug, filePath] of Object.entries(articleFiles)) {
  const basename = path.basename(filePath);
  fileNameToSlug[basename] = slug;
}

/**
 * Resolves internal markdown links (e.g. `[text](02-creating-your-account.md)`)
 * to proper article URLs (e.g. `[text](/articles/creating-your-account)`).
 */
export function resolveInternalLinks(content: string): string {
  return content.replace(
    /\[([^\]]+)\]\(([^)]+\.md)\)/g,
    (_match, text: string, href: string) => {
      const basename = path.basename(href);
      const slug = fileNameToSlug[basename];
      if (slug) {
        return `[${text}](/articles/${slug})`;
      }
      return _match;
    },
  );
}

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
