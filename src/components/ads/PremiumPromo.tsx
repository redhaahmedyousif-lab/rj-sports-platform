import Link from "next/link";
import { CrownIcon } from "@/components/ui/icons";
import { PREMIUM_PERKS as PERKS } from "@/lib/premium";
import { PREMIUM_NAME, SITE_NAME } from "@/lib/brand";

/** بطاقة ترويج الاشتراك — تظهر لغير المشتركين */
export function PremiumPromo() {
  return (
    <div className="rounded-xl border border-gold/30 bg-gradient-to-b from-gold/10 to-surface p-5">
      <div className="mb-3 flex items-center gap-2 text-gold">
        <CrownIcon />
        <h3 className="font-extrabold">
          {SITE_NAME} <span>{PREMIUM_NAME}</span>
        </h3>
      </div>
      <p className="mb-4 text-sm text-muted">
        فقط <span className="font-bold text-fg">1.99$</span> شهرياً
      </p>
      <ul className="mb-5 space-y-2 text-sm">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2">
            <span className="text-brand">✓</span>
            {perk}
          </li>
        ))}
      </ul>
      <Link
        href="/subscribe"
        className="block rounded-lg bg-gold py-2 text-center text-sm font-bold text-black transition hover:brightness-110"
      >
        اشترك الآن
      </Link>
    </div>
  );
}
