"use client";

/* Kategoriya yaratish/tahrirlash: nom, belgi, rang va (chiqim uchun) oylik limit.
   `inline` — boshqa oyna ichida (o'z tugmalari bilan); aks holda MonoSheet
   ichida MonoHeader + pastdagi MonoSave bilan. */

import { createElement, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryColor, TransactionType } from "@/lib/types";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE } from "@/lib/category-palette";
import { FINANCE_ICON_KEYS, financeIcon } from "@/lib/finance-icons";
import { MonoHeader, MonoSave } from "../widgets/mono-sheet";
import { CatBadge, FieldLabel, MoneyInput, catSoft, catSolid } from "./shared";

export type CategoryInput = { label: string; icon: string; color: CategoryColor; limit: number | null };

export function CategoryForm({ type, initial, initialLimit = null, inline, showLimit, submitLabel, onCancel, onSubmit }: {
  type: TransactionType;
  initial?: { label: string; icon: string; color: CategoryColor };
  initialLimit?: number | null;
  inline?: boolean;
  showLimit?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (c: CategoryInput) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? FINANCE_ICON_KEYS[0]);
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "indigo");
  const [limit, setLimit] = useState(initialLimit ?? 0);
  const [allIcons, setAllIcons] = useState(false);
  // Tanlangan belgi qisqa ro'yxatda bo'lmasa ham ko'rinsin.
  const head = FINANCE_ICON_KEYS.slice(0, 14);
  const icons = allIcons ? FINANCE_ICON_KEYS : head.includes(icon) ? head : [icon, ...head.slice(0, 13)];
  const placeholder = type === "INCOME" ? "Kirim kategoriyasi" : "Chiqim kategoriyasi";
  const valid = label.trim().length > 0;

  function submit() {
    if (!valid) return;
    onSubmit({ label: label.trim(), icon, color, limit: showLimit && limit > 0 ? limit : null });
  }

  const body = (
    <div className="space-y-3">
      <div>
        <FieldLabel aside={<button type="button" onClick={() => setAllIcons((v) => !v)} className="h-8 px-1 text-[12.5px] font-semibold text-muted">{allIcons ? "Kamroq" : `Hammasi (${FINANCE_ICON_KEYS.length})`}</button>}>Belgi</FieldLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {icons.map((k) => {
            const on = icon === k;
            return (
              <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k} aria-pressed={on} className={cn("grid aspect-square place-items-center rounded-[14px] border transition-colors", on ? "border-transparent" : "border-border text-faint")} style={on ? { background: catSoft(color, 0.16), color: catSolid(color) } : undefined}>
                {createElement(financeIcon(k), { className: "size-[18px]" })}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <FieldLabel>Rang</FieldLabel>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {CATEGORY_COLOR_KEYS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={CATEGORY_PALETTE[c].label} aria-pressed={color === c} className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: color === c ? catSoft(c, 0.22) : undefined }}>
              <span className="grid size-6 place-items-center rounded-full" style={{ background: catSolid(c) }}>
                {color === c && <Check className="size-3.5 text-background" strokeWidth={3.5} />}
              </span>
            </button>
          ))}
        </div>
      </div>
      {showLimit && (
        <div>
          <FieldLabel>Oylik limit (ixtiyoriy)</FieldLabel>
          <MoneyInput value={limit} onChange={setLimit} placeholder="Limit belgilanmagan" />
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-3 rounded-[22px] border border-border bg-background p-3">
        <div className="flex items-center gap-3">
          <CatBadge cat={{ id: "", type, label, icon, color, order: 0 }} size={40} />
          <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} enterKeyHint="done" placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none placeholder:font-medium placeholder:text-faint" />
        </div>
        {body}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="h-12 rounded-[18px] bg-subtle text-[15px] font-semibold">Bekor</button>
          <button type="button" onClick={submit} disabled={!valid} className="h-12 rounded-[18px] bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-35">{submitLabel ?? "Qo'shish"}</button>
        </div>
      </div>
    );
  }
  return (
    <>
      <MonoHeader label={`Yangi ${type === "INCOME" ? "kirim" : "chiqim"} kategoriyasi`} value={label} onChange={setLabel} placeholder={placeholder} onEnter={submit} onClose={onCancel} />
      <div className="rounded-[24px] border border-border bg-surface p-3">{body}</div>
      <MonoSave disabled={!valid} onClick={submit}>{submitLabel}</MonoSave>
    </>
  );
}
