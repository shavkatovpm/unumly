import { LoyihaWorkspaceView } from "@/components/app/loyiha-workspace-view";

export default async function LoyihaWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LoyihaWorkspaceView projectId={id} />;
}
