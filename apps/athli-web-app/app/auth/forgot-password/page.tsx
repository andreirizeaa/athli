'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthLayout } from '@/components/auth/auth-layout';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await resetPasswordForEmail(data.email);
      setIsSubmitted(true);
      toast.success('Request submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Forgot Password</h2>
          <p className="text-white/60 text-sm">
            Enter your email address and we&#39;ll send you instructions to reset your password.
          </p>
        </div>

        {!isSubmitted ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email" className="text-white/70 text-sm">
                      Email
                    </Label>
                    <FormControl>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        autoComplete="email"
                        className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Please wait
                    </>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4 text-center">
              <p className="text-sm text-white/60">
                We&#39;ve sent password reset instructions to your email address. Please check your
                inbox.
              </p>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  form.reset();
                }}
                variant="outline"
                className="w-full rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                Send Another Email
              </Button>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-white/60">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-white underline hover:text-white/90">
            Log in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}



