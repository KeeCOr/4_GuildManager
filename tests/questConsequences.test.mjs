import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importPenalty() {
  const source = await readFile(new URL('../src/utils/quest.ts', import.meta.url), 'utf8')
  const match = source.match(/export function calcQuestFailureFamePenalty[\s\S]*?\n}/)
  assert.ok(match, 'failure fame penalty function must exist')
  const compiled = ts.transpileModule(match[0], {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

async function importSurvivorRule() {
  const source = await readFile(new URL('../src/utils/quest.ts', import.meta.url), 'utf8')
  const match = source.match(/export function limitSuccessfulQuestDeaths[\s\S]*?\n}/)
  assert.ok(match, 'successful quest survivor rule must exist')
  const compiled = ts.transpileModule(match[0], {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

test('quest failure always lowers reputation', async () => {
  const { calcQuestFailureFamePenalty } = await importPenalty()
  assert.equal(calcQuestFailureFamePenalty(0), 1)
  assert.equal(calcQuestFailureFamePenalty(18), 1)
})

test('harder failures cost more reputation with a safe cap', async () => {
  const { calcQuestFailureFamePenalty } = await importPenalty()
  const boundaries = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600]
  boundaries.forEach((boundary, index) => {
    assert.equal(calcQuestFailureFamePenalty(boundary), index + 1)
    assert.equal(calcQuestFailureFamePenalty(boundary + 1), index + 2)
  })
  assert.equal(calcQuestFailureFamePenalty(700), 12)
  assert.equal(calcQuestFailureFamePenalty(9999), 12)
})

test('both quest result flows apply the shared failure penalty', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.equal((app.match(/calcQuestFailureFamePenalty\(quest\.difficulty\)/g) ?? []).length, 2)
  assert.equal((app.match(/의뢰 실패로 길드 평판/g) ?? []).length, 2)
})

test('a cleared quest always leaves at least one party member alive', async () => {
  const { limitSuccessfulQuestDeaths } = await importSurvivorRule()
  assert.deepEqual(limitSuccessfulQuestDeaths([{ id: 'solo', deathRisk: 0.9 }], ['solo']), [])
  assert.deepEqual(
    limitSuccessfulQuestDeaths([
      { id: 'safe', deathRisk: 0.1 },
      { id: 'mid', deathRisk: 0.4 },
      { id: 'risk', deathRisk: 0.8 },
      { id: 'last', deathRisk: 0.9 },
    ], ['safe', 'mid', 'risk', 'last']),
    ['mid', 'risk', 'last'],
  )
})

test('successful quest death rolls run in both result flows', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.equal((app.match(/limitSuccessfulQuestDeaths\(successRiskEntries, rolledSuccessDeadIds\)/g) ?? []).length, 2)
  assert.equal((app.match(/assignedMercIds\.length < 3/g) ?? []).length, 0)
})
