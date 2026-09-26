/** Filtre « encre » des tampons : placé une fois dans la mise en page de l'espace patient. */
export function FiltreEncre() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="encre" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="4" result="bruit" />
          <feColorMatrix in="bruit" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.1 1.95" result="masque" />
          <feComposite in="SourceGraphic" in2="masque" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

const INCLINAISONS = [-12, 8, -6, 11, -9, 5];

/** Tampon « VU » posé sur chaque étape faite, comme sur le carnet papier. */
export function Tampon({ rang = 0, libelle = "Fait", className = "size-9" }: { rang?: number; libelle?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={libelle}
      className={`animate-tampon text-marque ${className}`}
      style={
        {
          "--inclinaison": `${INCLINAISONS[rang % INCLINAISONS.length]}deg`,
          transform: "rotate(var(--inclinaison))",
          animationDelay: `${200 + (rang % 8) * 90}ms`,
        } as React.CSSProperties
      }
    >
      <g filter="url(#encre)">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" />
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="50" y="59" textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">
          VU
        </text>
      </g>
    </svg>
  );
}
