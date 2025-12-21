'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { intercomApi } from '@/lib/general/intercom-api';

declare global {
  interface Window {
    Intercom: (action: string, ...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
  }
}

export const IntercomProvider = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [jwt, setJwt] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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

  // Fetch JWT token
  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const fetchJwt = async () => {
      try {
        const token = await getToken();
        const response = await intercomApi.jwt(token);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.jwt) {
          setJwt(data.jwt);
        }
      } catch (error) {
        // Silently fail - Intercom will work without JWT if not enforced
      }
    };

    fetchJwt();
  }, [user, isLoaded, getToken]);

  // Boot Intercom with JWT and user data
  useEffect(() => {
    if (!isLoaded || !user || !jwt || !scriptLoaded || typeof window.Intercom === 'undefined') {
      return;
    }

    const emailAddress = user.emailAddresses[0]?.emailAddress || '';
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '';
    const createdAt = user.createdAt ? Math.floor(new Date(user.createdAt).getTime() / 1000) : undefined;

    window.Intercom('boot', {
      api_base: 'https://api-iam.intercom.io',
      app_id: 'anv873r9',
      intercom_user_jwt: jwt,
      user_id: user.id,
      ...(fullName && { name: fullName }),
      ...(emailAddress && { email: emailAddress }),
      ...(createdAt && { created_at: createdAt }),
      session_duration: 86400000, // 1 day
    });
  }, [user, isLoaded, jwt, scriptLoaded]);

  return null;
};

