# Contributing to JailOpsSim

Use one issue, one short-lived branch, and one pull request for a focused change. The [GitHub workflow guide](docs/GITHUB_WORKFLOW.md) explains each step, including commands and a beginner-friendly glossary.

## Branch names

```text
<type>/jos-<issue-number>-<short-description>
```

Use lowercase words separated by hyphens. The issue number is the number GitHub assigns to the issue, without `#` or leading zeroes. If there is no issue, omit the number: `docs/jos-github-workflow`.

| Type       | Purpose                                       | Example                            |
| ---------- | --------------------------------------------- | ---------------------------------- |
| `feat`     | Add functionality                             | `feat/jos-42-shift-handoff`        |
| `fix`      | Fix a bug                                     | `fix/jos-57-room-placement`        |
| `ui`       | Change the interface                          | `ui/jos-63-control-room-dashboard` |
| `refactor` | Restructure code while preserving behavior    | `refactor/jos-71-staff-scheduling` |
| `docs`     | Update documentation                          | `docs/jos-18-first-shift-guide`    |
| `chore`    | Maintain dependencies, tooling, or repository | `chore/jos-80-update-dependencies` |

These numbers are examples, not existing tasks. Use operational terms in the description when they fit the work: `intake-processing`, `cellblock-lockdown`, `shift-handoff`, or `control-room`.

This is a naming convention, not an automated branch restriction. Existing branches keep their names.

## Commits and pull requests

- Make commits that describe a coherent change, such as `Fix occupied-room assignment validation`.
- Push the branch and open a PR targeting `main`. Open a draft PR while work is still in progress.
- Use the PR template to explain the problem, resulting behavior, and validation.
- Include `Closes #<issue-number>` only when the PR fully resolves that issue. Use `Refs #<issue-number>` for related or partial work.
- Review the diff and required checks before merging. Prefer **Squash and merge** with a clear PR title so the completed change becomes one readable commit on `main`.
- Delete the completed task branch after merging. Keep long-lived branches used for deployment downloads or other ongoing work.

## Validation and project rules

Read [AGENTS.md](AGENTS.md) before changing the project. Preserve the [functional baseline](docs/BASELINE.md), existing data, accounts, modules, and deployment support.

For functional changes, run:

```bash
npm test
npm run format:check
```

For documentation or template changes, check formatting for the changed files; application tests are needed when behavior changes. The standard formatting command does not include `CONTRIBUTING.md` or `.github`, so check those explicitly when editing them:

```bash
npx prettier --check CONTRIBUTING.md docs/GITHUB_WORKFLOW.md .github
```

For deployment changes, also rebuild the Windows ZIP and run `npm run verify:package -- <zip>` using the actual ZIP path.

Use fictional training data in issues, screenshots, and examples. Keep production credentials, databases, and account details out of commits and reports.
