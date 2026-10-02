import type { MercPassive, PassiveSynergy } from '../types'

// ── 패시브 풀 ──────────────────────────────────────────────────────────────
export const PASSIVE_POOL: MercPassive[] = [
  { id: 'strong_body',   name: '강인한 체력',  desc: '생존율 +6',                powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 6,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'battle_inst',   name: '전투 본능',    desc: '공격력 +6',                powerBonus: 0, atkBonus: 6, trapBonus: 0, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'trap_sense',    name: '함정 직감',    desc: '함정해제 +8',              powerBonus: 0, atkBonus: 0, trapBonus: 8, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'iron_will',     name: '철의 의지',    desc: '생존율 +4, 사망률 -5%',    powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 4,  hpBonus: 0,  deathRiskMod: -0.05, xpMod: 0    },
  { id: 'warrior_soul',  name: '투사의 혼',    desc: '전투력 +4, 공격력 +3',     powerBonus: 4, atkBonus: 3, trapBonus: 0, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'keen_eye',      name: '예리한 눈',    desc: '공격력 +3, 함정해제 +5',   powerBonus: 0, atkBonus: 3, trapBonus: 5, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'steel_body',    name: '강철 신체',    desc: '생존율 +8, HP +10',        powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 8,  hpBonus: 10, deathRiskMod: 0,     xpMod: 0    },
  { id: 'tenacity',      name: '불굴',         desc: '사망률 -8%',               powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 0,  hpBonus: 0,  deathRiskMod: -0.08, xpMod: 0    },
  { id: 'expert',        name: '숙련자',       desc: '경험치 획득 +15%',         powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0.15 },
  { id: 'bravery',       name: '용맹',         desc: '전투력 +3, 사망률 -4%',   powerBonus: 3, atkBonus: 0, trapBonus: 0, survBonus: 0,  hpBonus: 0,  deathRiskMod: -0.04, xpMod: 0    },
  { id: 'endurance',     name: '지구력',       desc: '생존율 +5, 공격력 +2',    powerBonus: 0, atkBonus: 2, trapBonus: 0, survBonus: 5,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'instinct',      name: '전투 직감',    desc: '전투력 +5, 함정해제 +3',  powerBonus: 5, atkBonus: 0, trapBonus: 3, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0    },
  { id: 'resilience',    name: '회복력',       desc: 'HP +20, 사망률 -3%',      powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 0,  hpBonus: 20, deathRiskMod: -0.03, xpMod: 0    },
  { id: 'veteran',       name: '노련함',       desc: '모든 스탯 +2, 경험치 +8%', powerBonus: 2, atkBonus: 2, trapBonus: 2, survBonus: 2,  hpBonus: 0,  deathRiskMod: 0,     xpMod: 0.08 },
  { id: 'shadow_step',   name: '그림자 발걸음', desc: '함정해제 +6, 사망률 -5%', powerBonus: 0, atkBonus: 0, trapBonus: 6, survBonus: 0,  hpBonus: 0,  deathRiskMod: -0.05, xpMod: 0    },
  { id: 'battle_fury',   name: '전투 광기',    desc: '공격력 +8, 사망률 +5%',   powerBonus: 0, atkBonus: 8, trapBonus: 0, survBonus: 0,  hpBonus: 0,  deathRiskMod: 0.05,  xpMod: 0    },
]

// ── 패시브 시너지 ─────────────────────────────────────────────────────────
export const PASSIVE_SYNERGIES: PassiveSynergy[] = [
  { passiveIds: ['strong_body', 'iron_will'],   desc: '강인한 의지: 생존율 +5, 사망률 추가 -4%', powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 5,  deathRiskMod: -0.04 },
  { passiveIds: ['battle_inst', 'warrior_soul'], desc: '전사의 영혼: 공격력 +4, 전투력 +3',     powerBonus: 3, atkBonus: 4, trapBonus: 0, survBonus: 0,  deathRiskMod: 0     },
  { passiveIds: ['steel_body', 'tenacity'],      desc: '불멸의 육체: HP +15, 사망률 추가 -6%',   powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 0,  deathRiskMod: -0.06 },
  { passiveIds: ['trap_sense', 'keen_eye'],      desc: '예민한 직감: 함정해제 +6',               powerBonus: 0, atkBonus: 0, trapBonus: 6, survBonus: 0,  deathRiskMod: 0     },
  { passiveIds: ['bravery', 'battle_fury'],      desc: '광전사: 공격력 +5, 사망률 -3% (위험·용맹 상쇄)', powerBonus: 0, atkBonus: 5, trapBonus: 0, survBonus: 0, deathRiskMod: -0.03 },
  { passiveIds: ['expert', 'veteran'],           desc: '대가: 경험치 +10% 추가',                 powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 0,  deathRiskMod: 0     },
  { passiveIds: ['endurance', 'resilience'],     desc: '철벽 체력: 생존율 +4, HP +10',           powerBonus: 0, atkBonus: 0, trapBonus: 0, survBonus: 4,  deathRiskMod: 0     },
  { passiveIds: ['instinct', 'shadow_step'],     desc: '암살 직감: 함정해제 +4, 전투력 +3',     powerBonus: 3, atkBonus: 0, trapBonus: 4, survBonus: 0,  deathRiskMod: 0     },
]

export const findPassive = (id: string): MercPassive | undefined =>
  PASSIVE_POOL.find(p => p.id === id)

/** 용병의 모든 패시브+시너지 합산 스탯 보너스 */
export function getMercPassiveStats(passiveIds: string[]): {
  powerBonus: number; atkBonus: number; trapBonus: number
  survBonus: number; hpBonus: number; deathRiskMod: number; xpMod: number
} {
  let powerBonus = 0, atkBonus = 0, trapBonus = 0, survBonus = 0
  let hpBonus = 0, deathRiskMod = 0, xpMod = 0

  for (const id of passiveIds) {
    const p = findPassive(id)
    if (!p) continue
    powerBonus += p.powerBonus; atkBonus += p.atkBonus
    trapBonus  += p.trapBonus;  survBonus += p.survBonus
    hpBonus    += p.hpBonus;    deathRiskMod += p.deathRiskMod
    xpMod      += p.xpMod
  }

  // 시너지 효과
  const idSet = new Set(passiveIds)
  for (const syn of PASSIVE_SYNERGIES) {
    if (idSet.has(syn.passiveIds[0]) && idSet.has(syn.passiveIds[1])) {
      powerBonus += syn.powerBonus; atkBonus += syn.atkBonus
      trapBonus  += syn.trapBonus;  survBonus += syn.survBonus
      deathRiskMod += syn.deathRiskMod
    }
  }

  return { powerBonus, atkBonus, trapBonus, survBonus, hpBonus, deathRiskMod, xpMod }
}

/** 등급에 따른 초기 패시브 슬롯 수 */
export const GRADE_PASSIVE_SLOTS: Record<string, number> = { D: 1, C: 2, B: 3, A: 4, S: 5 }

/** 랜덤 패시브 ID 선택 (이미 보유한 것 제외) */
export function pickRandomPassive(existing: string[]): string | null {
  const available = PASSIVE_POOL.filter(p => !existing.includes(p.id))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)].id
}
