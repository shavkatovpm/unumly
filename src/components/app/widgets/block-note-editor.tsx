"use client";

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  SideMenuController,
  SuggestionMenuController,
  TableHandle,
  TableHandlesController,
  getDefaultReactSlashMenuItems,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useDictionary,
  useExtension,
  useExtensionState,
  type TableHandleProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems,
  type Block, type PartialBlock,
} from "@blocknote/core";
import { uz } from "@blocknote/core/locales";
import { SideMenuExtension, SuggestionMenu, TableHandlesExtension } from "@blocknote/core/extensions";
import {
  AlignLeft, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Columns3, Heading2, ListChecks,
  MoreVertical, Plus, Rows3, SquareCheck, Table as TableIcon, Trash2,
} from "lucide-react";
import "@blocknote/mantine/style.css";

// Loyihada rasm qo'shish imkoniyati butunlay o'chirilgan — "image" blok
// turi sxemadan olib tashlanadi, shuning uchun u slash-menyu, "+" tugma,
// paste va drag-drop orqali ham hech qayerda paydo bo'lmaydi.
const { image: _image, ...blockSpecsWithoutImage } = defaultBlockSpecs;
const schema = BlockNoteSchema.create({ blockSpecs: blockSpecsWithoutImage });

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
 *  bermaydi, shuning uchun (o'zbek lokalidagi) sarlavha bo'yicha moslaymiz —
 *  xaritada yo'q sarlavha — asl ikon saqlanib qoladi. */
const SLASH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "2-darajali sarlavha": Heading2,
  "Belgilash ro‘yxati": ListChecks,
  "Jadval": TableIcon,
};

// Hozircha faqat shu uchtasi kifoya — qolgan barcha blok turlari
// (sarlavha 1/3-6, iqtibos, boshqa ro'yxatlar, kod, media va h.k.)
// slash-menyudan yashiriladi.
const ALLOWED_SLASH_TITLES = new Set([
  "2-darajali sarlavha",
  "Belgilash ro‘yxati",
  "Jadval",
]);

const SAVE_DEBOUNCE_MS = 700;

/** Matn/fon rangi — blok darajasidagi prop (har bir blok mustaqil, Enter
 *  bilan bo'linganda vorislik qilinmaydi). Quyidagi mexanizm shuni tuzatadi:
 *  yangi blok paydo bo'lsa va rangi bo'lmasa, undan oldingi blokning rangini
 *  meros qilib oladi — foydalanuvchi ranglar menyusidan boshqasini
 *  tanlamaguncha, o'sha bo'limdagi keyingi qatorlar bir xil rangda qoladi. */
type ColorProps = { textColor: string; backgroundColor: string };
type ColorSnapshot = Map<string, ColorProps>;

function flattenBlocks(blocks: Block[], out: Block[] = []): Block[] {
  for (const b of blocks) {
    out.push(b);
    if (b.children && b.children.length > 0) flattenBlocks(b.children, out);
  }
  return out;
}

function colorPropsOf(block: Block): ColorProps {
  const props = block.props as Record<string, unknown> | undefined;
  const textColor = typeof props?.textColor === "string" ? props.textColor : "default";
  const backgroundColor = typeof props?.backgroundColor === "string" ? props.backgroundColor : "default";
  return { textColor, backgroundColor };
}

