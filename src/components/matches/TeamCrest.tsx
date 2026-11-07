import Image from "next/image";
import type { Team } from "@/types/database";

const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** شعار الفريق — يعرض الصورة إن وُجدت وإلا دائرة ملونة بالأحرف الأولى */
export function TeamCrest({ team, size = 24 }: { team: Team; size?: number }) {
  if (team.logo_url) {
    return (
      <Image
        src={team.logo_url}
        alt={team.name}
        width={size}
        height={size}
        className="shrink-0 object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: colorFor(team.id), fontSize: size * 0.36 }}
    >
      {(team.short_name ?? team.name).slice(0, 3)}
    </span>
  );
}
