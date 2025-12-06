import jwt from 'jsonwebtoken';

export interface IntercomUser {
  id: string;
  email?: string;
}

export class IntercomService {
  generateJWT(user: IntercomUser): string {
    const intercomSecret = process.env.NEXT_PUBLIC_INTERCOM_SECRET_KEY;

    if (!intercomSecret) {
      throw new Error('Intercom secret key not configured');
    }

    // Trim whitespace from secret key
    const secretKey = intercomSecret.trim();

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
    if (user.email) {
      payload.email = user.email;
    }

    // Sign JWT with HS256 algorithm
    const token = jwt.sign(payload, secretKey, {
      algorithm: 'HS256',
      noTimestamp: false, // Include iat (issued at) claim
    });

    return token;
  }
}