/** Enter bilan bo'linganda yangi blok — oldingi blok rangini davom ettiradi. */
function useStickyBlockColor(editor: ReturnType<typeof useCreateBlockNote>) {
  const prevRef = useRef<ColorSnapshot>(new Map());
  const initedRef = useRef(false);

  return useCallback(() => {
    const flat = flattenBlocks(editor.document);
    if (!initedRef.current) {
      // Birinchi chaqiriqda (hujjat ochilganda) faqat holatni saqlaymiz —
      // mavjud hujjatni "tuzatib" chiqmaymiz, faqat shu tahrirlash
      // sessiyasida yangi yaratilgan bloklarga ta'sir qiladi.
      initedRef.current = true;
      const snap: ColorSnapshot = new Map();
      for (const b of flat) snap.set(b.id, colorPropsOf(b));
      prevRef.current = snap;
      return;
    }

    const prevSnap = prevRef.current;
    const nextSnap: ColorSnapshot = new Map();
    for (let i = 0; i < flat.length; i++) {
      const b = flat[i];
      const current = colorPropsOf(b);
      const isNew = !prevSnap.has(b.id);
      const hasNoColor = current.textColor === "default" && current.backgroundColor === "default";
      if (isNew && hasNoColor && i > 0) {
        const inherited = colorPropsOf(flat[i - 1]);
        if (inherited.textColor !== "default" || inherited.backgroundColor !== "default") {
          try {
            editor.updateBlock(b.id, { props: inherited });
            nextSnap.set(b.id, inherited);
            continue;
          } catch {
            // Bu blok turi rang propini qo'llab-quvvatlamaydi — o'tkazib yuboramiz.
          }
        }
      }
      nextSnap.set(b.id, current);
    }
    prevRef.current = nextSnap;
  }, [editor]);
}

const BLOCK_MENU_WIDTH = 208;

/** "⋯" menyusida to'g'ridan-to'g'ri (boshqa menyuni ochmasdan) tanlanadigan
 *  blok turlari — slash-menyudagi uchtasi bilan bir xil (+ oddiy matn). */
const BLOCK_TYPE_ITEMS = [
  { type: "paragraph", label: "Oddiy matn", icon: AlignLeft },
  { type: "heading", label: "Sarlavha", icon: Heading2, props: { level: 2 } },
  { type: "checkListItem", label: "Belgilash", icon: ListChecks },
  { type: "table", label: "Jadval", icon: TableIcon },
] as const;

/** Matn/fon rangi tanlash — BlockNote'ning o'z 10 ta rang kalitiga mos
 *  (default/gray/brown/red/orange/yellow/green/blue/purple/pink), lekin
 *  ilovaning o'z uslubidagi kichik doiralar bilan (BlockNote'ning Mantine
 *  menyu komponentlari emas). */
const COLOR_KEYS = [
  "default", "gray", "brown", "red", "orange", "yellow", "green", "blue", "purple", "pink",
] as const;
const COLOR_HEX: Record<(typeof COLOR_KEYS)[number], string> = {
  default: "transparent",
  gray: "#9b9a97",
  brown: "#64473a",
  red: "#e03e3e",
  orange: "#d9730d",
  yellow: "#dfab01",
  green: "#4d6461",
  blue: "#0b6e99",
  purple: "#6940a5",
  pink: "#ad1a72",
};
const COLOR_LABEL_UZ: Record<(typeof COLOR_KEYS)[number], string> = {
  default: "Avtomatik", gray: "Kulrang", brown: "Jigarrang", red: "Qizil",
  orange: "To'q sariq", yellow: "Sariq", green: "Yashil", blue: "Ko'k",
  purple: "Binafsha", pink: "Pushti",
};

/** Qator ustidan hover qilinganda chiqadigan yagona "⋯" tugma — Notion'ning
 *  chap tarafdagi ikkita alohida ("+" va sudrash) ikonkasi o'rniga, ilovaning
 *  boshqa joylarida (sahifa kartalari) ishlatilgan xuddi shu "⋯" tili bilan.
 *  Bosilsa kichik menyu ochiladi: blok turini tanlash (alohida "/" menyusiz,
 *  to'g'ridan-to'g'ri shu yerning o'zida), matn/fon rangi, Yuqoriga/Pastga,
 *  O'chirish; ustidan tortilsa (draggable) — blokni sudrab ko'chirish ham
 *  shu tugma orqali ishlaydi. */
