import type { Mercenary, MercenaryGrade, Potential } from '../types'

const GRADE_ORDER: MercenaryGrade[] = ['D', 'C', 'B', 'A', 'S']
const gradeIndex = (g: MercenaryGrade) => GRADE_ORDER.indexOf(g)

/** 생성 시 잠재력 결정 — 현재 등급에서 0~2단계 위 */
export function rollPotential(currentGrade: MercenaryGrade): Potential {
  const idx = gradeIndex(currentGrade)
  const maxIdx = Math.min(4, idx + Math.floor(Math.random() * 3))
  return { maxGrade: GRADE_ORDER[maxIdx], revealed: false, awakened: false }
}

/** 마석 1개로 잠재력 강제 공개 */
export function revealPotential(m: Mercenary): Mercenary {
  return { ...m, potential: { ...m.potential, revealed: true } }
}

/** 마석 3개로 잠재력 리롤 */
export function rerollPotential(m: Mercenary): Mercenary {
  return { ...m, potential: rollPotential(m.grade) }
}

/** 마석 5개로 강제 각성 */
export function forceAwaken(m: Mercenary): Mercenary {
  if (m.potential.awakened) return m
  if (gradeIndex(m.grade) >= gradeIndex(m.potential.maxGrade)) return m
  const newGrade = m.potential.maxGrade
  const statBoost = (gradeIndex(newGrade) - gradeIndex(m.grade)) * 8
  const deathCosts: Record<MercenaryGrade, number> = { D: 80, C: 150, B: 280, A: 500, S: 1000 }
  return {
    ...m,
    grade: newGrade,
    power: m.power + statBoost,
    deathCost: deathCosts[newGrade],
    stats: {
      공격력: m.stats.공격력 + statBoost,
      함정해제: m.stats.함정해제 + Math.floor(statBoost * 0.7),
      생존율: m.stats.생존율 + Math.floor(statBoost * 0.7),
      협조성: m.stats.협조성 + Math.floor(statBoost * 0.3),
    },
    potential: { ...m.potential, awakened: true, revealed: true },
  }
}

/** 레벨업 시 잠재력 자동 공개 체크 (Lv5+) */
export function checkPotentialReveal(m: Mercenary): Mercenary {
  if (!m.potential.revealed && m.level >= 5) {
    return { ...m, potential: { ...m.potential, revealed: true } }
  }
  return m
}
