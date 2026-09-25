export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="24" className="fill-marque" />
      <circle cx="17" cy="24" r="5.5" fill="#fff" />
      <path
        d="M26 15.5a12 12 0 0 1 0 17M31.5 10.5a19 19 0 0 1 0 27"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
