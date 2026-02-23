import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { SearchBar } from '@/components/search-bar';
import { collections } from '@/lib/content';
import { Link } from '@/lib/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations();

  return (
    <div>
      {/* Hero */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('home.title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('home.subtitle')}
          </p>
          <div className="mt-8">
            <SearchBar variant="hero" />
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const Icon = collection.icon;
            const articleCount = (collection.articles?.length ?? 0) +
              (collection.sections?.reduce((acc, s) => acc + s.articles.length, 0) ?? 0);

            return (
              <Link
                key={collection.slug}
                href={`/collections/${collection.slug}`}
                className="group rounded-xl border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Icon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground">{t(collection.titleKey)}</h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {t(collection.descriptionKey)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {articleCount} {articleCount === 1 ? t('home.article') : t('home.articles')}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
