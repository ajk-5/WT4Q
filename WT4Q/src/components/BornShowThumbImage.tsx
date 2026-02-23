'use client';

import { useState } from 'react';

type Props = {
  src?: string;
  alt: string;
  className?: string;
};

export default function BornShowThumbImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  const finalSrc = !src || failed ? '/images/90stimeslogo.png.jpg' : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (!failed) {
          setFailed(true);
        }
      }}
    />
  );
}

