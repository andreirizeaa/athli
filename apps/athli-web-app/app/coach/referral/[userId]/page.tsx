'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { fetchUserById } from '@/lib/coach/coach-user-service';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export default function CoachReferralPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const supabase = createClient();
  
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referringUserName, setReferringUserName] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Fetch referring user information on mount
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const user = await fetchUserById(userId);
        setReferringUserName(user.name);
      } catch (error: any) {
        console.error('Error fetching referring user:', error);
        // Don't show error toast - just use fallback text
        setReferringUserName(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSigningUp(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            user_type: 'coach',
            referred_by: userId, // Track the referring user
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) {
        // If user already exists, try to sign them in instead
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInError) {
              throw new Error('An account with this email already exists. Please use the correct password or reset your password.');
            }

            if (signInData?.session?.user) {
              toast.success('Signed in successfully!');
              router.push('/home');
              return;
            }
          } catch (signInError: any) {
            throw new Error('An account with this email already exists. Please use the correct password or reset your password.');
          }
        }
        throw error;
      }

      // New account created successfully
      toast.success('Account created! Please check your email for verification code.');
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?referred_by=${userId}&redirect=/auth/verify-email`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile',
        },
      });

      if (error) throw error;
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign up with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleSignInClick = () => {
    router.push('/auth/login');
  };

  return (
    <div className="flex h-screen w-screen fixed inset-0">
      <div className="hidden h-full w-1/2 bg-gray-100 lg:block">
        <Image
          width={1000}
          height={1000}
          src="/images/auth-image.jpg"
          alt="Coach referral page"
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      <div className="flex h-full w-full items-center justify-center lg:w-1/2 overflow-y-auto">
        {isLoadingUser ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-8 px-4">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold">Create New Account</h2>
              {referringUserName && (
                <p className="mt-2 text-sm text-muted-foreground">
                  You've been referred by {referringUserName}
                </p>
              )}
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="sr-only">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                <button
                  type="button"
                  onClick={handleSignInClick}
                  className="underline"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

