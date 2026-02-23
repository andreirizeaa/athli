import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_MARKETING_URL:
      process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://tryathli.com',
  },
};

export default withNextIntl(nextConfig);
