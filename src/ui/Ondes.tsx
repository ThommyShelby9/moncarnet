/** Motif de marque : les ondes de la voix, en décor des grandes cartes et des en-têtes. */
export function Ondes({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false" className={`pointer-events-none absolute animate-respire ${className}`}>
      <g fill="none" stroke="currentColor" strokeWidth="6">
        <circle cx="80" cy="80" r="30" />
        <circle cx="80" cy="80" r="52" />
        <circle cx="80" cy="80" r="74" />
      </g>
    </svg>
  );
}
