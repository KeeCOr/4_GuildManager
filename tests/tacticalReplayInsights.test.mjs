import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../', import.meta.url)

async function loadReplayModule() {
  const source = await readFile(new URL('src/utils/tacticalReplay.ts', root), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`)
}

const baseQuest = {
  id: 'q-trap',
  name: 'Trap Survey',
  difficulty: 120,
  element: 'dark',
  duration: 2,
  slots: 2,
  trapFocus: true,
  conditionDrain: 18,
  deathRisk: 0.08,
  reward: { gold: 180, fame: 4, exp: 60 },
}

const activeQuest = { questId: 'q-trap', assignedMercIds: ['m1', 'm2'], completesAt: 2000, durationMs: 1000 }

function merc(overrides) {
  return {
    id: overrides.id,
    name: overrides.name,
    class: overrides.class ?? 'rogue',
    hp: 100,
    power: overrides.power,
    trap_disarm: overrides.trap_disarm ?? 0,
    element: overrides.element ?? 'dark',
    status: 'away',
    condition: 80,
    ...overrides,
  }
}

test('tactical replay exposes insight cards for power, trap coverage, and reward', async () => {
  const { buildTacticalReplay } = await loadReplayModule()
  const replay = buildTacticalReplay(baseQuest, [
    merc({ id: 'm1', name: 'Aren', power: 90, trap_disarm: 40 }),
    merc({ id: 'm2', name: 'Bern', power: 80 }),
  ], activeQuest, 1600)

  assert.ok(Array.isArray(replay.insights))
  assert.equal(replay.insights.length, 3)
  assert.deepEqual(replay.insights.map(item => item.id), ['power', 'trap', 'reward'])
  assert.match(replay.insights[2].detail, /180G/)
})

test('tactical replay insight tone warns when party power is below difficulty', async () => {
  const { buildTacticalReplay } = await loadReplayModule()
  const replay = buildTacticalReplay(baseQuest, [
    merc({ id: 'm1', name: 'Luke', power: 35, trap_disarm: 0 }),
  ], activeQuest, 1600)

  const power = replay.insights.find(item => item.id === 'power')
  const trap = replay.insights.find(item => item.id === 'trap')
  assert.equal(power.tone, 'warn')
  assert.equal(trap.tone, 'warn')
})