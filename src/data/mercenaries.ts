import type { Mercenary, Quest } from '../types'
import { DEFAULT_WEAPON } from './weapons'
export { WEAPONS, DEFAULT_WEAPON } from './weapons'

export const initialMercenaries: Mercenary[] = [
  {
    id: 'm1', name: '카이강', age: 22, race: '인간', class: '전사',
    grade: 'D', power: 28, element: '불', trap_disarm: 15, condition: 90, hp: 100,
    cost: 0, deathCost: 80,
    traits: { cooperation: 65, ego: 50, gender: '남', synergy_factor: 1.0 },
    stats: { 공격력: 30, 함정해제: 15, 생존율: 35, 협조성: 65 },
    dailyWage: 18, favorability: 50, status: '대기중', room: '식당',
    level: 1, experience: 0, expToNext: 100, weaponId: 'w_w1'
  },
  {
    id: 'm2', name: '미나원', age: 19, race: '인간', class: '궁수',
    grade: 'D', power: 25, element: '자연', trap_disarm: 18, condition: 85, hp: 100,
    cost: 0, deathCost: 80,
    traits: { cooperation: 60, ego: 55, gender: '여', synergy_factor: 0.98 },
    stats: { 공격력: 28, 함정해제: 18, 생존율: 28, 협조성: 60 },
    dailyWage: 16, favorability: 50, status: '대기중', room: '식당',
    level: 1, experience: 0, expToNext: 100, weaponId: 'w_a1'
  },
  {
    id: 'm3', name: '브란성', age: 24, race: '드워프', class: '도적',
    grade: 'C', power: 42, element: '암흑', trap_disarm: 45, condition: 80, hp: 100,
    cost: 0, deathCost: 150,
    traits: { cooperation: 55, ego: 60, gender: '남', synergy_factor: 0.96 },
    stats: { 공격력: 35, 함정해제: 45, 생존율: 38, 협조성: 55 },
    dailyWage: 28, favorability: 50, status: '대기중', room: '식당',
    level: 2, experience: 80, expToNext: 200, weaponId: 'w_r1'
  },
]