function CustomBlockMenuButton() {
  const editor = useBlockNoteEditor();
  const sideMenu = useExtension(SideMenuExtension);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // MUHIM: freeze/unfreeze faqat ochilish/yopilish AMALIGA bog'lab
  // chaqiriladi — `useEffect([menuOpen])` orqali EMAS. `unfreezeMenu()`
  // ichida `state.show = false` o'rnatiladi (menyuni "yashiradi"); bu
  // komponent har safar YANGI blok hover qilinganda qayta MOUNT bo'ladi
  // (`menuOpen` boshlang'ich `false` qiymatdan boshlanadi), shuning uchun
  // effect mount'da darhol `unfreezeMenu()`ni chaqirib, SideMenuController
  // hozirgina ko'rsatgan menyuni o'sha zahoti yashirib yuborardi — "⋯"
  // hech qachon ko'rinmasligining aynan sababi shu edi.
  function toggleMenu() {
    setMenuOpen((v) => {
      const next = !v;
      if (next) sideMenu.freezeMenu();
      else sideMenu.unfreezeMenu();
      return next;
    });
  }
  function closeMenu() {
    setMenuOpen(false);
    sideMenu.unfreezeMenu();
  }

  // Menyu ochiq bo'lganda `freezeMenu()` BlockNote'ning o'z hover-kuzatuvini
  // butunlay to'xtatadi (aks holda "⋯" ochiq turgan blokdan sirg'alib
  // ketardi) — lekin bu shuni anglatadiki, agar foydalanuvchi biror amalni
  // bosmasdan (Escape/tashqariga bosish/band tanlash), shunchaki sichqonchani
  // BOSHQA qatorga olib borsa, hech narsa uni yechmaydi va "⋯" abadiy o'sha
  // birinchi qatorda "qotib" qolardi. Shu sabab bu yerda MUSTAQIL ravishda
  // haqiqiy hujjat kontentidagi boshqa blok ustiga o'tilganini kuzatib,
  // shunday holatda menyuni avtomatik yopamiz (unfreeze) — shundan keyingi
  // navbatdagi mousemove'da BlockNote o'zi yangi qatorni ilib oladi.
  useEffect(() => {
    if (!menuOpen || block === undefined) return;
    function onMove(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const blockEl = target?.closest?.("[data-id]") as HTMLElement | null;
      const hoveredId = blockEl?.getAttribute("data-id");
      if (hoveredId && hoveredId !== block!.id) {
        closeMenu();
      }
    }
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, block]);

  function insertBlockBelow(type: string, props?: Record<string, unknown>) {
    closeMenu();
    if (block === undefined) return;
    const inserted = editor.insertBlocks(
      [{ type, props } as PartialBlock],
      block,
      "after"
    )[0];
    editor.setTextCursorPosition(inserted);
  }

  function setTextColor(color: string) {
    closeMenu();
    if (block === undefined) return;
    try {
      editor.updateBlock(block, { props: { textColor: color } } as never);
    } catch {
      // Bu blok turi rang propini qo'llab-quvvatlamaydi (masalan jadval) — o'tkazib yuboriladi.
    }
  }
  function setBackgroundColor(color: string) {
    closeMenu();
    if (block === undefined) return;
    try {
      editor.updateBlock(block, { props: { backgroundColor: color } } as never);
    } catch {
      // Bu blok turi rang propini qo'llab-quvvatlamaydi (masalan jadval) — o'tkazib yuboriladi.
    }
  }

  if (block === undefined) return null;

  return (
    <button
      ref={triggerRef}
      type="button"
      draggable
      onDragStart={(e) => sideMenu.blockDragStart(e, block)}
      onDragEnd={sideMenu.blockDragEnd}
      onClick={toggleMenu}
      aria-label="Blok menyusi"
      className="grid size-[28px] shrink-0 cursor-grab place-items-center rounded active:cursor-grabbing"
    >
      <MoreVertical size={18} strokeWidth={2} />
      <BlockActionMenu
        open={menuOpen}
        triggerRef={triggerRef}
        onClose={closeMenu}
        onInsertBlock={insertBlockBelow}
        onSetTextColor={setTextColor}
        onSetBackgroundColor={setBackgroundColor}
        onRemove={() => { closeMenu(); editor.removeBlocks([block]); }}
      />
    </button>
  );
}

