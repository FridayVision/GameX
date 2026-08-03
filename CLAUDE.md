# GameX — Claude Instructions

## Session Start Protocol (always do this first)

At the start of every session, before writing or suggesting any code, read these three files:

1. `docs/prd.md` — what we're building and why
2. `docs/trd.md` — every technical decision and how it fits together
3. `docs/task-list.md` — current build status and what's next

After every completed milestone: update `docs/task-list.md` status and commit.

---

## Plan Mode Protocol

When entering plan mode for any milestone or feature, **always save the plan to a file** before executing — do not keep it only in memory.

**File location:** `_plans/` (gitignored — local traceability only)

**File naming:** `milestone-{N}-{slug}-{YYYY-MM-DD}.md`
Examples: `milestone-1-shared-foundation-2026-08-03.md`, `milestone-3-llm-pool-2026-08-04.md`

**File structure:**

```
# Plan: Milestone N — {Title}
Date: YYYY-MM-DD

## References
- TRD sections: §X, §Y
- PRD requirements: FR-N, FR-N
- Task-list items: (list the specific checkboxes)

## Implementation Steps
Numbered steps — files to create, order of operations, decisions to confirm

## Files to Create / Modify
List with one-line purpose each

## Open Questions
Any uncertainties to resolve before or during implementation
```

Save the file first, then proceed with implementation. This makes every plan reviewable and referenceable in future sessions.

---

## Naming Conventions (always enforced)

Before creating or renaming any file or folder, apply these rules without being asked.

| What                      | Rule              | Example                                                   |
| ------------------------- | ----------------- | --------------------------------------------------------- |
| Any folder                | `kebab-case`      | `components/`, `hooks/`, `app/room/[code]/board/`         |
| TypeScript / TSX file     | `kebab-case`      | `game-board.tsx`, `use-game-state.ts`, `socket-events.ts` |
| Next.js special files     | as-is (framework) | `page.tsx`, `layout.tsx`, `route.ts`                      |
| Python file               | `snake_case`      | `llm_pool_generator.py`, `tmdb_search.py`                 |
| Markdown / config / other | `kebab-case`      | `task-list.md`, `tailwind.config.ts`                      |

Exports inside files follow language convention independently of the file name:

- React components → `PascalCase` export (`GameBoard`)
- Hooks → `camelCase` export (`useGameState`)
- Types / interfaces → `PascalCase` (`PlayerState`)
- Functions / variables → `camelCase` (`generateBracket`)
- Constants → `SCREAMING_SNAKE_CASE` (`MAX_PLAYERS`)
- Socket event strings → `kebab-case` (`'player-joined'`)

If a user-requested name violates these rules, use the compliant form and note the correction inline.

Full rationale and examples: `.claude/skills/gamex-naming/SKILL.md`
