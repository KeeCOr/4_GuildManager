import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

test('loot achievements determine special bonus strength', async () => {
  const { createSpecialBonusOffer } = await importModule('../src/utils/specialBonus.ts')
  const offer = createSpecialBonusOffer({ questId: 'q1', questName: '시험', rewardGold: 100, conditionDrain: 20, participantIds: ['a', 'a', 'b'], notableReasons: ['강적', '대량 부산물', '특별 아이템'] })
  assert.equal(offer.performance, 'legendary')
  assert.equal(offer.loyaltyGain, 13)
  assert.deepEqual(offer.participantIds, ['a', 'b'])
})

test('paying and withholding move all three stats in opposite directions', async () => {
  const { createSpecialBonusOffer, applySpecialBonusStats } = await importModule('../src/utils/specialBonus.ts')
  const offer = createSpecialBonusOffer({ questId: 'q2', questName: '시험', rewardGold: 100, conditionDrain: 20, participantIds: ['a'], notableReasons: ['강적'] })
  const paid = applySpecialBonusStats({ loyalty: 50, morale: 60, condition: 40 }, offer, true)
  const declined = applySpecialBonusStats({ loyalty: 50, morale: 60, condition: 40 }, offer, false)
  assert.ok(paid.loyalty > 50 && paid.morale > 60 && paid.condition > 40)
  assert.ok(declined.loyalty < 50 && declined.morale < 60 && declined.condition < 40)
})

test('both completion paths roll loot and gate bonus on notable loot', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.equal((app.match(/rollQuestLoot\(quest, success, Math\.random, assignedMercs\)/g) ?? []).length, 2)
  assert.equal((app.match(/loot\.notableReasons\.length > 0/g) ?? []).length, 2)
})
