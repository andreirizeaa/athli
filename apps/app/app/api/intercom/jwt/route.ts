import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const intercomSecret = process.env.NEXT_PUBLIC_INTERCOM_SECRET_KEY;

  if (!intercomSecret) {
    return NextResponse.json(
      { error: 'Intercom secret key not configured' },
      { status: 500 }
    );
  }

  // Trim whitespace from secret key
  const secretKey = intercomSecret.trim();

  const emailAddress = user.emailAddresses[0]?.emailAddress;

  // Build payload with required fields
  const payload: {
    user_id: string;
    email?: string;
    iat?: number;
    exp: number;
  } = {
    user_id: user.id,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  // Add email if available
  if (emailAddress) {
    payload.email = emailAddress;
  }

  try {
    // Sign JWT with HS256 algorithm
    const token = jwt.sign(payload, secretKey, {
      algorithm: 'HS256',
      noTimestamp: false, // Include iat (issued at) claim
    });

    return NextResponse.json({ jwt: token });
  } catch (error) {
    console.error('JWT generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate JWT token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