export const ALL_QUESTS: Quest[] = [
  {
    id: 'q1', name: '쥐 사냥', difficulty: 30, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.01, conditionDrain: 8, dailyGoldCost: 2, element: '자연', trapFocus: false,
    description: '마을 창고를 침입한 쥐 떼를 제거합니다. 초보에게 적합.',
    reward: { gold: 22, food: 8, fame: 2, exp: 15 }
  },
  {
    id: 'q2', name: '야간 경비', difficulty: 50, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.02, conditionDrain: 10, dailyGoldCost: 3, element: '암흑', trapFocus: false,
    description: '마을 외곽 야간 순찰 및 경비 임무입니다.',
    reward: { gold: 38, food: 12, fame: 3, exp: 20 }
  },
  {
    id: 'q3', name: '상인 호위', difficulty: 85, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.04, conditionDrain: 12, dailyGoldCost: 5, element: '자연', trapFocus: false,
    description: '인근 도시까지 상인 일행을 호위합니다.',
    reward: { gold: 68, food: 18, fame: 5, exp: 30 }
  },
  {
    id: 'q4', name: '도둑단 소탕', difficulty: 150, slots: 4, minSlots: 2, duration: 3,
    deathRisk: 0.08, conditionDrain: 18, dailyGoldCost: 8, element: '불', trapFocus: false,
    description: '주변을 위협하는 도둑단을 소탕합니다. C급 이상 권장.',
    reward: { gold: 135, food: 28, fame: 10, exp: 50 }
  },
  {
    id: 'q5', name: '광산 함정 해제', difficulty: 180, slots: 4, minSlots: 2, duration: 3,
    deathRisk: 0.1, conditionDrain: 20, dailyGoldCost: 10, element: '암흑', trapFocus: true,
    description: '버려진 광산에서 함정을 해제하고 자원을 회수합니다. 도적·함정해제 권장.',
    reward: { gold: 195, food: 15, fame: 12, exp: 60 }
  },
  {
    id: 'q6', name: '밀수단 추적', difficulty: 260, slots: 4, minSlots: 2, duration: 4,
    deathRisk: 0.12, conditionDrain: 22, dailyGoldCost: 12, element: '번개', trapFocus: false,
    description: '왕국 물자를 횡령한 밀수단을 추적 체포합니다. B급 이상 권장.',
    reward: { gold: 285, food: 38, fame: 18, exp: 80 }
  },
  {
    id: 'q7', name: '귀족 저택 장기 경비', difficulty: 300, slots: 4, minSlots: 2, duration: 5,
    deathRisk: 0.08, conditionDrain: 15, dailyGoldCost: 15, element: '빛', trapFocus: false,
    description: '귀족 저택에서 장기 경비 임무를 수행합니다. B급 이상 권장.',
    reward: { gold: 430, food: 22, fame: 22, exp: 90 }
  },
  {
    id: 'q8', name: '던전 탐사', difficulty: 420, slots: 4, minSlots: 3, duration: 6,
    deathRisk: 0.2, conditionDrain: 28, dailyGoldCost: 20, element: '암흑', trapFocus: true,
    description: '심층 던전에서 유물을 회수합니다. A급 이상 권장. 함정해제 필수.',
    reward: { gold: 660, food: 55, fame: 35, exp: 140 }
  },
  {
    id: 'q9', name: '북방 약탈자 토벌', difficulty: 520, slots: 4, minSlots: 3, duration: 5,
    deathRisk: 0.18, conditionDrain: 25, dailyGoldCost: 20, element: '얼음', trapFocus: false,
    description: '북방 대규모 약탈자 집단을 격멸합니다. A급 이상 권장.',
    reward: { gold: 800, food: 75, fame: 45, exp: 160 }
  },
  {
    id: 'q10', name: '드래곤 토벌', difficulty: 700, slots: 4, minSlots: 4, duration: 8,
    deathRisk: 0.35, conditionDrain: 40, dailyGoldCost: 35, element: '불', trapFocus: false,
    description: '대륙 최강 드래곤을 토벌합니다. S급 필요. 극고위험.',
    reward: { gold: 1500, food: 120, fame: 100, exp: 300 }
  },

  // ── 추가 퀘스트 (직군·원소 다양화) ──────────────────────────────────

  // Lv1 tier (난이도 ≤120) ─ 빛/얼음 보강
  {
    id: 'q11', name: '마을 치유 봉사', difficulty: 55, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.01, conditionDrain: 5, dailyGoldCost: 2, element: '빛', trapFocus: false,
    description: '역병이 도는 마을에서 부상자를 치료하고 돌봅니다. 성직자가 있으면 회복 효율이 크게 높아집니다.',
    reward: { gold: 30, food: 15, fame: 3, exp: 18 }
  },
  {
    id: 'q12', name: '얼음 동굴 수색', difficulty: 90, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.03, conditionDrain: 14, dailyGoldCost: 4, element: '얼음', trapFocus: false,
    description: '마을 근처 얼음 동굴에서 실종자를 수색합니다. 혹한의 환경이라 생존율과 컨디션 관리가 중요합니다.',
    reward: { gold: 60, food: 20, fame: 4, exp: 28 }
  },

  // Lv2 tier (난이도 121~210) ─ 자연 함정 / 번개 원소 보강
  {
    id: 'q13', name: '독숲 정찰', difficulty: 145, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.06, conditionDrain: 18, dailyGoldCost: 7, element: '자연', trapFocus: true,
    description: '독가스와 함정이 가득한 마법 숲을 정찰합니다. 궁수의 원거리 능력과 도적의 함정해제가 시너지를 이룹니다.',
    reward: { gold: 120, food: 22, fame: 7, exp: 46 }
  },
  {
    id: 'q14', name: '번개 정령 포획', difficulty: 185, slots: 4, minSlots: 2, duration: 3,
    deathRisk: 0.08, conditionDrain: 18, dailyGoldCost: 9, element: '번개', trapFocus: false,
    description: '폭주하는 번개 정령을 포획해 마법사 조합에 납품합니다. 마법사의 주문이 제어에 결정적입니다.',
    reward: { gold: 170, food: 18, fame: 10, exp: 58 }
  },

  // Lv3 tier (난이도 211~330) ─ 얼음 / 빛 원소 보강
  {
    id: 'q15', name: '설원 요새 탈환', difficulty: 245, slots: 4, minSlots: 2, duration: 4,
    deathRisk: 0.10, conditionDrain: 24, dailyGoldCost: 11, element: '얼음', trapFocus: false,
    description: '얼음 마족에게 점령된 요새를 탈환합니다. 혹한 속 장기전이라 성직자의 회복 지원이 핵심입니다.',
    reward: { gold: 265, food: 42, fame: 16, exp: 78 }
  },
  {
    id: 'q16', name: '성소 수호 임무', difficulty: 285, slots: 4, minSlots: 2, duration: 4,
    deathRisk: 0.09, conditionDrain: 16, dailyGoldCost: 13, element: '빛', trapFocus: false,
    description: '어둠의 세력이 침범하는 성소에서 사제들을 수호합니다. 성직자의 빛 속성이 큰 우위를 가져옵니다.',
    reward: { gold: 325, food: 30, fame: 20, exp: 88 }
  },

  // Lv4 tier (난이도 331~560) ─ 번개 함정 / 얼음 극한
  {
    id: 'q17', name: '마법사 탑 잠입', difficulty: 390, slots: 4, minSlots: 2, duration: 5,
    deathRisk: 0.15, conditionDrain: 26, dailyGoldCost: 18, element: '번개', trapFocus: true,
    description: '마법 함정이 가득한 탑에 잠입해 금지된 마법서를 회수합니다. 마법사와 도적의 조합이 이상적입니다.',
    reward: { gold: 580, food: 50, fame: 30, exp: 130 }
  },
  {
    id: 'q18', name: '빙원 극지 원정', difficulty: 490, slots: 4, minSlots: 3, duration: 6,
    deathRisk: 0.16, conditionDrain: 32, dailyGoldCost: 22, element: '얼음', trapFocus: false,
    description: '극지방 빙원을 원정하며 고대 유물을 수습합니다. 극한의 소모전이라 성직자 치유와 전사 방어가 필수입니다.',
    reward: { gold: 720, food: 80, fame: 40, exp: 155 }
  },
]

