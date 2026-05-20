import type { Metadata } from "next";
import { isAdminAuthed } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin/login-form";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin · Unumly",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthed();
  if (!authed) return <AdminLoginForm />;
  return <AdminShell>{children}</AdminShell>;
}