// BlockNote'ning o'z <SideMenu> o'rovchisi (@blocknote/react) children
// berilganda negadir hover holatini darhol yashirib yuborardi (sababi
// aniqlanmadi — hatto bo'sh <div/> ham buzardi, standart ichki
// AddBlockButton/DragHandleButton esa muammosiz ishlardi). Shu sabab u
// butunlay chetlab o'tiladi — to'g'ridan-to'g'ri asosdagi (Mantine)
// Components.SideMenu.Root'ga chiqiladi, bu qatlam sinovdan o'tkazilgan:
// oddiy MantineGroup, hech qanday side-effect yo'q.
function CustomSideMenuRoot() {
  const Components = useComponentsContext()!;
  return (
    <Components.SideMenu.Root className="bn-side-menu">
      <CustomBlockMenuButton />
    </Components.SideMenu.Root>
  );
}

/** "⋯" tugmasi ostida chiqadigan blok amallari menyusi — sahifa kartalari
 *  uchun ishlatilgan PageCardMenu bilan bir xil vizual til (portal orqali
 *  document.body'ga, aks holda muharrir konteynerining o'zi kesib
 *  tashlashi mumkin). */
function BlockActionMenu({
  open,
  triggerRef,
  onClose,
  onInsertBlock,
  onSetTextColor,
  onSetBackgroundColor,
  onRemove,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onInsertBlock: (type: string, props?: Record<string, unknown>) => void;
  onSetTextColor: (color: string) => void;
  onSetBackgroundColor: (color: string) => void;
  onRemove: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, r.left) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    }
    const tid = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(tid);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !mounted || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[100] overflow-hidden rounded-lg border border-border bg-surface py-1.5 shadow-2xl ring-1 ring-black/5"
      style={{ top: pos.top, left: pos.left, width: BLOCK_MENU_WIDTH }}
    >
      <div className="px-3 pb-2">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-faint">Blok turi</p>
        <div className="flex items-center gap-1">
          {BLOCK_TYPE_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              title={item.label}
              onClick={() => onInsertBlock(item.type, "props" in item ? item.props : undefined)}
              className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <item.icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-faint">Matn rangi</p>
        <div className="flex flex-wrap items-center gap-1">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              title={COLOR_LABEL_UZ[c]}
              onClick={() => onSetTextColor(c)}
              className="grid size-5 place-items-center rounded-full border border-border transition-transform hover:scale-110"
              style={{ color: c === "default" ? "var(--faint)" : COLOR_HEX[c] }}
            >
              <span className="text-[10px] font-bold leading-none">A</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-faint">Fon rangi</p>
        <div className="flex flex-wrap items-center gap-1">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              title={COLOR_LABEL_UZ[c]}
              onClick={() => onSetBackgroundColor(c)}
              className="size-5 rounded-full border border-border transition-transform hover:scale-110"
              style={{ background: c === "default" ? "transparent" : COLOR_HEX[c] }}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-1">
        <button
          type="button"
          role="menuitem"
          onClick={onRemove}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-hover"
        >
          <Trash2 className="size-3.5" /> O&apos;chirish
        </button>
      </div>
    </div>,
    document.body
  );
}

type TableOrientation = "row" | "column";

