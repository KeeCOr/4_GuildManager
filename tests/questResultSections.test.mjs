import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/utils/questResultSections.ts', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

test('quest result sections follow the player decision order', () => {
  const order = ['보상 및 성장', '부상', '전사', '부산물', '특별 아이템', '후속 영향', '임무 기록']
  let cursor = -1
  for (const label of order) {
    const next = source.indexOf(`label: '${label}'`)
    assert.ok(next > cursor, `${label} section should keep its decision order`)
    cursor = next
  }
})

test('quest result classifier separates injury, death and loot lines', () => {
  assert.match(source, /line\.startsWith\('🤕'\).*'injuries'/)
  assert.match(source, /line\.startsWith\('💀'\).*'deaths'/)
  assert.match(source, /line\.startsWith\('🎒'\).*'materials'/)
  assert.match(source, /line\.startsWith\('🏺'\).*'items'/)
})

test('failed quest records each surviving injury before grouped rendering', () => {
  const injuryLogs = app.match(/🤕 \$\{merc\.name\} 부상 — HP -30, 회복 전 파견 제한/g) ?? []
  assert.equal(injuryLogs.length, 2)
  assert.match(app, /groupQuestResultLines\(page\.lines\)/)
  assert.match(app, /aria-labelledby=\{`result-\$\{section\.key\}`\}/)
})

test('empty result state explains how to create the first result', () => {
  assert.match(app, /아직 완료된 의뢰가 없습니다/)
  assert.match(app, /의뢰를 파견하면 보상과 피해, 다음 조치가 여기에 정리됩니다/)
})
