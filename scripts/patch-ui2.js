import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const fp = resolve('src/App.tsx')
let s = readFileSync(fp, 'utf-8')
const orig = s

// ── 1. Font minimum = text-sm (name font size) ──────────────────────────────
s = s.replace(/text-\[11px\]/g, 'text-sm')
s = s.replace(/text-\[12px\]/g, 'text-sm')
s = s.replace(/text-\[13px\]/g, 'text-sm')

// ── 2. ARRIVAL_REFRESH_COST constant ────────────────────────────────────────
s = s.replace(
  "const MISSION_PAY_PER_DAY: Record<string, number> = { D: 15, C: 30, B: 58, A: 100, S: 175 }",
  "const MISSION_PAY_PER_DAY: Record<string, number> = { D: 15, C: 30, B: 58, A: 100, S: 175 }\nconst ARRIVAL_REFRESH_COST = 50"
)

// ── 3. refreshArrivals function ──────────────────────────────────────────────
s = s.replace(
  "  const dismissArrival = (mercId: string) => {",
  `  const refreshArrivals = () => {
    if (state.gold < ARRIVAL_REFRESH_COST) { log(\`금화 부족: 새로고침 불가 (\${ARRIVAL_REFRESH_COST}G)\`); return }
    setState(prev => ({ ...prev, gold: prev.gold - ARRIVAL_REFRESH_COST }))
    const diningLv = roomLevels['식당'] ?? 1
    const cnt = arrivalCount(buildings.barracks) + diningArrivalBonus(diningLv)
    setGateArrivals(Array.from({ length: cnt }, () => generateMercenary(buildings.tavern + diningTavernBonus(diningLv))))
    log(\`🔄 도착 목록 새로고침 (-\${ARRIVAL_REFRESH_COST}G)\`)
  }

  const dismissArrival = (mercId: string) => {`
)

// ── 4. Remove simultaneous quest limit in launchQuest ───────────────────────
s = s.replace(
  `    if (activeQuests.length >= maxSimultaneousQuests(buildings.hall)) {
      log('길드 홀을 업그레이드하면 더 많은 계약을 동시에 수행할 수 있습니다.')
      return
    }`,
  ''
)

// ── 5. Remove canLaunch quest count limit ────────────────────────────────────
s = s.replace(
  `const canLaunch = filledSlots.length >= 1 &&
                          activeQuests.length < maxSimultaneousQuests(buildings.hall)`,
  `const canLaunch = filledSlots.length >= 1`
)

// ── 6. Add hire button to arrival card ───────────────────────────────────────
s = s.replace(
  `                <div className="flex border-t" style={{ borderColor: 'rgba(160,90,20,0.15)' }}>
                  <button
                    onClick={() => dismissArrival(m.id)}
                    className="flex-1 text-sm py-1.5 text-center transition hover:brightness-125 font-semibold"
                    style={{ color: 'rgba(239,68,68,0.6)', background: 'rgba(239,68,68,0.06)' }}>
                    ✕ 거절
                  </button>
                </div>`,
  `                <div className="flex border-t" style={{ borderColor: 'rgba(160,90,20,0.15)' }}>
                  <button onClick={() => dismissArrival(m.id)}
                    className="flex-1 text-sm py-1.5 text-center transition hover:brightness-125 font-semibold"
                    style={{ color: 'rgba(239,68,68,0.6)', background: 'rgba(239,68,68,0.06)', borderRight: '1px solid rgba(160,90,20,0.15)' }}>
                    ✕ 거절
                  </button>
                  {(() => {
                    const ch = mercs.length < maxHireCap(roomLevels['식당'] ?? 1) && state.gold >= m.cost
                    return (
                      <button onClick={() => ch && hireMerc(m)}
                        className="flex-1 text-sm py-1.5 text-center transition hover:brightness-125 font-semibold"
                        style={{ color: ch ? 'rgba(34,197,94,0.9)' : 'rgba(100,80,30,0.45)', background: 'rgba(34,197,94,0.06)', cursor: ch ? 'pointer' : 'not-allowed' }}>
                        ⚔ 고용
                      </button>
                    )
                  })()}
                </div>`
)

