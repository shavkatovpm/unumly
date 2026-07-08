import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Berilgan element matn kiritiladigan joymi (input/textarea/contentEditable
 *  — jumladan BlockNote'ning ProseMirror hujjat maydoni). Global ⌘/Ctrl
 *  klaviatura yorliqlari (masalan sidebar ⌘B) shu yerda `true` bo'lsa
 *  ishlamasligi kerak — aks holda brauzerning/muharrirning standart
 *  ⌘B (qalin), ⌘I (kursiv), ⌘A (barchasini belgilash) kabi yorliqlarini
 *  "o'g'irlab" ketadi. */
export function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    return t !== "button" && t !== "submit" && t !== "checkbox" && t !== "radio" && t !== "file";
  }
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}
