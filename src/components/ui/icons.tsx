// أيقونات SVG خفيفة بدون مكتبات خارجية
type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const BallIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="m12 7 4 3-1.5 4.5h-5L8 10z" />
    <path d="M12 2v5M16 10l5-1.5M14.5 14.5 17 19M9.5 14.5 7 19M8 10 3 8.5" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
  </svg>
);

export const CrownIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m2 7 5 4 5-7 5 7 5-4-2 12H4z" />
  </svg>
);

export const ChevronIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
