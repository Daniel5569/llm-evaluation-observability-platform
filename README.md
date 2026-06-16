# LLM Evaluation & Observability Platform

LLM Evaluation & Observability Platform is a production-shaped demo for tracking prompt quality, regression risk, traces, cost, latency, and human review across AI product workflows.

## Problem

AI startups often ship prompt and model changes without a clear operating loop for quality. Teams need fast answers to practical questions:

- Did the new prompt improve or regress?
- Which test cases failed after a model or prompt change?
- Where are cost and latency increasing?
- Which outputs need human review before deploy?
- Should this candidate ship, wait for review, or be held?

## What This Demo Shows

This repo demonstrates an internal console for AI product and engineering teams:

- Eval dashboards with pass rate, regressions, latency, cost, and pending reviews.
- Prompt version comparison across baseline and candidate releases.
- Scorecards with metric-level evaluation.
- Test case details with input, context, expected behavior, baseline output, candidate output, scores, cost, and latency.
- Observability views for traces and failure categories.
- Human review actions that update case status and append audit events.
- Deterministic release recommendations: `ship`, `needs review`, or `hold`.

## Demo Projects

1. **Support Copilot**: customer support reply generation.
2. **Sales Research Assistant**: account briefs and outreach angles.
3. **Contract Clause Analyzer**: contract excerpt risk review.

All data is synthetic and runs locally. The app does not call OpenAI, Anthropic, Gemini, or any external service by default.

## 90-Second Walkthrough

1. Open the dashboard and check the KPI row for latest pass rate, regressions, latency, cost, and pending human reviews.
2. Choose a demo project from the sidebar or top selector.
3. Compare prompt versions and open an eval run from the release gate table.
4. Review the scorecard and regression table.
5. Select a test case to inspect the full trace: input, context, expected behavior, baseline output, candidate output, scores, cost, and latency.
6. Approve the candidate, mark it as needs fix, or ignore the regression.
7. Confirm the audit log captures the reviewer action.

## Architecture

```text
app/
  page.tsx                 Main route
  layout.tsx               Metadata and shell
components/
  eval-dashboard.tsx       Main interactive console
  project-selector.tsx     Project navigation
  scorecard.tsx            Metric cards
  status-badge.tsx         Status and severity labels
  trend-chart.tsx          Simple run trend visualization
lib/
  demo-data.ts             Synthetic projects, runs, traces, audit events
  evaluation-engine.ts     Scoring, regressions, recommendations, reviewer actions
  evaluation-types.ts      Domain types
  formatters.ts            Display helpers
tests/
  evaluation-engine.test.ts
docs/
  GITHUB_HANDOFF.md
```

## Evaluation Model

The demo keeps evaluation logic separate from UI:

- Weighted score averages metric scores with optional weights.
- Pass rate counts candidate outputs that meet the passing threshold and review status.
- Regression detection flags candidates below baseline by threshold.
- Severity is derived from score delta.
- Deployment recommendation is based on pass rate, severe regressions, medium regressions, and pending reviews.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vitest
- Local deterministic seed data

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run lint
npm run build
npm test
```

## Synthetic Data And Privacy

This repository intentionally uses synthetic projects, tickets, account signals, contract excerpts, traces, costs, scores, users, and audit events. It does not require API keys and does not include private customer data, personal contact details, credentials, or production logs.

## Why This Matters For AI Startups

LLM products need more than prompts. They need repeatable release checks, regression detection, trace inspection, human review, and operational dashboards. This demo shows how those workflows can be packaged into a practical internal tool for teams shipping AI features.

## Screenshots

Screenshots can be added after running the app locally.
