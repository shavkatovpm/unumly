"use client";

import { useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, PartialBlock } from "@blocknote/core";
import "@blocknote/mantine/style.css";

/**
 * Unumly rang tokenlariga moslashtirilgan BlockNote temasi. CSS var()
 * qiymatlari ishlatilgani uchun light/dark hech qanday qo'shimcha ishsiz
 * o'zi moslashadi (brauzer var()ni chizish vaqtida hal qiladi).
 */
const theme = {
  colors: {
    editor: { text: "var(--foreground)", background: "transparent" },
    menu: { text: "var(--foreground)", background: "var(--surface)" },
    tooltip: { text: "var(--foreground)", background: "var(--surface-raised)" },
    hovered: { text: "var(--foreground)", background: "var(--hover)" },
    selected: { text: "var(--accent-ink)", background: "var(--accent)" },
    disabled: { text: "var(--faint)", background: "var(--subtle)" },
    shadow: "var(--shadow-md)",
    border: "var(--border)",
    sideMenu: "var(--faint)",
  },
  borderRadius: 8,
  fontFamily: "inherit",
};

const SAVE_DEBOUNCE_MS = 700;

export function BlockNoteEditor({
  initialContent,
  onChange,
  editable = true,
}: {
  /** Undefined/empty → editor boshlanadi bo'sh paragraf bilan. */
  initialContent?: PartialBlock[] | null;
  onChange: (blocks: Block[]) => void;
  editable?: boolean;
}) {
  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
  });
  const timerRef = useRef<number | null>(null);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      editable={editable}
      onChange={() => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          onChange(editor.document);
          timerRef.current = null;
        }, SAVE_DEBOUNCE_MS);
      }}
    />
  );
}
