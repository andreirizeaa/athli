'use client';

import { SignUp } from '@clerk/nextjs';
import Features from '@/components/features-11';

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-background flex">
      <div className="w-2/5 flex items-center justify-center">
        <SignUp routing="path" path="/sign-up" />
      </div>
      <div className="w-3/5 bg-muted flex items-center justify-center py-8">
        <Features />
      </div>
    </div>
  );
}

