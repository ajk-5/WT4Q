"use client";

import { useRouter } from 'next/navigation';

type Props = {
  className?: string;
  fallback?: string;
  label?: string;
  title?: string;
};

export default function BackButton({ className, fallback = '/', label = '← Back', title = 'Go back' }: Props) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {}
    }
    router.push(fallback);
  };
  return (
    <button type="button" className={className} onClick={onClick} aria-label={title} title={title}>
      {label}
    </button>
  );
}

