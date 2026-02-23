'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Markdown } from '@/components/markdown';
import { TableOfContents } from '@/components/table-of-contents';

export function ArticleLayout({
  title,
  content,
  collectionSlug,
  collectionTitleKey,
  sectionTitleKey,
}: {
  title: string;
  content: string;
  collectionSlug: string;
  collectionTitleKey: string;
  sectionTitleKey?: string;
}) {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-0">
        {/* Main content */}
        <div className="min-w-0 rounded-l-xl bg-white p-6 sm:p-8 dark:bg-neutral-950 lg:border lg:border-r-0">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm text-foreground mb-6 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">
              {t('nav.helpCenter')}
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href={`/collections/${collectionSlug}`} className="hover:text-primary transition-colors">
              {t(collectionTitleKey)}
            </Link>
            {sectionTitleKey && (
              <>
                <span className="text-muted-foreground">/</span>
                <span>{t(sectionTitleKey)}</span>
              </>
            )}
          </nav>

          {/* Back button */}
          <Link
            href={`/collections/${collectionSlug}`}
            className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors mb-6"
          >
            <ChevronLeft className="size-4" />
            {t('nav.backToCollection')}
          </Link>

          {/* Article title */}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

          {/* Author info */}
          <div className="mt-4 mb-8 flex items-center gap-2">
            <Image
              src="/andrei.jpg"
              alt="Andrei"
              width={120}
              height={120}
              quality={100}
              className="size-10 rounded-full object-cover"
            />
            <span className="text-sm text-muted-foreground">
              {t('author.writtenBy')} Andrei
            </span>
          </div>

          {/* Article content */}
          <article className="max-w-none">
            <Markdown content={content} />
          </article>

          {/* Back button */}
          <Link
            href={`/collections/${collectionSlug}`}
            className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors mt-12"
          >
            <ChevronLeft className="size-4" />
            {t('nav.backToCollection')}
          </Link>
        </div>

        {/* Table of contents - sticky on desktop, aligned with content */}
        <aside className="hidden lg:block rounded-r-xl border border-l-0 bg-white pt-[140px] p-6 dark:bg-neutral-950">
          <div className="sticky top-20">
            <TableOfContents content={content} />
          </div>
        </aside>
      </div>
    </div>
  );
}
