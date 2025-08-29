export default function MenuIcon({ className, open = false }: { className?: string; open?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
