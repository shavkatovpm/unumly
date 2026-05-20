import Link from "next/link";
import { Activity, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function relTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hozir online";
  if (min < 60) return `${min} daq oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} kun oldin`;
  return d.toISOString().slice(0, 10);
}

function displayName(u: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  telegramId: bigint;
}): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (u.username) return `@${u.username}`;
  return `id:${u.telegramId.toString()}`;
}

export default async function SessiyalarPage() {
  const users = await prisma.user.findMany({
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  });

  const activeThreshold = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 daq
  const activeCount = users.filter((u) => u.lastSeenAt >= activeThreshold).length;
  const onlineCount = users.filter((u) => u.lastSeenAt >= onlineThreshold).length;

  return (
    <>
      <AdminPageHeader
        title="Faollik"
        subtitle={`${onlineCount} ta hozir · ${activeCount} ta oxirgi 7 kunda · session jadvalimiz hozircha yo'q`}
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="space-y-2">
          {users.map((u) => {
            const isOnline = u.lastSeenAt >= onlineThreshold;
            const isActive = u.lastSeenAt >= activeThreshold;
            const name = displayName(u);
            const initials =
              (u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "");
            return (
              <Link
                key={u.id}
                href={`/admode/foydalanuvchilar/${u.id}`}
                className={cn(
                  "flex items-center gap-4 rounded-xl border bg-surface px-4 py-3 shadow-[0_1px_0_var(--border)] transition-colors hover:bg-hover/40",
                  isOnline
                    ? "border-accent/40 ring-1 ring-accent/20"
                    : "border-border",
                )}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-subtle">
                  {initials ? (
                    <span className="font-mono text-[11px] uppercase text-muted">
                      {initials}
                    </span>
                  ) : (
                    <Activity className="size-4 text-muted" strokeWidth={1.8} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium">{name}</p>
                    {u.username && u.username !== name.replace("@", "") && (
                      <span className="font-mono text-[10.5px] text-faint">
                        @{u.username}
                      </span>
                    )}
                    {isOnline && (
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent-ink">
                        Online
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-faint">
                    {u.phone && <span className="font-mono">{u.phone}</span>}
                    {u.phone && " · "}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-2.5" /> {relTime(u.lastSeenAt)}
                    </span>
                    {" · "}
                    qo&apos;shilgan {u.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>

                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
                    isActive
                      ? "bg-accent-soft text-accent-ink"
                      : "bg-subtle text-faint",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isActive ? "bg-accent" : "bg-faint/60",
                    )}
                  />
                  {isActive ? "Faol" : "Nofaol"}
                </span>
              </Link>
            );
          })}

          {users.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-[13px] text-faint">
              Hozircha foydalanuvchilar yo&apos;q
            </div>
          )}
        </div>
      </div>
    </>
  );
}
