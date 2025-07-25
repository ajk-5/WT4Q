interface Props {
  code: number;
  isDay?: boolean;
  className?: string;
}

function Sun({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" fill="#FFD54F" />
      <g stroke="#FFD54F" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </g>
    </svg>
  );
}

function Moon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="#FFEB3B"
      />
    </svg>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#90A4AE"
        d="M19 18H6a4 4 0 0 1 0-8 6 6 0 0 1 11.7-1.6A4.5 4.5 0 0 1 19 18z"
      />
    </svg>
  );
}

function Rain({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#90A4AE"
        d="M19 17H6a4 4 0 0 1 0-8 6 6 0 0 1 11.7-1.6A4.5 4.5 0 0 1 19 17z"
      />
      <line x1="8" y1="20" x2="8" y2="22" stroke="#2196F3" strokeWidth="2" />
      <line x1="12" y1="20" x2="12" y2="22" stroke="#2196F3" strokeWidth="2" />
      <line x1="16" y1="20" x2="16" y2="22" stroke="#2196F3" strokeWidth="2" />
    </svg>
  );
}

function Snow({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#90A4AE"
        d="M19 16H6a4 4 0 0 1 0-8 6 6 0 0 1 11.7-1.6A4.5 4.5 0 0 1 19 16z"
      />
      <g fill="#BBDEFB">
        <circle cx="8" cy="20" r="1" />
        <circle cx="12" cy="20" r="1" />
        <circle cx="16" cy="20" r="1" />
      </g>
    </svg>
  );
}

function Fog({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#90A4AE"
        d="M19 16H6a4 4 0 0 1 0-8 6 6 0 0 1 11.7-1.6A4.5 4.5 0 0 1 19 16z"
      />
      <line x1="4" y1="18" x2="20" y2="18" stroke="#B0BEC5" strokeWidth="2" />
      <line x1="6" y1="21" x2="18" y2="21" stroke="#B0BEC5" strokeWidth="2" />
    </svg>
  );
}

function Storm({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#90A4AE"
        d="M19 16H6a4 4 0 0 1 0-8 6 6 0 0 1 11.7-1.6A4.5 4.5 0 0 1 19 16z"
      />
      <polyline
        points="13 16 11 22 15 22 13 28"
        stroke="#FFC107"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export default function WeatherIcon({ code, isDay = true, className }: Props) {
  if (code === 0) return isDay ? <Sun className={className} /> : <Moon className={className} />;
  if (code >= 1 && code <= 3) return <Cloud className={className} />;
  if (code >= 45 && code <= 48) return <Fog className={className} />;
  if (code >= 51 && code <= 67) return <Rain className={className} />;
  if (code >= 80 && code <= 82) return <Rain className={className} />;
  if (code >= 71 && code <= 86) return <Snow className={className} />;
  if (code >= 95) return <Storm className={className} />;
  return <Cloud className={className} />;
}

