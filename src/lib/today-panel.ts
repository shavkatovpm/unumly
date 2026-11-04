"use client";

import { useEffect, useState } from "react";

/* Bugun tepasidagi tablar va ularning tartibi — qurilmada saqlanadi
   (Boshqaruv → Bugun paneli). */

export type PanelTab = "analitika" | "maqsad" | "reja" | "agenda";
export const PANEL_TABS: { id: PanelTab; label: string; hint: string }[] = [
  { id: "analitika", label: "Analitika", hint: "Hafta, oy va 3 oylik natijalar" },
  { id: "maqsad", label: "Maqsad", hint: "Shu haftaning maqsadlari" },
  { id: "reja", label: "Reja", hint: "G'oyalarni bugunga olish" },
  { id: "agenda", label: "Agenda", hint: "Yaqin kunlardagi rejalar" },
];

const KEY = "unumly:today-panel";
const CHANGE_EVENT = "unumly:today-panel:change";
type Config = { order: PanelTab[]; off: PanelTab[] };
const DEFAULT: Config = { order: PANEL_TABS.map((t) => t.id), off: [] };

function read(): Config {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Config | null;
    const valid = (id: unknown): id is PanelTab => PANEL_TABS.some((t) => t.id === id);
    if (raw && Array.isArray(raw.order) && raw.order.length === PANEL_TABS.length && raw.order.every(valid)) {
      return { order: raw.order, off: (raw.off ?? []).filter(valid) };
    }
  } catch { /* ignore */ }
  return DEFAULT;
}

export function useTodayPanel() {
  const [cfg, setCfg] = useState<Config>(DEFAULT);
  useEffect(() => {
    const sync = () => setCfg(read());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  function save(next: Config) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return {
    cfg,
    visible: cfg.order.filter((id) => !cfg.off.includes(id)),
    toggle(id: PanelTab) {
      save({ ...cfg, off: cfg.off.includes(id) ? cfg.off.filter((x) => x !== id) : [...cfg.off, id] });
    },
    move(id: PanelTab, delta: -1 | 1) {
      const i = cfg.order.indexOf(id);
      const j = i + delta;
      if (j < 0 || j >= cfg.order.length) return;
      const order = [...cfg.order];
      [order[i], order[j]] = [order[j], order[i]];
      save({ ...cfg, order });
    },
    reset: () => save(DEFAULT),
  };
}
