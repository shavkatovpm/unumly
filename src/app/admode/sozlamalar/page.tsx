import { AdminPageHeader } from "@/components/admin/admin-shell";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { isUsingDefaultPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminSozlamalarPage() {
  const usingDefault = await isUsingDefaultPassword();

  return (
    <>
      <AdminPageHeader
        title="Sozlamalar"
        subtitle="Admin parol va boshqa konfiguratsiya"
      />
      <div className="mx-auto max-w-xl px-6 py-6">
        <ChangePasswordForm usingDefault={usingDefault} />
      </div>
    </>
  );
}
