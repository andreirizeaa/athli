import { NextResponse } from 'next/server';
import { buildSearchIndex } from '@/lib/articles';

const cachedIndex: Record<string, ReturnType<typeof buildSearchIndex>> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  if (!cachedIndex[locale]) {
    cachedIndex[locale] = buildSearchIndex(locale);
  }
  return NextResponse.json(cachedIndex[locale]);
}
