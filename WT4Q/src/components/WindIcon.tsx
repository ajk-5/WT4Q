export default function WindIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 12h10a3 3 0 1 0 0-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M4 18h11a2 2 0 1 0 0-4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="3" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
