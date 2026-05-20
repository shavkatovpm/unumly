import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PlansList, type AdminPlanRow } from "@/components/admin/plans-list";

export const dynamic = "force-dynamic";

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

export default async function AdminRejalarPage() {
  const plans = await prisma.plan.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          telegramId: true,
        },
      },
    },
  });

  const rows: AdminPlanRow[] = plans.map((p) => ({
    id: p.id,
    title: p.title,
    scope: p.scope,
    status: p.status,
    priority: p.priority,
    scheduledFor: p.scheduledFor,
    time: p.time,
    createdAt: p.createdAt.toISOString(),
    user: {
      id: p.user.id,
      username: p.user.username,
      displayName: displayName(p.user),
    },
  }));

  const todo = rows.filter((p) => p.status === "TODO").length;
  const done = rows.filter((p) => p.status === "DONE").length;

  return (
    <>
      <AdminPageHeader
        title="Rejalar"
        subtitle={`${rows.length} ta ko'rsatildi · ${todo} faol · ${done} bajarilgan`}
      />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <PlansList plans={rows} />
      </div>
    </>
  );
}
