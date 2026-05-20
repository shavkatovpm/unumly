import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AnnounceButton } from "@/components/admin/announce-modal";
import { UserDetail, type UserDetailData, type UserDetailPlan } from "@/components/admin/user-detail";

export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      plans: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const todayIso = new Date().toISOString().slice(0, 10);
  const data: UserDetailData = {
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    joinedAt: user.createdAt.toISOString(),
    lastSeenAt: user.lastSeenAt.toISOString(),
    isActive: user.lastSeenAt.getTime() >= Date.now() - ACTIVE_WINDOW_MS,
    todayIso,
    plans: user.plans.map<UserDetailPlan>((p) => ({
      id: p.id,
      title: p.title,
      scope: p.scope,
      status: p.status,
      priority: p.priority,
      scheduledFor: p.scheduledFor,
      time: p.time,
    })),
  };

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    `id:${user.telegramId.toString()}`;

  return (
    <>
      <AdminPageHeader
        title={displayName}
        subtitle={`${user.username ? `@${user.username}` : "no username"} · ${user.plans.length} ta reja`}
        actions={
          <>
            <AnnounceButton
              label="Xabar yuborish"
              target={{ type: "ids", ids: [user.id] }}
              targetSummary={user.username ? `@${user.username}` : displayName}
            />
            <Link
              href="/admode/foydalanuvchilar"
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Orqaga
            </Link>
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <UserDetail data={data} />
      </div>
    </>
  );
}
