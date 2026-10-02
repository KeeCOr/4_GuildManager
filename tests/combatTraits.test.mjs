import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function load() {
  let source = await readFile(new URL('../src/data/combatTraits.ts', import.meta.url), 'utf8')
  source = source.replace("import type { Mercenary, Quest, Race } from '../types'", '')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

const merc = (cls, race = '인간', element = '불') => ({ class: cls, race, element })
const quest = (name, description = '', overrides = {}) => ({ id: name, name, description, difficulty: 200, slots: 4, duration: 3, element: '암흑', ...overrides })

test('class specialties respond to encounter shape', async () => {
  const { calcTraitSuccessBonus } = await load()
  assert.ok(calcTraitSuccessBonus(quest('우두머리 결투'), [merc('전사')]) >= 8)
  assert.ok(calcTraitSuccessBonus(quest('몬스터 군단 소탕'), [merc('마법사')]) >= 10)
  assert.ok(calcTraitSuccessBonus(quest('유령 퇴치'), [merc('성직자', '인간', '빛')]) >= 19)
  assert.ok(calcTraitSuccessBonus(quest('와이번 추격'), [merc('궁수')]) >= 10)
})

test('warrior protects backline while cleric protects frontline', async () => {
  const { calcTraitDeathRiskMultiplier } = await load()
  const q = quest('우두머리 결투')
  const party = [merc('전사'), merc('마법사'), merc('성직자')]
  assert.ok(calcTraitDeathRiskMultiplier(q, party[1], party) < 1)
  assert.ok(calcTraitDeathRiskMultiplier(q, party[0], party) < calcTraitDeathRiskMultiplier(q, party[0], party.slice(0, 2)))
})

test('ice, dwarf and cleric reduce long-mission condition drain', async () => {
  const { calcTraitConditionDrain } = await load()
  const q = quest('장기 원정', '', { duration: 5, conditionDrain: 20, element: '불' })
  assert.ok(calcTraitConditionDrain(q, merc('성직자', '드워프', '얼음')) < 20)
})

test('monster encounter exposes stable count size and element', async () => {
  const { getMonsterEncounter } = await load()
  const q = quest('몬스터 군단 소탕', '', { element: '불' })
  const first = getMonsterEncounter(q)
  const second = getMonsterEncounter(q)
  assert.deepEqual(first, second)
  assert.ok(first.count >= 8)
  assert.equal(first.element, '불')
  assert.match(first.label, /마리.*속성/)
})
