"use client";

import { useRef } from "react";
import {
  AddBlockButton,
  DragHandleButton,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems, type Block, type PartialBlock } from "@blocknote/core";
import {
  AlignLeft, ChevronRight, Code, GripVertical, Heading1, Heading2, Heading3,
  Heading4, Heading5, Heading6, Image as ImageIcon, List, ListChecks, ListOrdered,
  Minus, Music, Paperclip, Quote, SeparatorHorizontal, Smile, Table as TableIcon, Video,
} from "lucide-react";
import "@blocknote/mantine/style.css";

/** Unumly rang tokenlariga moslashtirilgan BlockNote temasi. CSS var()
 *  qiymatlari ishlatilgani uchun light/dark hech qanday qo'shimcha ishsiz
 *  o'zi moslashadi (brauzer var()ni chizish vaqtida hal qiladi). Qolgan
 *  "Notion'ga o'xshashlik" — ikonalar/shrift/popover shakli — CSS orqali
 *  (globals.css, ".unumly-bn" ostida) va quyidagi custom slash/side menu
 *  bilan almashtiriladi. */
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

/** Slash-menyudagi har bir blok turi uchun lucide ikon — BlockNote'ning
 *  o'z (RemixIcon) ikonalari o'rniga, ilovaning boshqa joylarida ishlatilgan
 *  bir xil ikon tili bilan. `DefaultReactSuggestionItem` `key`ni ochib
 *  bermaydi, shuning uchun (ingliz lokalidagi) sarlavha bo'yicha moslaymiz —
 *  xaritada yo'q sarlavha — asl ikon saqlanib qoladi. */
const SLASH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Heading 1": Heading1,
  "Heading 2": Heading2,
  "Heading 3": Heading3,
  "Heading 4": Heading4,
  "Heading 5": Heading5,
  "Heading 6": Heading6,
  "Toggle Heading 1": Heading1,
  "Toggle Heading 2": Heading2,
  "Toggle Heading 3": Heading3,
  Quote: Quote,
  "Toggle List": ChevronRight,
  "Numbered List": ListOrdered,
  "Bullet List": List,
  "Check List": ListChecks,
  Paragraph: AlignLeft,
  "Code Block": Code,
  "Page Break": SeparatorHorizontal,
  Divider: Minus,
  Table: TableIcon,
  Image: ImageIcon,
  Video: Video,
  Audio: Music,
  File: Paperclip,
  Emoji: Smile,
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
    <div className="unumly-bn">
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        slashMenu={false}
        sideMenu={false}
        onChange={() => {
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            onChange(editor.document);
            timerRef.current = null;
          }, SAVE_DEBOUNCE_MS);
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              getDefaultReactSlashMenuItems(editor).map((item) => {
                const Icon = SLASH_ICONS[item.title];
                return Icon ? { ...item, icon: <Icon className="size-4" /> } : item;
              }),
              query
            )
          }
        />
        <SideMenuController
          sideMenu={(props) => (
            <SideMenu {...props}>
              <AddBlockButton />
              <DragHandleButton {...props}>
                <GripVertical className="size-[15px]" />
              </DragHandleButton>
            </SideMenu>
          )}
        />
      </BlockNoteView>
    </div>
  );
}