function TableDeleteItem({ orientation }: { orientation: TableOrientation }) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const tableHandles = useExtension(TableHandlesExtension);
  const index = useExtensionState(TableHandlesExtension, {
    selector: (state) => (orientation === "column" ? state?.colIndex : state?.rowIndex),
  });
  if (tableHandles === undefined || index === undefined) return null;
  return (
    <Components.Generic.Menu.Item
      icon={<Trash2 className="size-3.5" />}
      onClick={() => tableHandles.removeRowOrColumn(index, orientation)}
    >
      {orientation === "row" ? dict.table_handle.delete_row_menuitem : dict.table_handle.delete_column_menuitem}
    </Components.Generic.Menu.Item>
  );
}

const ADD_ITEM_ICONS = {
  above: ArrowUp,
  below: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
} as const;

function TableAddItem(
  props: { orientation: "row"; side: "above" | "below" } | { orientation: "column"; side: "left" | "right" }
) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const tableHandles = useExtension(TableHandlesExtension);
  const index = useExtensionState(TableHandlesExtension, {
    selector: (state) => (props.orientation === "column" ? state?.colIndex : state?.rowIndex),
  });
  if (tableHandles === undefined || index === undefined) return null;
  const SideIcon = ADD_ITEM_ICONS[props.side];
  return (
    <Components.Generic.Menu.Item
      icon={<SideIcon className="size-3.5" />}
      onClick={() =>
        tableHandles.addRowOrColumn(
          index,
          props.orientation === "row"
            ? { orientation: "row", side: props.side }
            : { orientation: "column", side: props.side }
        )
      }
    >
      {dict.table_handle[`add_${props.side}_menuitem`]}
    </Components.Generic.Menu.Item>
  );
}

function TableHeaderItem({ orientation }: { orientation: TableOrientation }) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor();
  const tableHandles = useExtension(TableHandlesExtension);
  const { block, index } = useExtensionState(TableHandlesExtension, {
    selector: (state) => ({
      block: state?.block,
      index: orientation === "column" ? state?.colIndex : state?.rowIndex,
    }),
  });

  if (!tableHandles || !block || index !== 0 || !editor.settings.tables.headers) return null;

  const content = block.content as { headerRows?: number; headerCols?: number };
  if (orientation === "row") {
    const isHeaderRow = Boolean(content.headerRows);
    return (
      <Components.Generic.Menu.Item
        icon={<Rows3 className="size-3.5" />}
        checked={isHeaderRow}
        onClick={() =>
          editor.updateBlock(block, {
            ...block,
            content: { ...content, headerRows: isHeaderRow ? undefined : 1 } as never,
          })
        }
      >
        {dict.drag_handle.header_row_menuitem}
      </Components.Generic.Menu.Item>
    );
  }
  const isHeaderColumn = Boolean(content.headerCols);
  return (
    <Components.Generic.Menu.Item
      icon={<Columns3 className="size-3.5" />}
      checked={isHeaderColumn}
      onClick={() =>
        editor.updateBlock(block, {
          ...block,
          content: { ...content, headerCols: isHeaderColumn ? undefined : 1 } as never,
        })
      }
    >
      {dict.drag_handle.header_column_menuitem}
    </Components.Generic.Menu.Item>
  );
}

/** Jadval katagi ichidagi (rich-text) kontent — xom holatda `InlineContent[]`
 *  yoki normallashtirilgan `TableCell` (`{type:"tableCell", props, content}`)
 *  bo'lishi mumkin; ikkalasini ham bir xil davolaydi. */
function cellInlineContent(cell: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(cell)) return cell as Record<string, unknown>[];
  if (cell && typeof cell === "object" && (cell as { type?: unknown }).type === "tableCell") {
    const content = (cell as { content?: unknown }).content;
    return Array.isArray(content) ? (content as Record<string, unknown>[]) : null;
  }
  return null;
}
function withCellInlineContent(cell: unknown, inline: Record<string, unknown>[]): unknown {
  if (Array.isArray(cell)) return inline;
  return { ...(cell as object), content: inline };
}

