type P = { size?: number; className?: string };

function base(size: number, className?: string) {
  return {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true, className,
  };
}

export const IconCheck = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IconX = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IconClock = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
export const IconUp = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);
export const IconDown = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
);
export const IconEqual = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><line x1="5" y1="9" x2="19" y2="9" /><line x1="5" y1="15" x2="19" y2="15" /></svg>
);
export const IconCaretUp = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><polyline points="18 15 12 9 6 15" /></svg>
);
export const IconCaretDown = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconUsers = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const IconXCircle = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
);
export const IconBars = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
);
export const IconTrend = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
);
export const IconChevronDown = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconLeft = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><polyline points="15 18 9 12 15 6" /></svg>
);
export const IconRight = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><polyline points="9 18 15 12 9 6" /></svg>
);
export const IconDownload = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><path d="M12 3v12" /><polyline points="7 10 12 15 17 10" /><path d="M5 21h14" /></svg>
);
export const IconSpark = ({ size = 15, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" opacity=".7" />
  </svg>
);
