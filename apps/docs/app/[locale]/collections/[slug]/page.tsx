import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { collections, getCollectionBySlug } from '@/lib/content';
import { ChevronLeft, FileText } from 'lucide-react';

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="size-4" />
        {t('nav.allCollections')}
      </Link>

      {/* Collection header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t(collection.titleKey)}</h1>
          <p className="mt-1 text-muted-foreground">{t(collection.descriptionKey)}</p>
        </div>
      </div>

      {/* Articles - flat list */}
      {collection.articles && collection.articles.length > 0 && (
        <div className="space-y-1">
          {collection.articles.map((article) => (
            <ArticleLink key={article.slug} article={article} />
          ))}
        </div>
      )}

      {/* Articles - grouped by section */}
      {collection.sections && collection.sections.length > 0 && (
        <div className="space-y-8">
          {collection.sections.map((section) => (
            <div key={section.titleKey}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t(section.titleKey)}
              </h2>
              <div className="space-y-1">
                {section.articles.map((article) => (
                  <ArticleLink key={article.slug} article={article} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleLink({ article }: { article: { slug: string; titleKey: string; descriptionKey: string } }) {
  const t = useTranslations();

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex items-center gap-3 rounded-lg border bg-background px-4 py-3 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <FileText className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t(article.titleKey)}</p>
        <p className="text-xs text-muted-foreground truncate">{t(article.descriptionKey)}</p>
      </div>
      <ChevronLeft className="size-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}
