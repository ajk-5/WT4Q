'use client';

import { CSSProperties, useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot: string | number;
  format?: string;
  layout?: string;
  layoutKey?: string;
  className?: string;
  style?: CSSProperties;
  center?: boolean;
  collapseIfEmpty?: boolean;
};

export default function AdSlot({
  slot,
  format,
  layout,
  layoutKey,
  className,
  style,
  center,
  collapseIfEmpty = true,
}: AdSlotProps) {
  const ref = useRef<HTMLModElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const el = ref.current;
    const wrapper = containerRef.current;
    if (!el || !wrapper || pushedRef.current) return;

    if (el.dataset?.adsbygoogleStatus === 'done') {
      pushedRef.current = true;
      return;
    }

    const minWidth = format === 'fluid' ? 250 : 0;

    const tryPush = () => {
      if (pushedRef.current) return;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushedRef.current = true;
      } catch {
        // AdSense script may not be ready yet.
      }
    };

    const attemptWhenWideEnough = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.floor(rect.width);
      if (width >= minWidth) {
        tryPush();
        return true;
      }
      return false;
    };

    let ro: ResizeObserver | null = null;
    const onLoaded = () => {
      if (!pushedRef.current) tryPush();
    };

    window.requestAnimationFrame(() => {
      if (attemptWhenWideEnough()) {
        window.addEventListener('adsbygoogle:loaded', onLoaded, { once: true });
        return;
      }

      if ('ResizeObserver' in window) {
        ro = new ResizeObserver(() => {
          if (!pushedRef.current && attemptWhenWideEnough()) {
            window.addEventListener('adsbygoogle:loaded', onLoaded, { once: true });
            ro?.disconnect();
            ro = null;
          }
        });
        ro.observe(wrapper);
      } else {
        let pollId: number | null = null;
        pollId = setInterval(() => {
          if (!pushedRef.current && attemptWhenWideEnough()) {
            window.addEventListener('adsbygoogle:loaded', onLoaded, { once: true });
            if (pollId !== null) {
              clearInterval(pollId);
              pollId = null;
            }
          }
        }, 500) as unknown as number;

        (wrapper as unknown as { _adCleanup?: () => void })._adCleanup = () => {
          if (pollId !== null) {
            clearInterval(pollId);
            pollId = null;
          }
        };
      }
    });

    return () => {
      window.removeEventListener('adsbygoogle:loaded', onLoaded);
      try {
        ro?.disconnect();
      } catch {}

      const w = wrapper as unknown as { _adCleanup?: () => void };
      try {
        w._adCleanup?.();
      } catch {}
    };
  }, [format]);

  useEffect(() => {
    if (!collapseIfEmpty) return;

    const el = ref.current;
    const wrapper = containerRef.current;
    if (!el || !wrapper) return;

    const collapse = () => {
      const status =
        el.getAttribute('data-ad-status') ||
        el.getAttribute('data-adsbygoogle-status');
      const done = el.getAttribute('data-adsbygoogle-status') === 'done';
      if (status === 'unfilled' && !done) {
        wrapper.style.display = 'none';
      }
    };

    const mo = new MutationObserver(collapse);
    mo.observe(el, {
      attributes: true,
      attributeFilter: ['data-ad-status', 'data-adsbygoogle-status', 'style'],
    });

    const timer = window.setTimeout(collapse, 6000);
    return () => {
      mo.disconnect();
      window.clearTimeout(timer);
    };
  }, [collapseIfEmpty]);

  const styleMerged: CSSProperties = {
    display: 'block',
    ...(format === 'auto' ? { minWidth: 300 } : undefined),
    ...(center ? { textAlign: 'center' } : undefined),
    ...style,
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <ins
        ref={ref}
        className={`adsbygoogle${className ? ` ${className}` : ''}`}
        style={styleMerged}
        data-ad-client="ca-pub-2858608482723109"
        data-ad-slot={String(slot)}
        {...(format ? { 'data-ad-format': format } : {})}
        {...(format === 'auto' ? { 'data-full-width-responsive': 'true' } : {})}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
      />
    </div>
  );
}
