'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    Intercom: (action: string, ...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
    IntercomBooted?: boolean;
  }
}

// Custom Intercom branding configuration
// Update these values to match your brand
const INTERCOM_BACKGROUND_COLOR = process.env.NEXT_PUBLIC_INTERCOM_BACKGROUND_COLOR || '#000000';
const INTERCOM_LAUNCHER_ICON = process.env.NEXT_PUBLIC_INTERCOM_LAUNCHER_ICON || undefined;

const INTERCOM_APP_ID = 'anv873r9';

export const IntercomProvider = () => {
  const { user, isLoaded } = useUser();
  const [jwt, setJwt] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const pathname = usePathname();
  const hasBootedRef = useRef(false);
  const brandingAppliedRef = useRef(false);

  // Apply custom branding after Intercom is ready
  const applyIntercomBranding = (force = false) => {
    if (typeof window === 'undefined') {
      return;
    }

    // Always set CSS variables for CSS fallback (these persist)
    if (INTERCOM_BACKGROUND_COLOR) {
      document.documentElement.style.setProperty('--intercom-bg-color', INTERCOM_BACKGROUND_COLOR);
    }

    if (INTERCOM_LAUNCHER_ICON) {
      document.documentElement.style.setProperty('--intercom-icon-url', `url(${INTERCOM_LAUNCHER_ICON})`);
    }

    // Apply JavaScript branding if Intercom is available
    if (typeof window.Intercom === 'undefined') {
      return;
    }

    // Skip if already applied (unless forced)
    if (brandingAppliedRef.current && !force) {
      return;
    }

    try {
      const brandingOptions: Record<string, unknown> = {};

      if (INTERCOM_BACKGROUND_COLOR) {
        brandingOptions.background_color = INTERCOM_BACKGROUND_COLOR;
      }

      if (INTERCOM_LAUNCHER_ICON) {
        brandingOptions.launcher_icon = INTERCOM_LAUNCHER_ICON;
      }

      if (Object.keys(brandingOptions).length > 0) {
        window.Intercom('update', brandingOptions);
        brandingAppliedRef.current = true;
      }
    } catch (error) {
      // Silently fail - branding is optional
    }
  };

  // Set CSS variables early for CSS fallback
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Set CSS variables immediately so CSS can use them
    if (INTERCOM_BACKGROUND_COLOR) {
      document.documentElement.style.setProperty('--intercom-bg-color', INTERCOM_BACKGROUND_COLOR);
    }

    if (INTERCOM_LAUNCHER_ICON) {
      document.documentElement.style.setProperty('--intercom-icon-url', `url(${INTERCOM_LAUNCHER_ICON})`);
    }
  }, []);

  // Load Intercom script only once
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent double loading
    if (window.Intercom && typeof window.Intercom === 'function' && window.IntercomBooted) {
      setScriptLoaded(true);
      return;
    }

    // Set intercomSettings with app_id before loading script
    window.intercomSettings = {
      app_id: INTERCOM_APP_ID,
    };

    // Initialize Intercom function if it doesn't exist
    if (typeof window.Intercom === 'undefined') {
      const w = window;
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

    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src*="widget.intercom.io/widget/${INTERCOM_APP_ID}"]`);
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    // Load the Intercom widget script
    const loadScript = () => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://widget.intercom.io/widget/${INTERCOM_APP_ID}`;
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

  // Listen for intercomReady event and watch for DOM changes
  useEffect(() => {
    if (!scriptLoaded || typeof window === 'undefined') {
      return;
    }

    const handleIntercomReady = () => {
      // Force re-apply branding when Intercom is ready
      applyIntercomBranding(true);
    };

    // Check if already ready
    if (window.Intercom && typeof window.Intercom === 'function') {
      // Try to apply branding immediately
      setTimeout(() => {
        applyIntercomBranding();
      }, 100);
    }

    // Listen for the intercomReady event
    window.addEventListener('intercomReady', handleIntercomReady);

    // Watch for Intercom container injection/reload
    const observer = new MutationObserver(() => {
      const intercomContainer = document.getElementById('intercom-container');
      if (intercomContainer) {
        // Re-apply branding when container appears or changes (force re-apply)
        setTimeout(() => {
          applyIntercomBranding(true);
        }, 200);
      }
    });

    // Observe document body for Intercom container injection
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener('intercomReady', handleIntercomReady);
      observer.disconnect();
    };
  }, [scriptLoaded]);

  // Fetch JWT token
  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const fetchJwt = async () => {
      try {
        const response = await fetch('/api/intercom/jwt');
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
  }, [user, isLoaded]);

  // Boot Intercom with JWT and user data (only once)
  useEffect(() => {
    if (!isLoaded || !user || !jwt || !scriptLoaded || typeof window.Intercom === 'undefined') {
      return;
    }

    // Only boot once
    if (hasBootedRef.current) {
      // Use update() for subsequent changes (e.g., route changes)
      const emailAddress = user.emailAddresses[0]?.emailAddress || '';
      const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '';
      const createdAt = user.createdAt ? Math.floor(new Date(user.createdAt).getTime() / 1000) : undefined;

      window.Intercom('update', {
        intercom_user_jwt: jwt,
        user_id: user.id,
        ...(fullName && { name: fullName }),
        ...(emailAddress && { email: emailAddress }),
        ...(createdAt && { created_at: createdAt }),
      });

      // Re-apply branding after update (force to ensure it persists)
      setTimeout(() => {
        applyIntercomBranding(true);
      }, 100);
      return;
    }

    // First boot
    const emailAddress = user.emailAddresses[0]?.emailAddress || '';
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '';
    const createdAt = user.createdAt ? Math.floor(new Date(user.createdAt).getTime() / 1000) : undefined;

    window.Intercom('boot', {
      api_base: 'https://api-iam.intercom.io',
      app_id: INTERCOM_APP_ID,
      intercom_user_jwt: jwt,
      user_id: user.id,
      ...(fullName && { name: fullName }),
      ...(emailAddress && { email: emailAddress }),
      ...(createdAt && { created_at: createdAt }),
      session_duration: 86400000, // 1 day
    });

    hasBootedRef.current = true;
    window.IntercomBooted = true;

    // Apply branding after boot
    setTimeout(() => {
      applyIntercomBranding();
    }, 500);
  }, [user, isLoaded, jwt, scriptLoaded]);

  // Handle route changes - use update() instead of boot()
  useEffect(() => {
    if (!hasBootedRef.current || typeof window.Intercom === 'undefined') {
      return;
    }

    // Update Intercom on route change to maintain state
    window.Intercom('update');

    // Re-apply branding after route change (force to ensure it persists)
    setTimeout(() => {
      applyIntercomBranding(true);
    }, 100);
  }, [pathname]);

  return null;
};