// ── Generator helpers ─────────────────────────────

const NAMES_FIRST = ['다린', '에스텔', '브란', '테오', '미나', '아이샤', '카이', '라인', '로웬', '율리', '아란', '세린', '고란', '에르빈']
const NAMES_LAST = ['강', '원', '윤', '현', '성', '유', '빈', '센트', '솔', '아스', '블레', '혼']

export const randomName = () =>
  NAMES_FIRST[Math.floor(Math.random() * NAMES_FIRST.length)] +
  NAMES_LAST[Math.floor(Math.random() * NAMES_LAST.length)]

export const RACE_LIST = ['엘프', '인간', '드워프', '수인'] as const
export const CLASS_LIST: Mercenary['class'][] = ['궁수', '성직자', '도적', '마법사', '전사']

export const CLASS_PROFILES: Record<Mercenary['class'], { atk: number; trap: number; surv: number; cost: number }> = {
  궁수: { atk: 1.3, trap: 0.8, surv: 1.0, cost: 1.05 },
  성직자: { atk: 0.75, trap: 1.0, surv: 1.25, cost: 1.25 },
  도적: { atk: 0.9, trap: 1.4, surv: 0.95, cost: 0.95 },
  마법사: { atk: 1.35, trap: 1.0, surv: 0.9, cost: 1.3 },
  전사: { atk: 1.05, trap: 0.9, surv: 1.2, cost: 1.1 },
}

export const RACE_MODS = {
  // atkBonus/trapBonus/survBonus: 직접 스탯 가감, hpBonus: 기본 HP 가감
  엘프:   { cost: 1.0, cooperation: 48, synergy: -6,  atkBonus:  0, trapBonus: 8,  survBonus: -5, hpBonus: -10 },
  인간:   { cost: 1.0, cooperation: 70, synergy:  4,  atkBonus:  3, trapBonus: 2,  survBonus:  2, hpBonus:   5 },
  드워프: { cost: 1.5, cooperation: 60, synergy: -2,  atkBonus:  5, trapBonus: -5, survBonus: 10, hpBonus:  15 },
  수인:   { cost: 0.9, cooperation: 55, synergy: -4,  atkBonus:  8, trapBonus:  3, survBonus: -5, hpBonus:  -5 },
} as const

// 종족 능력치 설명 (UI 표시용)
export const RACE_BONUS_DESC: Record<string, string> = {
  엘프:   '함정해제 +8 · 생존율 -5 · HP -10',
  인간:   '공격력 +3 · 함정해제 +2 · 생존율 +2 · HP +5',
  드워프: '공격력 +5 · 생존율 +10 · HP +15 · 함정해제 -5',
  수인:   '공격력 +8 · 함정해제 +3 · 생존율 -5 · HP -5',
}

// 직업별 속성 가중치 (같은 직업도 다양한 속성 보유 가능)
const ELEMENT_WEIGHTS: Record<Mercenary['class'], [Mercenary['element'], number][]> = {
  전사:   [['불', 5], ['얼음', 2], ['번개', 2], ['자연', 1], ['암흑', 0], ['빛', 0]],
  궁수:   [['불', 0], ['얼음', 1], ['번개', 2], ['자연', 5], ['암흑', 1], ['빛', 1]],
  도적:   [['불', 0], ['얼음', 1], ['번개', 2], ['자연', 1], ['암흑', 5], ['빛', 1]],
  마법사: [['불', 2], ['얼음', 3], ['번개', 3], ['자연', 0], ['암흑', 2], ['빛', 0]],
  성직자: [['불', 0], ['얼음', 2], ['번개', 0], ['자연', 2], ['암흑', 1], ['빛', 5]],
}

function pickElement(cls: Mercenary['class']): Mercenary['element'] {
  const entries = ELEMENT_WEIGHTS[cls]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * total
  for (const [el, w] of entries) { roll -= w; if (roll <= 0) return el }
  return entries[0][0]
}

