'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
// import { createClient } from '@/lib/supabase/client';
// import { intercomApi } from '@/lib/api/intercom/intercom';

declare global {
  interface Window {
    Intercom: (action: string, ...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
  }
}

export const IntercomProvider = () => {
  const { user, supabaseUser, isLoading } = useSupabaseAuth();
  const pathname = usePathname();
  // const supabase = createClient(); // Not needed when JWT API is disabled
  // const [jwt, setJwt] = useState<string | null>(null); // Not needed when JWT API is disabled
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Check if we're on an auth page
  const isAuthPage = pathname?.startsWith('/auth/');

  // Load Intercom script
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Set intercomSettings with app_id before loading script
    window.intercomSettings = {
      app_id: 'anv873r9',
    };

    // Initialize Intercom function if it doesn't exist
    if (typeof window.Intercom === 'undefined') {
      const w = window;
      const ic = w.Intercom;
      if (typeof ic === 'function') {
        ic('reattach_activator');
        ic('update', w.intercomSettings);
      } else {
        const d = document;
        interface IntercomFunction {
          (args: IArguments): void;
          q: unknown[];
          c: (args: IArguments) => void;
        }
        const i = function (args: IArguments) {
          i.c(args);
        } as IntercomFunction;
        i.q = [];
        i.c = function (args: IArguments) {
          i.q.push(args);
        };
        w.Intercom = i as unknown as typeof window.Intercom;
      }
    }

    // Load the Intercom widget script
    const loadScript = () => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://widget.intercom.io/widget/anv873r9';
      script.onload = () => {
        setScriptLoaded(true);
      };
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    };

    if (document.readyState === 'complete') {
      loadScript();
    } else {
      window.addEventListener('load', loadScript, false);
    }
  }, []);

  // Fetch JWT token - DISABLED
  // JWT API call has been disabled - Intercom will boot without JWT authentication
  // useEffect(() => {
  //   if (isLoading || !user || !supabaseUser || isAuthPage) {
  //     return;
  //   }

  //   const fetchJwt = async () => {
  //     try {
  //       const { data: { session } } = await supabase.auth.getSession();
  //       const token = session?.access_token;

  //       if (!token) {
  //         return;
  //       }

  //       const response = await intercomApi.jwt(token);
  //       if (!response.ok) {
  //         return;
  //       }
  //       const data = await response.json();
  //       if (data.jwt) {
  //         setJwt(data.jwt);
  //       }
  //     } catch (error) {
  //       // Silently fail - Intercom will work without JWT if not enforced
  //     }
  //   };

  //   fetchJwt();
  // }, [user, supabaseUser, isLoading, isAuthPage, supabase.auth]);

  // Boot Intercom with JWT and user data - only when user is logged in and not on auth pages
  // JWT API call disabled, so booting without JWT
  useEffect(() => {
    if (isLoading || !user || !supabaseUser || !scriptLoaded || typeof window.Intercom === 'undefined' || isAuthPage) {
      return;
    }

    const emailAddress = user.email || supabaseUser.email || '';
    const fullName = user.name || '';
    const createdAt = supabaseUser.created_at ? Math.floor(new Date(supabaseUser.created_at).getTime() / 1000) : undefined;

    window.Intercom('boot', {
      api_base: 'https://api-iam.intercom.io',
      app_id: 'anv873r9',
      // intercom_user_jwt: jwt, // JWT disabled
      user_id: user.id,
      ...(fullName && { name: fullName }),
      ...(emailAddress && { email: emailAddress }),
      ...(createdAt && { created_at: createdAt }),
      session_duration: 86400000, // 1 day
    });
  }, [user, supabaseUser, isLoading, scriptLoaded]);

  return null;
};

