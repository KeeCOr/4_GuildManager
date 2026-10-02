import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/utils/questReadiness.ts', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

test('quest readiness compares all four dispatch requirements', () => {
  for (const label of ['전력', '함정 대응', '핵심 역할', '속성 대응']) {
    assert.match(source, new RegExp(`label: '${label}'`))
  }
  assert.match(source, /metCount: rows\.filter\(row => row\.status === 'met'\)\.length/)
})

test('quest readiness covers empty, partial and fulfilled states with a recovery hint', () => {
  assert.match(source, /'미편성'/)
  assert.match(source, /'partial'/)
  assert.match(source, /'도적 또는 궁수를 배치하세요'/)
  assert.match(source, /핵심 출정 조건을 모두 충족했습니다/)
})

test('quest card renders the shared readiness comparison before dispatch', () => {
  assert.match(app, /getQuestReadinessComparison\(quest, assignedMercs\)/)
  assert.match(app, /출정 준비 비교/)
  assert.match(app, /준비 \{readiness\.metCount\}\/\{readiness\.totalCount\} 충족/)
})
