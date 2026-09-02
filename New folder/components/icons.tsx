interface P { size?: number; className?: string }

export const IconScraper = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M13.5 2.5 21 10l-3.2 3.2-7.5-7.5L13.5 2.5Z" fill="currentColor" opacity="0.9" />
    <path d="M10.3 5.7 3 13l1.8 1.8 2.4-.6 3.4 3.4-.6 2.4L11.8 22l7.3-7.3" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="6.6" cy="17.4" r="1.1" fill="currentColor" />
  </svg>
);

export const IconLaser = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 2h6v5l-1.5 2h-3L9 7V2Z" fill="currentColor" opacity="0.9" />
    <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="17.5" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
    <path d="M3.5 17.5h3M17.5 17.5h3M6 11l2 1.6M18 11l-2 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
  </svg>
);

export const IconFoam = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="8" cy="8.5" r="4" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="15.5" cy="6.5" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="17.5" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M4 18.5h16M6.5 21.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconLock = ({ size = 14, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="10.5" width="14" height="10" fill="currentColor" opacity="0.85" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconPause = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="4" width="4.5" height="16" />
    <rect x="13.5" y="4" width="4.5" height="16" />
  </svg>
);

export const IconSound = ({ size = 16, className, off = false }: P & { off?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
    {off ? (
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

export const IconDownload = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 3v11M7.5 10 12 14.5 16.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconCoin = ({ size = 15, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7.5v9M8.5 9.8c0-1.2 1.6-2 3.5-2s3.5.8 3.5 2c0 2.8-7 1.8-7 4.6 0 1.2 1.6 2 3.5 2s3.5-.8 3.5-2" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
  </svg>
);

export const IconCheck = ({ size = 12, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="m4 12.5 5.5 5.5L20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconArrow = ({ size = 15, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12h15M13 5.5 19.5 12 13 18.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconHand = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 11V4.8a1.6 1.6 0 0 1 3.2 0V10m0-3.4a1.6 1.6 0 0 1 3.2 0V11m0-2.4a1.6 1.6 0 0 1 3.2 0V14a7 7 0 0 1-7 7h-.6a7 7 0 0 1-5.9-3.2l-2.3-3.6a1.7 1.7 0 0 1 2.6-2.1L7.5 14V7a1.6 1.6 0 0 1 1.5-1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
