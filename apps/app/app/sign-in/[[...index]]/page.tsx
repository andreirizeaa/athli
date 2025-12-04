'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center relative">
      <Link href="/" className="absolute top-6 left-6 z-10" aria-label="Home">
        <Logo />
      </Link>
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}

