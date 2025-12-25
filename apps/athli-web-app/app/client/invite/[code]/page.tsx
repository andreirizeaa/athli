'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { createClient } from '@/supabase/client';
import { getCoachByCode } from '@/api/coach/coach-public-service';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export default function ClientInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { signIn, signInWithGoogle } = useSupabaseAuth();
  const supabase = createClient();

  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(true);

  // Fetch coach information on mount
  useEffect(() => {
    const fetchCoach = async () => {
      if (!code) {
        setIsLoadingCoach(false);
        return;
      }

      try {
        const response = await getCoachByCode(code);
        if (response.data && response.data.coach) {
          setCoachId(response.data.coach.id);
          setCoachName(response.data.coach.name);
          // Could also use company name here if we wanted
        }
      } catch (error: any) {
        console.error('Error fetching coach:', error);
        // Don't show error toast - just use fallback text
        setCoachName(null);
      } finally {
        setIsLoadingCoach(false);
      }
    };

    fetchCoach();
  }, [code]);

  // Check if user is already signed in (e.g., from OAuth callback)
  useEffect(() => {
    if (isLoadingCoach || !coachId) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // User is already signed in, check if they need to create client profile
        handleExistingUser(session.user.id);
      }
    });

    // Listen for auth state changes (e.g., OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && _event === 'SIGNED_IN') {
        // User just signed in (e.g., from OAuth), ensure client profile exists
        handleExistingUser(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [coachId, isLoadingCoach]);

  const handleExistingUser = async (userId: string) => {
    // Redirect to new-client route which will handle the profile creation
    router.push(`/auth/new-client?coach_id=${coachId}`);
  };


  const handleSignUp = async (e: React.FormEvent) => {
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
            user_type: 'client',
            coach_id: coachId,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) {
        // If user already exists, try to sign them in instead
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          try {
            const signInResult = await signIn(email, password);
            if (signInResult?.session?.user) {
              // Wait for session to be established
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Ensure client profile exists
              await handleExistingUser(signInResult.session.user.id);
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
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&redirect=/auth/new-client&coach_id=${coachId}`);
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
          redirectTo: `${window.location.origin}/auth/callback?coach_id=${coachId}&redirect=/auth/new-client`,
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
      toast.error(err.message || 'Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen fixed inset-0">
      <div className="hidden h-full w-1/2 bg-gray-100 lg:block">
        <Image
          width={1000}
          height={1000}
          src="/images/auth-image.jpg"
          alt="Client invite page"
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      <div className="flex h-full w-full items-center justify-center lg:w-1/2 overflow-y-auto">
        {isLoadingCoach ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-8 px-4">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold">
                {coachName ? `Join ${coachName}'s Program` : 'Join Your Coach\'s Program'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an account to get started with your personalized training program
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="sr-only">
                    Your name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full"
                    placeholder="Your name"
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
                      autoComplete="new-password"
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
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

