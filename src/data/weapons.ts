import type { Weapon, MercenaryClass } from '../types'

export const WEAPONS: Weapon[] = [
  // ── 전사 (강철 계열) ──
  { id: 'w_w1', name: '낡은 검',    icon: '🗡',  class: '전사', tier: 1, powerBonus: 0,  atkBonus: 0,  trapBonus: 0, survBonus: 0, upgradeCost: 100, raceBonus: { 드워프: 2, 수인: 1, 인간: 1 } },
  { id: 'w_w2', name: '강철 대검',  icon: '⚔',  class: '전사', tier: 2, powerBonus: 5,  atkBonus: 4,  trapBonus: 0, survBonus: 0, upgradeCost: 260, raceBonus: { 드워프: 4, 수인: 2, 인간: 1 } },
  { id: 'w_w3', name: '영웅의 검',  icon: '⚜',  class: '전사', tier: 3, powerBonus: 12, atkBonus: 10, trapBonus: 0, survBonus: 3, upgradeCost: 0,   raceBonus: { 드워프: 5, 수인: 3, 인간: 2 } },
  // ── 궁수 (원거리 계열) ──
  { id: 'w_a1', name: '낡은 단궁',  icon: '🏹',  class: '궁수', tier: 1, powerBonus: 0,  atkBonus: 0,  trapBonus: 0, survBonus: 0, upgradeCost: 90,  raceBonus: { 엘프: 2, 인간: 1 } },
  { id: 'w_a2', name: '장궁',       icon: '🏹',  class: '궁수', tier: 2, powerBonus: 5,  atkBonus: 4,  trapBonus: 4, survBonus: 0, upgradeCost: 240, raceBonus: { 엘프: 4, 인간: 1 } },
  { id: 'w_a3', name: '황금 석궁',  icon: '🎯',  class: '궁수', tier: 3, powerBonus: 12, atkBonus: 9,  trapBonus: 9, survBonus: 0, upgradeCost: 0,   raceBonus: { 엘프: 5, 인간: 2 } },
  // ── 도적 (은밀 계열) ──
  { id: 'w_r1', name: '낡은 단검',  icon: '🔪',  class: '도적', tier: 1, powerBonus: 0,  atkBonus: 0,  trapBonus: 0,  survBonus: 0, upgradeCost: 85,  raceBonus: { 수인: 2, 인간: 1 } },
  { id: 'w_r2', name: '독 단검',    icon: '💉',  class: '도적', tier: 2, powerBonus: 5,  atkBonus: 3,  trapBonus: 8,  survBonus: 0, upgradeCost: 220, raceBonus: { 수인: 4, 인간: 1 } },
  { id: 'w_r3', name: '그림자 칼날', icon: '🌑', class: '도적', tier: 3, powerBonus: 12, atkBonus: 7,  trapBonus: 18, survBonus: 0, upgradeCost: 0,   raceBonus: { 수인: 5, 인간: 2 } },
  // ── 마법사 (마법 계열) ──
  { id: 'w_m1', name: '낡은 지팡이', icon: '🪄', class: '마법사', tier: 1, powerBonus: 0,  atkBonus: 0,  trapBonus: 0, survBonus: 0, upgradeCost: 100, raceBonus: { 엘프: 2, 인간: 1 } },
  { id: 'w_m2', name: '수정 완드',   icon: '🔮', class: '마법사', tier: 2, powerBonus: 6,  atkBonus: 6,  trapBonus: 0, survBonus: 0, upgradeCost: 280, raceBonus: { 엘프: 5, 인간: 1 } },
  { id: 'w_m3', name: '고대 마법서', icon: '📖', class: '마법사', tier: 3, powerBonus: 14, atkBonus: 14, trapBonus: 0, survBonus: 0, upgradeCost: 0,   raceBonus: { 엘프: 6, 인간: 2 } },
  // ── 성직자 (신성 계열) ──
  { id: 'w_c1', name: '낡은 철퇴',     icon: '🔨', class: '성직자', tier: 1, powerBonus: 0,  atkBonus: 0, trapBonus: 0, survBonus: 0,  upgradeCost: 95,  raceBonus: { 인간: 2, 엘프: 1 } },
  { id: 'w_c2', name: '성스러운 철퇴', icon: '✨', class: '성직자', tier: 2, powerBonus: 5,  atkBonus: 3, trapBonus: 0, survBonus: 5,  upgradeCost: 250, raceBonus: { 인간: 3, 엘프: 2 } },
  { id: 'w_c3', name: '성검',          icon: '💫', class: '성직자', tier: 3, powerBonus: 12, atkBonus: 7, trapBonus: 0, survBonus: 10, upgradeCost: 0,   raceBonus: { 인간: 4, 엘프: 3 } },
]

export const DEFAULT_WEAPON: Record<MercenaryClass, string> = {
  전사: 'w_w1', 궁수: 'w_a1', 도적: 'w_r1', 마법사: 'w_m1', 성직자: 'w_c1',
}
