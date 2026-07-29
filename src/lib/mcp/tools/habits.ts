import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  mcpListHabits,
  mcpCreateHabit,
  mcpUpdateHabit,
  mcpDeleteHabit,
  mcpLogHabit,
  mcpDeleteHabitCategory,
} from "@/lib/mcp/habits";
import { timeStr, leadMin, weekday, dateStr, textResult } from "./shared";

export function registerHabitTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_habits",
    {
      title: "Odatlarni ro'yxatlash",
      description:
        "Barcha odatlarni qaytaradi — kategoriya nomi va joriy streak (ketma-ket bajarilgan kunlar soni, " +
        "faqat odat rejalashtirilgan kunlar hisobga olinadi) bilan. Odat modeli loyihaga bog'lanmaydi " +
        "(har doim shaxsiy).",
      inputSchema: {},
    },
    async () => textResult(await mcpListHabits(ownerUserId))
  );

  server.registerTool(
    "create_habit",
    {
      title: "Yangi odat yaratish",
      description:
        "Yangi takrorlanuvchi odat yaratadi. days MAJBURIY — haftaning qaysi kunlarida (0=Yakshanba..6=Shanba, " +
        "JS getDay() bilan bir xil) takrorlanishini ko'rsatadi. categoryId ixtiyoriy (get_structure." +
        "habitCategories'dan). Odat kelajakdagi kunlar uchun avtomatik Plan occurrence'lari sifatida " +
        "materializatsiya bo'ladi (ilova ochilganda, ildiz oynasi bo'yicha) — MCP orqali yaratilgandan keyin " +
        "darhol Bugun/Agenda'da ko'rinmasligi mumkin, foydalanuvchi ilovani ochganda paydo bo'ladi.",
      inputSchema: {
        title: z.string().min(1),
        categoryId: z.string().nullable().optional(),
        days: z.array(weekday).min(1),
        time: timeStr.optional(),
        notifyLeadMin: leadMin.optional(),
        showInAgenda: z.boolean().optional().describe("Default true"),
      },
    },
    async (args) => textResult(await mcpCreateHabit(ownerUserId, args))
  );

  server.registerTool(
    "update_habit",
    {
      title: "Odatni yangilash",
      description:
        "Mavjud odatni id bo'yicha yangilaydi. days o'zgarsa — kelajakdagi, hali bajarilmagan occurrence'lar " +
        "orasidan yangi jadvalga mos kelmaydiganlari o'chiriladi. time o'zgarsa — kelajakdagi, hali " +
        "bajarilmagan occurrence'larning vaqti va eslatmasi qayta hisoblanadi. archivedAt berilsa odat " +
        "arxivlanadi (yopiq holat, ISO sana yoki null tiklash uchun).",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        categoryId: z.string().nullable().optional(),
        days: z.array(weekday).min(1).optional(),
        time: timeStr.nullable().optional(),
        notifyLeadMin: leadMin.nullable().optional(),
        showInAgenda: z.boolean().optional(),
        archivedAt: z.string().datetime().nullable().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateHabit(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_habit",
    {
      title: "Odatni o'chirish",
      description:
        "Odatni butunlay o'chiradi (hard delete, arxiv yo'q — arxivlash uchun update_habit'dagi archivedAt " +
        "ishlatiladi). Barcha occurrence Plan'lar (tarix ham) DB darajasidagi ON DELETE CASCADE orqali birga " +
        "o'chadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteHabit(ownerUserId, id))
  );

  server.registerTool(
    "log_habit",
    {
      title: "Odatni bajarilgan deb belgilash",
      description:
        "Berilgan kun (default — bugun, Asia/Tashkent) uchun odatni DONE deb belgilaydi. Agar shu kun uchun " +
        "occurrence allaqachon mavjud bo'lsa — holatini DONE'ga o'tkazadi (idempotent, allaqachon DONE bo'lsa " +
        "hech narsa qilmaydi); mavjud bo'lmasa (masalan o'tgan kun uchun orqaga to'ldirish) — DONE holatida " +
        "yangi occurrence yaratadi.",
      inputSchema: {
        habitId: z.string(),
        date: dateStr.optional().describe("Default: bugun (Asia/Tashkent)"),
      },
    },
    async ({ habitId, date }) => textResult(await mcpLogHabit(ownerUserId, habitId, date))
  );

  server.registerTool(
    "delete_habit_category",
    {
      title: "Odat kategoriyasini o'chirish",
      description:
        "Odat kategoriyasini o'chiradi. Odatlar O'CHIRILMAYDI — shu kategoriyaga tegishli barcha odatlar " +
        "avval kategoriyasiz (categoryId=null) holatga o'tkaziladi, so'ng kategoriyaning o'zi o'chadi. " +
        "Javobda 'detachedHabitsCount' — nechta odat ajratilganini ko'rsatadi. DIQQAT: standart kategoriyalar " +
        "himoyasi YO'Q (delete_category'dan farqli — bu yerda 'standart' ekanini aniqlab bo'lmaydi, chunki " +
        "ular ham tasodifiy id bilan yaratiladi; app'ning o'zida ham bu himoya yo'q).",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteHabitCategory(ownerUserId, id))
  );
}
