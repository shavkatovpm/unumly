import type { Metadata } from "next";
import { WorkspaceView } from "@/components/app/workspace/workspace-view";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <WorkspaceView />;
}
