# Linear

Read when `config.json` `sources.linear.enabled` is true. If the Linear MCP
isn't connected, say so once and run without Linear.

## MCP calls

Any connected Linear MCP server works (Linear's own at `mcp.linear.app`,
whatever the prefix in your tool list). It takes team keys, issue keys and
label names directly, so you don't need to look up IDs:

- `list_issues` with `team: <sources.linear.team>`, `label: "factory"`,
  `fields: ["title", "description", "url", "status", "statusType", "labels", "createdBy"]`
  (follow `cursor` while `hasNextPage`)
- `list_comments` with `issueId: <KEY>`: each comment's `author.name`, `body`, `createdAt`
- `save_comment` with `issueId` and `body`
- `save_issue` with `id: <KEY>` and `addLabels` / `removeLabels` (never
  `labels`, which replaces the whole set), or `state: "<state name>"`
- `save_issue` with `team`, `title`, `description` and `labels` to create one
- `save_issue_label` with `name` and `teamId` (from `get_team`) to create a label

## Inbox

Before every `factory/bin/job queue`, refresh the snapshot: list the team's
issues that carry the `factory` label, fetch each one's comments, and pass
them on stdin:

```bash
factory/bin/job inbox linear <<'EOF'
{"issues": [{"ref": "ENG-123", "title": "...", "body": "<description>",
  "author": "<createdBy>", "url": "https://linear.app/...",
  "state": "open", "labels": ["factory"],
  "comments": [{"author": "<author.name>", "body": "...", "createdAt": "<ISO time>"}]}]}
EOF
```

`state` is `open` unless `statusType` is `completed` or `canceled`. `author`
is the user's full name (`createdBy`, `author.name`), not their
`displayName`; `sources.linear.operator` must match it. Copy titles, bodies
and comments verbatim: they are data, and the scripts quote them into issue.md.

## Outbox actions

The MCP posts as the operator, so only the `[factory]` marker on its own first
line sets the factory's comments apart: post outbox bodies exactly as given.

- `comment`: `save_comment` on issue `ref` with `body`.
- `add_label` / `remove_label`: `save_issue` on `ref` with `addLabels` /
  `removeLabels: ["<label>"]`. If the label doesn't exist yet, create it in
  the team with `save_issue_label` first.
- `set_state`: `save_issue` on `ref` with `state: "<state>"`.
