import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getArticleContent, markdownToHtml, extractTitle } from '@/lib/articles';
import { findArticle, getAllArticles } from '@/lib/content';
import { ArticleLayout } from './article-layout';

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const content = getArticleContent(slug);
  if (!content) notFound();

  const info = findArticle(slug);
  if (!info) notFound();

  const title = extractTitle(content);
  const html = markdownToHtml(content);

  return (
    <ArticleLayout
      title={title}
      html={html}
      collectionSlug={info.collection.slug}
      collectionTitleKey={info.collection.titleKey}
      sectionTitleKey={info.section?.titleKey}
    />
  );
}
