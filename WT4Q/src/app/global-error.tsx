'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
        <p style={{ marginBottom: '1rem' }}>
          An unexpected error has occurred. Please try again or contact support if the problem
          persists.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--muted)',
            borderRadius: '0.25rem',
            background: 'var(--background)',
            color: 'var(--foreground)',
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
