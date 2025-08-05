'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnchorHTMLAttributes } from 'react';

interface PrefetchLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export default function PrefetchLink({ href, onMouseEnter, children, ...props }: PrefetchLinkProps) {
  const router = useRouter();

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    router.prefetch(href);
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  return (
    <Link href={href} {...props} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
