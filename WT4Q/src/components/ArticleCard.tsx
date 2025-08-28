"use client";

import { useRef, useState, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import PrefetchLink from "@/components/PrefetchLink";
import styles from "./ArticleCard.module.css";
import { useRouter } from "next/navigation";
import type { ArticleImage } from "@/lib/models";

/** Replace with your own helper if you already have one */
function truncateWords(html: string, words: number) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const parts = text.split(" ");
  return parts.length <= words ? text : parts.slice(0, words).join(" ") + "…";
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  createdDate?: string;
  views?: number;
  content: string;
  images?: ArticleImage[];
}

type FinalPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  isSheet: boolean;
};

type BasePos = {
  isSheet: boolean;
  placedAbove: boolean;
  anchorY: number; // cardRect.top (above) or cardRect.bottom (below)
  width: number;
  left: number;
  maxHeight: number;
  vw: number;
  vh: number;
};

export default function ArticleCard({ article }: { article: Article }) {
  const [showPreview, setShowPreview] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const [pos, setPos] = useState<FinalPos | null>(null);
  const [measuring, setMeasuring] = useState(false); // first paint offscreen to measure

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<BasePos | null>(null);

  // NEW: robust tap vs scroll handling
  const isScrollingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const scrollStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const router = useRouter();
  const snippet = truncateWords(article.content || article.summary || "", 50);

  const HOVER_DELAY_MS = 400;
  const LONG_PRESS_MS = 600;
  const MOVE_CANCEL_PX = 10;   // cancel long-press if finger moves this much
  const TAP_TOLERANCE = 8;     // treat as scroll if movement exceeds this
  const GUTTER = 8;            // px viewport gutter
  const MAX_W = 42 * 16;       // 42rem ~ 672px
  const MIN_H = 120;           // px minimum visible height

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // Compute base geometry using layout viewport (excludes scrollbar).
  function computeBase(): BasePos | null {
    const card = cardRef.current;
    if (!card) return null;

    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;

    const isSheet = vw <= 640; // small screens -> bottom sheet
    const cardRect = card.getBoundingClientRect();

    if (isSheet) {
      const maxHeight = Math.max(MIN_H, Math.floor(vh * 0.65));
      return {
        isSheet: true,
        placedAbove: false,
        anchorY: vh - maxHeight,
        width: vw,
        left: 0,
        maxHeight,
        vw,
        vh,
      };
    }

    // Desktop/tablet floating overlay
    const width = Math.min(MAX_W, vw - 2 * GUTTER - 1); // -1 prevents right-edge tick
    const cardCenter = cardRect.left + cardRect.width / 2;
    const unclampedLeft = Math.round(cardCenter - width / 2);
    const left = Math.max(GUTTER, Math.min(unclampedLeft, vw - width - GUTTER));

    const spaceBelow = vh - cardRect.bottom - GUTTER;
    const spaceAbove = cardRect.top - GUTTER;
    const placedAbove =
      spaceBelow < Math.max(MIN_H, vh * 0.3) && spaceAbove > spaceBelow;

    const maxHeight = Math.max(MIN_H, placedAbove ? spaceAbove : spaceBelow);
    const anchorY = placedAbove ? cardRect.top : cardRect.bottom;

    return {
      isSheet: false,
      placedAbove,
      anchorY,
      width,
      left,
      maxHeight,
      vw,
      vh,
    };
  }

  // Open: compute base geometry; for desktop we measure actual height before final top.
  useLayoutEffect(() => {
    if (!showPreview) {
      setPos(null);
      setMeasuring(false);
      return;
    }

    const base = computeBase();
    baseRef.current = base;

    if (!base) return;

    if (base.isSheet) {
      // Bottom sheet doesn't need measuring
      setPos({
        isSheet: true,
        top: base.anchorY,
        left: base.left,
        width: base.width,
        maxHeight: base.maxHeight,
      });
      setMeasuring(false);
    } else {
      // Desktop/tablet: render offscreen at the right width to measure natural height
      setPos({
        isSheet: false,
        top: 0,
        left: -99999, // offscreen while measuring
        width: base.width,
        maxHeight: base.maxHeight,
      });
      setMeasuring(true);
    }
  }, [showPreview]);

  // After first paint, measure actual height and anchor precisely above/below the card.
  useLayoutEffect(() => {
    if (!showPreview) return;
    if (!measuring) return;

    const el = previewRef.current;
    const base = baseRef.current;
    if (!el || !base) return;

    // Temporarily remove maxHeight to get natural height
    const prevMax = el.style.maxHeight;
    el.style.maxHeight = "none";
    const natural = el.scrollHeight;
    el.style.maxHeight = prevMax;

    const desired = Math.min(natural, base.maxHeight);

    let top: number;
    if (base.placedAbove) {
      // overlay bottom touches card top (minus GUTTER)
      const bottom = base.anchorY - GUTTER;
      top = Math.max(GUTTER, bottom - desired);
    } else {
      // just below card; clamp to viewport bottom
      const candidate = base.anchorY + GUTTER;
      top = Math.min(base.vh - GUTTER - desired, candidate);
    }

    setPos({
      isSheet: false,
      top,
      left: base.left,
      width: base.width,
      maxHeight: desired, // final clamp
    });
    setMeasuring(false);
  }, [measuring, showPreview]);

  // Keep position fresh on resize/scroll (recompute + remeasure).
  useLayoutEffect(() => {
    if (!showPreview) return;

    const update = () => {
      const base = computeBase();
      baseRef.current = base;
      if (!base) return;

      if (base.isSheet) {
        setPos({
          isSheet: true,
          top: base.anchorY,
          left: base.left,
          width: base.width,
          maxHeight: base.maxHeight,
        });
        setMeasuring(false);
      } else {
        // Set width/left immediately, then re-measure height in next frame
        setPos({
          isSheet: false,
          top: 0,
          left: -99999,
          width: base.width,
          maxHeight: base.maxHeight,
        });
        setMeasuring(true);
      }
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop hover preview
  function onMouseEnter() {
    clearTimer();
    timerRef.current = setTimeout(() => setShowPreview(true), HOVER_DELAY_MS);
  }
  function onMouseLeave() {
    clearTimer();
    setShowPreview(false);
  }

  // Mobile long-press preview + single-tap navigate (with scroll detection)
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;

    isScrollingRef.current = false;
    suppressClickRef.current = false;

    setLongPressTriggered(false);
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    scrollStartRef.current = { x: window.scrollX, y: window.scrollY };

    clearTimer();
    timerRef.current = setTimeout(() => {
      setLongPressTriggered(true);
      setShowPreview(true); // show preview on hold
    }, LONG_PRESS_MS);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const moved = Math.hypot(dx, dy);

    // Cancel long-press if moving
    if (moved > MOVE_CANCEL_PX) clearTimer();

    // Mark as scrolling gesture if beyond tap tolerance
    if (moved > TAP_TOLERANCE) {
      isScrollingRef.current = true;
    }
  }

  function onTouchEnd() {
    const wasLongPress = longPressTriggered;
    clearTimer();

    // Treat as scroll if page actually scrolled (covers tiny finger jitter)
    const scrolled =
      Math.abs(window.scrollY - scrollStartRef.current.y) > 2 ||
      Math.abs(window.scrollX - scrollStartRef.current.x) > 2;

    if (wasLongPress) {
      // release after hold -> hide preview, do NOT navigate
      setShowPreview(false);
      setLongPressTriggered(false);
      suppressClickRef.current = true; // block the follow-up synthetic click
      touchStartRef.current = null;
      return;
    }

    if (isScrollingRef.current || scrolled) {
      // It was a scroll, not a tap — do NOT navigate
      suppressClickRef.current = true; // block post-touch click
      touchStartRef.current = null;
      return;
    }

    // Genuine single tap -> navigate
    router.push(`/articles/${article.slug}`);
    touchStartRef.current = null;
  }

  // Click/keyboard navigation on desktop (suppress click after touch scroll)
  function onClick() {
    if (suppressClickRef.current) {
      // Consume the synthetic click generated after a touch scroll
      suppressClickRef.current = false;
      return;
    }
    if (!showPreview) router.push(`/articles/${article.slug}`);
  }

  // ESC to close on desktop
  useEffect(() => {
    if (!showPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPreview(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPreview]);

  const previewNode =
    showPreview && pos
      ? createPortal(
          <div
            ref={previewRef}
            className={`${styles.preview} ${pos.isSheet ? styles.sheet : ""}`}
            style={{
              visibility: measuring ? "hidden" : undefined, // avoid flicker while measuring
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            onContextMenu={(e) => e.preventDefault()} // block bg image menu
            role="dialog"
            aria-modal="false"
            aria-label={`Preview of ${article.title}`}
          >
            {/* Invisible overlay to intercept long-press on the CSS background */}
            <div className={styles.hitArea} aria-hidden="true" />

            {/* Real content above the hitArea */}
            <div
              className={styles.previewInner}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              <p
                className={styles.summary}
                dangerouslySetInnerHTML={{ __html: snippet }}
              />
              <PrefetchLink
                href={`/articles/${article.slug}`}
                className={styles.readMore}
              >
                Read more
              </PrefetchLink>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={cardRef}
      className={styles.card}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/articles/${article.slug}`);
        }
      }}
      aria-label={`Open article: ${article.title}`}
    >
      <h2 className={styles.title}>{article.title}</h2>
              <PrefetchLink
                href={`/articles/${article.slug}`}
                className={styles.readMore}
              >
                Read more
              </PrefetchLink>
      {typeof article.views === "number" && (
        <p className={styles.views}>{article.views.toLocaleString()} views</p>
      )}

      {previewNode}
    </div>
  );
}
