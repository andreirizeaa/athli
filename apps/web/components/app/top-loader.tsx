'use client';

import NextTopLoader from 'nextjs-toploader';
import { useEffect, useState } from 'react';

export function TopLoader() {
  const [color, setColor] = useState<string>('#000000');

  useEffect(() => {
    const updateColor = () => {
      const computedStyle = getComputedStyle(document.body);
      const primaryColor = computedStyle.getPropertyValue('--primary').trim();
      if (primaryColor) {
        setColor(primaryColor);
      }
    };

    updateColor();

    // Listen for theme changes via attribute mutations on body
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('data-theme')) {
          updateColor();
        }
      }
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return (
    <NextTopLoader
      color={color}
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl={true}
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow={`0 0 10px ${color},0 0 5px ${color}`}
    />
  );
}
