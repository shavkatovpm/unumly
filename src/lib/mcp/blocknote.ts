import "server-only";

/**
 * BlockNote JSON ↔ markdown — @blocknote/server-util LAZY (dynamic import)
 * orqali yuklanadi: faqat get_page/create_page/update_page chaqirilganda.
 * Sabab: bu paket jsdom'ga tayanadi (og'ir) — boshqa tool'lar (list_tasks
 * va h.k.) uni umuman yuklamasligi, yaratmasligi kerak. Next.js/Vercel
 * bundler dynamic import'ni baribir funksiya paketiga qo'shishi mumkin,
 * lekin jsdom instance'ining o'zi (asosiy og'irlik — window/document mock)
 * faqat chindan chaqirilganda yaratiladi.
 */

type ServerEditor = import("@blocknote/server-util").ServerBlockNoteEditor;

let editorPromise: Promise<ServerEditor> | null = null;

async function getEditor(): Promise<ServerEditor> {
  if (!editorPromise) {
    editorPromise = import("@blocknote/server-util").then((m) => m.ServerBlockNoteEditor.create());
  }
  return editorPromise;
}

/** BlockNote blok massivini (Page.content) LLM o'qishi uchun qulay
 *  markdown'ga o'giradi. Bo'sh/null content uchun bo'sh satr qaytaradi. */
export async function blocksToMarkdown(blocks: unknown): Promise<string> {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  const editor = await getEditor();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return editor.blocksToMarkdownLossy(blocks as any);
}

/** Oddiy markdown matnni BlockNote blok massiviga o'giradi (create_page/
 *  update_page uchun) — paragraph/heading/list каби asosiy elementlarni
 *  tanийdi; murakkab BlockNote-maxsus bloklar (jadval formatlash va h.k.)
 *  to'liq saqlanmasligi mumkin ("lossy" — kutubxonaning o'z nomlanishi). */
export async function markdownToBlocks(markdown: string): Promise<unknown[]> {
  const editor = await getEditor();
  return editor.tryParseMarkdownToBlocks(markdown);
}
