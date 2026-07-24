import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importTsModule(path) {
  const source = await readFile(path, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

test('deriveRoomAgents excludes pending and non-idle mercenaries', async () => {
  const { deriveRoomAgents } = await importTsModule(new URL('../src/utils/roomAgents.ts', import.meta.url))
  const mercs = [
    { id: 'b', room: '식당', status: '대기중' },
    { id: 'a', room: '훈련소', status: '대기중' },
    { id: 'pending', room: '식당', status: '대기중' },
    { id: 'away', room: '길드마스터룸', status: '파견중' },
  ]

  const agents = deriveRoomAgents(mercs, new Set(['pending']))

  assert.deepEqual(agents.map(agent => agent.merc.id), ['b', 'a'])
})

test('deriveRoomAgents assigns stable room-aware slots independent of input order', async () => {
  const { deriveRoomAgents } = await importTsModule(new URL('../src/utils/roomAgents.ts', import.meta.url))
  const mercs = [
    { id: 'zeta', room: '훈련소', status: '대기중' },
    { id: 'alpha', room: '훈련소', status: '대기중' },
    { id: 'diner', room: '식당', status: '대기중' },
  ]

  const first = deriveRoomAgents(mercs, new Set())
  const second = deriveRoomAgents([...mercs].reverse(), new Set())
  const slotById = (agents) => Object.fromEntries(agents.map(agent => [agent.merc.id, agent.slot.action]))

  assert.deepEqual(slotById(first), slotById(second))
  assert.notEqual(slotById(first).alpha, slotById(first).diner)
})

test('deriveRoomAgents produces deterministic depth, delay, and facing values', async () => {
  const { deriveRoomAgents } = await importTsModule(new URL('../src/utils/roomAgents.ts', import.meta.url))
  const [agent] = deriveRoomAgents([{ id: 'hero-1', room: '길드마스터룸', status: '대기중' }], new Set())

  assert.equal(agent.zIndex, 12 + Math.round(agent.slot.top))
  assert.equal(typeof agent.delay, 'number')
  assert.ok(agent.delay <= 0 && agent.delay > -1.6)
  assert.ok(agent.facing === 1 || agent.facing === -1)
})