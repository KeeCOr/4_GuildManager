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

function makeMerc(overrides) {
  return {
    id: 'x', name: 'X', status: '대기중',
    hp: 100, condition: 100, morale: 70, favorability: 50, room: '식당',
    level: 1, experience: 0, expToNext: 100,
    power: 10, trap_disarm: 5,
    stats: { 공격력: 10, 함정해제: 5, 생존율: 10, 협조성: 10 },
    ...overrides,
  }
}

async function loadModule() {
  return importTsModule(new URL('../src/utils/returnEpisode.ts', import.meta.url))
}

test('generateReturnEpisode produces a deterministic, grounded episode and enqueue is idempotent', async () => {
  const { generateReturnEpisode, enqueueReturnEpisode } = await loadModule()

  const activeQuest = { questId: 'q1', assignedMercIds: ['a', 'b'], completesAt: 123456, durationMs: 1000 }
  const postMercs = [
    makeMerc({ id: 'a', name: '카이강', power: 50, status: '대기중' }),
    makeMerc({ id: 'b', name: '미나원', power: 30, status: '부상' }),
  ]

  const episode = generateReturnEpisode(activeQuest, '고블린 소탕', true, postMercs)

  assert.equal(episode.id, 'q1:123456')
  assert.equal(episode.questId, 'q1')
  assert.equal(episode.questName, '고블린 소탕')
  assert.equal(episode.success, true)
  assert.deepEqual(episode.participants.map(p => p.id), ['a', 'b'])
  assert.ok(episode.cause.includes('카이강'))
  assert.deepEqual(episode.choices.map(c => c.id), ['feast', 'review', 'care'])

  const emptyState = { pending: [], processedIds: [], activeFeedback: null }
  const enqueued = enqueueReturnEpisode(emptyState, episode)
  assert.equal(enqueued.pending.length, 1)

  const reEnqueued = enqueueReturnEpisode(enqueued, episode)
  assert.equal(reEnqueued, enqueued, 'no-op for already-pending id must return the same state reference')

  const processedState = { pending: [], processedIds: [episode.id], activeFeedback: null }
  const stillNoOp = enqueueReturnEpisode(processedState, episode)
  assert.equal(stillNoOp, processedState, 'no-op for already-processed id must return the same state reference')
})

test('feast choice raises morale/favorability for survivors, clamps to 100, and sets canonical room', async () => {
  const { resolveReturnEpisode } = await loadModule()

  const episode = {
    id: 'q2:200', questId: 'q2', completesAt: 200, questName: '퀘스트', success: true,
    cause: '카이강의 활약으로 임무를 성공적으로 마쳤다.',
    participants: [{ id: 'a', name: '카이강', status: '대기중' }],
    choices: [],
  }
  const state = { pending: [episode], processedIds: [], activeFeedback: null }
  const mercs = [makeMerc({ id: 'a', name: '카이강', morale: 95, favorability: 98, room: '훈련소' })]

  const result = resolveReturnEpisode(state, episode.id, 'feast', mercs)

  assert.equal(result.applied, true)
  assert.equal(result.mercs[0].morale, 100)
  assert.equal(result.mercs[0].favorability, 100)
  assert.equal(result.mercs[0].room, '식당')
  assert.equal(result.state.activeFeedback.visualRoom, '식당')
  assert.equal(result.state.activeFeedback.activityId, 'feast')
})

test('review choice crosses a level threshold without corrupting experience bookkeeping', async () => {
  const { resolveReturnEpisode } = await loadModule()

  const episode = {
    id: 'q3:300', questId: 'q3', completesAt: 300, questName: '퀘스트', success: true,
    cause: '임무를 성공적으로 마쳤다.',
    participants: [{ id: 'a', name: '카이강', status: '대기중' }],
    choices: [],
  }
  const state = { pending: [episode], processedIds: [], activeFeedback: null }
  const mercs = [makeMerc({
    id: 'a', name: '카이강', level: 1, experience: 60, expToNext: 100,
    power: 10, trap_disarm: 5, stats: { 공격력: 10, 함정해제: 5, 생존율: 10, 협조성: 10 },
  })]

  const result = resolveReturnEpisode(state, episode.id, 'review', mercs)
  const merc = result.mercs[0]

  assert.equal(merc.level, 2)
  assert.equal(merc.experience, 5) // 60 + 45 - 100
  assert.equal(merc.expToNext, 200)
  assert.equal(merc.power, 12)
  assert.equal(merc.trap_disarm, 6)
  assert.equal(merc.stats.공격력, 11)
  assert.equal(merc.stats.함정해제, 6)
  assert.equal(merc.stats.생존율, 11)
  assert.equal(merc.stats.협조성, 11)
  assert.equal(merc.room, '훈련소')
})