const GRADE_STAT_TOTALS = { D: 42, C: 58, B: 72, A: 86, S: 102 } as const
const DEATH_COSTS = { D: 80, C: 150, B: 280, A: 500, S: 1000 } as const
const EXP_TO_NEXT = (level: number) => level * 100

// Grade weights per tavern level (index 0 = no tavern)
export const GRADE_WEIGHTS = [
  { D: 65, C: 30, B: 5, A: 0, S: 0 },  // tavern lv 0
  { D: 60, C: 35, B: 5, A: 0, S: 0 },  // tavern lv 1
  { D: 40, C: 40, B: 18, A: 2, S: 0 }, // tavern lv 2
  { D: 25, C: 35, B: 28, A: 11, S: 1 },// tavern lv 3
  { D: 15, C: 25, B: 30, A: 25, S: 5 },// tavern lv 4
]

function pickGrade(tavernLevel: number): Mercenary['grade'] {
  const weights = GRADE_WEIGHTS[Math.min(tavernLevel, 4)]
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (const [grade, w] of Object.entries(weights)) {
    roll -= w
    if (roll <= 0) return grade as Mercenary['grade']
  }
  return 'D'
}

function allocateStats(total: number, cls: Mercenary['class']) {
  const p = CLASS_PROFILES[cls]
  const raw = [p.atk, p.trap, p.surv].map(w => Math.max(0.7, Math.random()) * w)
  const sum = raw.reduce((a, b) => a + b, 0)
  const vals = raw.map(w => Math.max(8, Math.round((w / sum) * total)))
  let cur = vals.reduce((a, b) => a + b, 0)
  let i = 0
  while (cur < total) { vals[i]++; cur++; i = (i + 1) % 3 }
  while (cur > total) { if (vals[i] > 8) { vals[i]--; cur-- } i = (i + 1) % 3 }
  return { 공격력: vals[0], 함정해제: vals[1], 생존율: vals[2] }
}

export function generateMercenary(tavernLevel = 0): Mercenary {
  const race = RACE_LIST[Math.floor(Math.random() * RACE_LIST.length)]
  const cls = CLASS_LIST[Math.floor(Math.random() * CLASS_LIST.length)]
  const grade = pickGrade(tavernLevel)
  const statTotal = GRADE_STAT_TOTALS[grade]
  const raceMod = RACE_MODS[race]
  const cooperation = Math.max(30, Math.min(88, Math.round(raceMod.cooperation + (Math.random() * 14 - 7))))
  const rawCombat = allocateStats(statTotal, cls)
  // 종족 스탯 보너스/페널티 적용
  const combat = {
    공격력:   Math.max(8, rawCombat.공격력   + raceMod.atkBonus),
    함정해제: Math.max(0, rawCombat.함정해제 + raceMod.trapBonus),
    생존율:   Math.max(8, rawCombat.생존율   + raceMod.survBonus),
  }
  const stats = { ...combat, 협조성: cooperation }
  const power = Math.max(20, Math.round(
    combat.공격력 * 0.55 + combat.생존율 * 0.25 + combat.함정해제 * 0.12 +
    ['D','C','B','A','S'].indexOf(grade) * 12 +
    (cls === '마법사' ? 4 : 0)
  ))
  const clsP = CLASS_PROFILES[cls]
  const gradeIdx = ['D','C','B','A','S'].indexOf(grade)
  const rawCost = Math.round(
    (power * 1.2 + gradeIdx * 15 + cooperation * 0.5)
    * raceMod.cost * clsP.cost
  )
  const cost = gradeIdx === 0 ? 0
    : gradeIdx === 1 ? Math.min(20, Math.max(0, Math.round(rawCost * 0.15)))
    : Math.max(50, rawCost)
  const dailyWage = Math.max(12, Math.round(cost * 0.07 + ['D','C','B','A','S'].indexOf(grade) * 5))

  return {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: randomName(),
    age: Math.floor(Math.random() * 28) + 18,
    race, class: cls, grade, power,
    element: pickElement(cls),
    trap_disarm: (cls === '궁수' || cls === '도적') ? Math.round(combat.함정해제 * (cls === '도적' ? 1.1 : 1)) : 0,
    condition: 100, hp: Math.max(50, 100 + raceMod.hpBonus), cost, deathCost: DEATH_COSTS[grade],
    traits: {
      cooperation,
      ego: Math.floor(Math.random() * 41) + 45,
      gender: Math.random() < 0.5 ? '남' : '여',
      synergy_factor: Number((1 + raceMod.synergy * 0.01 + (Math.random() - 0.5) * 0.08).toFixed(2))
    },
    stats, dailyWage,
    favorability: 50,
    status: '대기중', room: '식당',
    level: 1, experience: 0, expToNext: EXP_TO_NEXT(1),
    weaponId: DEFAULT_WEAPON[cls]
  }
}

export { EXP_TO_NEXT }
