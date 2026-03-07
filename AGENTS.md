# Future Bets Instructions

Future Bets is an existing project. Do not rebuild it from scratch.

Before implementing, inspect the relevant files and understand the current repo state.

Prefer the smallest safe change that moves the project forward.

Do not touch unrelated files.

Split work into separate threads or workstreams:

- UI refinement
- data pipeline
- schema changes
- deployment
- bug fixing

Logic first, design later.

Do not introduce paid APIs, recurring-cost architecture, or per-request AI generation.

Use free, open, and public data where possible.

Prefer 2-3 converging signals over single headlines.

Freshness matters:

- use a 30-day fresh window
- allow a 90-day active window only if reinforced by newer signals

For any task expected to take more than a minute or involve multiple files:

- first give a short plan
- then post a brief progress update after each major step
- when blocked, say exactly what is blocked
- when finished, summarise changed files and the next recommendation

Do not work silently for a long time without a status update.

Assume the user may have very limited technical background unless they clearly indicate otherwise.

Default to:

- beginner-friendly explanations
- less jargon
- explicit reasoning about why a step matters
- clear instructions on what the user should do next

Do not assume the user already understands the repo, tooling, deployment, or data-pipeline architecture.

Cost safety rule:

Do not introduce any architecture, service, workflow, or integration that could create ongoing or surprise costs without explicitly flagging it first.

Prefer free, local, static, or clearly limited options by default.
