import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['gb', 'es'],
  defaultLocale: 'gb',
  localePrefix: 'always',
});