// ── 7. Add refresh button to arrival header (after font patch, p uses text-sm) ──
s = s.replace(
  `          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex-1 h-px" style={{ background: 'rgba(180,100,20,0.3)' }} />
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'rgba(200,140,40,0.7)' }}>
              ✦ 용병 도착 ✦
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(180,100,20,0.3)' }} />
          </div>`,
  `          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex-1 h-px" style={{ background: 'rgba(180,100,20,0.3)' }} />
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'rgba(200,140,40,0.7)' }}>✦ 용병 도착 ✦</p>
            <div className="flex-1 h-px" style={{ background: 'rgba(180,100,20,0.3)' }} />
            <button onClick={refreshArrivals}
              className="text-sm rounded-lg px-2 py-1 font-semibold transition hover:brightness-125 flex-shrink-0"
              style={{
                background: state.gold >= ARRIVAL_REFRESH_COST ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(180,130,30,0.35)',
                color: state.gold >= ARRIVAL_REFRESH_COST ? 'rgba(251,191,36,0.85)' : 'rgba(120,90,30,0.5)'
              }}>
              🔄 {ARRIVAL_REFRESH_COST}G
            </button>
          </div>`
)

// ── 8. Quest modal: wider ────────────────────────────────────────────────────
s = s.replace(
  "style={{ width: '41%', background: 'rgba(5,5,15,0.97)', borderRight: '2px solid rgba(59,130,246,0.4)' }}",
  "style={{ width: '46%', background: 'rgba(5,5,15,0.97)', borderRight: '2px solid rgba(59,130,246,0.4)' }}"
)

// ── 9. Active quest count label: remove limit ref ───────────────────────────
s = s.replace(
  '⚔ 진행 중 {activeQuests.length}/{maxSimultaneousQuests(buildings.hall)}건',
  '⚔ 진행 중 {activeQuests.length}건'
)

// ── 10. Arrival panel: slightly taller & wider ───────────────────────────────
s = s.replace(
  "left: 10, bottom: 48, width: '38%', maxHeight: 310",
  "left: 10, bottom: 48, width: '40%', maxHeight: 360"
)

// ── 11. UI quality: improve arrival card padding ─────────────────────────────
s = s.replace(
  "                  style={{ padding: '8px 12px' }}",
  "                  style={{ padding: '10px 14px' }}"
)

// ── 12. UI quality: improve quest card header padding ───────────────────────
s = s.replace(
  '            <div className="px-3 pt-2.5 pb-2" style={{ borderBottom: \'1px solid rgba(255,255,255,0.05)\' }}>',
  '            <div className="px-4 pt-3 pb-2.5" style={{ borderBottom: \'1px solid rgba(255,255,255,0.05)\' }}>'
)

// ── verify ───────────────────────────────────────────────────────────────────
const checks = [
  ['ARRIVAL_REFRESH_COST', s.includes('ARRIVAL_REFRESH_COST')],
  ['refreshArrivals', s.includes('refreshArrivals')],
  ['hire button added', s.includes('ch && hireMerc(m)')],
  ['quest limit removed (launchQuest)', !s.includes("log('길드 홀을 업그레이드하면")],
  ['quest limit removed (canLaunch)', !s.includes('activeQuests.length < maxSimultaneousQuests')],
  ['quest modal wider', s.includes("width: '46%'")],
]
console.log('\n검증 결과:')
checks.forEach(([name, ok]) => console.log(` ${ok ? '✅' : '❌'} ${name}`))

if (s === orig) { console.error('\n⚠ 변경사항 없음 — 문자열 불일치 가능성'); process.exit(1) }

writeFileSync(fp, s, 'utf-8')
console.log('\n✅ src/App.tsx 패치 완료')
