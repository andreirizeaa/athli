'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';

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
    <div className="flex pb-8 lg:h-screen lg:pb-0">
      <div className="hidden w-1/2 bg-gray-100 lg:block">
        <Image
          width={1000}
          height={1000}
          src="/images/auth-image.jpg"
          alt="Forgot password"
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold">Forgot Password</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your email address and we&#39;ll send you instructions to reset your password.
            </p>
          </div>

          {!isSubmitted ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="email" className="sr-only">
                        Email address
                      </Label>
                      <FormControl>
                        <div className="relative">
                          <MailIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform opacity-30" />
                          <Input
                            {...field}
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="w-full pl-10"
                            placeholder="Enter your email address"
                            disabled={isSubmitting}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
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
            <div className="mt-8 space-y-6">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  We&#39;ve sent password reset instructions to your email address. Please check your
                  inbox.
                </p>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    form.reset();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Send Another Email
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



