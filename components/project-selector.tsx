import clsx from "clsx";
import type { Project, ProjectId } from "@/lib/evaluation-types";

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect
}: {
  projects: Project[];
  selectedProjectId: ProjectId;
  onSelect: (projectId: ProjectId) => void;
}) {
  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelect(project.id)}
          className={clsx(
            "w-full rounded-lg border px-3 py-2 text-left transition",
            selectedProjectId === project.id
              ? "border-brand bg-brand-soft text-brand"
              : "border-transparent text-slate-600 hover:border-line hover:bg-white"
          )}
        >
          <div className="text-sm font-semibold">{project.name}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted">{project.useCase}</div>
        </button>
      ))}
    </div>
  );
}
