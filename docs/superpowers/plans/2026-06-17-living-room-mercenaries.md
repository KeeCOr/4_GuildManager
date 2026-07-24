# Living Room Mercenaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render assigned idle mercenaries as animated agents in the guild building scene.

**Architecture:** Add pure display helpers and a derived `roomAgents` list in `App.tsx`, then render an absolute scene layer between the room/drop overlays and front prop layer. Use CSS keyframes in `index.css` for room-appropriate movement and idle behaviors.

**Tech Stack:** React 18, TypeScript, Vite, CSS keyframes.

## Global Constraints

- Do not change save data schema.
- Do not add runtime dependencies.
- Only render mercenaries with `status === '대기중'` and not in `pendingMercIds`.
- Keep existing room drag/drop and mercenary detail modal behavior.

---

### Task 1: Scene Agent Data

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `getRoomAgentSlot(merc, index)`, `getRoomActionLabel(room, slot)`, `roomAgents` derived array.

- [ ] Add room-specific slot presets with percent `left`, `top`, `scale`, `action`, and `anim` values.
- [ ] Add stable hash helper for mercenary ids.
- [ ] Derive `roomAgents` from `mercs` and `pendingMercIds`.

### Task 2: Scene Agent Layer

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `roomAgents` from Task 1.
- Produces: clickable `.gm-room-agent` elements.

- [ ] Render the agent layer inside `.gm-scene-camera` before `sceneFrontProps`.
- [ ] Use existing sprites via `getSprite` and fallback to `MercAvatar`.
- [ ] Set `setSelectedMercId` and `setRoomMercPreview` on click.
- [ ] Add room-specific CSS keyframes and hover/focus styling.

### Task 3: Verification and Release Hygiene

**Files:**
- Modify: generated release outputs after build.

- [ ] Run `npm run build`.
- [ ] Run project release command `node scripts/build-release.js` if build passes.
- [ ] Place latest portable artifact per AGENTS rules.
- [ ] Update planning docs if the project docs contain current MD/HTML planning files.