/** Katakning o'zini (raw massiv bo'lsa) to'liq `TableCell` obyektiga
 *  ko'tarib, `props`ini birlashtiradi — xom massiv shaklida propga o'rin
 *  yo'q, shuning uchun kerak bo'lgandagina (masalan markazga tekislashda)
 *  to'liq shaklga aylantiriladi. */
function withCellProps(cell: unknown, props: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(cell)) return { type: "tableCell", props, content: cell };
  const c = cell as { props?: Record<string, unknown> };
  return { ...(cell as object), props: { ...(c.props ?? {}), ...props } };
}

// Belgi haqiqiy checkbox emas — bitta bo'sh joy belgili matn (ProseMirror
// bo'sh matn tugunini yoqtirmaydi), lekin ustiga maxsus `textColor` uslub
// qiymati ("checkbox-off"/"checkbox-on") qo'yiladi. BlockNote bu qiymatni
// `data-value` HTML atributi sifatida chiqaradi (haqiqiy rangga
// aylantirmasdan — biz uni rang sifatida ishlatmaymiz), shu orqali
// globals.css'da ilovaning o'z checkbox uslubidagi (rounded-md, border-
// accent/bg-accent) haqiqiy quti+belgi CSS bilan chiziladi.
const CHECKBOX_MARKER_TEXT = " ";
const CHECKBOX_OFF = "checkbox-off";
const CHECKBOX_ON = "checkbox-on";

function checkboxState(cell: unknown): "off" | "on" | null {
  const first = cellInlineContent(cell)?.[0] as { type?: string; styles?: Record<string, unknown> } | undefined;
  if (first?.type !== "text") return null;
  const tc = first.styles?.textColor;
  if (tc === CHECKBOX_OFF) return "off";
  if (tc === CHECKBOX_ON) return "on";
  return null;
}

function isCheckboxCell(cell: unknown): boolean {
  return checkboxState(cell) !== null;
}

/** Belgilangan (✅) qatorning butun matnini "bajarilgan" his qildirish uchun
 *  chiziq bilan o'chirilgandek ko'rsatadi (`strike` — BlockNote'ning standart
 *  uslubi); belgi olib tashlanganda chiziq ham olib tashlanadi. */
function withStrike(run: Record<string, unknown>, strike: boolean): Record<string, unknown> {
  if (run.type !== "text") return run;
  const styles = { ...((run.styles as Record<string, unknown>) ?? {}) };
  if (strike) styles.strike = true;
  else delete styles.strike;
  return { ...run, styles };
}

function setRowStrike(cells: unknown[], strike: boolean, checkboxColIndex: number): unknown[] {
  return cells.map((cell, ci) => {
    const inline = cellInlineContent(cell);
    if (!inline || inline.length === 0) return cell;
    const nextInline = inline.map((run, ri) =>
      // Checkbox belgisining o'zi chiziqsiz qoladi — faqat undan keyingi
      // (label) matn va boshqa katakchalarning HAMMASI chiziq oladi.
      ci === checkboxColIndex && ri === 0 ? run : withStrike(run, strike)
    );
    return withCellInlineContent(cell, nextInline);
  });
}

// Jadval mutatsiya funksiyalari `useBlockNoteEditor`ning turli chaqiruv
// nuqtalarida (har xil generic sxema parametrlari bilan) ishlatiladi —
// to'liq generic turni talab qilish o'rniga faqat kerakli ikkita metod
// bilan minimal interfeys yetarli.
type TableMutationEditor = {
  getBlock: (id: string) => { id: string; type: string; content: unknown } | undefined;
  updateBlock: (id: string, update: unknown) => unknown;
};

/** Ustunni "belgilash ustuni"ga aylantiradi — har bir katakning boshiga
 *  checkbox belgisini qo'shadi (allaqachon belgilangan kataklar o'zgarmaydi)
 *  va katakni markazga tekislaydi — checkbox katakning o'rtasida turishi
 *  uchun. */
