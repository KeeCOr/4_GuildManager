import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function load() {
  let source = await readFile(new URL('../src/utils/questLoot.ts', import.meta.url), 'utf8')
  source = source.replace("import type { Mercenary, Quest } from '../types'", '')
  source = source.replace("import { getMonsterEncounter } from '../data/combatTraits'", "const getMonsterEncounter = () => ({ count: 4, size: '중형' })")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

const quest = { id: 'q', name: '시험 의뢰', difficulty: 300, element: '자연', trapFocus: false }

test('three requested loot achievements are independent performance reasons', async () => {
  const { rollQuestLoot } = await load()
  const rolls = [0, 0.5, 0.99, 0, 0.1]
  const loot = rollQuestLoot(quest, true, () => rolls.shift() ?? 0)
  assert.equal(loot.strongerMonster, true)
  assert.equal(loot.abundantMaterials, true)
  assert.ok(loot.specialItem)
  assert.equal(loot.notableReasons.length, 3)
})

test('material stock accumulates quest byproducts', async () => {
  const { addQuestLoot, EMPTY_QUEST_MATERIALS } = await load()
  const next = addQuestLoot({ ...EMPTY_QUEST_MATERIALS }, { materials: [{ id: 'bone', name: '뼈', quantity: 4 }] })
  assert.equal(next.bone, 4)
})
