'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center relative">
      <Link href="/" className="absolute top-6 left-6 z-10" aria-label="Home">
        <Logo />
      </Link>
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}