function markColumnAsCheckbox(
  editor: TableMutationEditor,
  blockId: string,
  colIndex: number
) {
  const block = editor.getBlock(blockId);
  if (!block || block.type !== "table") return;
  const content = block.content as { rows: { cells: unknown[] }[] } & Record<string, unknown>;
  const rows = content.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell, ci) => {
      if (ci !== colIndex || isCheckboxCell(cell)) return cell;
      const inline = cellInlineContent(cell) ?? [];
      const marker = { type: "text", text: CHECKBOX_MARKER_TEXT, styles: { textColor: CHECKBOX_OFF } };
      const withMarker = withCellInlineContent(cell, [marker, ...inline]);
      return withCellProps(withMarker, { textAlignment: "center" });
    }),
  }));
  editor.updateBlock(blockId, { type: "table", content: { ...content, rows } } as never);
}

/** Belgini yoqadi/o'chiradi va butun qatorni "bajarilgan" (chiziqli) holatga
 *  moslaydi — yoqilganda qatordagi barcha matn chiziq bilan o'chirilgandek
 *  bo'ladi, o'chirilganda chiziq olib tashlanadi. */
function toggleCellCheckbox(
  editor: TableMutationEditor,
  blockId: string,
  rowIndex: number,
  colIndex: number
) {
  const block = editor.getBlock(blockId);
  if (!block || block.type !== "table") return;
  const content = block.content as { rows: { cells: unknown[] }[] } & Record<string, unknown>;
  const row = content.rows[rowIndex];
  const cell = row?.cells[colIndex];
  const state = checkboxState(cell);
  if (state === null) return;
  const checked = state === "off";
  const inline = cellInlineContent(cell)!;
  const first = inline[0] as Record<string, unknown>;
  const styles = { ...((first.styles as Record<string, unknown>) ?? {}), textColor: checked ? CHECKBOX_ON : CHECKBOX_OFF };
  const nextInline = [{ ...first, styles }, ...inline.slice(1)];
  const rows = content.rows.map((r, ri) => {
    if (ri !== rowIndex) return r;
    const withNewMarker = r.cells.map((c, ci) => (ci === colIndex ? withCellInlineContent(c, nextInline) : c));
    return { ...r, cells: setRowStrike(withNewMarker, checked, colIndex) };
  });
  editor.updateBlock(blockId, { type: "table", content: { ...content, rows } } as never);
}

/** Ustun tutqichi menyusidagi "Belgilash ustuni" — bosilgan ustunni to do
 *  ro'yxatga o'xshab har bir katakni belgilash mumkin bo'lgan holatga
 *  o'tkazadi (jadval katagi haqiqiy checkbox'ni qo'llab-quvvatlamagani uchun —
 *  maxsus uslub-belgisi orqali, lekin ilovaning o'z checkbox ko'rinishi va
 *  bosish qulayligi bilan). */
function TableCheckboxColumnItem() {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const { block, colIndex } = useExtensionState(TableHandlesExtension, {
    selector: (state) => ({ block: state?.block, colIndex: state?.colIndex }),
  });
  if (!block || colIndex === undefined) return null;
  return (
    <Components.Generic.Menu.Item
      icon={<SquareCheck className="size-3.5" />}
      onClick={() => markColumnAsCheckbox(editor as unknown as TableMutationEditor, block.id, colIndex)}
    >
      Belgilash ustuni
    </Components.Generic.Menu.Item>
  );
}

/** Jadval qator/ustun tugmasi ostidagi menyu — matn variantlariga mos
 *  ikonalar qo'shilgan (standart BlockNote menyusida ikon yo'q edi). */
