/** عرض النجوم (للقراءة فقط) — يدعم أنصاف النجوم للمتوسط */
export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span role="img" aria-label={label ?? `${value} من 5 نجوم`} className="inline-flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return <Star key={i} fill={fill} size={size} />;
      })}
    </span>
  );
}

export function Star({ fill, size }: { fill: number; size: number }) {
  const id = `s${Math.round(fill * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--color-gold)" />
          <stop offset={`${fill * 100}%`} stopColor="var(--color-border)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 2.5l2.95 6.1 6.65.9-4.85 4.6 1.2 6.6L12 17.6l-5.95 3.1 1.2-6.6L2.4 9.5l6.65-.9z"
      />
    </svg>
  );
}
