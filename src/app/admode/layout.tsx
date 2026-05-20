import type { Metadata } from "next";
import { PasswordGate } from "@/components/admin/password-gate";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin · Unumly",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PasswordGate>
      <AdminShell>{children}</AdminShell>
    </PasswordGate>
  );
}
