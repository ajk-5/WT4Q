export default function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
