'use client';

import { useState } from 'react';
import Image from 'next/image';

type Props = {
  src?: string;
  alt: string;
  className?: string;
};

export default function BornShowHeroImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  const finalSrc = !src || failed ? '/images/90stimeslogo.png.jpg' : src;

  return (
    <Image
      src={finalSrc}
      alt={alt}
      className={className}
      width={1200}
      height={675}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 960px, 1200px"
      unoptimized
      priority
      onError={() => {
        if (!failed) {
          setFailed(true);
        }
      }}
    />
  );
}

