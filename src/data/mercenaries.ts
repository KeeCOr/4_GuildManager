import type { Mercenary } from '../types'
import { DEFAULT_WEAPON } from './weapons'
export { WEAPONS, DEFAULT_WEAPON } from './weapons'
export { ALL_QUESTS } from './quests'

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
