import { NextResponse } from 'next/server';
import { promisify } from 'util';
import { resolveMx } from 'dns';

const resolveMxAsync = promisify(resolveMx);

const detectProviderFromDomain = (domain: string): 'google' | 'outlook' | null => {
  const lowerDomain = domain.toLowerCase();

  // Google domains
  if (lowerDomain === 'gmail.com' || lowerDomain === 'googlemail.com' || lowerDomain.endsWith('.google.com')) {
    return 'google';
  }

  // Outlook/Microsoft domains
  if (
    lowerDomain === 'outlook.com' ||
    lowerDomain === 'hotmail.com' ||
    lowerDomain === 'live.com' ||
    lowerDomain === 'msn.com' ||
    lowerDomain.endsWith('.outlook.com')
  ) {
    return 'outlook';
  }

  return null;
};

const detectProviderFromMxRecords = (mxRecords: Array<{ exchange: string; priority: number }>): 'google' | 'outlook' | null => {
  for (const record of mxRecords) {
    const exchange = record.exchange.toLowerCase();

    // Google Workspace MX records
    if (
      exchange.includes('aspmx.l.google.com') ||
      exchange.includes('google.com') ||
      exchange.includes('googlemail.com')
    ) {
      return 'google';
    }

    // Microsoft 365 / Outlook MX records
    if (
      exchange.includes('mail.protection.outlook.com') ||
      exchange.includes('outlook.com') ||
      exchange.includes('pamx1.hotmail.com')
    ) {
      return 'outlook';
    }
  }

  return null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return NextResponse.json({ error: 'Invalid email domain' }, { status: 400 });
  }

  // First, try domain-based detection for known domains
  const domainProvider = detectProviderFromDomain(domain);
  if (domainProvider) {
    return NextResponse.json({ provider: domainProvider });
  }

  // For custom domains, check MX records
  try {
    const mxRecords = await resolveMxAsync(domain);
    
    if (mxRecords && mxRecords.length > 0) {
      const mxProvider = detectProviderFromMxRecords(mxRecords);
      if (mxProvider) {
        return NextResponse.json({ provider: mxProvider });
      }
    }

    // If no provider detected from MX records, return null
    return NextResponse.json({ provider: null });
  } catch (error) {
    // If DNS lookup fails, return null (could be invalid domain or network issue)
    return NextResponse.json({ provider: null });
  }
}


