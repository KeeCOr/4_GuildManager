import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const fp = resolve('src/App.tsx')
let s = readFileSync(fp, 'utf-8')

// ── 1. Add tutorialStep state ────────────────────────────────────────────────
s = s.replace(
  "  const [showTutorial, setShowTutorial] = useState(true)",
  `  const [showTutorial, setShowTutorial] = useState(true)
  const [tutorialStep, setTutorialStep] = useState(0)`
)

// ── 2. Add TUTORIAL_STEPS constant (after BUILDING_INFO block) ───────────────
const tutorialStepsCode = `
// ── Tutorial steps ─────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    icon: '🌑',
    tag: '세계관',
    title: '중세 암흑 판타지의 세계',
    body: [
      '험준한 산맥과 마족의 영토가 맞닿은 요새 도시 — 아이언홀드.',
      '이 땅에는 전쟁, 야수, 함정, 부패한 귀족들이 끊임없이 용병을 필요로 한다.',
      '당신은 도시 변두리의 낡은 건물을 사들여 용병단 길드를 세웠다.',
      '아직 이름도 없는 작은 길드지만, 언젠가 이 땅에서 가장 강력한 용병단이 될 것이다.',
    ],
    tips: [],
    image: '🏚→🏰',
  },
  {
    icon: '🎯',
    tag: '목표',
    title: '당신의 목표',
    body: [
      '계약을 수행하고, 명성을 쌓고, 길드를 성장시켜라.',
      '드래곤 토벌까지 — 살아남을 수 있다면.',
    ],
    tips: [
      '명성(⭐)을 쌓아 길드 레벨을 올리세요',
      '금화(💰)로 건물을 짓고 더 강한 용병을 유치하세요',
      '용병이 죽으면 장례 보상금이 차감됩니다 — 무모한 파견은 금물',
    ],
    image: '⭐',
  },
  {
    icon: '🚶',
    tag: '용병 고용',
    title: '용병 고용하기',
    body: [
      '며칠마다 새 용병들이 길드 문 앞에 찾아옵니다.',
      '화면 왼쪽 하단의 도착 패널에서 확인하세요.',
    ],
    tips: [
      '카드 클릭 → 상세 정보 확인',
      '카드 하단 [⚔ 고용] → 즉시 고용 / [✕ 거절] → 패스',
      'D·C급은 무료 or 소액, 고등급일수록 비쌉니다',
      '🔄 50G로 즉시 새 용병 목록을 새로고침할 수 있습니다',
      '종족마다 특화 능력치가 다릅니다 — 드워프는 생존력, 엘프는 함정해제',
    ],
    image: '🚶→🏰',
  },
  {
    icon: '📜',
    tag: '퀘스트',
    title: '계약 수행하기',
    body: [
      '[계약 관리] 버튼을 눌러 수주 가능한 계약 목록을 확인하세요.',
      '용병을 배치하고 파견하면 실시간으로 진행됩니다.',
    ],
    tips: [
      '용병 클릭 → 선택, 슬롯 클릭 or 드래그로 배치',
      '속성 일치(✦)가 강력한 보너스를 줍니다',
      '성직자는 파티 전체 생존율을 높입니다',
      '전력이 부족해도 파견 가능하지만 위험합니다',
      '함정 퀘스트(🔧)는 도적·궁수의 함정해제 능력이 필수',
    ],
    image: '⚔',
  },
  {
    icon: '💰',
    tag: '경제',
    title: '경제와 자원 관리',
    body: [
      '금화와 식량, 사기를 동시에 관리해야 합니다.',
      '자원이 고갈되면 용병들의 컨디션과 사기가 급락합니다.',
    ],
    tips: [
      '식량(🌾): 용병 1명당 하루 5씩 소비 — 파견 중엔 추가 소비',
      '금화(💰): 건물 건설, 무기 업그레이드, 새로고침에 사용',
      '병영↑ → 더 많은 용병이 자주 도착',
      '선술집↑ → 더 높은 등급 용병 등장',
      '의무소↑ → 부상·컨디션 빠른 회복',
    ],
    image: '💰🌾',
  },
  {
    icon: '📈',
    tag: '성장',
    title: '용병 성장과 전략',
    body: [
      '용병은 퀘스트와 훈련을 통해 성장합니다.',
      '룸 배치와 무기 업그레이드로 전투력을 극대화하세요.',
    ],
    tips: [
      '퀘스트 성공 → 경험치 → 레벨업 → 모든 능력치 상승',
      '길드마스터룸 배치 → 호감도↑ → 실효 전력↑',
      '훈련소 배치 → 매일 XP 획득',
      '무기 업그레이드(용병 상세 화면) → 공격/함정/생존 보정',
      '빛(✨) 속성은 파티 전체 생존율, 자연(🌿)은 개인 생존율 강화',
    ],
    image: '⬆',
  },
]

`

// Insert before "// ── Building definitions ──"
s = s.replace(
  "// ── Building definitions ───────────────────────────────────────────────────",
  tutorialStepsCode + "// ── Building definitions ───────────────────────────────────────────────────"
)

