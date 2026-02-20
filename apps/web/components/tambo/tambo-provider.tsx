'use client';

import React from 'react';
import { TamboProvider as TamboReactProvider } from '@tambo-ai/react';
import { tamboComponents, tamboApiKey } from '@/lib/tambo';

interface TamboProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps children with Tambo's provider so the agent can render
 * registered components in response to user messages.
 *
 * If no API key is configured the provider is skipped and children
 * render normally (graceful degradation).
 */
export function TamboProvider({ children }: TamboProviderProps) {
  if (!tamboApiKey) {
    return <>{children}</>;
  }

  return (
    <TamboReactProvider
      apiKey={tamboApiKey}
      components={tamboComponents}
    >
      {children}
    </TamboReactProvider>
  );
}
