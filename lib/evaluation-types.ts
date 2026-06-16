export type ProjectId = "support-copilot" | "sales-research" | "contract-analyzer";

export type RunStatus = "passed" | "failed" | "needs_review" | "regression_detected";
export type ReviewStatus = "passed" | "approved" | "ignored" | "needs_review" | "needs_fix" | "failed";
export type Recommendation = "ship" | "needs review" | "hold";
export type Severity = "low" | "medium" | "high" | "critical";

export type FailureCategory =
  | "hallucination risk"
  | "policy violation"
  | "incomplete answer"
  | "wrong classification"
  | "bad tone"
  | "high latency"
  | "high cost"
  | "wrong refund policy"
  | "too vague"
  | "missed escalation"
  | "generic output"
  | "invented company signal"
  | "weak persona fit"
  | "missing next step"
  | "missed termination clause"
  | "overstates risk"
  | "wrong party obligation"
  | "insufficient evidence";

export interface Project {
  id: ProjectId;
  name: string;
  useCase: string;
  activePromptVersion: string;
  baselineVersion: string;
  datasetSize: number;
  metrics: string[];
}

export interface PromptVersion {
  id: string;
  projectId: ProjectId;
  model: string;
  createdDate: string;
  owner: string;
  changeNote: string;
  deploymentStatus: "production" | "candidate" | "archived" | "review";
}

export interface ScoreMap {
  [metric: string]: number;
}

export interface EvalTestCase {
  id: string;
  projectId: ProjectId;
  runId: string;
  name: string;
  category: string;
  expectedBehavior: string;
  input: string;
  context: string;
  expectedAnswer: string;
  baselineOutput: string;
  candidateOutput: string;
  baselineScores: ScoreMap;
  candidateScores: ScoreMap;
  baselineScore: number;
  candidateScore: number;
  delta: number;
  failureCategory: FailureCategory;
  severity: Severity;
  status: ReviewStatus;
  latencyMs: number;
  costUsd: number;
  failureReason: string;
}

export interface EvalRun {
  id: string;
  projectId: ProjectId;
  promptVersion: string;
  baselineVersion: string;
  candidateVersion: string;
  model: string;
  createdAt: string;
  passRate: number;
  weightedScore: number;
  regressionCount: number;
  severeRegressionCount: number;
  pendingReviews: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
  status: RunStatus;
  recommendation: Recommendation;
}

export interface TraceRecord {
  requestId: string;
  projectId: ProjectId;
  runId: string;
  testCaseId: string;
  model: string;
  latencyMs: number;
  costUsd: number;
  score: number;
  status: ReviewStatus | RunStatus;
  category: FailureCategory;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  projectId: ProjectId;
  target: string;
  beforeStatus: ReviewStatus;
  afterStatus: ReviewStatus;
  note: string;
}

export interface ReviewerActionResult {
  testCase: EvalTestCase;
  auditEvent: AuditEvent;
}
