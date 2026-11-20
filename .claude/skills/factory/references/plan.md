# /factory plan <prd> [target=github|linear|chat] [slug=<slug>]

The user has a written PRD and wants it built. You turn it into tickets; the
factory builds them in dependency order. Nothing is created until the user
approves the breakdown. Plan files live in `<repo>/factory/plans/<slug>/`:
`plan.md` (waves, coverage, open questions), `tickets.json`, and
`published.json` (which ticket became which ref).

1. **Find the PRD.** It must be a file in the repo (`docs/prd.md`, say). If
   they point you at one elsewhere (an attachment, a Google Doc, a Notion
   page), offer to save it into `docs/` and commit it: every agent reads it
   from the worktree. Suggest a line in `AGENTS.md` pointing to it.
2. **Pick the target.** `target=` if given; otherwise Linear when it's
   enabled, else GitHub, else chat. Pick a short `slug` from the PRD title.
3. **Plan.** Spawn `planner` in the foreground (you need its result) with
   `PRD: <repo-relative path>. Plan folder: <repo>/factory/plans/<slug>/. Main checkout: <repo>. Target: <target>.`
   Then run `factory/bin/plan check <slug>`. If it fails, respawn the planner
   once with the errors; if it fails again, show the user the errors and stop.
4. **Show the user the breakdown** and wait: the `plan check` output (the
   waves), and plan.md's Prerequisites, Coverage gaps and Open questions. Ask
   them to approve, answer the open questions, or say what to change. Keep it
   short; they can read plan.md for the rest. For changes, write their words
   verbatim to `factory/plans/<slug>/feedback-<k>.md`, respawn the planner
   with `Revise: read feedback-<k>.md.` added, check again and show the new
   breakdown. Don't publish without an explicit yes.
5. **Publish** once they approve:
   - GitHub or chat: `factory/bin/plan publish <slug> github|chat`. It creates
     the tickets dependencies-first, labeled `factory`, with `Depends on:`
     lines naming the real refs. Add `--no-label` if the user wants to label
     tickets themselves.
   - Linear: loop until `factory/bin/plan next <slug>` prints nothing. Each
     time it prints `{"id", "title", "body", "labels"}`: create that issue in
     the configured team with `save_issue`, exactly that title, body (as
     `description`) and labels, then `factory/bin/plan map <slug> <id> <KEY>`.
     If the MCP can't add a label, create the label first.

   If publishing stops part-way, run the same command again: published
   tickets are recorded in `published.json` and skipped.
6. **Report** with `factory/bin/plan status <slug>`, and offer to start:
   `/factory run` starts wave 1 now and later waves as their dependencies
   merge. Remind them that Prerequisites aren't factory tickets.

`/factory plan status <slug>` runs `factory/bin/plan status <slug>`: each
ticket's ref, job and stage, so the user can follow the PRD's progress.
