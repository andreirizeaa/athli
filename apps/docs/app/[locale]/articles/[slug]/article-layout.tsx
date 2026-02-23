'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { ChevronLeft } from 'lucide-react';

export function ArticleLayout({
  title,
  html,
  collectionSlug,
  collectionTitleKey,
  sectionTitleKey,
}: {
  title: string;
  html: string;
  collectionSlug: string;
  collectionTitleKey: string;
  sectionTitleKey?: string;
}) {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">
          {t('nav.helpCenter')}
        </Link>
        <span>/</span>
        <Link href={`/collections/${collectionSlug}`} className="hover:text-foreground transition-colors">
          {t(collectionTitleKey)}
        </Link>
        {sectionTitleKey && (
          <>
            <span>/</span>
            <span>{t(sectionTitleKey)}</span>
          </>
        )}
      </nav>

      {/* Back button */}
      <Link
        href={`/collections/${collectionSlug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="size-4" />
        {t('nav.backToCollection')}
      </Link>

      {/* Article title */}
      <h1 className="text-3xl font-bold tracking-tight mb-8">{title}</h1>

      {/* Article content */}
      <article
        className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:scroll-mt-20
          prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-base prose-p:leading-relaxed
          prose-li:text-base
          prose-table:text-sm
          prose-th:text-left prose-th:font-semibold prose-th:p-3 prose-th:border-b
          prose-td:p-3 prose-td:border-b
          prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic
          [&_.screenshot-placeholder]:my-4 [&_.screenshot-placeholder]:rounded-lg [&_.screenshot-placeholder]:border [&_.screenshot-placeholder]:border-dashed [&_.screenshot-placeholder]:border-muted-foreground/30 [&_.screenshot-placeholder]:bg-muted/50 [&_.screenshot-placeholder]:p-6 [&_.screenshot-placeholder]:text-center [&_.screenshot-placeholder]:text-sm [&_.screenshot-placeholder]:text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
