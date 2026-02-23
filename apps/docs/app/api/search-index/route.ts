import { NextResponse } from 'next/server';
import { buildSearchIndex } from '@/lib/articles';

let cachedIndex: ReturnType<typeof buildSearchIndex> | null = null;

export async function GET() {
  if (!cachedIndex) {
    cachedIndex = buildSearchIndex();
  }
  return NextResponse.json(cachedIndex);
}
