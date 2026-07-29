## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Codex workflow

- When reading or investigating the codebase, prioritize Graphify first:
  - Run `graphify query "<question>"` when `graphify-out/graph.json` exists.
  - Use `graphify explain "<concept>"` for focused concepts.
  - Use `graphify path "<A>" "<B>"` for relationships.
  - If the `graphify` CLI is unavailable, note the limitation and continue with targeted source reads.
- Do not run Android device/emulator/sandbox test flows.
- Prefer command-line checks that run in the local development environment, such as unit tests, type checks, lint, or targeted npm scripts.
- Unless a higher-priority instruction explicitly requires it, do not commit changes and do not create GitHub pull requests automatically.
- Focus on editing code and reporting the commands that were run.

## Release Notes Policy

Every change that affects application behavior, user interface, data, reports, APIs, or how users use a feature must update the repository's existing release notes in the same change set.

Before completing a task, coding agents must:

1. Find the repository's existing release-notes mechanism.
2. Add the user-facing change to the current release section or equivalent location.
3. Use the repository's existing language, format, and categories.
4. Do not create a second release-notes mechanism.
5. If release notes are not needed, state the reason in the final summary.

### Version update workflow

When the user explicitly requests a version update, version bump, or release-version change:

1. Determine the target version from the repository's version source of truth and use the exact matching `vX.Y.Z` release heading.
2. Replace the entire contents of the root `RELEASE_NOTES.md` so that it initially contains only `# vX.Y.Z`. Do not preserve summaries, sections, bullets, or any other content from the previous release.
3. Inspect the actual codebase changes included in the release. Use the relevant working-tree diff and commits since the previous release tag or release baseline; do not use the previous release-note text as a source.
4. Rebuild `RELEASE_NOTES.md` from that inspection with a concise, user-facing overview of the application's changes. Describe observable features, improvements, fixes, security changes, data changes, limitations, and required user actions when applicable; omit internal implementation details and unchanged areas.
5. Follow the repository's existing release-note template, language, headings, and validation requirements. Include only sections supported by the changes, but always provide the required summary and at least one concrete change item.
6. Confirm that the release-note heading, version source, and intended release tag all match before finishing.

Clearing and rebuilding `RELEASE_NOTES.md` is mandatory only for an explicit version-update request. For ordinary feature or fix tasks without a version change, update the current release notes incrementally under the general policy above.

## Completion Checklist

- [ ] Checked the impact scope of the change.
- [ ] Added or updated relevant tests.
- [ ] Ran appropriate lint, type checks, tests, and build.
- [ ] Updated Release Notes, or cleared and rebuilt them from codebase changes for a version update.
- [ ] Confirmed there are no unrelated changes.
- [ ] Summarized changed files and verification results.
