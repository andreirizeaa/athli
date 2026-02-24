import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getArticleContent, extractTitle, resolveScreenshots, resolveInternalLinks } from '@/lib/articles';
import { findArticle, findNextArticle, getAllArticles, articleFiles } from '@/lib/content';
import { ArticleLayout } from './article-layout';

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const content = getArticleContent(slug, locale);
  if (!content) return {};

  const title = extractTitle(content);
  return {
    title: `${title} - Athli Help Center`,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const rawContent = getArticleContent(slug, locale);
  if (!rawContent) notFound();

  const info = findArticle(slug);
  if (!info) notFound();

  const title = extractTitle(rawContent);
  const content = resolveInternalLinks(resolveScreenshots(rawContent, info.collection.slug, slug));
  const filePath = articleFiles[slug] ?? '';
  const isMobileArticle =
    (filePath.startsWith('client-mobile/') || filePath.startsWith('coach-mobile/')) &&
    slug !== 'client-getting-started';
  const nextArticle = findNextArticle(slug);

  return (
    <ArticleLayout
      title={title}
      content={content}
      collectionSlug={info.collection.slug}
      collectionTitleKey={info.collection.titleKey}
      sectionTitleKey={info.section?.titleKey}
      isMobileArticle={isMobileArticle}
      nextArticle={nextArticle ? { slug: nextArticle.slug, titleKey: nextArticle.titleKey } : undefined}
    />
  );
}