// ── 3. Replace tutorial modal JSX ───────────────────────────────────────────
const oldTutorial = `      {/* Tutorial */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6" style={{ background: '#13131f', border: '1px solid rgba(251,191,36,0.25)' }}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-white">🏰 용병단 길드 운영 가이드</h2>
              <button onClick={() => setShowTutorial(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
              {[
                ['📋 계약 수행', '퀘스트에 용병을 배치해 파견하세요. 여러 계약을 동시에 진행할 수 있습니다.'],
                ['💀 사망 비용', '퀘스트 실패 시 용병이 전사할 수 있습니다. 장례 보상금이 차감됩니다.'],
                ['📈 성장 시스템', '퀘스트 성공 시 경험치를 획득해 레벨업합니다. 저급 용병도 육성 가능!'],
                ['🏥 컨디션', '컨디션이 낮으면 실제 전투력이 하락합니다. 의무소를 지어 회복시키세요.'],
                ['🚶 용병 도착', '며칠마다 새 용병이 문 앞에 도착합니다. 병영을 업그레이드하면 자주, 많이 옵니다.'],
                ['🏗 건물 확장', '금화로 건물을 건설·업그레이드하면 더 좋은 용병, 더 많은 계약이 가능합니다.'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="font-bold text-white mb-1">{title}</p>
                  <p className="text-sm text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTutorial(false)}
              className="mt-5 w-full rounded-xl py-2.5 font-bold text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
              시작하기
            </button>
          </div>
        </div>
      )}`

const newTutorial = `      {/* Tutorial — multi-step */}
      {showTutorial && (() => {
        const step = TUTORIAL_STEPS[tutorialStep]
        const isLast = tutorialStep === TUTORIAL_STEPS.length - 1
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#0d0b1c', border: '1px solid rgba(120,80,200,0.35)', boxShadow: '0 0 60px rgba(80,40,160,0.2)', maxHeight: '90vh' }}>

              {/* Progress bar */}
              <div className="flex flex-shrink-0" style={{ height: 4 }}>
                {TUTORIAL_STEPS.map((_, i) => (
                  <div key={i} className="flex-1 transition-all duration-500"
                    style={{ background: i <= tutorialStep ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)' }} />
                ))}
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{step.icon}</span>
                  <div>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(120,80,200,0.25)', color: '#c4b5fd', border: '1px solid rgba(120,80,200,0.4)' }}>
                      {tutorialStep + 1} / {TUTORIAL_STEPS.length} — {step.tag}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1">{step.title}</h2>
                  </div>
                </div>
                <button onClick={() => setShowTutorial(false)}
                  className="text-slate-500 hover:text-white text-xl leading-none flex-shrink-0 ml-4">×</button>
              </div>

              {/* Body */}
              <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
                {/* Story text */}
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {step.body.map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgba(200,190,170,0.85)' }}>{line}</p>
                  ))}
                </div>
                {/* Tips */}
                {step.tips.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold" style={{ color: 'rgba(180,140,60,0.8)' }}>핵심 포인트</p>
                    <div className="space-y-1.5">
                      {step.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2"
                          style={{ background: 'rgba(120,80,200,0.08)', border: '1px solid rgba(120,80,200,0.18)' }}>
                          <span className="text-purple-400 font-bold flex-shrink-0 text-sm mt-0.5">›</span>
                          <p className="text-sm" style={{ color: 'rgba(190,180,210,0.85)' }}>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-6 py-4 flex-shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {tutorialStep > 0 && (
                  <button onClick={() => setTutorialStep(s => s - 1)}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-125"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(160,150,180,0.8)' }}>
                    ← 이전
                  </button>
                )}
                <button onClick={() => setShowTutorial(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-125"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(120,120,120,0.6)' }}>
                  건너뛰기
                </button>
                <div className="flex-1" />
                {!isLast ? (
                  <button onClick={() => setTutorialStep(s => s + 1)}
                    className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#5b21b6,#7c3aed)', boxShadow: '0 0 16px rgba(124,58,237,0.35)' }}>
                    다음 →
                  </button>
                ) : (
                  <button onClick={() => { setShowTutorial(false); setTutorialStep(0) }}
                    className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#b45309,#d97706)', boxShadow: '0 0 16px rgba(217,119,6,0.35)' }}>
                    🏰 길드 운영 시작!
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}`

s = s.replace(oldTutorial, newTutorial)

// Verify
const checks = [
  ['TUTORIAL_STEPS defined', s.includes('const TUTORIAL_STEPS = [')],
  ['tutorialStep state added', s.includes('tutorialStep, setTutorialStep')],
  ['old tutorial removed', !s.includes('용병단 길드 운영 가이드')],
  ['new tutorial added', s.includes('tutorialStep === TUTORIAL_STEPS.length - 1')],
  ['multi-step progress bar', s.includes('i <= tutorialStep')],
]
console.log('\n검증:')
checks.forEach(([n, ok]) => console.log(` ${ok ? '✅' : '❌'} ${n}`))

writeFileSync(fp, s, 'utf-8')
console.log('\n✅ 튜토리얼 패치 완료')
