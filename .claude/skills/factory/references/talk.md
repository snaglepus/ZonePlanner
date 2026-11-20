# Talking to the factory

`/factory add` and `/factory <anything>`. Every change of state still goes
through the scripts; the steps named in **bold** (**intake**, **build**,
**queued**) are in SKILL.md's "Advancing a job".

## /factory add <feature> [opts]

The user is describing a feature. Keep this light: it is not a requirements
interview. Besides the route opts, it takes `mirror=github|linear`.

1. If the request is clear enough for intake to judge, don't ask anything. If
   one thing is genuinely ambiguous and would change what gets built, ask at
   most three short questions in one message, each with your recommended
   answer, and wait. Intake can still ask more later.
2. Write a short imperative title and a body that states the request in the
   user's own words, plus their answers. Don't add requirements they didn't
   ask for; the spec writer and the adversary do that.
3. With `mirror=github` (or `sources.chat.mirror` set to `github`), create the
   issue and run it as a GitHub job instead:
   `gh issue create --label factory --title "<title>" --body "<body>"`, then
   `/factory run <n>`. With `mirror=linear`, create the Linear issue with
   `save_issue` (`team`, `title`, `description`, `labels: ["factory"]`),
   refresh the inbox, then `/factory run <KEY>`.
4. Otherwise create a chat job:

   ```bash
   factory/bin/job create chat <<'EOF'
   {"title": "<title>", "body": "<body>", "opts": "<the user's [opts], e.g. adversary=claude rounds=2, or empty>"}
   EOF
   ```

   It prints the job id and starts `queued`. The job stores the opts, so route
   applies them even if it starts on a later `/factory run`. If a slot is
   free (check with `factory/bin/job queue`, refreshing the Linear inbox first
   as `references/linear.md` says when Linear is enabled), start it at
   **queued** now; otherwise tell the user it's queued
   behind the running jobs and starts on the next `/factory run`.

## /factory <anything>

Work out what the user wants and act on it. When it isn't clear which job they
mean, or whether it's feedback or a new feature, ask.

- **A question** (status, cost, why a job escalated, what the adversary or a
  reviewer said): answer from `factory/bin/job summary`, `job.json` and the
  job's files. Here you may read a file in full when the answer is in it.
- **What needs them**: refresh the Linear inbox when Linear is enabled (see
  `references/linear.md`), then run `factory/bin/job queue`. For each `wait` line, say
  what the job waits for: the question in `decision.md` for `needs-human`, in
  `intake.md` for `needs-info`.
- **An answer to a chat job's question** (a reply to intake's questions you
  showed them):

  ```bash
  factory/bin/job answer <id> <<'EOF'
  <their answer, verbatim>
  EOF
  ```

  then `factory/bin/job advance <id> intake` and go to **intake**.
- **An answer to a GitHub or Linear `needs-info` question**: post their words
  on the ticket (`gh issue comment <n> --body "<answer>"`, or `save_comment`
  on the Linear issue, then refresh the inbox), then
  `factory/bin/job advance <id> intake` and go to **intake**.
- **Feedback on a `needs-human` job**: pass their words verbatim on stdin:

  ```bash
  factory/bin/job feedback <id> <<'EOF'
  <their feedback>
  EOF
  ```

  It saves `feedback-<k>.md` and prints where the job went:
  - `→ spec` (it escalated during spec review, before any build): spawn
    `spec-writer` with `<header> The user gave feedback: read feedback-<k>.md, revise spec.md, and write spec-review/dispositions-<r>.md.`
    where `r` is `spec_review.round`; then `factory/bin/job advance <id> spec-review`.
  - `→ build`: go to **build** with
    `The user gave feedback: read feedback-<k>.md and address it, push, and update build.md for round <N>.`
- **Rejecting or benching a `queued`, `needs-info` or `needs-human` job**:
  pass their reason verbatim on stdin to `factory/bin/job reject <id>`. It
  saves `rejection.md`, tells the ticket why, removes the factory labels,
  closes the job's PR if it has one, and moves the job to Done.
- **A new feature**: treat it as `/factory add`.
