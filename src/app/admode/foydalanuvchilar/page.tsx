import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { UsersList, type AdminUserRow } from "@/components/admin/users-list";

export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default async function FoydalanuvchilarPage() {
  const users = await prisma.user.findMany({
    orderBy: { lastSeenAt: "desc" },
    include: {
      _count: { select: { plans: { where: { deletedAt: null } } } },
    },
  });

  const activeThreshold = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    telegramId: u.telegramId.toString(),
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    joinedAt: u.createdAt.toISOString(),
    lastSeenAt: u.lastSeenAt.toISOString(),
    plansCount: u._count.plans,
    isActive: u.lastSeenAt >= activeThreshold,
  }));

  const activeCount = rows.filter((r) => r.isActive).length;

  return (
    <>
      <AdminPageHeader
        title="Foydalanuvchilar"
        subtitle={`${rows.length} ta jami · ${activeCount} ta faol (7 kun)`}
      />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <UsersList users={rows} />
      </div>
    </>
  );
}
