# GuildManager Structure Cleanup Note

Inspection date: 2026-06-24
Scope: `C:\Development\4_GM` only

No files or folders were deleted. Existing dirty documentation changes were preserved as-is.

## Preserve

- `.worktrees/systems-overhaul`
  - Registered by `git worktree list --porcelain` as an active Git worktree.
  - Branch: `feature/systems-overhaul`
  - HEAD: `ee685bee18d41aee5fdf4de7e1ba8e77b303e407`
  - Status inside the worktree is not clean: one tracked docs HTML deletion is present.
  - Decision: preserve. Do not delete or prune unless the branch/worktree owner confirms it is retired and dirty state is intentionally discarded or migrated.

## Safe Cleanup Candidates

These root folders are present but empty after recursive inspection:

- `Assets`
- `Library`
- `Logs`
- `UserSettings`

Observed state:

- None of the four folders are tracked by Git.
- They are not part of the current Vite/React source layout used by `package.json`.
- Recursive item count was `0` for each folder.
- They look like leftover Unity-style project folders rather than active GuildManager runtime folders.

Decision: safe cleanup candidates only if the team confirms GuildManager is not being opened as a Unity project. Because empty folders can still be personal workspace markers, leave them in place unless cleanup is explicitly requested.

## Ambiguous Or Dirty Items Not For Cleanup

- Pre-existing dirty docs in the main worktree:
  - `docs/GuildManager_기획서.md`
  - `docs/GuildManager_기획서.html`
  - deleted legacy `docs/기획서.html`
  - untracked `docs/GuildManager_업데이트_내역서.md`
  - untracked `docs/GuildManager_업데이트_내역서.html`
- Generated or dependency folders such as `dist`, `release`, and `node_modules` were outside this cleanup decision request and were not evaluated for deletion.

## Recommended Next Cleanup Step

If cleanup is requested later, first confirm ownership of `.worktrees/systems-overhaul`. After that, remove only confirmed stale empty root folders (`Assets`, `Library`, `Logs`, `UserSettings`) and leave all dirty docs/worktrees untouched.
