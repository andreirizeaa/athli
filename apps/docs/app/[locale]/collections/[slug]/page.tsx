import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { collections, getCollectionBySlug } from '@/lib/content';
import { ChevronLeft, FileText } from 'lucide-react';

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const collection = getCollectionBySlug(slug);
  if (!collection) return {};

  const t = await getTranslations();
  return {
    title: `${t(collection.titleKey)} - Athli Help Center`,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  return <CollectionContent collection={collection} />;
}

function CollectionContent({ collection }: { collection: NonNullable<ReturnType<typeof getCollectionBySlug>> }) {
  const t = useTranslations();
  const Icon = collection.icon;
  const articleCount = (collection.articles?.length ?? 0) +
    (collection.sections?.reduce((acc, s) => acc + s.articles.length, 0) ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors mb-6"
      >
        <ChevronLeft className="size-4" />
        {t('nav.allCollections')}
      </Link>

      {/* Collection header - icon on top, text below */}
      <div className="mb-8">
        <div className="flex size-14 items-center justify-center rounded-xl border bg-muted">
          <Icon className="size-7 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t(collection.titleKey)}</h1>
        <p className="mt-1 text-muted-foreground">{t(collection.descriptionKey)}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Image
            src="/andrei.jpg"
            alt="Andrei"
            width={120}
            height={120}
            quality={100}
            className="size-10 rounded-full object-cover"
          />
          <span>{t('author.by')} Andrei</span>
          <span className="text-xs">•</span>
          <span>{articleCount} {articleCount === 1 ? t('home.article') : t('home.articles')}</span>
        </div>
      </div>

      {/* Articles - flat list in single card */}
      {collection.articles && collection.articles.length > 0 && (
        <div className="rounded-xl border bg-background overflow-hidden">
          {collection.articles.map((article) => (
            <ArticleRow key={article.slug} article={article} />
          ))}
        </div>
      )}

      {/* Articles - grouped by section, one card per section */}
      {collection.sections && collection.sections.length > 0 && (
        <div className="space-y-6">
          {collection.sections.map((section) => (
            <div key={section.titleKey}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t(section.titleKey)}</h2>
              <div className="rounded-xl border bg-background overflow-hidden">
                {section.articles.map((article) => (
                  <ArticleRow key={article.slug} article={article} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleRow({ article }: { article: { slug: string; titleKey: string; descriptionKey: string } }) {
  const t = useTranslations();

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted"
    >
      <FileText className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t(article.titleKey)}</p>
      </div>
      <ChevronLeft className="size-4 text-muted-foreground rotate-180 shrink-0" />
    </Link>
  );
}
