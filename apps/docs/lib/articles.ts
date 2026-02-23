import fs from 'fs';
import path from 'path';
import { articleFiles } from './content';

const HELP_CENTER_DIR = path.join(process.cwd(), '..', '..', 'docs', 'help-center');

export function getArticleContent(slug: string): string | null {
  const filePath = articleFiles[slug];
  if (!filePath) return null;

  const fullPath = path.join(HELP_CENTER_DIR, filePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return null;
  }
}

// Simple markdown to HTML converter (no external deps)
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Remove the first H1 (we display it separately)
  html = html.replace(/^# .+\n*/m, '');

  // Screenshot placeholders
  html = html.replace(/^> \[Screenshot: (.+)\]$/gm, '<div class="screenshot-placeholder"><span>📸 $1</span></div>');

  // Blockquotes (must be before other processing)
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Tables
  html = html.replace(/\n(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g, (_match, header, _separator, body) => {
    const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (wrap remaining text blocks)
  html = html.replace(/^(?!<[hubltoq]|<div|<blockquote)(.+)$/gm, '<p>$1</p>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

// Extract title from markdown
export function extractTitle(markdown: string): string {
  const match = markdown.match(/^# (.+)$/m);
  return match ? match[1] : 'Untitled';
}

// Build search index
export function buildSearchIndex(): { slug: string; title: string; content: string; collectionSlug: string }[] {
  const { getAllArticles } = require('./content');
  const articles = getAllArticles();
  const index: { slug: string; title: string; content: string; collectionSlug: string }[] = [];

  for (const article of articles) {
    const content = getArticleContent(article.slug);
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
