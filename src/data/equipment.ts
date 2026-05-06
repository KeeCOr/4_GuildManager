import type { Equipment, EquipSlot, EquipGrade, SetDefinition, MercenaryClass, PassiveEffect } from '../types'

// ── Helper ────────────────────────────────────────────────────────────────
function eq(
  id: string, name: string, slot: EquipSlot, grade: EquipGrade,
  powerBonus: number, atkBonus: number, trapBonus: number, survBonus: number, moraleBonus: number,
  buyCost: number, icon: string,
  setId?: string,
  classBonus?: Partial<Record<MercenaryClass, number>>,
  passive?: PassiveEffect
): Equipment {
  return { id, name, slot, grade, powerBonus, atkBonus, trapBonus, survBonus, moraleBonus, buyCost, icon, setId, classBonus, passive }
}

// ── WEAPON slot (25 items) ────────────────────────────────────────────────
// 철검 계열 — 철벽 세트 (B~S), 전사 친화
const SWORDS: Equipment[] = [
  eq('eq_w_sword_d', '낡은 철검',   'weapon', 'D',  2,  2, 0, 0, 0,  60, '🗡', undefined,  { 전사: 1 }),
  eq('eq_w_sword_c', '철검',        'weapon', 'C',  5,  4, 0, 0, 0, 140, '🗡', undefined,  { 전사: 2 }),
  eq('eq_w_sword_b', '강철검',      'weapon', 'B',  9,  7, 0, 1, 0, 280, '⚔', '철벽',     { 전사: 3 }),
  eq('eq_w_sword_a', '영웅의 검',   'weapon', 'A', 14, 11, 0, 2, 0, 480, '⚔', '철벽',     { 전사: 5 }),
  eq('eq_w_sword_s', '불멸의 검',   'weapon', 'S', 20, 16, 0, 3, 5, 850, '⚜', '철벽',     { 전사: 7 }, { type: 'quest_success_morale', value: 5, condition: '퀘스트 성공 시 사기 +5' }),
]

