"use client";

import { useEffect } from "react";

/** يمرّر شريط التواريخ أفقياً بحيث يظهر اليوم المختار في المنتصف (مفيد على الجوال) */
export function ScrollActiveIntoView({ containerId, deps }: { containerId: string; deps: string }) {
  useEffect(() => {
    const active = document
      .getElementById(containerId)
      ?.querySelector<HTMLElement>("[aria-current]");
    // scrollIntoView يتعامل مع اتجاه RTL تلقائياً
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
  }, [containerId, deps]);

  return null;
}
