"use client";

/**
 * Bitta loyiha ichidagi workspace — sarlavha (nom/rang/icon) + ikkita
 * qism: Hujjatlar (nested BlockNote sahifalar) va Tasklar (jadval).
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, useHydratedProjects } from "@/lib/projects-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { ListLoader } from "./widgets/list-loader";
import { HujjatlarPanel } from "./loyiha/hujjatlar-panel";
import { JadvalPanel } from "./loyiha/jadval-panel";
import { ProjectIcon } from "./loyiha-icons";

type Tab = "hujjatlar" | "tasklar";

export function LoyihaWorkspaceView({ projectId }: { projectId: string }) {
  const { projects } = useProjects();
  const hydrated = useHydratedProjects();
  const [tab, setTab] = useState<Tab>("hujjatlar");

  const project = projects.find((p) => p.id === projectId);

  if (!hydrated) {
    return <ListLoader />;
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[14px] font-medium text-foreground">Loyiha topilmadi</p>
        <p className="mt-1 text-[12.5px] text-muted">O&apos;chirilgan yoki mavjud emas.</p>
        <Link href="/loyiha" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:opacity-70">
          <ArrowLeft className="size-3.5" /> Loyihalarga qaytish
        </Link>
      </div>
    );
  }

  const color = project.color ? CATEGORY_PALETTE[project.color].oklch : "var(--foreground)";

  return (
    <div className="flex h-full flex-col" style={{ height: "var(--tg-vh, 100vh)" }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Link
          href="/loyiha"
          aria-label="Loyihalarga qaytish"
          className="grid size-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{ background: project.color ? colorWithAlpha(project.color, 0.14) : "var(--subtle)", color }}
        >
          <ProjectIcon k={project.icon} className="size-4" />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{project.title}</h1>

        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-subtle/60 p-0.5 text-[12.5px]">
          <button
            type="button"
            onClick={() => setTab("hujjatlar")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-all",
              tab === "hujjatlar" ? "bg-surface shadow-sm text-foreground" : "text-faint hover:text-muted"
            )}
          >
            Hujjatlar
          </button>
          <button
            type="button"
            onClick={() => setTab("tasklar")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-all",
              tab === "tasklar" ? "bg-surface shadow-sm text-foreground" : "text-faint hover:text-muted"
            )}
          >
            Tasklar
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "hujjatlar" ? (
          <HujjatlarPanel projectId={project.id} />
        ) : (
          <JadvalPanel projectId={project.id} />
        )}
      </div>
    </div>
  );
}
