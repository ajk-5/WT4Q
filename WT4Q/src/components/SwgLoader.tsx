'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SwgLoader() {
  const pathname = usePathname();
  const isArticle = pathname?.startsWith('/articles/');

  useEffect(() => {
    if (!isArticle || typeof document === 'undefined') return;
    const existing = document.querySelector(
      'script[src^="https://news.google.com/swg/js/v1/swg-basic.js"]'
    ) as HTMLScriptElement | null;
    if (existing) return;

    const s = document.createElement('script');
    s.async = true;
    s.type = 'application/javascript';
    s.src = 'https://news.google.com/swg/js/v1/swg-basic.js';
    s.onload = () => {
      // Initialize SWG Basic subscriptions
      type SwgInitConfig = {
        type: string;
        isPartOfType: string[];
        isPartOfProductId: string;
        clientOptions: { theme: string; lang: string };
      };
      type SwgBasicSubscriptions = { init: (cfg: SwgInitConfig) => void };
      type SwgBasicQueue = Array<(basicSubscriptions: SwgBasicSubscriptions) => void>;

      const w = window as unknown as { SWG_BASIC?: SwgBasicQueue };
      w.SWG_BASIC = w.SWG_BASIC ?? [];
      w.SWG_BASIC.push((basicSubscriptions) => {
        basicSubscriptions.init({
          type: 'NewsArticle',
          isPartOfType: ['Product'],
          isPartOfProductId: 'CAowzfDADA:openaccess',
          clientOptions: { theme: 'light', lang: 'en' },
        });
      });
    };
    document.head.appendChild(s);
  }, [isArticle]);

  return null;
}
