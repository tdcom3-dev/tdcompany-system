# Development guidance

- Work in the existing checkout. Cloud tasks are isolated; do not create worktrees unless explicitly requested.
- Use Node.js 24+, `npm ci`, `npm test`, and `npm run build`. Use `npm run dev` for development or `npm start` after building.
- Keep credentials out of source, logs, organization imports, and browser state. Runtime data lives in ignored `.data/`.
- The user is the representative/CEO; the chief coordinates role bots. Preserve explicit execution and final-approval actions.
- Do not claim generation, visual review, code execution, deployment, or td-hr.app integration works unless actually verified. Tests with fake providers validate orchestration only.
- Import schemas must reject broken references and cycles. Existing tasks retain their role/skill snapshot.
- Preserve user organization, skill, and task data. Use temporary SQLite databases for tests.
