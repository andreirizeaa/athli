'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { toast } from 'sonner';

export default function SignUpPage() {
  const { signUp, signInWithGoogle } = useSupabaseAuth();
  const router = useRouter();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSigningUp(true);
    try {
      await signUp(email, password, firstName, lastName);
      toast.success('Account created! Please check your email for verification code.');
      // signUp already redirects to verify-email page
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign up with Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex pb-8 lg:h-screen lg:pb-0">
      <div className="hidden w-1/2 bg-gray-100 lg:block">
        <Image
          width={1000}
          height={1000}
          src="/images/auth-image.jpg"
          alt="shadcn/ui login page"
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold">Create New Account</h2>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="first_name" className="sr-only">
                  First name
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  className="w-full"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSigningUp || isGoogleLoading}
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="sr-only">
                  Last name
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  className="w-full"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSigningUp || isGoogleLoading}
                />
              </div>
              <div>
                <Label htmlFor="email" className="sr-only">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSigningUp || isGoogleLoading}
                />
              </div>
              <div>
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="w-full pr-10"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSigningUp || isGoogleLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSigningUp || isGoogleLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={isSigningUp || isGoogleLoading}>
                {isSigningUp ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="w-full border-t" />
              <span className="text-muted-foreground shrink-0 text-sm">or continue with</span>
              <div className="w-full border-t" />
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSigningUp || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Image
                      src="/icons/google.png"
                      alt="Google"
                      width={16}
                      height={16}
                      className="mr-2"
                    />
                    Google
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
