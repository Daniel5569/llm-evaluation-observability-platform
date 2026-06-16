# GitHub Handoff Guide

Repo name: `llm-evaluation-observability-platform`

Recommended GitHub description:

> LLM evaluation and observability dashboard for prompt versions, regressions, traces, cost, latency, and human review.

Recommended topics:

`llm-evaluation`, `llm-observability`, `ai-evals`, `prompt-engineering`, `human-in-the-loop`, `ai-product`, `nextjs`, `typescript`, `saas-dashboard`, `portfolio-project`

Recommended branch: `main`

Recommended license: MIT

## Objective

This repository is a public portfolio/demo asset for conversations with USA-based AI startups. It shows that you can build pragmatic AI product and operations tools: eval workflows, prompt version comparison, regression detection, observability surfaces, human review, audit trails, and release recommendations.

## 60-Second Explanation

This is a local Next.js dashboard for managing LLM quality before release. It lets a team compare baseline and candidate prompt versions, inspect eval runs, find regressions, review traces, track cost and latency, and approve or block risky outputs through a human review queue. The data is synthetic, the scoring is deterministic, and no external AI provider is required.

## What To Say On GitHub

Use positioning like:

- AI Automation / Product Builder.
- Builds internal tools for AI product and engineering teams.
- Focused on eval workflows, observability, human review, product surfaces, and data modeling.

Avoid presenting it as production infrastructure, enterprise security tooling, or a real customer-data system.

## Before Publishing

Run:

```bash
npm install
npm run lint
npm run build
npm test
```

Then check:

```bash
git status
```

Make sure these are not committed:

- `node_modules/`
- `.next/`
- `.env`
- `.env.local`
- logs
- screenshots or temporary QA folders

The included `.gitignore` already excludes those paths.

## Security And Privacy Checklist

This repo is designed to be safe for public GitHub:

- No real API calls are made by default.
- No API key is required.
- `.env` and `.env.*` are ignored except `.env.example`.
- Demo data is synthetic.
- No real customer records, emails, phone numbers, addresses, private prompts, production logs, or tokens should be added.

Before pushing, search for accidental sensitive text:

```bash
git grep -n "token\\|secret\\|password\\|api_key\\|private\\|phone\\|email"
```

If a result is documentation explaining what not to commit, that is fine. If it looks like a real credential or personal detail, remove it before publishing.

## Suggested GitHub Publish Flow

From inside the repo folder:

```bash
git init
git branch -M main
git add .
git commit -m "Initial LLM eval observability platform"
git remote add origin https://github.com/<your-github-user>/llm-evaluation-observability-platform.git
git push -u origin main
```

Create the GitHub repository first in the GitHub UI, then run the commands above. Replace `<your-github-user>` with your GitHub username.

## Test Coverage

Current tests cover:

- Weighted score calculation.
- Pass rate calculation.
- Regression detection with threshold.
- Deployment recommendation for `ship`, `needs review`, and `hold`.
- Reviewer action updates and audit event creation.

## Useful Demo Path

When presenting the project:

1. Start on the KPI dashboard.
2. Select `Support Copilot`.
3. Open the latest eval run.
4. Show the scorecard and regression table.
5. Select a failed test case.
6. Explain baseline vs candidate outputs.
7. Mark the case as `Needs fix`.
8. Show the audit log event.

That path communicates the product value quickly: measurable LLM quality, release control, and human-in-the-loop review.