function CustomTableHandleMenu({ orientation }: { orientation: TableOrientation }) {
  const Components = useComponentsContext()!;
  return (
    <Components.Generic.Menu.Dropdown className="bn-table-handle-menu">
      <TableDeleteItem orientation={orientation} />
      {orientation === "row" ? (
        <>
          <TableAddItem orientation="row" side="above" />
          <TableAddItem orientation="row" side="below" />
        </>
      ) : (
        <>
          <TableAddItem orientation="column" side="left" />
          <TableAddItem orientation="column" side="right" />
          <TableCheckboxColumnItem />
        </>
      )}
      <TableHeaderItem orientation={orientation} />
    </Components.Generic.Menu.Dropdown>
  );
}

function CustomTableHandle(props: TableHandleProps) {
  // BlockNote'ning `tableHandleMenu?: FC` turi torroq e'lon qilingan (haqiqatda
  // `orientation` prop bilan chaqiriladi) — shu sabab cast talab qilinadi.
  // Standart 6-nuqtali (2 ustunli) Notion uslubidagi tutqich o'rniga — 3
  // nuqtali (bitta ustunli) ikon, qatorni/ustunni bosish qulay bo'lishi
  // uchun yetarlicha katta.
  return (
    <TableHandle {...props} tableHandleMenu={CustomTableHandleMenu as unknown as FC}>
      <MoreVertical size={20} strokeWidth={2.25} />
    </TableHandle>
  );
}

/** "Belgilash ustuni"ga aylantirilgan kataklarda — bosilgan joyi farqi
 *  qilmasdan (aniq belgi ustidan ham, katakning istalgan joyidan ham) doim
 *  faqat belgini almashtiradi, matn kursori HECH QACHON qo'yilmaydi — bu
 *  ustundagi kataklarga erkin matn yozish imkoniyati atayin yo'q (faqat
 *  belgilash uchun). Faqat ProseMirror o'z ishlovchisini ishga
 *  tushirishidan oldin (capture bosqichida) to'xtatilgani uchun ishlaydi. */
function handleCheckboxCellMouseDown(
  editor: TableMutationEditor,
  e: React.MouseEvent<HTMLDivElement>
) {
  const target = e.target as HTMLElement;
  const cellEl = target.closest("td, th") as HTMLElement | null;
  if (!cellEl) return;
  const marker = cellEl.querySelector('span[data-style-type="textColor"][data-value^="checkbox-"]') as HTMLElement | null;
  if (!marker) return;

  const rowEl = cellEl.closest("tr");
  const blockEl = cellEl.closest('[data-node-type="blockContainer"]') as HTMLElement | null;
  const blockId = blockEl?.getAttribute("data-id");
  if (!rowEl || !blockId) return;
  const rows = Array.from(rowEl.parentElement?.children ?? []);
  const rowIndex = rows.indexOf(rowEl);
  const cells = Array.from(rowEl.children);
  const colIndex = cells.indexOf(cellEl);
  if (rowIndex < 0 || colIndex < 0) return;

  e.preventDefault();
  e.stopPropagation();
  toggleCellCheckbox(editor, blockId, rowIndex, colIndex);
}

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
    schema,
    dictionary: uz,
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
  });
  const timerRef = useRef<number | null>(null);
  const applyStickyColor = useStickyBlockColor(editor);

  return (
    <div
      className="unumly-bn"
      onMouseDownCapture={(e) => handleCheckboxCellMouseDown(editor as unknown as TableMutationEditor, e)}
    >
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        slashMenu={false}
        sideMenu={false}
        tableHandles={false}
        onChange={() => {
          applyStickyColor();
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
              getDefaultReactSlashMenuItems(editor)
                .filter((item) => ALLOWED_SLASH_TITLES.has(item.title))
                .map((item) => {
                  const Icon = SLASH_ICONS[item.title];
                  return Icon ? { ...item, icon: <Icon className="size-4" /> } : item;
                }),
              query
            )
          }
        />
        <SideMenuController sideMenu={CustomSideMenuRoot} />
        <TableHandlesController tableHandle={CustomTableHandle} />
      </BlockNoteView>
    </div>
  );
}
