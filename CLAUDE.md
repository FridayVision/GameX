# GameX — Claude Instructions

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
