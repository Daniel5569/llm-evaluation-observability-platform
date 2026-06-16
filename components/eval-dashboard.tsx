"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DollarSign,
  Filter,
  GitCompareArrows,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  auditEvents as seedAuditEvents,
  evalRuns,
  projects,
  promptVersions,
  testCases as seedTestCases,
  traceRecords
} from "@/lib/demo-data";
import { applyReviewerAction } from "@/lib/evaluation-engine";
import type { AuditEvent, EvalRun, EvalTestCase, ProjectId, ReviewStatus, RunStatus } from "@/lib/evaluation-types";
import { formatCurrency, formatDateTime, formatPercent, titleCase } from "@/lib/formatters";
import { ProjectSelector } from "./project-selector";
import { Scorecard } from "./scorecard";
import { StatusBadge } from "./status-badge";
import { TrendChart } from "./trend-chart";

type RunFilter = "all" | "passed" | "regressions" | "needs_review" | "failed";

export function EvalDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>("support-copilot");
  const [selectedRunId, setSelectedRunId] = useState("eval-sup-001");
  const [selectedCaseId, setSelectedCaseId] = useState("eval-sup-001-tc-2");
  const [filter, setFilter] = useState<RunFilter>("all");
  const [query, setQuery] = useState("");
  const [testCases, setTestCases] = useState(seedTestCases);
  const [auditEvents, setAuditEvents] = useState(seedAuditEvents);
  const [note, setNote] = useState("Reviewed against release gate criteria.");

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const projectRuns = evalRuns.filter((run) => run.projectId === selectedProjectId);
  const selectedRun = projectRuns.find((run) => run.id === selectedRunId) ?? projectRuns[0];
  const runTestCases = testCases.filter((testCase) => testCase.runId === selectedRun.id);
  const selectedTestCase = runTestCases.find((testCase) => testCase.id === selectedCaseId) ?? runTestCases[0];

  const filteredRuns = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return evalRuns.filter((run) => {
      const project = projects.find((item) => item.id === run.projectId);
      const statusMatch =
        filter === "all" ||
        (filter === "regressions" && run.regressionCount > 0) ||
        (filter === "needs_review" && run.pendingReviews > 0) ||
        (filter === "passed" && run.status === "passed") ||
        (filter === "failed" && run.status === "failed");
      const queryMatch =
        needle.length === 0 ||
        [run.id, run.promptVersion, run.model, project?.name ?? ""].some((value) =>
          value.toLowerCase().includes(needle)
        ) ||
        testCases.some(
          (testCase) =>
            testCase.runId === run.id &&
            [testCase.name, testCase.category, testCase.failureCategory].some((value) =>
              value.toLowerCase().includes(needle)
            )
        );

      return statusMatch && queryMatch;
    });
  }, [filter, query, testCases]);

  const kpis = useMemo(() => {
    const latestRun = [...evalRuns].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    const pendingReviews = testCases.filter((testCase) => testCase.status === "needs_review").length;
    const avgLatency = evalRuns.length > 0
      ? Math.round(evalRuns.reduce((total, run) => total + run.avgLatencyMs, 0) / evalRuns.length)
      : 0;
    const totalCost = evalRuns.reduce((total, run) => total + run.estimatedCostUsd, 0);
    const regressions = evalRuns.reduce((total, run) => total + run.regressionCount, 0);

    return [
      { label: "Latest pass rate", value: latestRun ? formatPercent(latestRun.passRate) : "—", icon: CheckCircle2, tone: "text-emerald-600" },
      { label: "Regressions detected", value: String(regressions), icon: AlertTriangle, tone: "text-rose-600" },
      { label: "Avg latency", value: `${avgLatency} ms`, icon: Clock3, tone: "text-sky-600" },
      { label: "Estimated cost", value: formatCurrency(totalCost), icon: DollarSign, tone: "text-slate-700" },
      { label: "Pending reviews", value: String(pendingReviews), icon: ClipboardCheck, tone: "text-amber-600" }
    ];
  }, [testCases]);

  function selectProject(projectId: ProjectId) {
    const nextRun = evalRuns.find((run) => run.projectId === projectId);
    const nextCase = nextRun ? testCases.find((testCase) => testCase.runId === nextRun.id) : undefined;
    setSelectedProjectId(projectId);
    if (nextRun) setSelectedRunId(nextRun.id);
    if (nextCase) setSelectedCaseId(nextCase.id);
  }

  function selectRun(run: EvalRun) {
    const firstCase = testCases.find((testCase) => testCase.runId === run.id);
    setSelectedProjectId(run.projectId);
    setSelectedRunId(run.id);
    if (firstCase) setSelectedCaseId(firstCase.id);
  }

  function handleReviewerAction(action: "approve" | "needs_fix" | "ignore") {
    const result = applyReviewerAction({
      testCase: selectedTestCase,
      action,
      note,
      timestamp: new Date("2026-06-13T09:00:00Z").toISOString()
    });
    setTestCases((current) =>
      current.map((testCase) => (testCase.id === selectedTestCase.id ? result.testCase : testCase))
    );
    setAuditEvents((current) => [result.auditEvent, ...current]);
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-white/95 px-4 py-5 lg:block">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">LLM EvalOps</div>
            <div className="text-xs text-muted">Quality release console</div>
          </div>
        </div>

        <nav className="mb-6 space-y-1 text-sm">
          {[
            ["Dashboard", Activity],
            ["Eval runs", GitCompareArrows],
            ["Trace explorer", Search],
            ["Human review", ClipboardCheck],
            ["Audit log", ShieldCheck]
          ].map(([label, Icon]) => (
            <a
              key={label as string}
              href={`#${String(label).toLowerCase().replaceAll(" ", "-")}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-wash hover:text-ink"
            >
              <Icon size={16} />
              {label as string}
            </a>
          ))}
        </nav>

        <div className="label mb-2">Demo projects</div>
        <ProjectSelector projects={projects} selectedProjectId={selectedProjectId} onSelect={selectProject} />
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-wash/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-ink">LLM Evaluation & Observability Platform</h1>
              <p className="mt-1 text-sm text-muted">
                Prompt versions, eval runs, regressions, traces, cost, latency, and human review.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search project, version, test case"
                  className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-panel sm:w-80"
                />
              </label>
              <select
                className="h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-panel"
                value={selectedProjectId}
                onChange={(event) => selectProject(event.target.value as ProjectId)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-4 lg:p-6">
          <section id="dashboard" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="panel p-4">
                <div className="flex items-center justify-between">
                  <span className="label">{kpi.label}</span>
                  <kpi.icon className={kpi.tone} size={18} />
                </div>
                <div className="mt-3 text-2xl font-semibold text-ink">{kpi.value}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="panel p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="label">Project overview</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{selectedProject.name}</h2>
                  <p className="mt-1 text-sm text-muted">{selectedProject.useCase}</p>
                </div>
                <StatusBadge value={selectedRun.recommendation} />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <InfoTile label="Active prompt" value={selectedProject.activePromptVersion} />
                <InfoTile label="Baseline" value={selectedProject.baselineVersion} />
                <InfoTile label="Dataset size" value={`${selectedProject.datasetSize} cases`} />
                <InfoTile label="Current run" value={selectedRun.id} />
              </div>
              <div className="mt-5">
                <TrendChart runs={projectRuns} />
              </div>
            </div>

            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="label">Prompt versions</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink">Release candidates</h2>
                </div>
                <GitCompareArrows size={18} className="text-muted" />
              </div>
              <div className="space-y-2">
                {promptVersions
                  .filter((version) => version.projectId === selectedProjectId)
                  .map((version) => (
                    <div key={version.id} className="rounded-lg border border-line p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-ink">{version.id}</span>
                        <StatusBadge value={version.deploymentStatus} />
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                        <span>{version.model}</span>
                        <span>{version.createdDate}</span>
                        <span>{version.owner}</span>
                        <span className="sm:text-right">{version.changeNote}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section id="eval-runs" className="panel overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="label">Latest eval runs</div>
                <h2 className="mt-1 text-lg font-semibold text-ink">Release gates</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={16} className="text-muted" />
                {(["all", "passed", "regressions", "needs_review", "failed"] as RunFilter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      filter === item
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-white text-slate-600 hover:border-brand"
                    }`}
                  >
                    {titleCase(item)}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    {["Project", "Prompt", "Model", "Pass rate", "Regressions", "Cost", "Latency", "Status"].map(
                      (header) => (
                        <th key={header} className="px-3 py-2 font-semibold">
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((run) => {
                    const project = projects.find((item) => item.id === run.projectId)!;
                    return (
                      <tr
                        key={run.id}
                        onClick={() => selectRun(run)}
                        className={`cursor-pointer hover:bg-brand-soft/40 ${
                          selectedRun.id === run.id ? "bg-brand-soft/60" : "bg-white"
                        }`}
                      >
                        <td className="table-cell">
                          <div className="font-medium text-ink">{project.name}</div>
                          <div className="font-mono text-xs text-muted">{run.id}</div>
                        </td>
                        <td className="table-cell font-mono">{run.promptVersion}</td>
                        <td className="table-cell">{run.model}</td>
                        <td className="table-cell">{formatPercent(run.passRate)}</td>
                        <td className="table-cell">{run.regressionCount}</td>
                        <td className="table-cell">{formatCurrency(run.estimatedCostUsd)}</td>
                        <td className="table-cell">{run.avgLatencyMs} ms</td>
                        <td className="table-cell">
                          <StatusBadge value={run.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="space-y-5">
              <div className="panel p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="label">Eval run detail</div>
                    <h2 className="mt-1 text-lg font-semibold text-ink">
                      {selectedRun.baselineVersion} vs {selectedRun.candidateVersion}
                    </h2>
                  </div>
                  <StatusBadge value={selectedRun.recommendation} />
                </div>
                <Scorecard testCases={runTestCases} />
              </div>

              <div className="panel overflow-hidden">
                <div className="border-b border-line p-4">
                  <div className="label">Test cases</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink">Regression analysis</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
                      <tr>
                        {["Case", "Category", "Expected behavior", "Baseline", "Candidate", "Delta", "Failure", "Status"].map(
                          (header) => (
                            <th key={header} className="px-3 py-2 font-semibold">
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {runTestCases.map((testCase) => (
                        <tr
                          key={testCase.id}
                          onClick={() => setSelectedCaseId(testCase.id)}
                          className={`cursor-pointer hover:bg-brand-soft/40 ${
                            selectedCaseId === testCase.id ? "bg-brand-soft/60" : ""
                          }`}
                        >
                          <td className="table-cell">
                            <div className="font-medium text-ink">{testCase.name}</div>
                            <div className="font-mono text-xs text-muted">{testCase.id}</div>
                          </td>
                          <td className="table-cell">{testCase.category}</td>
                          <td className="table-cell max-w-64 text-xs text-muted">{testCase.expectedBehavior}</td>
                          <td className="table-cell">{testCase.baselineScore.toFixed(2)}</td>
                          <td className="table-cell">{testCase.candidateScore.toFixed(2)}</td>
                          <td className={`table-cell font-semibold ${testCase.delta < -0.08 ? "text-rose-600" : "text-emerald-600"}`}>
                            {testCase.delta > 0 ? "+" : ""}
                            {testCase.delta.toFixed(2)}
                          </td>
                          <td className="table-cell">{testCase.failureCategory}</td>
                          <td className="table-cell">
                            <StatusBadge value={testCase.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <TraceDetailPanel
              testCase={selectedTestCase}
              note={note}
              setNote={setNote}
              onAction={handleReviewerAction}
            />
          </section>

          <section id="trace-explorer" className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <TraceList selectedProjectId={selectedProjectId} selectedRunId={selectedRun.id} />
            <ObservabilityBreakdown />
          </section>

          <section id="human-review" className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <HumanReviewQueue
              testCases={testCases}
              onSelect={(testCase) => {
                setSelectedProjectId(testCase.projectId);
                setSelectedRunId(testCase.runId);
                setSelectedCaseId(testCase.id);
              }}
            />
            <AuditLog events={auditEvents} />
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 px-3 py-2">
      <div className="label">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function TraceDetailPanel({
  testCase,
  note,
  setNote,
  onAction
}: {
  testCase: EvalTestCase;
  note: string;
  setNote: (note: string) => void;
  onAction: (action: "approve" | "needs_fix" | "ignore") => void;
}) {
  return (
    <aside className="panel sticky top-24 max-h-[calc(100vh-7rem)] overflow-auto p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="label">Trace detail</div>
          <h2 className="mt-1 text-lg font-semibold text-ink">{testCase.name}</h2>
          <p className="mt-1 text-sm text-muted">{testCase.failureReason}</p>
        </div>
        <StatusBadge value={testCase.severity} />
      </div>

      <div className="grid gap-3 text-sm">
        <DetailBlock title="Input" body={testCase.input} />
        <DetailBlock title="Retrieved context" body={testCase.context} />
        <DetailBlock title="Expected answer / criteria" body={testCase.expectedAnswer} />
        <ComparisonBlock label="Baseline output" body={testCase.baselineOutput} score={testCase.baselineScore} />
        <ComparisonBlock label="Candidate output" body={testCase.candidateOutput} score={testCase.candidateScore} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoTile label="Latency" value={`${testCase.latencyMs} ms`} />
        <InfoTile label="Cost" value={formatCurrency(testCase.costUsd)} />
      </div>

      <div className="mt-4">
        <div className="label mb-2">Scores by criterion</div>
        <div className="space-y-2">
          {Object.entries(testCase.candidateScores).map(([metric, score]) => (
            <div key={metric}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">{metric}</span>
                <span className="font-semibold text-ink">{score.toFixed(2)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand" style={{ width: `${score * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="label mb-2 block" htmlFor="review-note">
          Reviewer note
        </label>
        <textarea
          id="review-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-line bg-white p-3 text-sm"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <button onClick={() => onAction("approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          Approve
        </button>
        <button onClick={() => onAction("needs_fix")} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">
          Needs fix
        </button>
        <button onClick={() => onAction("ignore")} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Ignore
        </button>
      </div>
    </aside>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-3">
      <div className="label mb-1">{title}</div>
      <p className="text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function ComparisonBlock({ label, body, score }: { label: string; body: string; score: number }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="label">{label}</div>
        <span className="font-mono text-xs font-semibold text-ink">{score.toFixed(2)}</span>
      </div>
      <p className="text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function TraceList({ selectedProjectId, selectedRunId }: { selectedProjectId: ProjectId; selectedRunId: string }) {
  const traces = traceRecords.filter((trace) => trace.projectId === selectedProjectId || trace.runId === selectedRunId).slice(0, 16);

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line p-4">
        <div className="label">Trace explorer</div>
        <h2 className="mt-1 text-lg font-semibold text-ink">Recent requests</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              {["Request", "Project", "Model", "Latency", "Cost", "Score", "Status"].map((header) => (
                <th key={header} className="px-3 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {traces.map((trace) => (
              <tr key={trace.requestId}>
                <td className="table-cell font-mono">{trace.requestId}</td>
                <td className="table-cell">{projects.find((project) => project.id === trace.projectId)?.name}</td>
                <td className="table-cell">{trace.model}</td>
                <td className="table-cell">{trace.latencyMs} ms</td>
                <td className="table-cell">{formatCurrency(trace.costUsd)}</td>
                <td className="table-cell">{trace.score.toFixed(2)}</td>
                <td className="table-cell">
                  <StatusBadge value={trace.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ObservabilityBreakdown() {
  const categories = traceRecords.reduce<Record<string, number>>((acc, trace) => {
    acc[trace.category] = (acc[trace.category] ?? 0) + 1;
    return acc;
  }, {});
  const max = Math.max(...Object.values(categories));
  const p95 = [...traceRecords].sort((a, b) => a.latencyMs - b.latencyMs)[Math.floor(traceRecords.length * 0.95)]?.latencyMs ?? 0;
  const costPer1k = traceRecords.reduce((total, trace) => total + trace.costUsd, 0) * (1000 / traceRecords.length);
  const failureRate = Math.round((traceRecords.filter((trace) => trace.status !== "passed" && trace.status !== "approved").length / traceRecords.length) * 100);

  return (
    <div className="panel p-4">
      <div className="label">Observability</div>
      <h2 className="mt-1 text-lg font-semibold text-ink">Error categories</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <InfoTile label="p95 latency" value={`${p95} ms`} />
        <InfoTile label="Cost / 1k" value={formatCurrency(costPer1k)} />
        <InfoTile label="Failure rate" value={`${failureRate}%`} />
      </div>
      <div className="mt-4 space-y-3">
        {Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([category, count]) => (
            <div key={category}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">{category}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function HumanReviewQueue({
  testCases,
  onSelect
}: {
  testCases: EvalTestCase[];
  onSelect: (testCase: EvalTestCase) => void;
}) {
  const queue = testCases
    .filter((testCase) => ["needs_review", "needs_fix"].includes(testCase.status))
    .sort((a, b) => priorityValue(b.severity, b.status) - priorityValue(a.severity, a.status))
    .slice(0, 10);

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line p-4">
        <div className="label">Human review queue</div>
        <h2 className="mt-1 text-lg font-semibold text-ink">Release blockers</h2>
      </div>
      <div className="divide-y divide-line">
        {queue.map((testCase) => (
          <button
            key={testCase.id}
            onClick={() => onSelect(testCase)}
            className="grid w-full gap-2 px-4 py-3 text-left hover:bg-brand-soft/40 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <div className="font-medium text-ink">{testCase.name}</div>
              <div className="mt-1 text-xs text-muted">
                {projects.find((project) => project.id === testCase.projectId)?.name} · {testCase.failureCategory}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={testCase.severity} />
              <StatusBadge value={testCase.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AuditLog({ events }: { events: AuditEvent[] }) {
  return (
    <div id="audit-log" className="panel overflow-hidden">
      <div className="border-b border-line p-4">
        <div className="label">Audit log</div>
        <h2 className="mt-1 text-lg font-semibold text-ink">Reviewer actions</h2>
      </div>
      <div className="max-h-[440px] overflow-auto">
        {events.slice(0, 14).map((event) => (
          <div key={event.id} className="border-b border-line px-4 py-3 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{event.action}</span>
              <span className="text-xs text-muted">{formatDateTime(event.timestamp)}</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {event.actor} · {projects.find((project) => project.id === event.projectId)?.name} · {event.target}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge value={event.beforeStatus} />
              <span className="text-xs text-muted">to</span>
              <StatusBadge value={event.afterStatus} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{event.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityValue(severity: string, status: ReviewStatus | RunStatus): number {
  const severityWeight = { critical: 5, high: 4, medium: 3, low: 2 }[severity] ?? 1;
  const statusWeight = status === "needs_fix" ? 3 : status === "needs_review" ? 2 : 1;
  return severityWeight + statusWeight;
}