test('care choice heals an injured survivor, clamps stats, and excludes souls entirely', async () => {
  const { resolveReturnEpisode } = await loadModule()

  const episode = {
    id: 'q4:400', questId: 'q4', completesAt: 400, questName: '퀘스트', success: false,
    cause: '미나원의 부상으로 임무는 실패로 끝났다.',
    participants: [
      { id: 'a', name: '미나원', status: '부상' },
      { id: 'ghost', name: '고인', status: '영혼' },
    ],
    choices: [],
  }
  const state = { pending: [episode], processedIds: [], activeFeedback: null }
  const soul = makeMerc({ id: 'ghost', name: '고인', status: '영혼', hp: 0, condition: 0, room: '길드마스터룸' })
  const mercs = [
    makeMerc({ id: 'a', name: '미나원', status: '부상', hp: 70, condition: 85 }),
    soul,
  ]

  const result = resolveReturnEpisode(state, episode.id, 'care', mercs)
  const [healed, untouchedSoul] = result.mercs

  assert.equal(healed.hp, 100) // 70 + 35 clamped
  assert.equal(healed.condition, 100) // 85 + 20 clamped
  assert.equal(healed.status, '대기중')
  assert.equal(healed.room, '길드마스터룸')
  assert.equal(result.state.activeFeedback.visualAnchor, 'infirmary')
  assert.equal(untouchedSoul, soul, 'soul-status mercenary must be returned by identity, untouched')
  assert.ok(!result.state.activeFeedback.participantIds.includes('ghost'))
})

test('resolving an already-processed episode is a pure no-op with reference equality', async () => {
  const { resolveReturnEpisode } = await loadModule()

  const episode = {
    id: 'q5:500', questId: 'q5', completesAt: 500, questName: '퀘스트', success: true,
    cause: '임무를 성공적으로 마쳤다.',
    participants: [{ id: 'a', name: '카이강', status: '대기중' }],
    choices: [],
  }
  const state = { pending: [episode], processedIds: [], activeFeedback: null }
  const mercs = [makeMerc({ id: 'a', name: '카이강' })]

  const first = resolveReturnEpisode(state, episode.id, 'feast', mercs)
  assert.equal(first.applied, true)

  const second = resolveReturnEpisode(first.state, episode.id, 'feast', first.mercs)
  assert.equal(second.applied, false)
  assert.equal(second.mercs, first.mercs, 'no-op resolution must return the same mercs array reference')
  assert.equal(second.state, first.state, 'no-op resolution must return the same state reference')

  const unknownId = resolveReturnEpisode(state, 'nonexistent', 'feast', mercs)
  assert.equal(unknownId.applied, false)
  assert.equal(unknownId.mercs, mercs)
  assert.equal(unknownId.state, state)
})

test('normalizeReturnEpisodeState handles malformed legacy data and bounds processed IDs to 200', async () => {
  const { normalizeReturnEpisodeState } = await loadModule()

  assert.deepEqual(normalizeReturnEpisodeState(undefined), { pending: [], processedIds: [], activeFeedback: null })
  assert.deepEqual(normalizeReturnEpisodeState(null), { pending: [], processedIds: [], activeFeedback: null })

  const malformed = normalizeReturnEpisodeState({
    pending: ['not-an-episode', { id: 'ok' }, null, 42],
    processedIds: 'not-an-array',
    activeFeedback: { garbage: true },
  })
  assert.deepEqual(malformed, { pending: [], processedIds: [], activeFeedback: null })

  const manyIds = Array.from({ length: 250 }, (_, i) => `id-${i}`)
  const bounded = normalizeReturnEpisodeState({ pending: [], processedIds: manyIds, activeFeedback: null })
  assert.equal(bounded.processedIds.length, 200)
  assert.equal(bounded.processedIds[0], 'id-50')
  assert.equal(bounded.processedIds[199], 'id-249')

  const withDupes = normalizeReturnEpisodeState({
    pending: [],
    processedIds: ['a', 'b', 'a', 'c', 'b'],
    activeFeedback: null,
  })
  assert.deepEqual(withDupes.processedIds, ['a', 'b', 'c'])
})

test('normalizeReturnEpisodeState dedupes pending by id and drops already-processed pending episodes', async () => {
  const { normalizeReturnEpisodeState } = await loadModule()

  const makeEpisode = (id) => ({
    id, questId: id, completesAt: 1, questName: '퀘스트', success: true,
    cause: '임무를 성공적으로 마쳤다.',
    participants: [{ id: 'a', name: '카이강', status: '대기중' }],
    choices: [],
  })

  const result = normalizeReturnEpisodeState({
    pending: [makeEpisode('p1'), makeEpisode('p1'), makeEpisode('p2')],
    processedIds: ['p2'],
    activeFeedback: null,
  })

  assert.deepEqual(result.pending.map(p => p.id), ['p1'])
  assert.deepEqual(result.processedIds, ['p2'])
})