// 그림자 단검 계열 — 그림자 세트 (B~S), 도적 친화
const DAGGERS: Equipment[] = [
  eq('eq_w_dagger_d', '낡은 단검',     'weapon', 'D',  2,  1,  3, 0, 0,  55, '🔪', undefined, { 도적: 1 }),
  eq('eq_w_dagger_c', '독 단검',       'weapon', 'C',  4,  2,  6, 0, 0, 130, '🔪', undefined, { 도적: 2 }),
  eq('eq_w_dagger_b', '그림자 단검',   'weapon', 'B',  8,  4, 10, 0, 0, 260, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_w_dagger_a', '암살자의 단검', 'weapon', 'A', 13,  7, 15, 0, 0, 450, '🌑', '그림자',  { 도적: 5 }),
  eq('eq_w_dagger_s', '허무의 칼날',   'weapon', 'S', 18, 10, 22, 0, 0, 800, '🌑', '그림자',  { 도적: 7 }, { type: 'trap_bonus', value: 10, condition: '함정 퀘스트 성공률 +10%' }),
]

// 합성궁 계열 — 자연 세트 (B~S), 궁수 친화
const BOWS: Equipment[] = [
  eq('eq_w_bow_d', '낡은 단궁',   'weapon', 'D',  2,  2,  1, 0, 0,  55, '🏹', undefined, { 궁수: 1 }),
  eq('eq_w_bow_c', '합성궁',      'weapon', 'C',  5,  4,  3, 0, 0, 135, '🏹', undefined, { 궁수: 2 }),
  eq('eq_w_bow_b', '정밀 장궁',   'weapon', 'B',  8,  7,  5, 0, 0, 265, '🏹', '자연',    { 궁수: 3 }),
  eq('eq_w_bow_a', '풍요의 궁',   'weapon', 'A', 13, 10,  8, 1, 2, 455, '🏹', '자연',    { 궁수: 5 }),
  eq('eq_w_bow_s', '대지의 영궁', 'weapon', 'S', 19, 14, 12, 2, 3, 820, '🌿', '자연',    { 궁수: 7 }, { type: 'morale_recovery_on_kill', value: 5, condition: '퀘스트 성공 시 사기 추가 +5' }),
]

// 마법 지팡이 계열 — 현자 세트 (B~S), 마법사 친화
const STAVES: Equipment[] = [
  eq('eq_w_staff_d', '낡은 지팡이',   'weapon', 'D',  2,  3, 0, 0, 0,  60, '🪄', undefined, { 마법사: 1 }),
  eq('eq_w_staff_c', '수정 완드',     'weapon', 'C',  5,  6, 0, 0, 0, 145, '🪄', undefined, { 마법사: 2 }),
  eq('eq_w_staff_b', '고대 지팡이',   'weapon', 'B',  9, 10, 0, 0, 0, 275, '🔮', '현자',    { 마법사: 3 }),
  eq('eq_w_staff_a', '현자의 지팡이', 'weapon', 'A', 14, 15, 0, 0, 2, 470, '🔮', '현자',    { 마법사: 5 }),
  eq('eq_w_staff_s', '원소의 지팡이', 'weapon', 'S', 21, 22, 0, 0, 3, 870, '✨', '현자',    { 마법사: 7 }, { type: 'guild_fame_bonus', value: 3, condition: '퀘스트 성공 시 명성 +3' }),
]

// 성스러운 철퇴 계열 — 세트 없음, 성직자 친화
const MACES: Equipment[] = [
  eq('eq_w_mace_d', '낡은 철퇴',       'weapon', 'D',  2, 1, 0,  2, 0,  55, '🔨', undefined, { 성직자: 1 }),
  eq('eq_w_mace_c', '철퇴',            'weapon', 'C',  4, 2, 0,  4, 0, 130, '🔨', undefined, { 성직자: 2 }),
  eq('eq_w_mace_b', '성스러운 철퇴',   'weapon', 'B',  8, 4, 0,  7, 0, 255, '✨', undefined, { 성직자: 3 }),
  eq('eq_w_mace_a', '성직자의 철퇴',   'weapon', 'A', 12, 6, 0, 11, 0, 440, '✨', undefined, { 성직자: 5 }),
  eq('eq_w_mace_s', '신성한 철퇴',     'weapon', 'S', 18, 9, 0, 16, 5, 790, '💫', undefined, { 성직자: 7 }, { type: 'survival_bonus', value: 5, condition: '생존율 +5' }),
]

// ── HEAD slot (25 items) ──────────────────────────────────────────────────
// 철 투구 계열 — 철벽 세트 (B~S), 전사 친화
const HELMS: Equipment[] = [
  eq('eq_h_helm_d', '낡은 투구',   'head', 'D',  1, 0, 0,  3, 0,  50, '🪖', undefined, { 전사: 1 }),
  eq('eq_h_helm_c', '철 투구',     'head', 'C',  3, 0, 0,  6, 0, 120, '🪖', undefined, { 전사: 2 }),
  eq('eq_h_helm_b', '강철 투구',   'head', 'B',  6, 1, 0, 10, 0, 240, '🪖', '철벽',    { 전사: 3 }),
  eq('eq_h_helm_a', '전사의 투구', 'head', 'A', 10, 2, 0, 15, 0, 420, '🪖', '철벽',    { 전사: 5 }),
  eq('eq_h_helm_s', '불멸의 투구', 'head', 'S', 15, 3, 0, 21, 3, 760, '🛡', '철벽',    { 전사: 6 }, { type: 'same_element_death_resist', value: 10, condition: '속성 일치 퀘스트 사망률 -10%' }),
]

// 두건 계열 — 그림자 세트 (B~S), 도적 친화
const HOODS: Equipment[] = [
  eq('eq_h_hood_d', '낡은 두건',     'head', 'D',  1, 0,  3, 1, 0,  45, '🧢', undefined, { 도적: 1 }),
  eq('eq_h_hood_c', '두건',          'head', 'C',  3, 0,  6, 2, 0, 115, '🧢', undefined, { 도적: 2 }),
  eq('eq_h_hood_b', '그림자 두건',   'head', 'B',  6, 0, 10, 3, 0, 230, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_h_hood_a', '암살자의 두건', 'head', 'A', 10, 0, 15, 4, 0, 400, '🌑', '그림자',  { 도적: 5 }),
  eq('eq_h_hood_s', '허무의 두건',   'head', 'S', 15, 0, 22, 5, 0, 740, '🌑', '그림자',  { 도적: 6 }, { type: 'trap_bonus', value: 8, condition: '함정 퀘스트 성공률 +8%' }),
]

// 관 계열 — 현자 세트 (B~S), 마법사 친화
const CROWNS: Equipment[] = [
  eq('eq_h_crown_d', '낡은 관',    'head', 'D',  1,  2, 0, 0, 2,  50, '👑', undefined, { 마법사: 1 }),
  eq('eq_h_crown_c', '마법사 관',  'head', 'C',  3,  4, 0, 0, 3, 125, '👑', undefined, { 마법사: 2 }),
  eq('eq_h_crown_b', '현자의 관',  'head', 'B',  6,  7, 0, 0, 4, 245, '👑', '현자',    { 마법사: 3 }),
  eq('eq_h_crown_a', '원소의 관',  'head', 'A', 10, 11, 0, 0, 5, 430, '👑', '현자',    { 마법사: 5 }),
  eq('eq_h_crown_s', '아르카나 관','head', 'S', 15, 16, 0, 0, 6, 780, '✨', '현자',    { 마법사: 6 }, { type: 'guild_fame_bonus', value: 2, condition: '퀘스트 성공 시 명성 +2' }),
]

// 밴드 계열 — 자연 세트 (B~S), 궁수 친화
const BANDS: Equipment[] = [
  eq('eq_h_band_d', '낡은 밴드',   'head', 'D',  1, 1, 1, 1, 1,  45, '🎀', undefined, { 궁수: 1 }),
  eq('eq_h_band_c', '사냥꾼 밴드', 'head', 'C',  3, 2, 3, 2, 2, 115, '🎀', undefined, { 궁수: 2 }),
  eq('eq_h_band_b', '자연의 밴드', 'head', 'B',  6, 3, 5, 3, 3, 230, '🌿', '자연',    { 궁수: 3 }),
  eq('eq_h_band_a', '정령의 밴드', 'head', 'A', 10, 5, 7, 4, 4, 405, '🌿', '자연',    { 궁수: 5 }),
  eq('eq_h_band_s', '대지의 밴드', 'head', 'S', 15, 7,10, 5, 6, 745, '🌿', '자연',    { 궁수: 6 }, { type: 'morale_recovery_on_kill', value: 4, condition: '퀘스트 성공 시 사기 추가 +4' }),
]

// 성직자 모자 계열 — 세트 없음, 성직자 친화
const HATS: Equipment[] = [
  eq('eq_h_hat_d', '낡은 성직자 모자', 'head', 'D',  1, 0, 0,  2,  3,  45, '🎩', undefined, { 성직자: 1 }),
  eq('eq_h_hat_c', '성직자 모자',      'head', 'C',  3, 0, 0,  4,  5, 115, '🎩', undefined, { 성직자: 2 }),
  eq('eq_h_hat_b', '신성한 모자',      'head', 'B',  5, 0, 0,  7,  7, 225, '⛪', undefined, { 성직자: 3 }),
  eq('eq_h_hat_a', '대사제 모자',      'head', 'A',  9, 0, 0, 10,  9, 400, '⛪', undefined, { 성직자: 5 }),
  eq('eq_h_hat_s', '성좌의 모자',      'head', 'S', 14, 0, 0, 14, 12, 740, '💫', undefined, { 성직자: 6 }, { type: 'survival_bonus', value: 4, condition: '생존율 +4' }),
]

// ── BODY slot (25 items) ──────────────────────────────────────────────────
// 판금 갑옷 계열 — 철벽 세트 (B~S), 전사 친화
const PLATES: Equipment[] = [
  eq('eq_b_plate_d', '낡은 판금 갑옷',    'body', 'D',  1, 0, 0,  5, 0,  65, '🛡', undefined, { 전사: 1 }),
  eq('eq_b_plate_c', '판금 갑옷',         'body', 'C',  3, 0, 0,  9, 0, 160, '🛡', undefined, { 전사: 2 }),
  eq('eq_b_plate_b', '강철 판금 갑옷',    'body', 'B',  6, 1, 0, 14, 0, 310, '🛡', '철벽',    { 전사: 3 }),
  eq('eq_b_plate_a', '기사 갑옷',         'body', 'A', 10, 2, 0, 20, 0, 520, '🛡', '철벽',    { 전사: 5 }),
  eq('eq_b_plate_s', '불멸의 판금 갑옷',  'body', 'S', 16, 3, 0, 28, 0, 920, '⚜', '철벽',    { 전사: 7 }, { type: 'same_element_death_resist', value: 12, condition: '속성 일치 퀘스트 사망률 -12%' }),
]

// 가죽 갑옷 계열 — 자연 세트 (B~S), 도적/궁수 친화
const LEATHERS: Equipment[] = [
  eq('eq_b_leather_d', '낡은 가죽 갑옷',  'body', 'D',  1, 0,  2,  3, 0,  55, '🥋', undefined, { 도적: 1, 궁수: 1 }),
  eq('eq_b_leather_c', '가죽 갑옷',       'body', 'C',  3, 0,  4,  5, 0, 140, '🥋', undefined, { 도적: 2, 궁수: 2 }),
  eq('eq_b_leather_b', '자연의 가죽 갑옷','body', 'B',  6, 0,  7,  8, 1, 275, '🌿', '자연',    { 도적: 3, 궁수: 3 }),
  eq('eq_b_leather_a', '사냥꾼 갑옷',     'body', 'A', 10, 0, 10, 12, 2, 470, '🌿', '자연',    { 도적: 5, 궁수: 5 }),
  eq('eq_b_leather_s', '대지의 갑옷',     'body', 'S', 15, 0, 14, 17, 3, 850, '🌿', '자연',    { 도적: 6, 궁수: 6 }, { type: 'quest_success_morale', value: 4, condition: '퀘스트 성공 시 사기 +4' }),
]

// 마법사 로브 계열 — 현자 세트 (B~S), 마법사 친화
const ROBES: Equipment[] = [
  eq('eq_b_robe_d', '낡은 로브',    'body', 'D',  1,  3, 0, 1, 0,  55, '🧙', undefined, { 마법사: 1 }),
  eq('eq_b_robe_c', '마법사 로브',  'body', 'C',  3,  6, 0, 1, 1, 145, '🧙', undefined, { 마법사: 2 }),
  eq('eq_b_robe_b', '현자의 로브',  'body', 'B',  6, 10, 0, 2, 2, 285, '🔮', '현자',    { 마법사: 3 }),
  eq('eq_b_robe_a', '원소의 로브',  'body', 'A', 10, 15, 0, 3, 3, 480, '🔮', '현자',    { 마법사: 5 }),
  eq('eq_b_robe_s', '아르카나 로브','body', 'S', 16, 21, 0, 4, 4, 880, '✨', '현자',    { 마법사: 7 }, { type: 'same_element_death_resist', value: 8, condition: '속성 일치 퀘스트 사망률 -8%' }),
]

// 그림자 망토 계열 — 그림자 세트 (B~S), 도적 친화
const CLOAKS: Equipment[] = [
  eq('eq_b_cloak_d', '낡은 망토',    'body', 'D',  1, 0,  4, 2, 0,  55, '🌑', undefined, { 도적: 1 }),
  eq('eq_b_cloak_c', '그림자 망토',  'body', 'C',  3, 0,  7, 3, 0, 140, '🌑', undefined, { 도적: 2 }),
  eq('eq_b_cloak_b', '암살자 망토',  'body', 'B',  6, 0, 11, 4, 0, 270, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_b_cloak_a', '허무의 망토',  'body', 'A', 10, 0, 16, 5, 0, 460, '🌑', '그림자',  { 도적: 5 }),
  eq('eq_b_cloak_s', '심연의 망토',  'body', 'S', 15, 0, 23, 6, 0, 840, '🌑', '그림자',  { 도적: 7 }, { type: 'trap_bonus', value: 12, condition: '함정 퀘스트 성공률 +12%' }),
]

// 사슬 갑옷 계열 — 세트 없음, 범용
const CHAINS: Equipment[] = [
  eq('eq_b_chain_d', '낡은 사슬 갑옷',    'body', 'D',  1, 0, 0,  4, 0,  60, '⛓', undefined),
  eq('eq_b_chain_c', '사슬 갑옷',         'body', 'C',  3, 0, 0,  7, 0, 150, '⛓', undefined),
  eq('eq_b_chain_b', '강화 사슬 갑옷',    'body', 'B',  6, 0, 0, 11, 0, 295, '⛓', undefined),
  eq('eq_b_chain_a', '정예 사슬 갑옷',    'body', 'A', 10, 0, 0, 16, 1, 500, '⛓', undefined),
  eq('eq_b_chain_s', '절대 사슬 갑옷',    'body', 'S', 15, 0, 0, 22, 2, 880, '⛓', undefined, undefined, { type: 'survival_bonus', value: 5, condition: '생존율 +5' }),
]

// ── ACCESSORY slot (25 items) ─────────────────────────────────────────────
// 전투 반지 계열 — 철벽 세트 (B~S), 전사 친화
const RINGS: Equipment[] = [
  eq('eq_a_ring_d', '낡은 반지',    'accessory', 'D',  1, 1, 0,  1, 0,  45, '💍', undefined, { 전사: 1 }),
  eq('eq_a_ring_c', '강인의 반지',  'accessory', 'C',  3, 2, 0,  3, 0, 110, '💍', undefined, { 전사: 2 }),
  eq('eq_a_ring_b', '철벽의 반지',  'accessory', 'B',  5, 3, 0,  5, 0, 215, '💍', '철벽',    { 전사: 3 }),
  eq('eq_a_ring_a', '기사의 반지',  'accessory', 'A',  9, 5, 0,  8, 0, 375, '💍', '철벽',    { 전사: 4 }),
  eq('eq_a_ring_s', '불멸의 반지',  'accessory', 'S', 13, 7, 0, 12, 3, 700, '💎', '철벽',    { 전사: 6 }, { type: 'quest_success_morale', value: 6, condition: '퀘스트 성공 시 사기 +6' }),
]

// 그림자 장갑 계열 — 그림자 세트 (B~S), 도적 친화
const GLOVES: Equipment[] = [
  eq('eq_a_glove_d', '낡은 장갑',       'accessory', 'D',  1, 0,  3, 0, 0,  40, '🥊', undefined, { 도적: 1 }),
  eq('eq_a_glove_c', '가죽 장갑',       'accessory', 'C',  3, 0,  6, 0, 0, 105, '🥊', undefined, { 도적: 2 }),
  eq('eq_a_glove_b', '그림자 장갑',     'accessory', 'B',  5, 0, 10, 0, 0, 210, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_a_glove_a', '암살자의 장갑',   'accessory', 'A',  9, 0, 15, 0, 0, 365, '🌑', '그림자',  { 도적: 4 }),
  eq('eq_a_glove_s', '허무의 장갑',     'accessory', 'S', 13, 0, 22, 0, 0, 690, '🌑', '그림자',  { 도적: 6 }, { type: 'trap_bonus', value: 9, condition: '함정 퀘스트 성공률 +9%' }),
]

// 마법 목걸이 계열 — 현자 세트 (B~S), 마법사 친화
const NECKLACES: Equipment[] = [
  eq('eq_a_neck_d', '낡은 목걸이',    'accessory', 'D',  1,  2, 0, 0, 2,  45, '📿', undefined, { 마법사: 1 }),
  eq('eq_a_neck_c', '마법 목걸이',    'accessory', 'C',  3,  4, 0, 0, 3, 115, '📿', undefined, { 마법사: 2 }),
  eq('eq_a_neck_b', '현자의 목걸이',  'accessory', 'B',  5,  7, 0, 0, 4, 220, '📿', '현자',    { 마법사: 3 }),
  eq('eq_a_neck_a', '원소의 목걸이',  'accessory', 'A',  9, 11, 0, 0, 5, 380, '📿', '현자',    { 마법사: 4 }),
  eq('eq_a_neck_s', '아르카나 목걸이','accessory', 'S', 13, 16, 0, 0, 6, 710, '✨', '현자',    { 마법사: 6 }, { type: 'guild_fame_bonus', value: 4, condition: '퀘스트 성공 시 명성 +4' }),
]

// 자연의 부적 계열 — 자연 세트 (B~S), 궁수/성직자 친화
const AMULETS: Equipment[] = [
  eq('eq_a_amulet_d', '낡은 부적',   'accessory', 'D',  1, 0, 1, 1,  2,  40, '🧿', undefined, { 궁수: 1, 성직자: 1 }),
  eq('eq_a_amulet_c', '자연의 부적', 'accessory', 'C',  3, 0, 2, 2,  4, 110, '🧿', undefined, { 궁수: 2, 성직자: 2 }),
  eq('eq_a_amulet_b', '정령의 부적', 'accessory', 'B',  5, 0, 3, 3,  6, 215, '🌿', '자연',    { 궁수: 3, 성직자: 3 }),
  eq('eq_a_amulet_a', '대지의 부적', 'accessory', 'A',  9, 0, 5, 5,  8, 375, '🌿', '자연',    { 궁수: 4, 성직자: 4 }),
  eq('eq_a_amulet_s', '신목의 부적', 'accessory', 'S', 13, 0, 7, 7, 11, 700, '🌿', '자연',    { 궁수: 6, 성직자: 6 }, { type: 'morale_recovery_on_kill', value: 6, condition: '퀘스트 성공 시 사기 추가 +6' }),
]

// 강인의 팔찌 계열 — 세트 없음, 범용 생존
const BRACELETS: Equipment[] = [
  eq('eq_a_brace_d', '낡은 팔찌',    'accessory', 'D',  1, 0, 0,  3, 0,  40, '📎', undefined),
  eq('eq_a_brace_c', '강인의 팔찌',  'accessory', 'C',  3, 0, 0,  5, 0, 105, '📎', undefined),
  eq('eq_a_brace_b', '용사의 팔찌',  'accessory', 'B',  5, 0, 0,  8, 0, 205, '📎', undefined),
  eq('eq_a_brace_a', '불굴의 팔찌',  'accessory', 'A',  9, 0, 0, 12, 0, 360, '📎', undefined),
  eq('eq_a_brace_s', '신화의 팔찌',  'accessory', 'S', 13, 0, 0, 17, 2, 680, '⚡', undefined, undefined, { type: 'survival_bonus', value: 6, condition: '생존율 +6' }),
]

// ── Full pool export ──────────────────────────────────────────────────────
export const EQUIPMENT_POOL: Equipment[] = [
  ...SWORDS, ...DAGGERS, ...BOWS, ...STAVES, ...MACES,
  ...HELMS, ...HOODS, ...CROWNS, ...BANDS, ...HATS,
  ...PLATES, ...LEATHERS, ...ROBES, ...CLOAKS, ...CHAINS,
  ...RINGS, ...GLOVES, ...NECKLACES, ...AMULETS, ...BRACELETS,
]

// ── Set Definitions ───────────────────────────────────────────────────────
export const SET_DEFINITIONS: SetDefinition[] = [
  {
    id: '철벽',
    name: '철벽 세트',
    bonuses: [
      { requiredCount: 2, description: '생존율 +10', effects: [{ type: 'survival_bonus', value: 10 }] },
      { requiredCount: 3, description: '속성 일치 퀘스트 사망률 -20%', effects: [{ type: 'same_element_death_resist', value: 20 }] },
    ],
  },
  {
    id: '그림자',
    name: '그림자 세트',
    bonuses: [
      { requiredCount: 2, description: '함정해제 +8', effects: [{ type: 'trap_bonus', value: 8 }] },
      { requiredCount: 3, description: '암흑 퀘스트 성공률 +12%', effects: [{ type: 'trap_bonus', value: 12 }] },
    ],
  },
  {
    id: '현자',
    name: '현자 세트',
    bonuses: [
      { requiredCount: 2, description: '전력 +15', effects: [{ type: 'survival_bonus', value: 0 }] },
      { requiredCount: 3, description: '속성 일치 시 명성 +3', effects: [{ type: 'guild_fame_bonus', value: 3 }] },
    ],
  },
  {
    id: '자연',
    name: '자연 세트',
    bonuses: [
      { requiredCount: 2, description: '사기 +10', effects: [{ type: 'quest_success_morale', value: 10 }] },
      { requiredCount: 3, description: '퀘스트 성공 사기 회복 +5', effects: [{ type: 'morale_recovery_on_kill', value: 5 }] },
    ],
  },
]

// ── Helper functions ──────────────────────────────────────────────────────

/** Find equipment by ID */
export const findEquip = (id: string): Equipment | undefined =>
  EQUIPMENT_POOL.find(e => e.id === id)

/** Get all equipped items for a mercenary (resolves IDs → Equipment) */
export const getEquipped = (
  equip: { weapon: string | null; head: string | null; body: string | null; accessory: string | null }
): Equipment[] => {
  const ids = [equip.weapon, equip.head, equip.body, equip.accessory].filter(Boolean) as string[]
  return ids.map(id => EQUIPMENT_POOL.find(e => e.id === id)).filter(Boolean) as Equipment[]
}

/** Active set bonuses for a list of equipped items */
export const getSetBonuses = (equipped: Equipment[]): { set: SetDefinition; bonus: typeof SET_DEFINITIONS[0]['bonuses'][0] }[] => {
  const result: { set: SetDefinition; bonus: typeof SET_DEFINITIONS[0]['bonuses'][0] }[] = []
  for (const setDef of SET_DEFINITIONS) {
    const count = equipped.filter(e => e.setId === setDef.id).length
    for (const bonus of setDef.bonuses) {
      if (count >= bonus.requiredCount) result.push({ set: setDef, bonus })
    }
  }
  return result
}

/** powerScore for comparing equipment quality (for auto-equip logic) */
export const powerScore = (e: Equipment): number =>
  e.powerBonus + e.atkBonus + e.trapBonus + e.survBonus

/** Grade weights for merchant stock generation by guild level (0-indexed) */
export const MERCHANT_GRADE_WEIGHTS: Record<number, Partial<Record<EquipGrade, number>>> = {
  1: { D: 50, C: 40, B: 10 },
  2: { C: 40, B: 40, A: 20 },
  3: { B: 30, A: 50, S: 20 },
  4: { A: 40, S: 60 },
}

/** Drop grade pool by quest tier */
export const DROP_GRADE_POOL: Record<number, EquipGrade[]> = {
  1: ['D', 'D', 'C'],
  2: ['C', 'B'],
  3: ['B', 'A'],
  4: ['A', 'S'],
  5: ['A', 'S', 'S'],
}

/** Drop probability by quest tier (0–1) */
export const DROP_CHANCE: Record<number, number> = {
  1: 0.08, 2: 0.12, 3: 0.18, 4: 0.25, 5: 0.40,
}

/** Quest tier from difficulty */
export const questTier = (difficulty: number): number => {
  if (difficulty <= 120) return 1
  if (difficulty <= 210) return 2
  if (difficulty <= 330) return 3
  if (difficulty <= 560) return 4
  return 5
}

/** Pick a random item from the pool by slot + grade */
export const randomItemByGrade = (slot: EquipSlot, grade: EquipGrade): Equipment => {
  const pool = EQUIPMENT_POOL.filter(e => e.slot === slot && e.grade === grade)
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Pick a random drop item for a quest (returns null if no drop) */
export const rollQuestDrop = (difficulty: number): Equipment | null => {
  const tier = questTier(difficulty)
  if (Math.random() >= DROP_CHANCE[tier]) return null
  const grades = DROP_GRADE_POOL[tier]
  const grade = grades[Math.floor(Math.random() * grades.length)]
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']
  const slot = slots[Math.floor(Math.random() * slots.length)]
  return randomItemByGrade(slot, grade)
}

/** Generate merchant stock for a given guild level (1–4+) */
export const generateMerchantStock = (guildLevel: number): Equipment[] => {
  const lvKey = Math.min(guildLevel, 4) as 1 | 2 | 3 | 4
  const weights = MERCHANT_GRADE_WEIGHTS[lvKey]
  const entries = Object.entries(weights) as [EquipGrade, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  const count = 3 + Math.floor(Math.random() * 3) // 3–5 items

  const stock: Equipment[] = []
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']
  for (let i = 0; i < count; i++) {
    let roll = Math.random() * total
    let grade: EquipGrade = 'C'
    for (const [g, w] of entries) { roll -= w; if (roll <= 0) { grade = g; break } }
    const slot = slots[Math.floor(Math.random() * slots.length)]
    stock.push(randomItemByGrade(slot, grade))
  }
  return stock
}
