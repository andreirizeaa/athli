import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { SearchBar } from '@/components/search-bar';
import { collections } from '@/lib/content';
import { Link } from '@/lib/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

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
            const allArticles = [
              ...(collection.articles ?? []),
              ...(collection.sections?.flatMap((s) => s.articles) ?? []),
            ];
            const articleCount = allArticles.length;
            const href = articleCount === 1
              ? `/articles/${allArticles[0].slug}`
              : `/collections/${collection.slug}`;

            return (
              <Link
                key={collection.slug}
                href={href}
                className="group flex flex-col rounded-xl border bg-background p-5 transition-colors hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
                  <Icon className="size-5 text-foreground transition-colors" />
                </div>
                <h2 className="mt-4 font-semibold text-foreground">{t(collection.titleKey)}</h2>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {t(collection.descriptionKey)}
                </p>
                <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Image
                    src="/andrei.jpg"
                    alt="Andrei"
                    width={120}
                    height={120}
                    quality={100}
                    className="size-10 rounded-full object-cover"
                  />
                  <span>{t('home.authorCount', { count: 1 })}</span>
                  <span className="text-xs">•</span>
                  <span>
                    {articleCount} {articleCount === 1 ? t('home.article') : t('home.articles')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
