# GitHub workflow for JailOpsSim

Git records the project's history. GitHub hosts that history and adds issues, pull requests, reviews, and automated checks.

## What the terms mean

| Term           | Meaning                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Repository     | The project files and their Git history. A local checkout is a copy you work on.                                                  |
| Working tree   | The files you are currently editing. Unsaved or uncommitted work is not a commit.                                                 |
| Staging area   | The changes selected with `git add` for your next commit. You can stage specific files or individual changes.                     |
| Commit         | A recorded snapshot with a message and an ID called a SHA. A local commit stays on your computer until you push it.               |
| Branch         | A movable name pointing to a commit. New commits move that branch forward along its own line of development.                      |
| Push           | Send local commits and branch updates to GitHub.                                                                                  |
| Fetch          | Download remote history without changing your checked-out files.                                                                  |
| Pull           | Fetch remote history and integrate it into your current branch. `--ff-only` stops if the histories have diverged.                 |
| Issue          | A place to describe and track a bug, feature, question, or task. Creating an issue does not change the application.               |
| Pull request   | A proposal to integrate a branch into another branch, with a diff, discussion, reviews, and checks. Pushing updates refreshes it. |
| Merge          | Integrate changes from one line of development into another.                                                                      |
| Merge conflict | A change Git cannot combine automatically. Resolve the intended final content, then validate the result.                          |

`origin` is the usual nickname for the GitHub remote. `main` is JailOpsSim's default branch. A branch is not a separate folder or a backup of uncommitted work.

## A complete example

Suppose you want to improve shift handoff. The issue number `42` below is fictional; substitute the real number GitHub gives you.

### 1. Describe the work in an issue

Open the repository's **Issues** tab and choose **New issue**. Use the bug or feature form when applicable. Describe the expected outcome and how to tell when it is complete.

For example: **Improve shift handoff summary**, with acceptance criteria covering which information appears and how it is verified.

An issue tracks what needs doing. The PR will show the actual changes that do it.

### 2. Start a branch

In your local JailOpsSim checkout, inspect your current work first:

```bash
git status
```

If there are existing changes, finish and commit them on their current branch or preserve them deliberately before switching. Do not reset or discard them to start a new task.

With a clean working tree, update `main` and create your branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/jos-42-shift-handoff
```

If the pull reports divergent history, inspect that history before deciding how to combine it. The branch naming types and examples are listed in [CONTRIBUTING.md](../CONTRIBUTING.md).

### 3. Edit, inspect, and commit

Make the changes and run the checks appropriate to the work. For functional changes:

```bash
npm test
npm run format:check
```

Inspect what changed:

```bash
git diff
git status
```

Stage only the intended files. Replace `path/to/changed-file` with a real path; repeat `git add` for each intended file:

```bash
git add path/to/changed-file
git diff --cached
git commit -m "Improve shift handoff summary"
```

`git diff` shows unstaged changes; `git diff --cached` shows what the next commit will contain. You can make several commits on the same branch as the work develops.

### 4. Push and open a PR

```bash
git push -u origin feat/jos-42-shift-handoff
```

On GitHub, choose **Compare & pull request**, or open **Pull requests → New pull request**. Set the base to `main` and compare to your task branch.

Use a clear title such as **Improve shift handoff summary**. Fill in the PR template and write `Closes #42` if this PR completes the issue. That closing keyword closes the issue when the PR merges into the default branch. For partial work, write `Refs #42` instead.

A draft PR lets you share work in progress. When it is ready, mark it ready for review. Additional commits pushed to the same branch automatically update the PR.

### 5. Review and merge

Read **Files changed**, check the validation results, and address review feedback. The branch convention does not itself create or enforce checks; follow the repository's active rules.

GitHub offers three common merge methods:

| Method           | What appears on `main`                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Merge commit     | The branch's individual commits plus a commit joining the histories.                                   |
| Squash and merge | One new commit containing the PR's combined changes. This is the recommended choice for focused tasks. |
| Rebase and merge | The branch's individual changes replayed as new commits without a merge commit.                        |

Choose **Squash and merge** when available and use the PR title as the resulting commit title. Merging adds the change to `main`; deployment is a separate step unless an existing workflow deploys automatically.

Delete the completed task branch on GitHub after merging. This removes the branch name, not the completed changes on `main`. Keep deployment and other long-lived branches.

Locally, switch back and update:

```bash
git switch main
git pull --ff-only origin main
```

After squash merging, `git branch -d` may refuse to delete the local branch because its original commits are not ancestors of `main`. Keep it until you have verified that the PR merged and your work is present; there is no need to force-delete it to finish the task.

## The pattern to remember

**Issue → branch → edit → commit → push → PR → review/checks → merge.**

A commit saves history locally. A push shares it on GitHub. A PR proposes integration. A merge completes that integration. One focused task can contain many commits and still become one readable commit through squash merging.
