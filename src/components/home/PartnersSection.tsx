import { activePartners, type PartnerIcon } from "@/config/partners";

/** قنواتنا وشركاؤنا — أزرار روابط خارجية بتصميم داكن */
export function PartnersSection() {
  const partners = activePartners();
  if (partners.length === 0) return null;

  return (
    <section id="partners" aria-labelledby="partners-title" className="space-y-4">
      <div>
        <h2 id="partners-title" className="text-2xl font-extrabold">
          قنواتنا وشركاؤنا
        </h2>
        <p className="mt-1 text-sm text-muted">تابعنا لتصلك الأهداف والأخبار أولاً بأول</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {partners.map((p) => (
          <li key={p.id}>
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              data-partner={p.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span
                className="grid size-12 shrink-0 place-items-center rounded-xl ring-1 ring-white/10 transition group-hover:scale-105"
                style={{ background: `color-mix(in oklab, ${p.color} 16%, transparent)`, color: p.color }}
              >
                <SocialIcon icon={p.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{p.name}</span>
                <span className="block truncate text-xs text-muted">{p.description}</span>
              </span>
              <span aria-hidden className="text-muted transition group-hover:-translate-x-1 group-hover:text-fg">
                ←
              </span>
              <span className="sr-only">(يفتح في نافذة جديدة)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SocialIcon({ icon }: { icon: PartnerIcon }) {
  const props = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;
  switch (icon) {
    case "telegram":
      return (
        <svg {...props}>
          <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.4 3c.9-.3 1.6.2 1.5 1.3z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...props}>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.5-.3z" />
        </svg>
      );
    case "x":
      return (
        <svg {...props} width={20} height={20}>
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...props}>
          <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15V9l5.2 3-5.2 3z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...props}>
          <path d="M16.6 3c.4 2.2 1.8 3.6 4 3.8v3.1a7.2 7.2 0 0 1-4-1.3v6.2A5.8 5.8 0 1 1 10.8 9v3.2a2.7 2.7 0 1 0 2.7 2.7V3h3.1z" />
        </svg>
      );
  }
}
