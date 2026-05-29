import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initialMercenaries, ALL_QUESTS, generateMercenary, EXP_TO_NEXT, RACE_BONUS_DESC } from './data/mercenaries'
import { EQUIPMENT_POOL, findEquip, getEquipped, getSetBonuses, powerScore, rollQuestDrop, generateMerchantStock, questTier } from './data/equipment'
import { createDungeon, DUNGEON_TRIGGER_CHANCE, dungeonFloorDifficulty, dungeonFloorDeathRisk, dungeonFloorGold, dungeonFloorXp } from './data/dungeons'
import { effPower, effPowerVs, combatPower, canTrap, eqAtk, eqTrap, eqSurv, passiveDeathMod } from './utils/power'
import { elementRelation } from './utils/elements'
import { getMercPassiveStats, GRADE_PASSIVE_SLOTS, pickRandomPassive, PASSIVE_POOL, PASSIVE_SYNERGIES, findPassive } from './data/passives'
import { StatRadar } from './components/StatRadar'
import { MercAvatar } from './components/MercAvatar'
import { EquipmentModal } from './components/EquipmentModal'
import { MerchantPanel } from './components/MerchantPanel'
import { DungeonPanel } from './components/DungeonPanel'
import { ExpeditionPanel, ExpeditionLaunchModal } from './components/ExpeditionPanel'
import { useMerchant } from './hooks/useMerchant'
import { useDungeon } from './hooks/useDungeon'
import { getSprite } from './assets/Character/sprites'
import { UI_ICONS } from './assets/uiIcons'
import bgBase from './assets/BG/BG_Base.jpg'
import sceneFrontProps from './assets/BG/props/front/scene-front-props.png'
import type { Mercenary, Quest, ActiveQuest, GuildBuildings, CampaignState, Equipment, EquipSlot, MerchantState, ActiveDungeon, ActiveExpedition, ExpeditionResult, SaveSlotData, RoomId } from './types'

// ── Display helpers ────────────────────────────────────────────────────────

const RACE_ICONS: Record<string, string> = { 엘프: '🧝', 인간: '⚜️', 드워프: '⛏️', 수인: '🐺' }
const CLASS_ICONS: Record<string, string> = { 전사: '⚔️', 궁수: '🏹', 도적: '🗡️', 마법사: '🪄', 성직자: '🕊️' }
const GRADE_STARS: Record<string, string> = { S: '★★★★★', A: '★★★★', B: '★★★', C: '★★', D: '★' }
const ROOM_NAMES: RoomId[] = ['길드마스터룸', '훈련소', '식당']
type SceneFocusId = RoomId | '외부'
const SCENE_FOCUS: Record<SceneFocusId, { label: string; scale: number; origin: string }> = {
  '길드마스터룸': { label: '길드마스터룸', scale: 1.72, origin: '72% 27%' },
  '훈련소': { label: '훈련소', scale: 1.72, origin: '72% 55%' },
  '식당': { label: '식당', scale: 1.72, origin: '73% 82%' },
  '외부': { label: '외부 진입로', scale: 1.55, origin: '22% 74%' },
}
const SCENE_MIN_ZOOM = 1
const SCENE_MAX_ZOOM = 2.35
const SCENE_RESET_ZOOM = 1.03

// 속성 아이콘·색상
const ELEMENT_ICON: Record<string, string> = { 불: '🔥', 얼음: '🧊', 자연: '🌿', 암흑: '🌑', 빛: '✨' }

const ELEMENT_COLOR: Record<string, string> = {
  불: 'text-orange-400', 얼음: 'text-cyan-300',
  자연: 'text-green-400', 암흑: 'text-purple-400', 빛: 'text-yellow-100'
}
const ELEMENT_BG: Record<string, string> = {
  불: 'rgba(234,88,12,0.25)', 얼음: 'rgba(34,211,238,0.2)',
  자연: 'rgba(34,197,94,0.2)', 암흑: 'rgba(147,51,234,0.2)', 빛: 'rgba(253,224,71,0.2)'
}

const gradeText = (g: string) =>
  ({ S: 'text-fuchsia-300', A: 'text-amber-300', B: 'text-emerald-300', C: 'text-sky-300', D: 'text-slate-400' }[g] ?? 'text-slate-400')
const gradeBg = (g: string) =>
  ({ S: 'bg-fuchsia-700', A: 'bg-amber-700', B: 'bg-emerald-700', C: 'bg-sky-800', D: 'bg-slate-700' }[g] ?? 'bg-slate-700')

// 미션 급여: 등급별 1일당 지급액 (퀘스트 완료 시 duration만큼 정산)
const MISSION_PAY_PER_DAY: Record<string, number> = { D: 4, C: 10, B: 45, A: 90, S: 160 }
const ARRIVAL_REFRESH_COST = 150
const PREMIUM_REFRESH_COST = 5   // crystals

// 호감도 이모지
const favEmoji = (fav: number) =>
  fav >= 81 ? '❤️' : fav >= 61 ? '😊' : fav >= 41 ? '😐' : fav >= 21 ? '😒' : '💔'

// effPower, combatPower, canTrap imported from utils/power

function calcChemistryScore(party: Mercenary[]): number {
  if (party.length <= 1) return 70
  const avgCoop = party.reduce((s, m) => s + m.traits.cooperation, 0) / party.length
  const avgEgo  = party.reduce((s, m) => s + m.traits.ego, 0) / party.length
  const highEgoCount = party.filter(m => m.traits.ego > 70).length
  const clashPenalty = highEgoCount >= 2 ? (highEgoCount - 1) * 18 : 0
  const synAvg = party.reduce((s, m) => s + m.traits.synergy_factor, 0) / party.length
  let score = avgCoop * 0.55 + (100 - avgEgo) * 0.35 + (synAvg - 1) * 50 - clashPenalty

  // 종족 다양성: 같은 종족이면 무난하게 수렴, 다른 종족이 섞일수록 시너지↑
  const uniqueRaces = new Set(party.map(m => m.race)).size
  if (uniqueRaces === 1) {
    score = score * 0.65 + 70 * 0.35  // 단일 종족: 극단을 줄이고 평균으로 수렴
  } else {
    score += (uniqueRaces - 1) * 9    // 2종족: +9, 3종족: +18, 4종족: +27
  }

  // 나이대 유사성: 편차가 작을수록 보너스
  const ages = party.map(m => m.age)
  const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length
  const ageDev = ages.reduce((s, a) => s + Math.abs(a - avgAge), 0) / ages.length
  if (ageDev <= 4)       score += 10
  else if (ageDev <= 9)  score += 5

  // 성별 혼합 보너스
  const uniqueGenders = new Set(party.map(m => m.traits.gender)).size
  if (uniqueGenders > 1) score += 8

  return Math.max(0, Math.min(100, Math.round(score)))
}
// combatPower and canTrap imported from utils/power

const condBar = (cond: number) => {
  const pct = cond
  const col = cond >= 70 ? '#22c55e' : cond >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col }} />
    </div>
  )
}

const moraleBar = (mor: number) => {
  const col = mor >= 70 ? '#818cf8' : mor >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${mor}%`, background: col }} />
    </div>
  )
}


// ── 오프닝 스텝 (게임 시작 시 모달) ──────────────────────────────────────────
const INTRO_STEPS = [
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
  },
]

// ── 플레이 흐름 힌트 (상황에 맞게 자동 등장) ─────────────────────────────────
const HINT_STEPS: { id: string; icon: string; tag: string; title: string; body: string; tips: string[] }[] = [
  {
    id: 'hire',
    icon: '🚶',
    tag: '용병 고용',
    title: '용병이 문 앞에 찾아왔어요',
    body: '왼쪽 패널에서 도착한 용병을 확인하고 고용해보세요.',
    tips: [
      '카드 클릭 → 상세 스탯 확인',
      '[⚔ 고용] 클릭으로 즉시 영입, [✕] 로 거절',
      '🔄 50G — 새 용병 목록으로 즉시 교체 가능',
    ],
  },
  {
    id: 'quest',
    icon: '📜',
    tag: '계약 수행',
    title: '계약을 수주해봐요',
    body: '용병을 슬롯에 배치하고 파견하면 실시간으로 퀘스트가 진행됩니다.',
    tips: [
      '용병 클릭 선택 → 슬롯 클릭 또는 드래그로 배치',
      '속성 일치(✦) 시 성공률·보너스가 크게 오릅니다',
      '함정 퀘스트(🔧)는 도적·궁수 필수',
    ],
  },
  {
    id: 'economy',
    icon: '💰',
    tag: '자원 관리',
    title: '자원을 꼼꼼히 챙기세요',
    body: '금화와 사기를 관리해야 길드가 유지됩니다.',
    tips: [
      '12시간 이상 파견을 보내지 않으면 사기가 떨어집니다',
      '사기가 낮으면 퀘스트 성공률이 떨어집니다',
      '건물 업그레이드(병영·선술집·의무소)로 효율을 높이세요',
    ],
  },
  {
    id: 'growth',
    icon: '📈',
    tag: '용병 성장',
    title: '용병을 키워보세요',
    body: '퀘스트 성공과 훈련으로 레벨업 — 모든 능력치가 오릅니다.',
    tips: [
      '훈련소에 배치하면 매일 경험치 획득',
      '길드마스터룸 배치 → 호감도↑ → 실효 전력↑',
      '무기 업그레이드(용병 상세 화면)로 스탯 강화',
    ],
  },
]

const HINT_STORAGE_KEY = 'sma_shown_hints'
const loadShownHints = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(HINT_STORAGE_KEY) ?? '[]')) } catch { return new Set() }
}
const persistShownHints = (s: Set<string>) =>
  localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify([...s]))

// ── Building definitions ───────────────────────────────────────────────────

const BUILDING_INFO = {
  hall:      { name: '길드 홀',  icon: '🏰', maxLevel: 4, buildCost: 0,
               desc: (lv: number) => `동시 계약 ${[2,3,4,5][Math.min(lv-1,3)]}개` },
  barracks:  { name: '병영',     icon: '⛺', maxLevel: 4, buildCost: 300,
               desc: (lv: number) => `${[3,3,2,2][lv-1]}일마다 ${[1,2,3,4][lv-1]}명 도착 · 신병 Lv${arrivalRecruitLevel(lv)}` },
  training:  { name: '훈련소',   icon: '⚔️', maxLevel: 4, buildCost: 400,
               desc: (lv: number) => `경험치 +${[0,30,70,120][lv-1]}%` },
  tavern:    { name: '선술집',   icon: '🍺', maxLevel: 4, buildCost: 600,
               desc: (lv: number) => ['D~C급','D~B급','D~A급','D~S급'][lv-1]+' 용병 유치' },
  infirmary: { name: '의무소',   icon: '❤️‍🩹', maxLevel: 4, buildCost: 400,
               desc: (lv: number) => `컨디션 회복 +${[8,15,25,40][lv-1]}/일` },
} as const

// Upgrade cost: base_cost × 2^(currentLevel)
const upgradeCost = (id: keyof GuildBuildings, currentLevel: number): number => {
  const bases: Record<string, number> = { hall: 500, barracks: 300, training: 400, tavern: 600, infirmary: 400 }
  return Math.round(bases[id] * Math.pow(2, currentLevel))
}

// ── 퀘스트 풀 ────────────────────────────────────────────────────────────
// 홀 레벨에 따라 표시 퀘스트 수 결정: Lv1=3, Lv2=5, Lv3=7, Lv4=10
// 길드 레벨에 따라 등장 가능 최대 난이도 제한
//   Lv1(0~29명성)   : ≤120  → 쥐사냥·야간경비·상인호위
//   Lv2(30~79)      : ≤210  → +도둑단·광산함정
//   Lv3(80~179)     : ≤330  → +밀수단·귀족저택
//   Lv4(180~349)    : ≤560  → +던전탐사·북방약탈자
//   Lv5(350+)       : 제한없음 → +드래곤토벌
const GUILD_MAX_QUEST_DIFF = [120, 210, 330, 560, 9999] as const

function drawQuestPool(hallLevel: number, activeQuestIds: string[], fame: number, completedQuestIds: string[] = []): string[] {
  const count = [5, 7, 9, 12][Math.min(hallLevel - 1, 3)]
  const guildLv  = computeGuildLevel(fame)
  const maxDiff  = GUILD_MAX_QUEST_DIFF[Math.min(guildLv - 1, 4)]
  const nextDiff = guildLv < 5 ? GUILD_MAX_QUEST_DIFF[guildLv] : 9999
  // 이전 티어 상한 (Lv1이면 0 = 하위 없음)
  const prevDiff = guildLv >= 2 ? GUILD_MAX_QUEST_DIFF[guildLv - 2] : 0

  const avail = ALL_QUESTS.filter(q => {
    if (activeQuestIds.includes(q.id)) return false
    // 선행 퀘스트 미완료 시 숨김
    if (q.requiredQuestId && !completedQuestIds.includes(q.requiredQuestId)) return false
    return true
  })

  // 현재 티어: 길드 레벨에 맞는 난이도 범위 (항상 등장)
  const currentTier = avail.filter(q => q.difficulty > prevDiff && q.difficulty <= maxDiff)

  // 상위 티어: 20% 확률로 도전 의뢰 등장
  const nextTier = avail
    .filter(q => q.difficulty > maxDiff && q.difficulty <= nextDiff)
    .filter(() => Math.random() < 0.20)

  // 하위 티어: 30% 확률로 육성용 쉬운 의뢰 등장 (약한 용병 훈련용)
  const lowerTier = prevDiff > 0
    ? avail.filter(q => q.difficulty <= prevDiff).filter(() => Math.random() < 0.30)
    : []

  const candidates = [...currentTier, ...nextTier, ...lowerTier].sort(() => Math.random() - 0.5)
  return candidates.slice(0, count).map(q => q.id)
}

// ── 방 업그레이드 ──────────────────────────────────────────────────────────
const ROOM_UPGRADE_COSTS: Record<string, readonly [number, number]> = {
  '길드마스터룸': [500, 1200],
  '훈련소':       [150, 350],
  '식당':         [200, 500],
}

const ROOM_EFFECTS: Record<string, { desc: string[]; icon: string }> = {
  '길드마스터룸': { icon: '👑', desc: ['호감도+1/일', '호감도+2/일', '호감도+3/일'] },
  '훈련소':       { icon: '⚔️', desc: ['XP+1/일', 'XP+3/일', 'XP+6/일'] },
  '식당':         { icon: '🍖', desc: ['음식 판매', '판매+도착+1명', '판매+도착+2명'] },
}

// Room-level derived helpers
const trainingCapacity  = (lv: number) => [2, 4, 6][Math.min(lv - 1, 2)]
const trainingXPPerDay  = (lv: number) => [1, 3, 6][Math.min(lv - 1, 2)]
const masterCapacity    = (lv: number) => [1, 2, 3][Math.min(lv - 1, 2)]
const masterFavBonus    = (lv: number) => [1, 2, 3][Math.min(lv - 1, 2)]
const maxHireCap        = (lv: number) => [6, 9, 12][Math.min(lv - 1, 2)]
const diningSalesCapacity = (lv: number) => [2, 3, 4][Math.min(lv - 1, 2)]
const diningArrivalBonus = (lv: number) => [0, 1, 2][Math.min(lv - 1, 2)]
const diningTavernBonus  = (lv: number) => [0, 1, 2][Math.min(lv - 1, 2)]
const calcDiningSalesIncome = (lv: number, staff: Mercenary[], morale: number) => {
  const activeStaff = staff.slice(0, diningSalesCapacity(lv))
  if (activeStaff.length === 0) return 0
  const base = [25, 55, 95][Math.min(lv - 1, 2)]
  const staffBonus = activeStaff.reduce((sum, m) => sum + Math.round(10 + effPower(m) * 0.08), 0)
  const moraleRate = 0.7 + Math.max(0, Math.min(100, morale)) / 220
  return Math.max(0, Math.round((base + staffBonus) * moraleRate))
}

// Building effects

const arrivalCount    = (barracksLv: number) => [3, 4, 5, 6][barracksLv - 1] ?? 3
const arrivalRecruitLevel = (barracksLv: number) => [1, 2, 3, 4][Math.min(Math.max(barracksLv - 1, 0), 3)]
const recruitTrainingLevelBonus = (trainingLv: number) => trainingLv >= 4 ? 2 : trainingLv >= 3 ? 1 : 0
const recruitLevelRange = (buildings: GuildBuildings) => {
  const base = arrivalRecruitLevel(buildings.barracks)
  const bonus = recruitTrainingLevelBonus(buildings.training)
  return { min: base + bonus, max: base + bonus + (buildings.tavern >= 3 ? 1 : 0) }
}
const rollRecruitLevel = (buildings: GuildBuildings) => {
  const range = recruitLevelRange(buildings)
  return range.min + Math.floor(Math.random() * (range.max - range.min + 1))
}
const condRecovery    = (infLv: number)      => [0, 8, 15, 25, 40][infLv] ?? 0
const xpMultiplier    = (trainLv: number)    => [1.0, 1.3, 1.7, 2.2][trainLv - 1] ?? 1.0

// ── Real-time quest duration ───────────────────────────────────────────────
// duration 1→5분, 2→15분, 3→30분, 4→60분, 5→90분, 6→120분, 7→180분, 8→240분
const QUEST_BASE_TIMES_MIN = [5, 15, 30, 60, 90, 120, 180, 240] as const

function calcQuestDurationMs(quest: Quest, assignedMercs: Mercenary[]): number {
  const baseMins = QUEST_BASE_TIMES_MIN[Math.min(quest.duration - 1, 7)]
  const totalEff = assignedMercs.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalEff / quest.difficulty
  // 연속 보간: ratio 1.0 이하 → mult 1.0, 3.0 이상 → mult 0.30 (최대 70% 단축)
  const mult = powerRatio <= 1.0
    ? 1.0
    : Math.max(0.30, 1.0 - (Math.min(powerRatio, 3.0) - 1.0) / 2.0 * 0.70)
  return Math.max(5, Math.round(baseMins * mult)) * 60 * 1000
}

// ── Guild Level system ─────────────────────────────────────────────────────
// fame 0→Lv1, 30→Lv2, 80→Lv3, 180→Lv4, 350→Lv5
const GUILD_LEVEL_FAME = [0, 30, 80, 180, 350] as const

function computeGuildLevel(fame: number): number {
  for (let i = GUILD_LEVEL_FAME.length - 1; i >= 0; i--) {
    if (fame >= GUILD_LEVEL_FAME[i]) return i + 1
  }
  return 1
}

// 길드마스터룸 최대 업그레이드 레벨 = min(3, guildLevel)
function masterRoomMaxLevel(fame: number): number {
  return Math.min(3, computeGuildLevel(fame))
}

// ── Mini Components ───────────────────────────────────────────────────────

function MercCard({
  merc, onClick, selected, inParty, showDetail,
  isDraggable, onDragStart, onDragEnd, isDragging, matchElement, onEquipClick
}: {
  merc: Mercenary
  onClick: () => void
  selected?: boolean
  inParty?: boolean
  showDetail?: boolean
  isDraggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
  matchElement?: boolean
  onEquipClick?: () => void
}) {
  const isDeployed = merc.status === '파견중'
  const isInjured = merc.status === '부상'

  let bg = 'rgba(255,255,255,0.04)'
  let border = 'rgba(255,255,255,0.08)'
  if (isDeployed)  { bg = 'rgba(14,165,233,0.12)'; border = 'rgba(14,165,233,0.5)' }
  else if (selected) { bg = 'rgba(251,191,36,0.15)'; border = 'rgba(251,191,36,0.6)' }
  else if (inParty)  { bg = 'rgba(99,102,241,0.15)'; border = 'rgba(99,102,241,0.5)' }
  else if (isInjured){ bg = 'rgba(239,68,68,0.1)';  border = 'rgba(239,68,68,0.35)' }
  else if (matchElement) { bg = ELEMENT_BG[merc.element]; border = 'rgba(250,204,21,0.5)' }

  return (
    <div
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className="w-full rounded-xl text-left transition-all select-none"
      style={{ padding: '8px 10px', cursor: isDraggable ? 'grab' : 'pointer', opacity: isDragging ? 0.4 : 1, background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <MercAvatar m={merc} size={44} />
          {isDeployed && <span className="absolute -top-1 -right-1 text-sm">⚔</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm font-bold text-white truncate">{merc.name}</span>
            <span className={`text-sm font-bold px-1 rounded ${gradeBg(merc.grade)} text-white`}>{GRADE_STARS[merc.grade]}</span>
            <span className="text-sm text-slate-500">Lv{merc.level}</span>
            <span className={`text-sm font-bold ${ELEMENT_COLOR[merc.element]}`}>{ELEMENT_ICON[merc.element]}</span>
            {matchElement && <span className="text-sm text-yellow-300 font-bold">✦일치</span>}
          </div>
          <div className="text-sm mt-0.5 flex items-center gap-2" style={{ color: 'rgba(150,140,100,0.8)' }}>
            <span>⚔<span className="text-slate-300 font-semibold">{combatPower(merc)}</span></span>
            <span>💚<span className={merc.hp >= 70 ? 'text-emerald-400' : merc.hp >= 40 ? 'text-amber-400' : 'text-red-400'} style={{ fontWeight: 600 }}>{merc.hp}</span></span>
            {canTrap(merc) && merc.trap_disarm > 0 && (
              <span className="text-purple-300">🔧<span className="font-semibold">{merc.trap_disarm}</span></span>
            )}
          </div>
          {showDetail && <div className="mt-1 space-y-0.5">{condBar(merc.condition)}{moraleBar(merc.morale ?? 70)}</div>}
          {showDetail && onEquipClick && (
            <button
              className="text-xs mt-1 px-2 py-0.5 rounded"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}
              onClick={e => { e.stopPropagation(); onEquipClick() }}
            >
              장비
            </button>
          )}
        </div>
        <div className="flex-shrink-0 text-right flex flex-col items-end gap-0.5">
          {isDeployed
            ? <div className="text-sm font-bold rounded px-1.5 py-0.5 text-white" style={{ background: 'rgba(14,165,233,0.4)', border: '1px solid rgba(14,165,233,0.6)' }}>⚔ 파견중</div>
            : isInjured
              ? <div className="text-sm font-bold rounded px-1.5 py-0.5 text-white" style={{ background: 'rgba(239,68,68,0.4)', border: '1px solid rgba(239,68,68,0.6)' }}>🤕 부상</div>
              : <div className="text-sm font-bold text-amber-300">{MISSION_PAY_PER_DAY[merc.grade] ?? 4}G<span className="text-slate-600">/일</span></div>
          }
          {merc.condition < 10 && <div className="text-xs font-bold rounded px-1 py-0.5" style={{ background: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}>⛔파견불가</div>}
          {merc.age >= 30 && <div className="text-xs" style={{ color: 'rgba(180,140,80,0.7)' }}>{merc.age}세</div>}
        </div>
      </div>
    </div>
  )
}

/** 나이가 많을수록 레벨업 시 능력치 상승 감소 (age 20: 100%, age 50: 64%, age 70: 40%) */
function ageLevelFactor(age: number): number {
  return Math.max(0.4, 1 - Math.max(0, age - 20) * 0.012)
}

const GRADE_ORDER: Mercenary['grade'][] = ['D', 'C', 'B', 'A', 'S']

/** 레벨업 후 등급 상승 처리. S급 시작 캐릭터는 등급 상승 없음. */
function applyGradeUp(m: Mercenary, newLevel: number, logLines: string[]): Mercenary {
  if (m.startingGrade === 'S') return m
  if (m.grade === 'S') return m
  if (newLevel % 10 !== 0) return m
  const nextGradeIdx = GRADE_ORDER.indexOf(m.grade) + 1
  if (nextGradeIdx >= GRADE_ORDER.length) return m
  const newGrade = GRADE_ORDER[nextGradeIdx]
  const newPassive = pickRandomPassive(m.passives)
  const newPassives = newPassive ? [...m.passives, newPassive] : m.passives
  const p = newPassive ? findPassive(newPassive) : null
  logLines.push(`⬆ ${m.name} 등급 ${m.grade}→${newGrade} 승급! 패시브 해금: ${p?.name ?? '없음'}`)
  return { ...m, grade: newGrade, passives: newPassives }
}

// ── Quest Calculations (pure, module-level) ───────────────────────────────

function calcSuccessRate(quest: Quest, assignedIds: string[], allMercs: Mercenary[]): number {
  const assigned = assignedIds.filter(Boolean).map(id => allMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
  if (assigned.length === 0) return 0
  const totalEff = assigned.reduce((s, m) => s + effPowerVs(m, quest.element), 0)
  const powerRatio = totalEff / quest.difficulty
  // base: 0 power=10%, 1x=85%, capped 95%
  let rate = Math.round(Math.min(95, powerRatio * 75 + 10))
  // Class bonuses
  const classes = assigned.map(m => m.class)
  if (classes.includes('성직자')) rate = Math.min(95, rate + 8)
  if (classes.includes('전사'))   rate = Math.min(95, rate + 3)
  if (classes.includes('도적') && (quest.trapFocus || quest.conditionDrain >= 20)) rate = Math.min(95, rate + 10)
  // 속성 상성 효과 (상성 이득 → 성공률 보정)
  for (const m of assigned) {
    const rel = elementRelation(m.element, quest.element)
    if (rel === 'advantage') rate = Math.min(95, rate + 10)
    else if (rel === 'disadvantage') rate = Math.max(5, rate - 5)
  }
  // 암흑 속성 + 함정 집중 퀘스트: 추가 보너스
  if (quest.trapFocus && quest.element === '암흑') {
    const darkMatch = assigned.filter(m => m.element === '암흑').length
    rate = Math.min(95, rate + darkMatch * 6)
  }
  // 함정 퀘스트: 도적·궁수의 함정해제 합산이 높으면 보너스
  if (quest.trapFocus) {
    const totalTrap = assigned.filter(m => canTrap(m)).reduce((s, m) => s + m.trap_disarm + eqTrap(m), 0)
    if (totalTrap >= 80) rate = Math.min(95, rate + 10)
    else if (totalTrap >= 50) rate = Math.min(95, rate + 5)
  }
  // Fill ratio penalty
  const fillRatio = assigned.length / quest.slots
  if (fillRatio < 0.5)       rate = Math.max(5, rate - 15)
  else if (fillRatio < 0.75) rate = Math.max(5, rate - 5)
  // 심각한 컨디션 페널티 (개별 적용)
  for (const m of assigned) {
    if (m.condition < 20)      rate = Math.max(5, rate - 35)
    else if (m.condition < 35) rate = Math.max(5, rate - 20)
    else if (m.condition < 50) rate = Math.max(5, rate - 10)
  }
  // 케미 점수 보정
  const chem = calcChemistryScore(assigned)
  if      (chem >= 80) rate = Math.min(95, rate + 12)
  else if (chem < 40)  rate = Math.max(5,  rate - 18)
  else if (chem < 60)  rate = Math.max(5,  rate - 8)
  // 같은 종족 시너지: 파티 내 동일 종족 2명 이상 시 보너스
  const raceCounts = assigned.reduce<Record<string, number>>((acc, m) => {
    acc[m.race] = (acc[m.race] ?? 0) + 1; return acc
  }, {})
  for (const count of Object.values(raceCounts)) {
    if (count >= 2) rate = Math.min(95, rate + (count - 1) * 5)
  }
  // 사기 낮으면 성공률 패널티
  for (const m of assigned) {
    const mor = m.morale ?? 70
    if      (mor < 30) rate = Math.max(5, rate - 15)
    else if (mor < 50) rate = Math.max(5, rate - 8)
  }
  return Math.max(5, Math.min(95, rate))
}

// calcMercDeathRisk — 사망률은 등급이 아닌 퀘스트 종류·파티 구성·능력치 조합으로 결정
// party: 이 퀘스트에 배치된 전체 용병 배열
function calcMercDeathRisk(quest: Quest, merc: Mercenary, party: Mercenary[]): number {
  let risk = quest.deathRisk
  const partySize = party.length

  // ── 0. 파티 전력 vs 요구 전력 — 전력 부족 시 사망률 급증 ──
  const totalPartyEff = party.reduce((s, m) => s + effPowerVs(m, quest.element), 0)
  const powerRatio = totalPartyEff / quest.difficulty
  if      (powerRatio < 0.4) risk *= 5.0   // 심각한 전력 부족: 학살 수준
  else if (powerRatio < 0.6) risk *= 3.0   // 전력 크게 부족
  else if (powerRatio < 0.8) risk *= 1.8   // 전력 부족
  else if (powerRatio < 0.95) risk *= 1.2  // 약간 부족
  else if (powerRatio >= 1.5) risk *= 0.6  // 압도적 전력: 위험 감소

  // ── 1. 퀘스트 종류별 요구 능력치 ──────────────────
  // 함정 퀘스트: 도적·궁수 대폭 생존율 향상
  if (quest.trapFocus && canTrap(merc)) {
    risk *= Math.max(0.2, 1.8 - (merc.trap_disarm + eqTrap(merc)) / 25)
  } else if (quest.conditionDrain >= 20 && canTrap(merc)) {
    risk *= Math.max(0.45, 1.5 - (merc.trap_disarm + eqTrap(merc)) / 40)
  }
  // 전투형 (deathRisk ≥ 0.12): 공격력이 낮으면 적에게 압도됨
  if (quest.deathRisk >= 0.12) {
    const atkFactor = Math.max(0.55, 1.45 - (merc.stats.공격력 + eqAtk(merc)) / 55)
    risk *= atkFactor
  }
  // 장기 원정형 (duration ≥ 4): 생존율이 시간에 따라 복리로 중요해짐
  if (quest.duration >= 4) {
    const durFactor = Math.max(0.5, 1.35 - (merc.stats.생존율 + eqSurv(merc)) / 75)
    risk *= durFactor
  }

  // ── 2. 개인 생존율 스탯 (항상 적용) ──────────────
  risk *= Math.max(0.28, 1 - (merc.stats.생존율 + eqSurv(merc)) / 120)
  // ── 2b. 심각한 컨디션 패널티 ─────────────────────
  if      (merc.condition < 20) risk *= 4.0
  else if (merc.condition < 35) risk *= 2.5
  else if (merc.condition < 50) risk *= 1.5

  // ── 3. 파티 구성 시너지 ────────────────────────────
  const partyClasses = party.map(m => m.class)
  const hasHealer  = partyClasses.includes('성직자')
  const hasTank    = partyClasses.includes('전사')
  const hasRogue   = partyClasses.includes('도적')

  // 성직자: 파티 전원 회복 → 사망률 대폭 감소
  if (hasHealer) risk *= 0.65
  // 전사: 취약 클래스(성직자·마법사) 우선 보호
  if (hasTank && merc.class !== '전사') {
    risk *= (merc.class === '성직자' || merc.class === '마법사') ? 0.65 : 0.82
  }
  // 도적/궁수: 함정 퀘스트에서 파티 전원 보호
  if (quest.trapFocus && (hasRogue || partyClasses.includes('궁수'))) risk *= 0.70

  // ── 4. 소규모 파티 페널티 — 등급 무관, 스탯 기반 ─
  if (partySize < 3) {
    // 지원 부재 시 개인 생존율에 따라 패널티가 달라짐
    // 생존율 100이면 패널티 없음, 0이면 최대 2.0배
    const survNorm = merc.stats.생존율 / 100  // 0~1
    const backupPenalty = 1.0 + (1 - partySize / 3) * (1.2 - survNorm * 0.9)
    risk *= backupPenalty
  }

  // ── 5. 파티 평균 협조성 — 높을수록 유기적 전술 가능 ──
  const avgCoop = party.reduce((s, m) => s + m.traits.cooperation, 0) / partySize
  const coopFactor = Math.max(0.72, 1.25 - avgCoop / 65)
  risk *= coopFactor

  // ── 6. 직업별 고유 사망률 특성 ──────────────────────
  if (merc.class === '마법사') risk *= 1.40  // 공격력↑ 생존력↓
  if (merc.class === '성직자') risk *= 1.30  // 전투 취약 (전사 동행 시 완화)
  if (merc.class === '전사')   risk *= 0.88

  // ── 7. 파티 내 상대 전력 — 가장 약한 유닛이 먼저 쓰러짐 ──
  // 파티 평균 실효 전력 대비 이 유닛이 얼마나 약한가를 사망률에 반영
  // relStrength < 1 → 평균보다 약함 → 사망률 급증
  // relStrength > 1 → 평균보다 강함 → 사망률 완만 감소
  if (partySize >= 2) {
    const partyAvgEff = party.reduce((s, m) => s + effPowerVs(m, quest.element), 0) / partySize
    const mercEff = effPowerVs(merc, quest.element)
    const relStrength = mercEff / Math.max(1, partyAvgEff)
    // pow(1/rel, 0.75): rel=1.0 → ×1.0, rel=0.5 → ×1.68, rel=0.3 → ×2.4, rel=1.5 → ×0.74
    const relFactor = Math.max(0.65, Math.min(2.4, Math.pow(1 / Math.max(0.1, relStrength), 0.75)))
    risk *= relFactor
  }

  // ── 7b. 케미 점수 보정 ──────────────────────────────
  const chem = calcChemistryScore(party)
  if      (chem >= 80) risk *= 0.78
  else if (chem < 40)  risk *= 1.30
  else if (chem < 60)  risk *= 1.12

  // ── 8. 속성 일치/상성 사망률 보정 ──────────────────────
  const elemRel = elementRelation(merc.element, quest.element)
  if (elemRel === 'match')             risk *= 0.50
  else if (elemRel === 'advantage')    risk *= 0.85
  else if (elemRel === 'disadvantage') risk *= 1.15
  // ── 9. 패시브 사망률 보정 ──────────────────────────────
  risk *= passiveDeathMod(merc)

  return Math.min(0.98, Math.max(0.01, risk))
}

// ── Save System ────────────────────────────────────────────────────────────

const SAVE_KEY = 'sma_guild_saves'
const NUM_SAVE_SLOTS = 3

function loadAllSaveSlots(): (SaveSlotData | null)[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return Array(NUM_SAVE_SLOTS).fill(null)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : Array(NUM_SAVE_SLOTS).fill(null)
  } catch {
    return Array(NUM_SAVE_SLOTS).fill(null)
  }
}

// ── Main App ───────────────────────────────────────────────────────────────

function App() {
  // ── State ────────────────────────────────────────
  const [mercs, setMercs] = useState<Mercenary[]>(initialMercenaries)
  const [activeQuests, setActiveQuests] = useState<ActiveQuest[]>([])
  const [gateArrivals, setGateArrivals] = useState<Mercenary[]>(() =>
    Array.from({ length: 4 }, () => generateMercenary(0))
  )
  const ARRIVAL_INTERVAL_MS = 8 * 60 * 60 * 1000  // 8시간
  const MORALE_DROP_INTERVAL_MS = 12 * 60 * 60 * 1000  // 12시간
  const [nextArrivalTime, setNextArrivalTime] = useState(() => Date.now() + ARRIVAL_INTERVAL_MS)
  const [nextMoraleDropAt, setNextMoraleDropAt] = useState(() => Date.now() + MORALE_DROP_INTERVAL_MS)
  const [buildings, setBuildings] = useState<GuildBuildings>({
    hall: 1, barracks: 1, training: 1, tavern: 0, infirmary: 0
  })
  const [state, setState] = useState<CampaignState>({
    day: 1, gold: 380, fame: 5, morale: 80, crystals: 5,
    lastDayDate: new Date().toISOString().slice(0, 10),
  })
  const [questLog, setQuestLog] = useState<string[]>(['길드가 설립되었습니다. 계약을 수행해 명성을 쌓으세요.'])

  // UI state
  const [selectedMercId, setSelectedMercId] = useState<string | null>(null)
  const [pendingAssign, setPendingAssign] = useState<Record<string, string[]>>({}) // questId → mercIds[]
  const [selectedMercDetail, setSelectedMercDetail] = useState<Mercenary | null>(null)
  const [activeTab, setActiveTab] = useState<'quests' | 'buildings'>('quests')
  const [showTutorial, setShowTutorial] = useState(true)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [activeHint, setActiveHint] = useState<typeof HINT_STEPS[0] | null>(null)
  const shownHintsRef = useRef<Set<string>>(loadShownHints())
  const [draggingMercId, setDraggingMercId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<RoomId | null>('식당')
  const [dropTargetRoom, setDropTargetRoom] = useState<RoomId | null>(null)
  const [sceneFocusId, setSceneFocusId] = useState<SceneFocusId | null>(null)
  const [manualSceneCamera, setManualSceneCamera] = useState<{ scale: number; origin: string } | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showQuestModal, setShowQuestModal] = useState(false)
  const [showMercModal, setShowMercModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showSoulOverflowModal, setShowSoulOverflowModal] = useState(false)
  const [battleResults, setBattleResults] = useState<Array<{ questName: string; success: boolean; lines: string[] }>>([])
  const [battleResultPage, setBattleResultPage] = useState(0)
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([])
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [storyContent, setStoryContent] = useState<{ questName: string; chainName: string; title: string; lines: string[] } | null>(null)
  const [saveSlots, setSaveSlots] = useState<(SaveSlotData | null)[]>(loadAllSaveSlots)
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / 1600, window.innerHeight / 900))
  const [zoomDelta, setZoomDelta] = useState(0)
  const [previewArrival, setPreviewArrival] = useState<Mercenary | null>(null)
  const [roomMercPreview, setRoomMercPreview] = useState<Mercenary | null>(null)
  const [buildingWidth, setBuildingWidth] = useState<number>(() => {
    try { const v = localStorage.getItem('gm_buildingWidth'); return v ? Number(v) : 58 } catch { return 58 }
  })
  const buildingResizeRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const sceneTouchRef = useRef<{ distance: number; centerX: number; centerY: number } | null>(null)
  const handleBuildingResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    buildingResizeRef.current = { startX: e.clientX, startWidth: buildingWidth }
    const onMove = (ev: MouseEvent) => {
      if (!buildingResizeRef.current) return
      const dx = ev.clientX - buildingResizeRef.current.startX
      const effectiveScale = Math.max(0.5, Math.min(1.5, scale + zoomDelta))
      const pctDelta = (dx / effectiveScale / 1600) * 100
      setBuildingWidth(w => Math.min(75, Math.max(35, buildingResizeRef.current!.startWidth - pctDelta)))
    }
    const onUp = () => {
      buildingResizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  // ── Room overlay insets (% of building area) — drag-adjustable ───────────
  const [roomInsets, setRoomInsets] = useState<{ top: number; left: number; right: number; bottom: number }>(() => {
    try { const v = localStorage.getItem('gm_roomInsets'); return v ? JSON.parse(v) : { top: 4, left: 9, right: 11, bottom: 1 } } catch { return { top: 4, left: 9, right: 11, bottom: 1 } }
  })
  const roomResizeRef = useRef<{ edge: 'top'|'left'|'right'|'bottom'; startPos: number; startVal: number } | null>(null)
  const handleRoomEdgeDrag = (edge: 'top'|'left'|'right'|'bottom') => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const isVertical = edge === 'top' || edge === 'bottom'
    roomResizeRef.current = { edge, startPos: isVertical ? e.clientY : e.clientX, startVal: roomInsets[edge] }
    const onMove = (ev: MouseEvent) => {
      if (!roomResizeRef.current) return
      const effectiveScale = Math.max(0.5, Math.min(1.5, scale + zoomDelta))
      const dim = isVertical ? 900 : 1600
      const delta = ((isVertical ? ev.clientY : ev.clientX) - roomResizeRef.current.startPos) / effectiveScale / dim * 100
      const signed = (edge === 'top' || edge === 'left') ? delta : -delta
      setRoomInsets(prev => ({ ...prev, [edge]: Math.max(0, Math.min(30, roomResizeRef.current!.startVal + signed)) }))
    }
    const onUp = () => {
      roomResizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    try { localStorage.setItem('gm_buildingWidth', String(buildingWidth)) } catch { /* ignore */ }
  }, [buildingWidth])
  useEffect(() => {
    try { localStorage.setItem('gm_roomInsets', JSON.stringify(roomInsets)) } catch { /* ignore */ }
  }, [roomInsets])

  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const [questPool, setQuestPool] = useState<string[]>(() => drawQuestPool(1, [], 5))
  const [roomLevels, setRoomLevels] = useState<Record<string, number>>({ 길드마스터룸: 1, 훈련소: 1, 식당: 1 })
  // Equipment / Merchant / Dungeon state
  const [guildInventory, setGuildInventory] = useState<Equipment[]>([])
  const [merchantState, setMerchantState] = useState<MerchantState | null>(null)
  const [activeDungeon, setActiveDungeon] = useState<ActiveDungeon | null>(null)
  const [activeExpedition, setActiveExpedition] = useState<ActiveExpedition | null>(null)
  const [expeditionNextAt, setExpeditionNextAt] = useState(0)
  const [showEquipModal, setShowEquipModal] = useState<string | null>(null)
  const [showMerchant, setShowMerchant] = useState(false)
  const [showDungeon, setShowDungeon] = useState(false)
  const [showExpedition, setShowExpedition] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<Equipment | null>(null)
  const [questsCompletedToday, setQuestsCompletedToday] = useState(0)
  const [deathsToday, setDeathsToday] = useState(0)
  const [goalsClaimed, setGoalsClaimed] = useState<Set<string>>(new Set())

  // ── Derived ──────────────────────────────────────
  const deployedMercIds = useMemo(
    () => new Set([
      ...activeQuests.flatMap(aq => aq.assignedMercIds),
      ...(activeExpedition && !activeExpedition.result ? activeExpedition.assignedMercIds : []),
    ]),
    [activeQuests, activeExpedition]
  )
  const pendingMercIds = useMemo(
    () => new Set(Object.values(pendingAssign).flat()),
    [pendingAssign]
  )
  const activeMercCount = useMemo(
    () => mercs.filter(m => m.status !== '영혼').length,
    [mercs]
  )
  const roomOperations = useMemo(() => {
    const diningLv = roomLevels['식당'] ?? 1
    return ROOM_NAMES.map(room => {
      const roomLv = roomLevels[room] ?? 1
      const occupants = mercs.filter(m => m.room === room && m.status === '대기중' && !pendingMercIds.has(m.id))
      const cap = room === '길드마스터룸'
        ? masterCapacity(roomLv)
        : room === '훈련소'
        ? trainingCapacity(roomLv)
        : maxHireCap(diningLv)
      const nextCost = ROOM_UPGRADE_COSTS[room]?.[roomLv - 1] ?? 0
      const canUpgrade = room === '길드마스터룸'
        ? roomLv < 3 && roomLv < masterRoomMaxLevel(state.fame)
        : roomLv < 3 && roomLv < (roomLevels['길드마스터룸'] ?? 1)
      const blocked = room === '길드마스터룸'
        ? roomLv >= masterRoomMaxLevel(state.fame) && roomLv < 3
        : roomLv >= (roomLevels['길드마스터룸'] ?? 1) && roomLv < 3
      const status = occupants.length === 0
        ? '비어 있음'
        : occupants.length >= cap
        ? '가득 참'
        : '운영 중'
      const action = room === '길드마스터룸'
        ? `배치 효과: ${ROOM_EFFECTS[room].desc[roomLv - 1]}`
        : room === '훈련소'
        ? `오늘 훈련 가능: ${Math.min(occupants.length, cap)}/${cap}명`
        : `음식 판매 예상: +${calcDiningSalesIncome(roomLv, occupants, state.morale)}G/일`
      const subAction = room === '식당'
        ? `판매 담당 ${Math.min(occupants.length, diningSalesCapacity(roomLv))}/${diningSalesCapacity(roomLv)}명 · 고용 한도 ${activeMercCount}/${cap}명`
        : ''
      const nextEffect = roomLv < 3 ? ROOM_EFFECTS[room].desc[roomLv] : '최대 레벨'
      const recommendation = room === '길드마스터룸'
        ? '주력 용병을 배치해 호감도와 실효 전력을 키우세요.'
        : room === '훈련소'
        ? '저레벨 용병을 배치하면 매일 경험치를 얻습니다.'
        : '남는 대기 용병을 배치하면 음식 판매 수익이 납니다.'
      return { room, roomLv, occupants, cap, nextCost, canUpgrade, blocked, status, action, subAction, nextEffect, recommendation }
    })
  }, [activeMercCount, mercs, pendingMercIds, roomLevels, state.fame, state.morale])
  const selectedRoomOperation = useMemo(
    () => roomOperations.find(r => r.room === selectedRoomId) ?? null,
    [roomOperations, selectedRoomId]
  )
  const sceneFocus = sceneFocusId ? SCENE_FOCUS[sceneFocusId] : null
  const sceneCamera = manualSceneCamera
    ? { ...manualSceneCamera, label: '사용자 확대' }
    : sceneFocus
      ? sceneFocus
      : { scale: 1, origin: 'center center', label: '' }
  const isSceneZoomed = sceneCamera.scale > SCENE_RESET_ZOOM
  const focusRoom = (room: RoomId) => {
    setSelectedRoomId(room)
    setManualSceneCamera(null)
    setSceneFocusId(room)
  }
  const resetSceneCamera = () => {
    setManualSceneCamera(null)
    setSceneFocusId(null)
  }
  const zoomSceneAt = useCallback((clientX: number, clientY: number, delta: number) => {
    const target = document.querySelector('[data-scene-viewport="true"]') as HTMLElement | null
    if (!target) return
    const rect = target.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    const currentScale = manualSceneCamera?.scale ?? sceneFocus?.scale ?? 1
    const nextScale = Math.max(SCENE_MIN_ZOOM, Math.min(SCENE_MAX_ZOOM, currentScale + delta))
    if (nextScale <= SCENE_RESET_ZOOM) {
      resetSceneCamera()
      return
    }
    setSceneFocusId(null)
    setManualSceneCamera({ scale: nextScale, origin: `${x.toFixed(1)}% ${y.toFixed(1)}%` })
  }, [manualSceneCamera?.scale, sceneFocus?.scale])
  const handleSceneWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (showQuestModal || showMercModal || previewArrival || roomMercPreview || showSaveModal || showLogModal || showTutorial) return
    e.preventDefault()
    const sensitivity = e.ctrlKey ? 0.006 : 0.0018
    zoomSceneAt(e.clientX, e.clientY, -e.deltaY * sensitivity)
  }, [previewArrival, roomMercPreview, showLogModal, showMercModal, showQuestModal, showSaveModal, showTutorial, zoomSceneAt])
  const getTouchCameraPoint = (touches: React.TouchList) => {
    const a = touches[0]
    const b = touches[1]
    const centerX = (a.clientX + b.clientX) / 2
    const centerY = (a.clientY + b.clientY) / 2
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    return { centerX, centerY, distance }
  }
  const handleSceneTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) {
      sceneTouchRef.current = null
      return
    }
    sceneTouchRef.current = getTouchCameraPoint(e.touches)
  }, [])
  const handleSceneTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !sceneTouchRef.current) return
    e.preventDefault()
    const next = getTouchCameraPoint(e.touches)
    const prev = sceneTouchRef.current
    const pinchDelta = (next.distance - prev.distance) / 180
    const verticalDragDelta = (prev.centerY - next.centerY) / 520
    zoomSceneAt(next.centerX, next.centerY, pinchDelta + verticalDragDelta)
    sceneTouchRef.current = next
  }, [zoomSceneAt])
  const handleSceneTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) sceneTouchRef.current = null
  }, [])
  // ── Game logic ───────────────────────────────────

  const log = (msg: string) => setQuestLog(prev => [...prev, msg].slice(-20))

  // ── Equipment / Merchant / Dungeon hooks ─────────────────────────────────
  const { buyFromMerchant } = useMerchant({
    merchantState,
    setMerchantState,
    guildLevel: computeGuildLevel(state.fame),
    log,
  })

  const { onFloorCleared, onFloorFailed, abandonDungeon } = useDungeon({
    activeDungeon,
    setActiveDungeon,
    guildInventory,
    setGuildInventory,
    log,
    onReward: (gold, fame) => {
      setState(prev => ({ ...prev, gold: prev.gold + gold, fame: prev.fame + fame }))
    },
  })

  const showHint = useCallback((id: string) => {
    if (shownHintsRef.current.has(id)) return
    const hint = HINT_STEPS.find(h => h.id === id)
    if (!hint) return
    shownHintsRef.current.add(id)
    persistShownHints(shownHintsRef.current)
    setActiveHint(hint)
  }, [])

  // 용병 고용 힌트: 인트로 닫힌 후 첫 도착 용병 확인 시
  useEffect(() => {
    if (!showTutorial && gateArrivals.length > 0) showHint('hire')
  }, [showTutorial, gateArrivals.length, showHint])

  // 퀘스트 힌트: 계약 관리 패널 처음 열 때
  useEffect(() => {
    if (showQuestModal) showHint('quest')
  }, [showQuestModal, showHint])

  // 자원 관리 힌트: Day 2로 넘어갈 때
  useEffect(() => {
    if (state.day >= 2) showHint('economy')
  }, [state.day, showHint])

  // 성장 힌트: 첫 퀘스트 성공 후
  useEffect(() => {
    if (questLog.some(l => l.startsWith('✅'))) showHint('growth')
  }, [questLog, showHint])

  const hireMerc = (merc: Mercenary) => {
    if (state.gold < merc.cost) { log(`금화 부족: ${merc.name} 고용 불가 (${merc.cost}G 필요)`); return }
    const hireCap = maxHireCap(roomLevels['식당'] ?? 1)
    if (mercs.length >= hireCap) { log(`고용 한도 초과! 식당을 업그레이드하세요. (최대 ${hireCap}명)`); return }
    setState(prev => ({ ...prev, gold: prev.gold - merc.cost }))
    setMercs(prev => [...prev, { ...merc, status: '대기중', room: '식당' }])
    setGateArrivals(prev => prev.filter(m => m.id !== merc.id))
    log(`${merc.name}(${merc.grade}급 ${merc.class}) 고용! -${merc.cost}G`)
  }

  const refreshArrivals = () => {
    if (state.gold < ARRIVAL_REFRESH_COST) { log(`금화 부족: 새로고침 불가 (${ARRIVAL_REFRESH_COST}G)`); return }
    setState(prev => ({ ...prev, gold: prev.gold - ARRIVAL_REFRESH_COST }))
    const diningLv = roomLevels['식당'] ?? 1
    const cnt = arrivalCount(buildings.barracks) + diningArrivalBonus(diningLv)
    const recruitLevel = rollRecruitLevel(buildings)
    setGateArrivals(Array.from({ length: cnt }, () => generateMercenary(buildings.tavern + diningTavernBonus(diningLv), false, { level: recruitLevel })))
    log(`🔄 도착 목록 새로고침 (-${ARRIVAL_REFRESH_COST}G) · 신병 Lv${recruitLevel}`)
  }

  const premiumRefreshArrivals = () => {
    const crystals = state.crystals ?? 0
    if (crystals < PREMIUM_REFRESH_COST) { log(`수정 부족: 고급 새로고침 불가 (💎${PREMIUM_REFRESH_COST} 필요)`); return }
    setState(prev => ({ ...prev, crystals: (prev.crystals ?? 0) - PREMIUM_REFRESH_COST }))
    const diningLv = roomLevels['식당'] ?? 1
    const cnt = arrivalCount(buildings.barracks) + diningArrivalBonus(diningLv)
    const recruitLevel = rollRecruitLevel(buildings)
    setGateArrivals(Array.from({ length: cnt }, () => generateMercenary(buildings.tavern + diningTavernBonus(diningLv), true, { level: recruitLevel })))
    log(`💎 고급 새로고침! B급 이상 보장 · 신병 Lv${recruitLevel} (-${PREMIUM_REFRESH_COST}💎)`)
  }

  const dismissArrival = (mercId: string) => {
    setGateArrivals(prev => prev.filter(m => m.id !== mercId))
  }

  const DEPARTURE_NOTICE_MS = 7 * 24 * 60 * 60 * 1000  // 7 real days

  const dismissMerc = (merc: Mercenary) => {
    if (merc.status === '파견중') { log(`${merc.name}은 파견 중이라 해고할 수 없습니다.`); return }
    if (merc.leavingAt) { log(`${merc.name}은 이미 퇴단 예고 중입니다.`); return }
    const leavingAt = Date.now() + DEPARTURE_NOTICE_MS
    setMercs(prev => prev.map(m => m.id === merc.id ? { ...m, leavingAt } : m))
    setSelectedMercDetail(null)
    setRoomMercPreview(null)
    log(`📜 ${merc.name}이(가) 퇴단을 예고했습니다. 7일 후 길드를 떠납니다.`)
  }

  /** Roll for quest drop and dungeon trigger */
  const rollQuestExtras = (
    quest: Quest,
    success: boolean,
    existingDungeon: ActiveDungeon | null,
  ): { drop: Equipment | null; dungeon: ActiveDungeon | null } => {
    if (!success) return { drop: null, dungeon: null }
    const drop = rollQuestDrop(quest.difficulty)
    let dungeon: ActiveDungeon | null = null
    if (!existingDungeon) {
      const tier = questTier(quest.difficulty)
      if (Math.random() < DUNGEON_TRIGGER_CHANCE[tier]) {
        dungeon = createDungeon(quest.difficulty, tier)
      }
    }
    return { drop, dungeon }
  }

  const equipItem = (mercId: string, slot: EquipSlot, itemId: string | null) => {
    setMercs(prev => prev.map(m => {
      if (m.id !== mercId) return m
      const oldId = m.equipment[slot]
      let newInventory = [...guildInventory]
      if (itemId) newInventory = newInventory.filter(e => e.id !== itemId)
      if (oldId) {
        const oldItem = findEquip(oldId)
        if (oldItem) newInventory = [...newInventory, oldItem]
      }
      setGuildInventory(() => newInventory)
      return { ...m, equipment: { ...m.equipment, [slot]: itemId } }
    }))
  }

  const acceptDrop = (item: Equipment) => {
    if (guildInventory.length >= 40) {
      log('인벤토리 가득 참 — 전리품 획득 불가')
      setPendingDrop(null)
      return
    }
    setGuildInventory(prev => [...prev, item])
    log(`[${item.icon} ${item.name} ${item.grade}등급] 길드 인벤토리에 추가!`)
    setPendingDrop(null)
  }

  const rejectDrop = (item: Equipment) => {
    const candidates = mercs.filter(m => m.status !== '영혼' && m.status !== '파견중')
    const target = candidates.find(m => {
      const currentId = m.equipment[item.slot]
      if (!currentId) return true
      const current = findEquip(currentId)
      return current ? powerScore(item) > powerScore(current) : true
    })
    if (target && Math.random() < 0.7) {
      equipItem(target.id, item.slot, item.id)
      log(`${target.name} 새 장비 [${item.name}] 착용`)
      setMercs(prev => prev.map(m => m.id === target.id ? { ...m, morale: Math.min(100, (m.morale ?? 70) + 8) } : m))
    } else {
      log(`[${item.name}] 소멸`)
    }
    setPendingDrop(null)
  }

  const assignMerc = (questId: string, slotIdx: number) => {
    if (!selectedMercId) return
    const quest = ALL_QUESTS.find(q => q.id === questId)
    if (!quest) return
    setPendingAssign(prev => {
      const current = prev[questId] ?? Array(quest.slots).fill(null) as (string|null)[]
      const next = [...current] as (string|null)[]
      // Remove this merc from any other slot first
      for (let i = 0; i < next.length; i++) if (next[i] === selectedMercId) next[i] = null
      next[slotIdx] = selectedMercId
      return { ...prev, [questId]: next as string[] }
    })
    setSelectedMercId(null)
  }

  const unassignMerc = (questId: string, slotIdx: number) => {
    setPendingAssign(prev => {
      const current = [...(prev[questId] ?? [])] as (string|null)[]
      current[slotIdx] = null
      return { ...prev, [questId]: current as string[] }
    })
  }

  const launchQuest = (questId: string) => {
    const quest = ALL_QUESTS.find(q => q.id === questId)!
    const slots = (pendingAssign[questId] ?? []).filter(Boolean)
    if (slots.length < 1) {
      log('용병을 최소 1명 배치해야 파견할 수 있습니다.')
      return
    }

    const assignedMercs = slots.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
    // 컨디션 10 미만 → 파견 불가
    const tooTired = assignedMercs.filter(m => m.condition < 10)
    if (tooTired.length > 0) {
      log(`⛔ ${tooTired.map(m => m.name).join(', ')} — 컨디션 10 미만으로 파견 불가. 회복시키세요.`)
      return
    }
    const durationMs = calcQuestDurationMs(quest, assignedMercs)
    const completesAt = Date.now() + durationMs
    const mins = Math.round(durationMs / 60000)
    const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`
    const newAQ: ActiveQuest = { questId, assignedMercIds: slots, completesAt, durationMs }
    setActiveQuests(prev => [...prev, newAQ])
    setMercs(prev => prev.map(m => slots.includes(m.id) ? { ...m, status: '파견중' } : m))
    setPendingAssign(prev => { const n = { ...prev }; delete n[questId]; return n })
    setNextMoraleDropAt(Date.now() + MORALE_DROP_INTERVAL_MS)
    log(`[${quest.name}] 파견 출발! (${timeStr} 소요, ${slots.length}명)`)

    // 풀의 모든 퀘스트가 파견됐으면 즉시 재충전
    const afterActiveIds = [...activeQuests.map(aq => aq.questId), questId]
    if (questPool.every(id => afterActiveIds.includes(id))) {
      setQuestPool(drawQuestPool(buildings.hall, afterActiveIds, state.fame, completedQuestIds))
      log('📋 모든 계약 수주 완료! 새 계약이 갱신되었습니다.')
    }
  }

  const cancelPending = (questId: string) => {
    setPendingAssign(prev => { const n = { ...prev }; delete n[questId]; return n })
  }

  const reviveMerc = (mercId: string) => {
    const merc = mercs.find(m => m.id === mercId)
    if (!merc || merc.status !== '영혼') return
    const cost = merc.deathCost
    if (state.gold < cost) { log(`금화 부족 — 부활 불가 (${cost}G 필요)`); return }
    setState(prev => ({ ...prev, gold: prev.gold - cost }))
    setMercs(prev => prev.map(m => m.id === mercId
      ? { ...m, status: '부상', hp: 10, condition: 10, favorability: Math.max(0, m.favorability - 20) }
      : m))
    log(`✨ ${merc.name} 부활! (-${cost}G) — 극도로 쇠약한 상태, 회복에 시간이 필요합니다`)
  }

  // ── 정기 원정 ─────────────────────────────────────────────────────────────
  const EXPEDITION_DURATION_MS = 6 * 60 * 60 * 1000   // 6시간
  const EXPEDITION_COOLDOWN_MS = 12 * 60 * 60 * 1000  // 12시간 쿨다운

  const launchExpedition = (mercIds: string[]) => {
    if (mercIds.length === 0) { log('원정에 보낼 용병을 선택하세요'); return }
    if (activeExpedition && !activeExpedition.result) { log('이미 원정 중입니다'); return }
    if (expeditionNextAt > Date.now()) { log('원정 쿨다운 중입니다'); return }
    const assigned = mercIds.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
    const partyPower = assigned.reduce((s, m) => s + effPower(m), 0)
    // 경쟁자 전력 생성 (플레이어 전력 기준 ±40%)
    const spread = partyPower * 0.4
    const npcCount = 5 + Math.floor(Math.random() * 4)  // 6~9팀
    const npcScores = Array.from({ length: npcCount }, () =>
      Math.round(partyPower * 0.6 + Math.random() * spread * 2)
    )
    const now = Date.now()
    const expedition: ActiveExpedition = {
      id: `exp-${now}`,
      assignedMercIds: mercIds,
      startedAt: now,
      completesAt: now + EXPEDITION_DURATION_MS,
      npcScores,
      nextAvailableAt: now + EXPEDITION_DURATION_MS + EXPEDITION_COOLDOWN_MS,
    }
    setActiveExpedition(expedition)
    setMercs(prev => prev.map(m => mercIds.includes(m.id) ? { ...m, status: '파견중' } : m))
    setShowExpedition(true)
    log(`⚔ 원정 출발! ${assigned.map(m => m.name).join(', ')} — 6시간 후 귀환`)
  }

  const claimExpedition = () => {
    if (!activeExpedition?.result) return
    const { result } = activeExpedition
    setState(prev => ({
      ...prev,
      gold: prev.gold + result.goldReward,
      fame: prev.fame + result.fameReward,
      crystals: (prev.crystals ?? 0) + (result.crystalReward ?? 0),
    }))
    if (result.equipReward) {
      setGuildInventory(prev => [...prev, result.equipReward!])
    }
    const xpEach = result.xpReward
    setMercs(prev => prev.map(m => {
      if (!activeExpedition.assignedMercIds.includes(m.id)) return m
      const { xpMod } = getMercPassiveStats(m.passives ?? [])
      const xpGain = Math.round(xpEach * (1 + xpMod))
      let exp = m.experience + xpGain, level = m.level, expToNext = m.expToNext
      const logLines: string[] = []
      let updated = m
      while (exp >= expToNext && level < 50) {
        exp -= expToNext; level++; expToNext = EXP_TO_NEXT(level)
        updated = applyGradeUp(updated, level, logLines)
      }
      const sb = level - m.level
      const af = ageLevelFactor(m.age)
      logLines.forEach(l => log(l))
      return { ...updated, status: '대기중', level, experience: exp, expToNext,
        power: m.power + Math.round(sb * 4 * af),
        trap_disarm: m.trap_disarm + Math.round(sb * 2 * af),
        stats: { 공격력: m.stats.공격력 + Math.round(sb * 2 * af), 함정해제: m.stats.함정해제 + Math.round(sb * 2 * af),
                 생존율: m.stats.생존율 + Math.round(sb * 2 * af), 협조성: m.stats.협조성 + Math.round(sb * af) } }
    }))
    setExpeditionNextAt(activeExpedition.nextAvailableAt)
    setActiveExpedition(null)
    setShowExpedition(false)
    const equipMsg = result.equipReward ? `, 장비 [${result.equipReward.name}]` : ''
    log(`💰 원정 보상: ${result.goldReward}G, 명성 +${result.fameReward}, 💎 ${result.crystalReward ?? 0}, 경험치 +${result.xpReward}${equipMsg}`)
  }

  const freezeMercAge = (mercId: string) => {
    const merc = mercs.find(m => m.id === mercId)
    if (!merc) return
    if ((state.crystals ?? 0) < 3) { log('💎 수정 3개 필요 — 나이 동결 불가'); return }
    const freezeMs = 7 * 24 * 60 * 60 * 1000  // 실제 7일
    setState(prev => ({ ...prev, crystals: (prev.crystals ?? 0) - 3 }))
    setMercs(prev => prev.map(m => m.id === mercId ? { ...m, ageLockedUntil: Date.now() + freezeMs } : m))
    log(`✨ ${merc.name}의 나이를 30일간 동결했습니다 (-3💎)`)
  }

  const ascendMerc = (mercId: string) => {
    const merc = mercs.find(m => m.id === mercId)
    if (!merc || merc.status !== '영혼') return
    setState(prev => ({ ...prev, crystals: (prev.crystals ?? 0) + 1 }))
    setMercs(prev => prev.filter(m => m.id !== mercId))
    log(`🕊 ${merc.name} 성불. 수정 +1 (추모)`)
  }

  const instantCompleteQuest = (questId: string) => {
    const aq = activeQuests.find(a => a.questId === questId)
    if (!aq) return
    if (state.crystals < 1) { log('💎 수정 부족 — 즉시 완료 불가'); return }
    const quest = ALL_QUESTS.find(q => q.id === questId)!
    let g = state.gold, fame = state.fame, morale = state.morale
    let nextMercs = [...mercs]
    const questLines: string[] = []
    let questSuccessCount = 0
    let questDeaths = 0

    nextMercs = nextMercs.map(m => {
      if (!aq.assignedMercIds.includes(m.id)) return m
      const drain = (m.element === '얼음' && quest.element === '얼음')
        ? Math.round(quest.conditionDrain * 0.5)
        : quest.conditionDrain
      return { ...m, condition: Math.max(0, m.condition - drain) }
    })
    const assignedMercs = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
    const success = Math.random() < calcSuccessRate(quest, aq.assignedMercIds, nextMercs) / 100

    if (success) {
      questSuccessCount++
      fame += quest.reward.fame
      morale = Math.min(100, morale + 5)
      const totalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
      const rewardGold = quest.reward.gold
      const guildGold = Math.max(0, rewardGold - totalWages)
      g += guildGold
      const wageFullyPaid = rewardGold >= totalWages
      if (wageFullyPaid) {
        questLines.push(`💰 길드 수입 +${guildGold}G  명성 +${quest.reward.fame}`)
        if (totalWages > 0) questLines.push(`💼 급여 전액 지급 (${totalWages}G)`)
      } else {
        questLines.push(`🌟 명성 +${quest.reward.fame}`)
        questLines.push(`⚠ 보상(${rewardGold}G) < 급여(${totalWages}G): 길드 수입 없음`)
      }
      const baseXpGain = Math.round(quest.reward.exp * xpMultiplier(buildings.training))
      nextMercs = nextMercs.map(m => {
        if (!aq.assignedMercIds.includes(m.id)) return m
        const { xpMod } = getMercPassiveStats(m.passives ?? [])
        const xpGain = Math.round(baseXpGain * (1 + xpMod))
        let exp = m.experience + xpGain, level = m.level, expToNext = m.expToNext
        let updated = m
        while (exp >= expToNext && level < 50) {
          exp -= expToNext; level++; expToNext = EXP_TO_NEXT(level)
          questLines.push(`⬆ ${updated.name} Lv${level - 1}→Lv${level} 레벨업!`)
          updated = applyGradeUp(updated, level, questLines)
        }
        const sb = level - m.level
        const af = ageLevelFactor(m.age)
        return { ...updated, level, experience: exp, expToNext,
          favorability: Math.min(100, m.favorability + 5),
          morale: Math.min(100, (m.morale ?? 70) + 10),
          power: m.power + Math.round(sb * 4 * af),
          trap_disarm: m.trap_disarm + Math.round(sb * 2 * af),
          stats: { 공격력: m.stats.공격력 + Math.round(sb * 2 * af), 함정해제: m.stats.함정해제 + Math.round(sb * 2 * af),
                   생존율: m.stats.생존율 + Math.round(sb * 2 * af), 협조성: m.stats.협조성 + Math.round(sb * af) } }
      })
      if (!wageFullyPaid && totalWages > 0) {
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          const expectedWage = (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration
          const actualWage = Math.floor(rewardGold * expectedWage / totalWages)
          const deficit = expectedWage - actualWage
          const favPenalty = Math.max(1, Math.ceil((deficit / expectedWage) * 20))
          questLines.push(`😒 ${m.name} 급여 미달(${actualWage}/${expectedWage}G) 호감도 -${favPenalty}`)
          return { ...m, favorability: Math.max(0, m.favorability - favPenalty) }
        })
      }
      const instSuccessDeadIds: string[] = []
      if (aq.assignedMercIds.length < 3) {
        const party = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
        for (const mid of aq.assignedMercIds) {
          const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
          if (Math.random() < calcMercDeathRisk(quest, merc, party) * 0.35) {
            nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '영혼' as const, room: '길드마스터룸' as const, hp: 0, condition: 0 } : m)
            instSuccessDeadIds.push(mid); questDeaths++
            questLines.push(`💀 ${merc.name} 전사 — 임무 중 목숨을 잃었습니다. 영혼이 길드에 남아있습니다. 💎+1`)
          }
        }
      }
      if (instSuccessDeadIds.length > 0) {
        morale = Math.max(0, morale - instSuccessDeadIds.length * 5)
        questLines.push(`😔 동료를 잃은 생존자들의 사기와 컨디션이 저하됩니다.`)
        const deadRaces = instSuccessDeadIds.map(did => nextMercs.find(d => d.id === did)?.race).filter(Boolean) as string[]
        nextMercs = nextMercs.map(m => {
          if (m.status === '영혼' || instSuccessDeadIds.includes(m.id)) return m
          const sameRaceCount = deadRaces.filter(r => r === m.race).length
          const normalCount = instSuccessDeadIds.length - sameRaceCount
          const moralePenalty = normalCount * 10 + sameRaceCount * 20
          const condPenalty = aq.assignedMercIds.includes(m.id) ? 15 * instSuccessDeadIds.length : 0
          const favPenalty = aq.assignedMercIds.includes(m.id) ? 5 : 0
          return { ...m,
            condition: Math.max(0, m.condition - condPenalty),
            favorability: Math.max(0, m.favorability - favPenalty),
            morale: Math.max(0, (m.morale ?? 70) - moralePenalty),
          }
        })
      }
    } else {
      morale = Math.max(0, morale - 8)
      questLines.push(`🔙 부대가 귀환했습니다.`)
      const failTotalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
      const expectedFailWage = Math.round(failTotalWages * 0.5)
      if (expectedFailWage > 0) questLines.push(`💼 급여 미지급 (예정 ${expectedFailWage}G, 보상 없음)`)
      nextMercs = nextMercs.map(m => {
        if (!aq.assignedMercIds.includes(m.id)) return m
        const expectedWage = Math.round((MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration * 0.5)
        const wagePenalty = expectedWage > 0 ? Math.min(10, Math.max(2, Math.ceil(expectedWage / 15))) : 2
        return { ...m, favorability: Math.max(0, m.favorability - 5 - wagePenalty), morale: Math.max(0, (m.morale ?? 70) - 8) }
      })
      const failParty = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
      const deadIds: string[] = []
      for (const mid of aq.assignedMercIds) {
        const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
        if (Math.random() < calcMercDeathRisk(quest, merc, failParty)) {
          nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '영혼' as const, room: '길드마스터룸' as const, hp: 0, condition: 0 } : m)
          deadIds.push(mid); fame = Math.max(0, fame - 2); questDeaths++
          questLines.push(`💀 ${merc.name} 전사 — 임무 중 목숨을 잃었습니다. 영혼이 길드에 남아있습니다. 💎+1`)
        } else {
          nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '부상', hp: Math.max(0, m.hp - 30) } : m)
        }
      }
      if (deadIds.length > 0) {
        morale = Math.max(0, morale - deadIds.length * 5)
        questLines.push(`😔 동료를 잃은 생존자들의 사기와 컨디션이 저하됩니다.`)
        const deadRacesInstFail = deadIds.map(did => nextMercs.find(d => d.id === did)?.race).filter(Boolean) as string[]
        nextMercs = nextMercs.map(m => {
          if (m.status === '영혼' || deadIds.includes(m.id)) return m
          const sameRaceCount = deadRacesInstFail.filter(r => r === m.race).length
          const normalCount = deadIds.length - sameRaceCount
          const moralePenalty = normalCount * 10 + sameRaceCount * 20
          const condPenalty = aq.assignedMercIds.includes(m.id) ? 20 * deadIds.length : 0
          const favPenalty = aq.assignedMercIds.includes(m.id) ? 3 : 0
          return { ...m,
            condition: Math.max(0, m.condition - condPenalty),
            favorability: Math.max(0, m.favorability - favPenalty),
            morale: Math.max(0, (m.morale ?? 70) - moralePenalty),
          }
        })
      } else {
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id) || m.status === '영혼') return m
          return { ...m, condition: Math.max(0, m.condition - 5) }
        })
      }
    }
    nextMercs = nextMercs.map(m =>
      aq.assignedMercIds.includes(m.id) && m.status === '파견중' ? { ...m, status: '대기중' } : m)

    // Quest drop + dungeon trigger
    const { drop, dungeon: newDungeon } = rollQuestExtras(quest, success, activeDungeon)
    if (drop) setPendingDrop(drop)
    if (newDungeon) {
      setActiveDungeon(newDungeon)
      questLines.push(`던전 발견! [${newDungeon.name}] ${newDungeon.maxFloor}층 — 건물 패널에서 파견하세요.`)
    }

    const newPage = { questName: quest.name, success, lines: questLines }
    const newPageIdx = battleResults.length
    setMercs(nextMercs)
    setState(prev => ({ ...prev, gold: Math.max(0, g), fame: Math.max(0, fame), morale, crystals: prev.crystals - 1 + questDeaths }))
    setActiveQuests(prev => prev.filter(a => a.questId !== questId))
    setQuestLog(prev => [...prev, success ? `✅ [${quest.name}] 즉시완료 성공!` : `❌ [${quest.name}] 즉시완료 실패!`, ...questLines].slice(-20))
    setBattleResults(prev => [...prev, newPage])
    setBattleResultPage(newPageIdx)
    setShowLogModal(true)
    if (questSuccessCount > 0) setQuestsCompletedToday(prev => prev + questSuccessCount)
    if (questDeaths > 0) setDeathsToday(prev => prev + questDeaths)
    if (success) {
      setCompletedQuestIds(prev => [...new Set([...prev, questId])])
      if (quest.storyAfter) {
        setStoryContent({ questName: quest.name, chainName: quest.chainName ?? '', title: quest.storyAfter.title, lines: quest.storyAfter.lines })
        setShowStoryModal(true)
      }
    }
  }

  const saveGame = (slotIdx: number) => {
    const data: SaveSlotData = {
      name: `Day ${state.day}`,
      day: state.day,
      timestamp: Date.now(),
      mercs, activeQuests, buildings,
      campaignState: state,
      questLog, gateArrivals, nextArrivalTime, nextMoraleDropAt,
      questPool, roomLevels, completedQuestIds,
      guildInventory, merchantState, activeDungeon,
      activeExpedition, expeditionNextAt,
    }
    setSaveSlots(prev => {
      const next = [...prev]
      next[slotIdx] = data
      localStorage.setItem(SAVE_KEY, JSON.stringify(next))
      return next
    })
    log(`슬롯 ${slotIdx + 1}에 저장 완료! (Day ${state.day})`)
  }

  const loadGame = (slotIdx: number) => {
    const data = saveSlots[slotIdx]
    if (!data) return
    setMercs(data.mercs.map(m => {
      const migrated = (m.room === '대장간' as string || m.room === '숙소' as string) ? { ...m, room: '식당' as const } : m
      const legacy = migrated as any
      const migratedEquip = legacy.equipment ?? { weapon: null, head: null, body: null, accessory: null }
      return { ...migrated, equipment: migratedEquip }
    }))
    setActiveQuests(data.activeQuests.map((aq: any) => {
      if (typeof aq.completesAt === 'number') return aq as ActiveQuest
      const turns = Math.max(1, aq.turnsLeft ?? 1)
      const dur = turns * 5 * 60 * 1000
      return { questId: aq.questId, assignedMercIds: aq.assignedMercIds, completesAt: Date.now() + dur, durationMs: dur } as ActiveQuest
    }))
    setBuildings(data.buildings)
    setState({ ...data.campaignState, crystals: data.campaignState.crystals ?? 5, lastDayDate: data.campaignState.lastDayDate ?? new Date().toISOString().slice(0, 10) })
    setQuestLog(data.questLog)
    setGateArrivals(data.gateArrivals)
    setNextArrivalTime(data.nextArrivalTime ?? (Date.now() + ARRIVAL_INTERVAL_MS))
    setNextMoraleDropAt(data.nextMoraleDropAt ?? (Date.now() + MORALE_DROP_INTERVAL_MS))
    const loadedCompleted = data.completedQuestIds ?? []
    setQuestPool(data.questPool ?? drawQuestPool(data.buildings.hall, data.activeQuests.map(aq => aq.questId), data.campaignState.fame, loadedCompleted))
    setRoomLevels(data.roomLevels ?? { 길드마스터룸: 1, 훈련소: 1, 식당: 1 })
    setCompletedQuestIds(loadedCompleted)
    setGuildInventory(data.guildInventory ?? [])
    setMerchantState(data.merchantState ?? null)
    setActiveDungeon(data.activeDungeon ?? null)
    setActiveExpedition(data.activeExpedition ?? null)
    setExpeditionNextAt(data.expeditionNextAt ?? 0)
    setPendingAssign({})
    setSelectedMercId(null)
    setShowSaveModal(false)
    log(`슬롯 ${slotIdx + 1} 불러오기 완료! (Day ${data.day})`)
  }

  const upgradeRoom = (room: string) => {
    const costs = ROOM_UPGRADE_COSTS[room]
    if (!costs) return
    const currentLv = roomLevels[room] ?? 1
    if (currentLv >= 3) return
    if (room === '길드마스터룸') {
      const maxLv = masterRoomMaxLevel(state.fame)
      if (currentLv >= maxLv) {
        const neededFame = GUILD_LEVEL_FAME[currentLv] ?? 999
        log(`명성 ${neededFame} 필요 (현재 ${state.fame}). 퀘스트를 완료해 명성을 쌓으세요.`)
        return
      }
    } else {
      if (currentLv >= (roomLevels['길드마스터룸'] ?? 1)) {
        log(`길드마스터룸 Lv${currentLv + 1}이 필요합니다. 먼저 길드마스터룸을 업그레이드하세요.`)
        return
      }
    }
    const cost = costs[currentLv - 1]
    if (state.gold < cost) { log(`금화 부족: ${room} 업그레이드 불가 (${cost}G 필요)`); return }
    setState(prev => ({ ...prev, gold: prev.gold - cost }))
    setRoomLevels(prev => ({ ...prev, [room]: currentLv + 1 }))
    log(`🏗 ${room} Lv${currentLv}→Lv${currentLv + 1} 업그레이드! -${cost}G`)
  }

  const updateMercRoom = (mercId: string, room: Mercenary['room']) => {
    setMercs(prev => prev.map(m => m.id === mercId ? { ...m, room } : m))
    focusRoom(room)
    setDropTargetRoom(null)
  }

  const upgradeBuilding = (id: keyof GuildBuildings) => {
    const currentLv = buildings[id]
    const maxLv = BUILDING_INFO[id].maxLevel
    if (currentLv >= maxLv) return
    const cost = currentLv === 0
      ? BUILDING_INFO[id].buildCost
      : upgradeCost(id, currentLv)
    if (state.gold < cost) { log(`금화 부족: ${BUILDING_INFO[id].name} 건설 불가 (${cost}G 필요)`); return }
    setState(prev => ({ ...prev, gold: prev.gold - cost }))
    setBuildings(prev => ({ ...prev, [id]: prev[id] + 1 }))
    const isNew = currentLv === 0
    log(`${BUILDING_INFO[id].name} ${isNew ? '건설' : `Lv${currentLv}→Lv${currentLv + 1} 업그레이드`}! -${cost}G`)
  }

  // ── Real-calendar day advance ────────────────────────────────────────────
  const advanceDay = () => {
    let g = state.gold
    let morale = state.morale
    let fame = state.fame
    const nextDay = state.day + 1
    let nextMercs = mercs.map(m => ({ ...m }))
    const logs: string[] = []

    // ── 0. 일일 목표: 용병 사망 없음 ─────────────────────────────────────
    if (deathsToday === 0 && !goalsClaimed.has('g3')) {
      g += 300; fame += 10
      logs.push('🎯 일일 목표 달성! [오늘 사망 없음] +300G +10명성 +2💎')
      setGoalsClaimed(prev => new Set([...prev, 'g3']))
      setState(prev => ({ ...prev, crystals: (prev.crystals ?? 0) + 2 }))
    }
    setQuestsCompletedToday(0)
    setDeathsToday(0)
    setGoalsClaimed(new Set())

    // ── 1. Daily gold cost for active quests ──────────────────────────────
    for (const aq of activeQuests) {
      const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
      g -= quest.dailyGoldCost
    }

    // ── 2. Condition recovery ─────────────────────────────────────────────
    const COND_NATURAL_FLOOR = 65
    const recovery = condRecovery(buildings.infirmary)
    const baseRecov = 5
    nextMercs = nextMercs.map(m => {
      if (m.status === '파견중') return m
      const roomFloor = m.status === '대기중' ? COND_NATURAL_FLOOR : 0
      const recov = m.status === '부상' ? Math.max(1, recovery - 2) : recovery + baseRecov
      const rawCond = Math.min(100, m.condition + recov)
      const newCond = Math.max(roomFloor, rawCond)
      const newStatus = m.status === '부상' && newCond >= 60 ? '대기중' : m.status
      const hpRecov = m.status === '부상' ? (5 + buildings.infirmary * 5) : (m.hp < 100 ? 2 : 0)
      const newHp = Math.min(100, m.hp + hpRecov)
      return { ...m, condition: newCond, status: newStatus, hp: newHp }
    })

    // ── 3. 방 효과 ────────────────────────────────────────────────────────
    const trainLv = roomLevels['훈련소'] ?? 1
    const trainCap = trainingCapacity(trainLv)
    const trainXP = trainingXPPerDay(trainLv)
    const trainMercs = nextMercs.filter(m => m.status === '대기중' && m.room === '훈련소').slice(0, trainCap)
    const avgTrainPower = trainMercs.length > 0
      ? trainMercs.reduce((s, m) => s + m.power, 0) / trainMercs.length : 0
    const masterLv = roomLevels['길드마스터룸'] ?? 1
    const masterCap = masterCapacity(masterLv)
    const masterFav = masterFavBonus(masterLv)
    const masterMercIds = new Set(
      nextMercs.filter(m => m.status === '대기중' && m.room === '길드마스터룸').slice(0, masterCap).map(m => m.id)
    )
    nextMercs = nextMercs.map(m => {
      if (m.status !== '대기중') return m
      let upd: Partial<Mercenary> = {}
      if (m.room === '훈련소' && trainMercs.some(t => t.id === m.id) && trainXP > 0) {
        const weakFactor = avgTrainPower > 0 ? Math.max(1, 2 - m.power / avgTrainPower) : 1
        const { xpMod } = getMercPassiveStats(m.passives ?? [])
        let exp = m.experience + Math.round(trainXP * weakFactor * (1 + xpMod)), level = m.level, expToNext = m.expToNext
        let trainUpd = m
        while (exp >= expToNext && level < 50) {
          exp -= expToNext; level++; expToNext = EXP_TO_NEXT(level)
          logs.push(`⬆ ${trainUpd.name} 훈련으로 Lv${level - 1}→Lv${level}!`)
          trainUpd = applyGradeUp(trainUpd, level, logs)
        }
        const sb = level - m.level
        const af = ageLevelFactor(m.age)
        upd = { ...upd, startingGrade: trainUpd.startingGrade, grade: trainUpd.grade, passives: trainUpd.passives,
          experience: exp, level, expToNext,
          power: m.power + Math.round(sb * 4 * af), trap_disarm: m.trap_disarm + Math.round(sb * 2 * af),
          stats: { 공격력: m.stats.공격력 + Math.round(sb * 2 * af), 함정해제: m.stats.함정해제 + Math.round(sb * 2 * af),
                   생존율: m.stats.생존율 + Math.round(sb * 2 * af), 협조성: m.stats.협조성 + Math.round(sb * af) } }
      }
      if (masterMercIds.has(m.id)) upd.favorability = Math.min(100, m.favorability + masterFav)
      return Object.keys(upd).length > 0 ? { ...m, ...upd } : m
    })

    // ── 3a. 식당 음식 판매 수익 ─────────────────────────────────────────
    const diningLv = roomLevels['식당'] ?? 1
    const diningStaff = nextMercs
      .filter(m => m.status === '대기중' && m.room === '식당')
      .slice(0, diningSalesCapacity(diningLv))
    const diningIncome = calcDiningSalesIncome(diningLv, diningStaff, morale)
    if (diningIncome > 0) {
      g += diningIncome
      logs.push(`🍖 식당 음식 판매 수익 +${diningIncome}G (${diningStaff.length}/${diningSalesCapacity(diningLv)}명 판매 담당)`)
    }

    // ── 3b. 나이 증가 (30일마다) ─────────────────────────────────────────
    if (nextDay % 30 === 0) {
      const now = Date.now()
      nextMercs = nextMercs.map(m => {
        if (m.ageLockedUntil && m.ageLockedUntil > now) return m
        const newAge = m.age + 1
        if (newAge % 10 === 0) logs.push(`🕰 ${m.name} ${newAge}세`)
        return { ...m, age: newAge }
      })
    }

    // ── 4. Morale natural recovery ────────────────────────────────────────
    if (g > 0) morale = Math.min(100, morale + 1)

    // ── 5. 퀘스트 풀 갱신 ────────────────────────────────────────────────
    const newQuestPool = drawQuestPool(buildings.hall, activeQuests.map(aq => aq.questId), fame, completedQuestIds)

    setMercs(nextMercs)
    setQuestPool(newQuestPool)
    setState(prev => ({ ...prev, day: nextDay, gold: Math.max(0, g), fame: Math.max(0, fame), morale, lastDayDate: new Date().toISOString().slice(0, 10) }))
    setQuestLog(prev => [...prev, ...logs].slice(-20))
  }

  // ── 8시간마다 용병 도착 ────────────────────────────────────────────────────
  const arrivalDataRef = useRef({ buildings, roomLevels, nextArrivalTime })
  arrivalDataRef.current = { buildings, roomLevels, nextArrivalTime }
  useEffect(() => {
    const check = () => {
      const { buildings, roomLevels, nextArrivalTime } = arrivalDataRef.current
      if (Date.now() < nextArrivalTime) return
      const diningLv = roomLevels['식당'] ?? 1
      const count = arrivalCount(buildings.barracks) + diningArrivalBonus(diningLv)
      const recruitLevel = rollRecruitLevel(buildings)
      const arrivals = Array.from({ length: count }, () => generateMercenary(buildings.tavern + diningTavernBonus(diningLv), false, { level: recruitLevel }))
      setGateArrivals(arrivals)
      setNextArrivalTime(Date.now() + ARRIVAL_INTERVAL_MS)
      const grades = arrivals.map(a => a.grade).join(', ')
      const levels = recruitLevelRange(buildings)
      setQuestLog(prev => [...prev, `🚶 새 용병 ${count}명 도착! (${grades}급 · Lv${levels.min}${levels.max > levels.min ? `~${levels.max}` : ''})`].slice(-20))
    }
    const timer = setInterval(check, 30_000) // 30초마다 체크
    return () => clearInterval(timer)
  }, [])

  // ── 12시간 미파견 → 사기 하락 ─────────────────────────────────────────────
  const moraleDataRef = useRef({ nextMoraleDropAt, morale: state.morale })
  moraleDataRef.current = { nextMoraleDropAt, morale: state.morale }
  useEffect(() => {
    const check = () => {
      const { nextMoraleDropAt } = moraleDataRef.current
      if (Date.now() < nextMoraleDropAt) return
      setState(prev => ({ ...prev, morale: Math.max(0, prev.morale - 10) }))
      setNextMoraleDropAt(Date.now() + MORALE_DROP_INTERVAL_MS)
      setQuestLog(prev => [...prev, '😔 오래 쉬었더니 사기가 떨어졌습니다. 파견을 보내세요!'].slice(-20))
    }
    const timer = setInterval(check, 60_000) // 1분마다 체크
    return () => clearInterval(timer)
  }, [])

  // ── Real-time quest completion ────────────────────────────────────────────
  const completionDataRef = useRef({ mercs, state, questLog, buildings, roomLevels, activeQuests, gateArrivals, nextArrivalTime, nextMoraleDropAt, battleResults, completedQuestIds, activeDungeon, activeExpedition })
  completionDataRef.current = { mercs, state, questLog, buildings, roomLevels, activeQuests, gateArrivals, nextArrivalTime, nextMoraleDropAt, battleResults, completedQuestIds, activeDungeon, activeExpedition }

  const processCompletions = useCallback(() => {
    const now = Date.now()
    const { mercs, state, questLog: _log, buildings, activeQuests, battleResults, activeDungeon: currentDungeon, activeExpedition: currentExpedition } = completionDataRef.current

    // ── 원정 완료 처리 ─────────────────────────────────────
    if (currentExpedition && !currentExpedition.result && currentExpedition.completesAt <= now) {
      const assigned = currentExpedition.assignedMercIds.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
      const partyPower = assigned.reduce((s, m) => s + effPower(m), 0)
      const all = [...currentExpedition.npcScores, partyPower].sort((a, b) => b - a)
      const rank = all.indexOf(partyPower) + 1
      const total = all.length
      const EXPEDITION_REWARDS = [
        { gold: 600, fame: 60, xp: 500, crystals: 15, dropDiff: 120 },
        { gold: 400, fame: 40, xp: 350, crystals: 10, dropDiff: 80  },
        { gold: 250, fame: 25, xp: 250, crystals: 6,  dropDiff: 50  },
        { gold: 150, fame: 15, xp: 150, crystals: 3,  dropDiff: 0   },
        { gold: 80,  fame: 8,  xp: 100, crystals: 1,  dropDiff: 0   },
      ]
      const tier = Math.min(rank - 1, EXPEDITION_REWARDS.length - 1)
      const reward = EXPEDITION_REWARDS[tier]
      const equipReward = reward.dropDiff > 0 ? rollQuestDrop(reward.dropDiff) : null
      const result: ExpeditionResult = { rank, total, goldReward: reward.gold, fameReward: reward.fame, xpReward: reward.xp, crystalReward: reward.crystals, equipReward }
      setActiveExpedition({ ...currentExpedition, result })
      setShowExpedition(true)
      log(`⚔ 원정 완료! ${rank}위/${total}팀 — 보상 준비 완료`)
    }

    const completed = activeQuests.filter(aq => aq.completesAt <= now)
    if (completed.length === 0) return

    let g = state.gold, fame = state.fame, morale = state.morale
    let nextMercs = [...mercs]
    const logs: string[] = []
    const perQuestPages: Array<{ questName: string; success: boolean; lines: string[] }> = []
    let questSuccessCount = 0
    let batchDeaths = 0

    for (const aq of completed) {
      const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
      const questLines: string[] = []

      nextMercs = nextMercs.map(m => {
        if (!aq.assignedMercIds.includes(m.id)) return m
        const drain = (m.element === '얼음' && quest.element === '얼음')
          ? Math.round(quest.conditionDrain * 0.5)
          : quest.conditionDrain
        return { ...m, condition: Math.max(0, m.condition - drain) }
      })
      const assignedMercs = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
      const success = Math.random() < calcSuccessRate(quest, aq.assignedMercIds, nextMercs) / 100

      if (success) {
        questSuccessCount++
        fame += quest.reward.fame
        morale = Math.min(100, morale + 5)
        const totalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
        const rewardGold = quest.reward.gold
        const guildGold = Math.max(0, rewardGold - totalWages)
        g += guildGold
        const wageFullyPaid = rewardGold >= totalWages
        if (wageFullyPaid) {
          questLines.push(`💰 길드 수입 +${guildGold}G  명성 +${quest.reward.fame}`)
          if (totalWages > 0) questLines.push(`💼 급여 전액 지급 (${totalWages}G)`)
        } else {
          questLines.push(`🌟 명성 +${quest.reward.fame}`)
          questLines.push(`⚠ 보상(${rewardGold}G) < 급여(${totalWages}G): 길드 수입 없음`)
        }
        const baseXpGain2 = Math.round(quest.reward.exp * xpMultiplier(buildings.training))
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          const { xpMod } = getMercPassiveStats(m.passives ?? [])
          const xpGain = Math.round(baseXpGain2 * (1 + xpMod))
          let exp = m.experience + xpGain, level = m.level, expToNext = m.expToNext
          let updated = m
          while (exp >= expToNext && level < 50) {
            exp -= expToNext; level++; expToNext = EXP_TO_NEXT(level)
            questLines.push(`⬆ ${updated.name} Lv${level - 1}→Lv${level} 레벨업!`)
            updated = applyGradeUp(updated, level, questLines)
          }
          const sb = level - m.level
          const af = ageLevelFactor(m.age)
          return { ...updated, level, experience: exp, expToNext,
            favorability: Math.min(100, m.favorability + 5),
            morale: Math.min(100, (m.morale ?? 70) + 10),
            power: m.power + Math.round(sb * 4 * af),
            trap_disarm: m.trap_disarm + Math.round(sb * 2 * af),
            stats: { 공격력: m.stats.공격력 + Math.round(sb * 2 * af), 함정해제: m.stats.함정해제 + Math.round(sb * 2 * af), 생존율: m.stats.생존율 + Math.round(sb * 2 * af), 협조성: m.stats.협조성 + Math.round(sb * af) } }
        })
        if (!wageFullyPaid && totalWages > 0) {
          nextMercs = nextMercs.map(m => {
            if (!aq.assignedMercIds.includes(m.id)) return m
            const expectedWage = (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration
            const actualWage = Math.floor(rewardGold * expectedWage / totalWages)
            const deficit = expectedWage - actualWage
            const favPenalty = Math.max(1, Math.ceil((deficit / expectedWage) * 20))
            questLines.push(`😒 ${m.name} 급여 미달(${actualWage}/${expectedWage}G) 호감도 -${favPenalty}`)
            return { ...m, favorability: Math.max(0, m.favorability - favPenalty) }
          })
        }
        const successDeadIds: string[] = []
        if (aq.assignedMercIds.length < 3) {
          const party = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
          for (const mid of aq.assignedMercIds) {
            const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
            if (Math.random() < calcMercDeathRisk(quest, merc, party) * 0.35) {
              nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '영혼' as const, room: '길드마스터룸' as const, hp: 0, condition: 0 } : m)
              successDeadIds.push(mid); batchDeaths++
              questLines.push(`💀 ${merc.name} 전사 — 임무 중 목숨을 잃었습니다. 영혼이 길드에 남아있습니다. 💎+1`)
            }
          }
        }
        if (successDeadIds.length > 0) {
          morale = Math.max(0, morale - successDeadIds.length * 5)
          questLines.push(`😔 동료를 잃은 생존자들의 사기와 컨디션이 저하됩니다.`)
          const deadRacesSucc = successDeadIds.map(did => nextMercs.find(d => d.id === did)?.race).filter(Boolean) as string[]
          nextMercs = nextMercs.map(m => {
            if (m.status === '영혼' || successDeadIds.includes(m.id)) return m
            const sameRaceCount = deadRacesSucc.filter(r => r === m.race).length
            const normalCount = successDeadIds.length - sameRaceCount
            const moralePenalty = normalCount * 10 + sameRaceCount * 20
            const condPenalty = aq.assignedMercIds.includes(m.id) ? 15 * successDeadIds.length : 0
            const favPenalty = aq.assignedMercIds.includes(m.id) ? 5 : 0
            return { ...m,
              condition: Math.max(0, m.condition - condPenalty),
              favorability: Math.max(0, m.favorability - favPenalty),
              morale: Math.max(0, (m.morale ?? 70) - moralePenalty),
            }
          })
        }
      } else {
        morale = Math.max(0, morale - 8)
        questLines.push(`🔙 부대가 귀환했습니다.`)
        const failTotalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
        const expectedFailWage = Math.round(failTotalWages * 0.5)
        if (expectedFailWage > 0) questLines.push(`💼 급여 미지급 (예정 ${expectedFailWage}G, 보상 없음)`)
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          const expectedWage = Math.round((MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration * 0.5)
          const wagePenalty = expectedWage > 0 ? Math.min(10, Math.max(2, Math.ceil(expectedWage / 15))) : 2
          return { ...m, favorability: Math.max(0, m.favorability - 5 - wagePenalty), morale: Math.max(0, (m.morale ?? 70) - 8) }
        })
        const failParty = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
        const deadIds: string[] = []
        for (const mid of aq.assignedMercIds) {
          const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
          if (Math.random() < calcMercDeathRisk(quest, merc, failParty)) {
            nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '영혼' as const, room: '길드마스터룸' as const, hp: 0, condition: 0 } : m)
            deadIds.push(mid); fame = Math.max(0, fame - 2); batchDeaths++
            questLines.push(`💀 ${merc.name} 전사 — 임무 중 목숨을 잃었습니다. 영혼이 길드에 남아있습니다. 💎+1`)
          } else {
            nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '부상', hp: Math.max(0, m.hp - 30) } : m)
          }
        }
        if (deadIds.length > 0) {
          morale = Math.max(0, morale - deadIds.length * 5)
          questLines.push(`😔 동료를 잃은 생존자들의 사기와 컨디션이 저하됩니다.`)
          const deadRacesFail = deadIds.map(did => nextMercs.find(d => d.id === did)?.race).filter(Boolean) as string[]
          nextMercs = nextMercs.map(m => {
            if (m.status === '영혼' || deadIds.includes(m.id)) return m
            const sameRaceCount = deadRacesFail.filter(r => r === m.race).length
            const normalCount = deadIds.length - sameRaceCount
            const moralePenalty = normalCount * 10 + sameRaceCount * 20
            const condPenalty = aq.assignedMercIds.includes(m.id) ? 20 * deadIds.length : 0
            const favPenalty = aq.assignedMercIds.includes(m.id) ? 3 : 0
            return { ...m,
              condition: Math.max(0, m.condition - condPenalty),
              favorability: Math.max(0, m.favorability - favPenalty),
              morale: Math.max(0, (m.morale ?? 70) - moralePenalty),
            }
          })
        } else {
          // 사망 없이 실패 — 컨디션 소폭 감소
          nextMercs = nextMercs.map(m => {
            if (!aq.assignedMercIds.includes(m.id) || m.status === '영혼') return m
            return { ...m, condition: Math.max(0, m.condition - 5) }
          })
        }
      }
      nextMercs = nextMercs.map(m =>
        aq.assignedMercIds.includes(m.id) && m.status === '파견중' ? { ...m, status: '대기중' } : m)

      const { drop: timedDrop, dungeon: timedDungeon } = rollQuestExtras(quest, success, currentDungeon)
      if (timedDrop) setPendingDrop(timedDrop)
      if (timedDungeon) {
        setActiveDungeon(timedDungeon)
        questLines.push(`던전 발견! [${timedDungeon.name}] ${timedDungeon.maxFloor}층 — 건물 패널에서 파견하세요.`)
      }

      logs.push(success ? `✅ [${quest.name}] 성공!` : `❌ [${quest.name}] 실패!`, ...questLines)
      perQuestPages.push({ questName: quest.name, success, lines: questLines })
    }

    if (questSuccessCount > 0) {
      const { buildings } = completionDataRef.current
      const guildLv = computeGuildLevel(fame)
      const arrivalChance = [0.08, 0.14, 0.20, 0.25][Math.min(guildLv - 1, 3)]
      for (let i = 0; i < questSuccessCount; i++) {
        if (Math.random() < arrivalChance) {
          const newcomer = generateMercenary(buildings.tavern, false, { level: rollRecruitLevel(buildings) })
          setGateArrivals(prev => [...prev, newcomer])
          logs.push(`🚶 ${newcomer.name}(Lv${newcomer.level} ${newcomer.grade}급) — 소문을 듣고 찾아왔습니다!`)
          break
        }
      }
    }

    const firstNewPage = battleResults.length
    // 완료된 퀘스트 기록 + 스토리 트리거
    const newlyCompletedIds = completed.filter(aq => {
      const q = ALL_QUESTS.find(x => x.id === aq.questId)
      return !!q?.storyAfter
    })
    setMercs(nextMercs)
    setState(prev => ({ ...prev, day: state.day, gold: Math.max(0, g), fame: Math.max(0, fame), morale, crystals: (prev.crystals ?? 0) + batchDeaths }))
    setActiveQuests(prev => prev.filter(aq => aq.completesAt > now))
    setQuestLog(prev => [...prev, ...logs].slice(-20))
    setBattleResults(prev => [...prev, ...perQuestPages])
    setBattleResultPage(firstNewPage)
    setShowLogModal(true)
    if (questSuccessCount > 0) setQuestsCompletedToday(prev => prev + questSuccessCount)
    if (batchDeaths > 0) setDeathsToday(prev => prev + batchDeaths)
    setCompletedQuestIds(prev => [...new Set([...prev, ...completed.map(aq => aq.questId)])])
    // 스토리 퀘스트 완료 시 — 성공한 것만 스토리 표시
    for (const aq of newlyCompletedIds) {
      const q = ALL_QUESTS.find(x => x.id === aq.questId)
      if (q?.storyAfter && perQuestPages.find(p => p.questName === q.name && p.success)) {
        setStoryContent({ questName: q.name, chainName: q.chainName ?? '', title: q.storyAfter.title, lines: q.storyAfter.lines })
        setShowStoryModal(true)
        break
      }
    }

    // ── 퇴단 예고 만료 체크 ─────────────────────────────────
    const leavers = mercs.filter(m => m.leavingAt && m.leavingAt <= now)
    if (leavers.length > 0) {
      setMercs(prev => prev.filter(m => !leavers.some(l => l.id === m.id)))
      for (const m of leavers) log(`👋 ${m.name}이(가) 길드를 떠났습니다.`)
    }
  }, []) // empty deps - always reads from ref

  // 10초마다 퀘스트 완료 체크
  useEffect(() => {
    const timer = setInterval(processCompletions, 10_000)
    return () => clearInterval(timer)
  }, [processCompletions])

  // 일일 목표 자동 달성 체크
  const DAILY_GOALS = [
    { id: 'g1', text: '퀘스트 1건 완료', target: 1, reward: { gold: 100, fame: 0, crystals: 1 } },
    { id: 'g2', text: '퀘스트 3건 완료', target: 3, reward: { gold: 200, fame: 5, crystals: 2 } },
  ] as const
  useEffect(() => {
    for (const goal of DAILY_GOALS) {
      if (questsCompletedToday >= goal.target && !goalsClaimed.has(goal.id)) {
        setState(prev => ({ ...prev, gold: prev.gold + goal.reward.gold, fame: prev.fame + goal.reward.fame, crystals: (prev.crystals ?? 0) + goal.reward.crystals }))
        setQuestLog(prev => [...prev, `🎯 일일 목표 달성! [${goal.text}] +${goal.reward.gold}G${goal.reward.fame > 0 ? ` +${goal.reward.fame}명성` : ''} +${goal.reward.crystals}💎`].slice(-20))
        setGoalsClaimed(prev => new Set([...prev, goal.id]))
      }
    }
  }, [questsCompletedToday]) // eslint-disable-line react-hooks/exhaustive-deps

  // 실제 캘린더 날짜가 바뀌면 하루 경과 처리
  const advanceDayRef = useRef(advanceDay)
  advanceDayRef.current = advanceDay
  const lastDayDateRef = useRef(state.lastDayDate ?? new Date().toISOString().slice(0, 10))
  lastDayDateRef.current = state.lastDayDate ?? new Date().toISOString().slice(0, 10)
  useEffect(() => {
    // 앱 마운트 시 날짜 변경 즉시 체크
    const today = new Date().toISOString().slice(0, 10)
    if (lastDayDateRef.current && today > lastDayDateRef.current) {
      advanceDayRef.current()
    }
    // 1분마다 자정 체크
    const timer = setInterval(() => {
      const now = new Date().toISOString().slice(0, 10)
      if (now > lastDayDateRef.current) {
        advanceDayRef.current()
      }
    }, 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  // 영혼 수용 한계 초과 감지
  useEffect(() => {
    const souls = mercs.filter(m => m.status === '영혼')
    const cap = roomLevels['길드마스터룸'] ?? 1
    setShowSoulOverflowModal(souls.length > cap)
  }, [mercs, roomLevels])

  // 30초마다 타이머 표시 갱신
  const [tickTime, setTickTime] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setTickTime(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [])

  const formatTimeLeft = (completesAt: number): string => {
    const ms = completesAt - tickTime
    if (ms <= 0) return '완료 처리 중...'
    const totalSecs = Math.ceil(ms / 1000)
    const totalMins = Math.floor(totalSecs / 60)
    if (totalMins >= 60) return `${Math.floor(totalMins / 60)}시간 ${totalMins % 60}분`
    const secs = totalSecs % 60
    return `${totalMins}분 ${secs}초`
  }

  const formatArrivalCountdown = (arrivalAt: number, now: number): string => {
    const ms = arrivalAt - now
    if (ms <= 0) return '곧 도착...'
    const totalMins = Math.floor(ms / 60000)
    if (totalMins >= 60) return `${Math.floor(totalMins / 60)}시간 ${totalMins % 60}분 후`
    return `${totalMins}분 후`
  }

  // ── Stable stars for scene ─────────────────────
  const stars = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      left: (i * 41 + 7) % 96, top: (i * 19 + 5) % 44,
      size: i % 5 === 0 ? 2 : 1, opacity: 0.25 + (i % 5) * 0.1
    })), []
  )

  // ── JSX ─────────────────────────────────────────

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <div className="text-slate-100 flex flex-col" style={{ width: 1600, height: 900, transform: `scale(${Math.max(0.5, Math.min(1.5, scale + zoomDelta))})`, transformOrigin: 'center center', background: '#08080f', overflow: 'hidden', flexShrink: 0 }}>

      {/* Save/Load Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setShowSaveModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#13131f', border: '1px solid rgba(251,191,36,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">💾 저장 / 불러오기</h2>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <div className="space-y-3">
              {saveSlots.map((slot, idx) => (
                <div key={idx} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-white">슬롯 {idx + 1}</p>
                      {slot ? (
                        <p className="text-sm text-slate-400 mt-0.5">
                          {slot.name} · {slot.mercs.length}명 · {new Date(slot.timestamp).toLocaleDateString('ko-KR')} {new Date(slot.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-600 mt-0.5">빈 슬롯</p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => saveGame(idx)}
                        className="rounded-lg px-3 py-1.5 text-sm font-bold text-white transition hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
                        저장
                      </button>
                      {slot && (
                        <button
                          onClick={() => loadGame(idx)}
                          className="rounded-lg px-3 py-1.5 text-sm font-bold text-white transition hover:brightness-110"
                          style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                          불러오기
                        </button>
                      )}
                    </div>
                  </div>
                  {slot && (
                    <div className="flex gap-2 text-sm text-slate-500">
                      <span>🏅 명성 {slot.campaignState.fame}</span>
                      <span>💰 {slot.campaignState.gold}G</span>
                      <span>⚔️ 파견 {slot.activeQuests.length}건</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 오프닝 인트로 모달 (세계관 + 목표) ── */}
      {showTutorial && (() => {
        const step = INTRO_STEPS[tutorialStep]
        const isLast = tutorialStep === INTRO_STEPS.length - 1
        return (
          <div className="fixed z-50 p-0" style={{ left: 8, top: 100, width: 300 }}>
            <div className="w-full rounded-2xl overflow-hidden flex flex-col"
              style={{ background: 'rgba(10,8,22,0.97)', border: '1px solid rgba(120,80,200,0.45)', boxShadow: '0 0 40px rgba(60,30,140,0.35)', maxHeight: 'calc(100vh - 72px)' }}>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 pt-4 pb-1 flex-shrink-0">
                {INTRO_STEPS.map((_, i) => (
                  <div key={i} className="rounded-full transition-all duration-300"
                    style={{ width: i === tutorialStep ? 20 : 6, height: 6,
                      background: i <= tutorialStep ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.12)' }} />
                ))}
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-3 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-4xl leading-none">{step.icon}</span>
                  <div>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(120,80,200,0.25)', color: '#c4b5fd', border: '1px solid rgba(120,80,200,0.4)' }}>
                      {step.tag}
                    </span>
                    <h2 className="text-base font-bold text-white mt-1">{step.title}</h2>
                  </div>
                </div>
                <button onClick={() => setShowTutorial(false)}
                  className="text-slate-600 hover:text-slate-400 text-xl leading-none flex-shrink-0 ml-4">×</button>
              </div>

              {/* Body */}
              <div className="px-6 pb-2 overflow-y-auto flex-1 space-y-3">
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {step.body.map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgba(200,190,170,0.85)' }}>{line}</p>
                  ))}
                </div>
                {step.tips.length > 0 && (
                  <div className="space-y-1.5">
                    {step.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2"
                        style={{ background: 'rgba(120,80,200,0.08)', border: '1px solid rgba(120,80,200,0.15)' }}>
                        <span className="text-purple-400 font-bold flex-shrink-0 text-sm">›</span>
                        <p className="text-sm" style={{ color: 'rgba(190,180,210,0.85)' }}>{tip}</p>
                      </div>
                    ))}
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
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(100,100,100,0.5)' }}>
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
                  <button onClick={() => { setShowTutorial(false); setTutorialStep(0); setShowQuestModal(true) }}
                    className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#b45309,#d97706)', boxShadow: '0 0 16px rgba(217,119,6,0.35)' }}>
                    🏰 길드 운영 시작!
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── 일일 목표 카드 (우측 플로팅) ── */}
      {(() => {
        const allGoals = [
          { id: 'g1', text: '퀘스트 1건 완료', progress: questsCompletedToday, target: 1, reward: '100G +1💎' },
          { id: 'g2', text: '퀘스트 3건 완료', progress: questsCompletedToday, target: 3, reward: '200G +5명성 +2💎' },
          { id: 'g3', text: '오늘 사망 없음', progress: deathsToday === 0 ? 1 : 0, target: 1, reward: '300G +10명성 +2💎' },
        ]
        return (
          <div className="fixed z-20 rounded-xl overflow-hidden gm-float-card"
            style={{ right: 8, top: 56, width: 172 }}>
            <div className="gm-panel-titlebar px-2.5 py-1.5">
              <p className="text-xs font-bold" style={{ color: 'rgba(251,191,36,0.8)' }}>🎯 일일 목표</p>
            </div>
            <div className="px-2.5 py-1.5 space-y-1.5">
              {allGoals.map(goal => {
                const done = goalsClaimed.has(goal.id) || (goal.id === 'g3' ? deathsToday === 0 && goalsClaimed.has('g3') : questsCompletedToday >= goal.target && goalsClaimed.has(goal.id))
                const pct = Math.min(100, goal.id === 'g3' ? (deathsToday === 0 ? 100 : 0) : Math.round(goal.progress / goal.target * 100))
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs" style={{ color: done ? 'rgba(134,239,172,0.9)' : 'rgba(180,170,150,0.7)' }}>{done ? '✓ ' : ''}{goal.text}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden mb-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? '#22c55e' : 'rgba(251,191,36,0.6)' }} />
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(251,191,36,0.55)' }}>{goal.reward}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── 플레이 힌트 카드 (우하단 플로팅) ── */}
      {activeHint && (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-2xl overflow-hidden shadow-2xl gm-float-card">
          <div className="gm-panel-titlebar flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{activeHint.icon}</span>
              <span className="text-sm font-bold" style={{ color: '#c4b5fd' }}>{activeHint.tag}</span>
            </div>
            <button onClick={() => setActiveHint(null)} className="text-slate-600 hover:text-slate-400 text-base leading-none">×</button>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-white">{activeHint.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(180,170,150,0.85)' }}>{activeHint.body}</p>
            <div className="space-y-1 pt-1">
              {activeHint.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-purple-400 font-bold text-sm flex-shrink-0 mt-0.5">›</span>
                  <p className="text-sm" style={{ color: 'rgba(160,150,200,0.8)' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 pb-3">
            <button onClick={() => setActiveHint(null)}
              className="w-full rounded-lg py-1.5 text-sm font-bold text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#5b21b6,#7c3aed)' }}>
              알겠어요 ✓
            </button>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 border-b backdrop-blur-xl"
        style={{ background: 'rgba(14,9,4,0.97)', borderColor: 'rgba(180,130,50,0.25)', height: 48 }}>
        {/* 타이틀 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">🏰</span>
          <div>
            <h1 className="text-sm font-extrabold text-white leading-none tracking-wide">용병단 길드</h1>
            <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'rgba(150,110,50,0.6)' }}>Medieval Mercenary Manager</p>
          </div>
        </div>

        {/* 길드 레벨 (타이틀 옆) */}
        {(() => {
          const gLv = computeGuildLevel(state.fame)
          const nextFame = GUILD_LEVEL_FAME[gLv] ?? null
          const pct = nextFame ? Math.round(state.fame / nextFame * 100) : 100
          return (
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 flex-shrink-0"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <span className="text-sm font-extrabold text-amber-300">Lv{gLv}</span>
              {nextFame !== null ? (
                <>
                  <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#b45309,#f59e0b)' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(180,140,60,0.65)' }}>{state.fame}/{nextFame}</span>
                </>
              ) : <span className="text-xs text-amber-500 font-bold">MAX</span>}
            </div>
          )
        })()}

        {/* 자원 스탯 그룹 — 우측 정렬 */}
        <div className="ml-auto flex items-center gap-1">
          {[
            { id: 'day', iconSrc: UI_ICONS.timer, v: `Day ${state.day}`, c: 'text-cyan-300', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.15)' },
            { id: 'gold', iconSrc: UI_ICONS.gold, v: `${state.gold}G`, c: 'text-amber-300', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.18)' },
            { id: 'fame', iconSrc: UI_ICONS.fame, v: `${state.fame}`, c: 'text-fuchsia-300', bg: 'rgba(217,70,239,0.08)', border: 'rgba(217,70,239,0.15)' },
            { id: 'crystal', iconSrc: UI_ICONS.crystal, v: `${state.crystals ?? 0}`, c: 'text-violet-300', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' },
            { id: 'mercs', icon: '👥', v: `${activeMercCount}/${maxHireCap(roomLevels['식당'] ?? 1)}`, c: activeMercCount >= maxHireCap(roomLevels['식당'] ?? 1) ? 'text-red-400' : 'text-slate-300', bg: 'rgba(255,255,255,0.04)', border: activeMercCount >= maxHireCap(roomLevels['식당'] ?? 1) ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)' },
          ].map(({ id, icon, iconSrc, v, c, bg, border }) => (
            <div key={id} className="gm-resource-pill flex items-center gap-1 rounded-md px-1.5 py-1"
              style={{ borderColor: border, backgroundColor: bg }}>
              {iconSrc
                ? <img src={iconSrc} alt="" className="h-4 w-4 object-contain" draggable={false} />
                : <span className="text-sm leading-none">{icon}</span>}
              <span className={`text-xs font-bold ${c}`}>{v}</span>
            </div>
          ))}
        </div>

        {/* 우측 유틸 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => setZoomDelta(d => Math.max(-0.4, d - 0.1))}
              className="px-1.5 py-1 text-sm font-bold transition hover:brightness-125"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(160,160,160,0.8)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              −
            </button>
            <span className="px-1.5 text-xs" style={{ color: 'rgba(140,140,140,0.6)' }}>{Math.round((scale + zoomDelta) * 100)}%</span>
            <button onClick={() => setZoomDelta(d => Math.min(0.5, d + 0.1))}
              className="px-1.5 py-1 text-sm font-bold transition hover:brightness-125"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(160,160,160,0.8)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              +
            </button>
          </div>
          <button onClick={() => setShowTutorial(true)}
            className="rounded-md px-2 py-1 text-xs transition hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(120,120,120,0.7)' }}>
            ?
          </button>
          <button onClick={() => setShowSaveModal(true)}
            className="rounded-md px-2 py-1 text-xs transition hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(160,160,160,0.8)' }}>
            💾
          </button>
        </div>
      </header>

      {/* ── Scene ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex-1"
        data-scene-viewport="true"
        onWheel={handleSceneWheel}
        onTouchStart={handleSceneTouchStart}
        onTouchMove={handleSceneTouchMove}
        onTouchEnd={handleSceneTouchEnd}
        onTouchCancel={handleSceneTouchEnd}
        style={{ minHeight: 0, touchAction: 'none' }}
      >
        <div className="absolute inset-0 gm-scene-camera pointer-events-none" style={{
          transform: `scale(${sceneCamera.scale})`,
          transformOrigin: sceneCamera.origin,
        }}>
        {/* Background Image */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${bgBase})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }} />
        {/* 좌측 외부(외경) 어둡게, 우측 내부 살짝 어둡게 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.05) 42%, rgba(0,0,0,0.18) 100%)'
        }} />
        {/* 상단 및 하단 그라데이션 — UI 가독성 */}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 60, background: 'linear-gradient(180deg,rgba(0,0,0,0.5) 0%,transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 80, background: 'linear-gradient(0deg,rgba(0,0,0,0.55) 0%,transparent 100%)' }} />

        <button
          onClick={() => setSceneFocusId('외부')}
          className={`absolute rounded-2xl transition-all ${sceneFocusId === '외부' ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
          style={{ left: '2%', top: '20%', width: '38%', height: '72%', zIndex: 6, border: '1px solid rgba(251,191,36,0.18)', background: 'rgba(251,191,36,0.035)', cursor: 'zoom-in' }}
          title="외부 진입로 확대"
        />

        {/* ── Top-left buttons ── */}
        <div className={`absolute flex gap-1.5 rounded-2xl px-2 py-2 gm-float-card ${isSceneZoomed ? 'hidden' : ''}`} style={{ left: 10, top: 8, zIndex: 10 }}>
          <button onClick={() => setShowQuestModal(true)}
            className="gm-button-chrome rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-all relative">
            📜 계약 관리
            {(activeQuests.length > 0 || Object.keys(pendingAssign).some(k => (pendingAssign[k] ?? []).some(Boolean))) && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs font-extrabold flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                {activeQuests.length + Object.keys(pendingAssign).filter(k => (pendingAssign[k] ?? []).some(Boolean)).length}
              </span>
            )}
          </button>
          <button onClick={() => setShowMercModal(true)}
            className="gm-button-chrome rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-all">
            👥 용병 목록
          </button>
          <button onClick={() => { setBattleResultPage(Math.max(0, battleResults.length - 1)); setShowLogModal(true) }}
            className="gm-button-muted rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
            style={{ color: 'rgba(230,205,160,0.95)' }}>
            📋 결과{battleResults.length > 0 && <span className="ml-1 text-xs opacity-60">{battleResults.length}</span>}
          </button>
          <button onClick={refreshArrivals}
            className="gm-button-muted rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
            style={{
              color: state.gold >= ARRIVAL_REFRESH_COST ? 'rgba(255,210,80,0.9)' : 'rgba(100,75,25,0.4)',
            }}>
            🔄 용병 ({ARRIVAL_REFRESH_COST}G)
          </button>
          <button onClick={premiumRefreshArrivals}
            className="gm-button-muted rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
            style={{
              color: (state.crystals ?? 0) >= PREMIUM_REFRESH_COST ? 'rgba(196,181,253,0.95)' : 'rgba(80,60,120,0.4)',
            }}>
            💎 고급 ({PREMIUM_REFRESH_COST}💎)
          </button>
        </div>

        {/* ── 도착 용병 대기열 (하단 도로에 줄서기) ── */}
        <div className="absolute flex flex-col gap-1" style={{ left: 0, right: `${buildingWidth - 2}%`, bottom: 40, zIndex: 10 }}>
          {/* 라벨 */}
          <div className="flex items-center gap-2 px-3">
            {gateArrivals.length > 0
              ? <p className="text-xs font-bold tracking-widest" style={{ color: 'rgba(200,140,40,0.8)' }}>✦ 입단 희망자 {gateArrivals.length}명</p>
              : <p className="text-xs" style={{ color: 'rgba(120,90,40,0.5)' }}>🚶 다음 도착 {formatArrivalCountdown(nextArrivalTime, tickTime)}</p>
            }
          </div>
          {/* 가로 줄서기 */}
          <div className="flex items-end gap-3 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
            {gateArrivals.map((m) => {
              const sprite = getSprite(m.race, m.traits.gender, m.class)
              const gradeColor = m.grade === 'S' ? 'rgba(232,121,249,0.95)' : m.grade === 'A' ? 'rgba(251,191,36,0.95)' : m.grade === 'B' ? 'rgba(52,211,153,0.9)' : m.grade === 'C' ? 'rgba(56,189,248,0.85)' : 'rgba(160,160,170,0.8)'
              const spriteGlow = m.grade === 'S'
                ? 'drop-shadow(0 0 8px rgba(232,121,249,0.95)) drop-shadow(0 0 18px rgba(232,121,249,0.55))'
                : m.grade === 'A'
                ? 'drop-shadow(0 0 7px rgba(251,191,36,0.9)) drop-shadow(0 0 14px rgba(251,191,36,0.5))'
                : m.grade === 'B'
                ? 'drop-shadow(0 0 5px rgba(52,211,153,0.7))'
                : 'none'
              return (
                <div key={m.id} className="flex-shrink-0 flex flex-col cursor-pointer hover:brightness-110 transition-all"
                  style={{ width: 72 }} onClick={() => setPreviewArrival(m)}>
                  {/* 레벨 */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(220,185,100,0.95)', textAlign: 'center', width: '100%', padding: '2px 4px 0px' }}>Lv.{m.level}</div>
                  {/* 등급 (이름 위) */}
                  <div style={{ fontSize: 12, fontWeight: 800, color: gradeColor, padding: '1px 4px 1px', textAlign: 'center', letterSpacing: 1 }}>
                    {m.grade}
                  </div>
                  {/* 이름 */}
                  <p style={{ fontSize: 11, color: '#ede4cc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 4px', textAlign: 'center' }}>{m.name}</p>
                  {/* 속성 + 전투력 */}
                  <div style={{ fontSize: 10, display: 'flex', gap: 4, padding: '1px 4px 3px', width: '100%', justifyContent: 'center', color: 'rgba(200,200,200,0.8)' }}>
                    <span>{ELEMENT_ICON[m.element]}</span>
                    <span style={{ color: '#67e8f9', fontWeight: 700 }}>⚔{m.power}</span>
                  </div>
                  {/* 스프라이트 (등급 글로우) */}
                  <div style={{ position: 'relative', width: 68, height: 84, alignSelf: 'center' }}>
                    {sprite
                      ? <img src={sprite} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom', filter: spriteGlow }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', filter: spriteGlow }}><MercAvatar m={m} size={56} /></div>
                    }
                    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 26, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(4px)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Guild Building (right) — 배경 이미지 3층 구조 오버레이 ── */}
        <div className="absolute right-0 top-0 bottom-0" style={{ width: `${buildingWidth}%` }}>
          {/* 리사이즈 핸들 — 좌측 가장자리 드래그로 건물 너비 조정 */}
          <div
            onMouseDown={handleBuildingResizeStart}
            className="absolute top-0 bottom-0 z-30 group"
            style={{ left: 0, width: 10, cursor: 'col-resize' }}
          >
            <div className="absolute inset-y-0" style={{
              left: 3, width: 3,
              background: 'rgba(200,150,50,0.0)',
              borderLeft: '2px dashed rgba(200,150,50,0.0)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,150,50,0.25)'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(200,150,50,0.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,150,50,0)'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(200,150,50,0)' }}
            />
          </div>
          {/* 길드 홀 레벨 배지 */}
          <div className="absolute top-2 right-3 z-20 pointer-events-none">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,210,100,0.95)', border: '1px solid rgba(200,150,50,0.45)' }}>
              ⚔ 길드 홀 Lv{buildings.hall}
            </span>
          </div>
          {selectedRoomOperation && !isSceneZoomed && (
            <div className="absolute z-30 rounded-xl p-3 gm-panel-shell"
              style={{ right: 12, top: 38, width: 270, backdropFilter: 'blur(10px)' }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(220,170,90,0.7)' }}>Room Control</p>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    {ROOM_EFFECTS[selectedRoomOperation.room].icon} {selectedRoomOperation.room}
                    <span className="text-xs ml-1.5 text-slate-400">Lv{selectedRoomOperation.roomLv}</span>
                  </h3>
                </div>
                <button onClick={() => setSelectedRoomId(null)} className="text-slate-500 hover:text-white text-lg leading-none px-1">×</button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] text-slate-500">인원</p>
                  <p className="text-sm font-bold text-white">{selectedRoomOperation.occupants.length}/{selectedRoomOperation.cap}</p>
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] text-slate-500">상태</p>
                  <p className={selectedRoomOperation.occupants.length === 0 ? 'text-sm font-bold text-slate-400' : selectedRoomOperation.occupants.length >= selectedRoomOperation.cap ? 'text-sm font-bold text-amber-300' : 'text-sm font-bold text-emerald-300'}>{selectedRoomOperation.status}</p>
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] text-slate-500">효과</p>
                  <p className="text-sm font-bold text-cyan-200">{ROOM_EFFECTS[selectedRoomOperation.room].desc[selectedRoomOperation.roomLv - 1]}</p>
                </div>
              </div>
              <p className="text-xs mt-3" style={{ color: 'rgba(200,210,220,0.76)' }}>{selectedRoomOperation.action}</p>
              {selectedRoomOperation.subAction && (
                <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.72)' }}>{selectedRoomOperation.subAction}</p>
              )}
              <div className="grid grid-cols-2 gap-1.5 mt-3">
                <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(251,191,36,0.055)', border: '1px solid rgba(251,191,36,0.14)' }}>
                  <p className="text-[10px]" style={{ color: 'rgba(251,191,36,0.7)' }}>다음 효과</p>
                  <p className="text-xs font-bold text-amber-100">{selectedRoomOperation.nextEffect}</p>
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(125,211,252,0.055)', border: '1px solid rgba(125,211,252,0.14)' }}>
                  <p className="text-[10px]" style={{ color: 'rgba(125,211,252,0.7)' }}>빈 슬롯</p>
                  <p className="text-xs font-bold text-cyan-100">{Math.max(0, selectedRoomOperation.cap - selectedRoomOperation.occupants.length)}칸</p>
                </div>
              </div>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(226,232,240,0.68)' }}>{selectedRoomOperation.recommendation}</p>
              <div className="flex items-center gap-2 mt-3">
                {selectedRoomOperation.nextCost > 0 && (
                  <button
                    disabled={!selectedRoomOperation.canUpgrade || state.gold < selectedRoomOperation.nextCost}
                    onClick={() => upgradeRoom(selectedRoomOperation.room)}
                    className="gm-button-primary rounded-lg px-3 py-1.5 text-xs font-extrabold text-white disabled:cursor-not-allowed">
                    업그레이드 {selectedRoomOperation.nextCost}G
                  </button>
                )}
                <span className="text-xs" style={{ color: selectedRoomOperation.blocked ? 'rgba(251,191,36,0.82)' : 'rgba(148,163,184,0.72)' }}>
                  {selectedRoomOperation.blocked ? '상위 조건 필요' : draggingMercId ? '방 위에 놓으면 배치' : '용병을 드래그해 배치'}
                </span>
              </div>
            </div>
          )}
          {/* 3층 패널 컨테이너 — 드래그 핸들로 위치/크기 조정 가능 */}
          <div className="absolute flex flex-col" style={{ top: `${roomInsets.top}%`, left: `${roomInsets.left}%`, right: `${roomInsets.right}%`, bottom: `${roomInsets.bottom}%`, gap: '0.8%' }}>
            {/* 상단 핸들 */}
            <div onMouseDown={handleRoomEdgeDrag('top')} className="absolute z-40" style={{ top: 0, left: 12, right: 12, height: 8, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(200,160,60,0.35)' }} />
            </div>
            {/* 하단 핸들 */}
            <div onMouseDown={handleRoomEdgeDrag('bottom')} className="absolute z-40" style={{ bottom: 0, left: 12, right: 12, height: 8, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(200,160,60,0.35)' }} />
            </div>
            {/* 좌측 핸들 */}
            <div onMouseDown={handleRoomEdgeDrag('left')} className="absolute z-40" style={{ left: 0, top: 12, bottom: 12, width: 8, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 3, height: 36, borderRadius: 2, background: 'rgba(200,160,60,0.35)' }} />
            </div>
            {/* 우측 핸들 */}
            <div onMouseDown={handleRoomEdgeDrag('right')} className="absolute z-40" style={{ right: 0, top: 12, bottom: 12, width: 8, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 3, height: 36, borderRadius: 2, background: 'rgba(200,160,60,0.35)' }} />
            </div>

            {/* ── 3F: 길드마스터룸 (상단 전략실) ── */}
            {(() => {
              const room = '길드마스터룸' as const
              const cap = masterCapacity(roomLevels[room] ?? 1)
              const occupants = mercs.filter(m => m.room === room && m.status === '대기중' && !pendingMercIds.has(m.id))
              const roomLv = roomLevels[room] ?? 1
              const costs = ROOM_UPGRADE_COSTS[room]
              const canUpgrade = roomLv < 3
              const upgCost = canUpgrade && costs ? costs[roomLv - 1] : 0
              const souls = mercs.filter(m => m.status === '영혼')
              return (
                <div className={`gm-room-surface flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col ${selectedRoomId === room ? 'gm-room-selected' : ''} ${dropTargetRoom === room ? 'gm-room-drop-target' : ''}`}
                  style={{ background: 'rgba(10,6,25,0.32)', border: '1px solid rgba(160,110,255,0.35)', boxShadow: '0 2px 12px rgba(80,40,160,0.1)' }}
                  onClick={() => focusRoom(room)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnter={() => draggingMercId && setDropTargetRoom(room)}
                  onDragLeave={() => setDropTargetRoom(prev => prev === room ? null : prev)}
                  onDrop={e => { e.preventDefault(); const mid = e.dataTransfer.getData('roomMercId') || e.dataTransfer.getData('mercId'); if (mid) updateMercRoom(mid, room) }}>
                  <div className="flex items-center justify-between px-2 py-1 flex-shrink-0"
                    style={{ background: 'rgba(18,8,42,0.72)', borderBottom: '1px solid rgba(140,90,230,0.25)' }}>
                    <span className="text-xs font-bold" style={{ color: 'rgba(200,170,255,0.95)' }}>
                      👑 {room} <span className="opacity-50">Lv{roomLv}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'rgba(120,180,120,0.7)' }}>{ROOM_EFFECTS[room].desc[roomLv - 1]}</span>
                      {canUpgrade && (
                        <button onClick={() => upgradeRoom(room)}
                          className="text-xs font-bold rounded px-1.5 py-0.5 text-white transition hover:brightness-125"
                          style={{ background: state.gold >= upgCost ? 'rgba(16,185,129,0.4)' : 'rgba(80,80,80,0.3)', border: '1px solid rgba(16,185,129,0.28)' }}>
                          ↑{upgCost}G
                        </button>
                      )}
                      <span className="gm-room-badge">{occupants.length}/{cap}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="flex flex-wrap gap-2 p-2 items-end content-start">
                      {occupants.slice(0, cap).map(m => {
                        const isSel = selectedMercId === m.id
                        const isPend = pendingMercIds.has(m.id)
                        const sprite = getSprite(m.race, m.traits.gender, m.class)
                        const spriteGlow = m.grade === 'S'
                          ? 'drop-shadow(0 0 8px rgba(232,121,249,0.95)) drop-shadow(0 0 18px rgba(232,121,249,0.55))'
                          : m.grade === 'A'
                          ? 'drop-shadow(0 0 7px rgba(251,191,36,0.9)) drop-shadow(0 0 14px rgba(251,191,36,0.5))'
                          : m.grade === 'B'
                          ? 'drop-shadow(0 0 5px rgba(52,211,153,0.7))'
                          : 'none'
                        return (
                          <div key={m.id} draggable
                            onDragStart={e => { e.dataTransfer.setData('roomMercId', m.id); e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                            onDragEnd={() => { setDraggingMercId(null); setDropTargetRoom(null) }}
                            onClick={() => { setSelectedMercId(isSel ? null : m.id); setRoomMercPreview(m) }}
                            role="button" tabIndex={0}
                            className="flex flex-col items-center transition-all select-none"
                            style={{ width: 72, cursor: 'grab', opacity: draggingMercId === m.id ? 0.35 : 1, borderRadius: 8,
                              background: isSel ? 'rgba(251,191,36,0.1)' : isPend ? 'rgba(99,102,241,0.08)' : 'transparent',
                              outline: isSel ? '1px solid rgba(251,191,36,0.45)' : 'none' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: m.leavingAt ? 'rgba(239,68,68,0.9)' : 'rgba(220,185,100,0.95)', textAlign: 'center', width: '100%', padding: '2px 4px 1px' }}>{m.leavingAt ? '퇴단 예고' : `Lv.${m.level}`}</div>
                            <div style={{ width: '100%', padding: '0 4px 3px' }}>
                              <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, m.expToNext > 0 ? (m.experience / m.expToNext) * 100 : 0)}%`, background: 'rgba(200,160,50,0.85)', borderRadius: 2 }} />
                              </div>
                            </div>
                            <p style={{ fontSize: 11, color: '#ede4cc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 4px', textAlign: 'center' }}>{m.name}</p>
                            <div style={{ fontSize: 10, display: 'flex', gap: 4, padding: '1px 4px 3px', width: '100%', justifyContent: 'center', color: 'rgba(200,200,200,0.8)' }}>
                              <span>{ELEMENT_ICON[m.element]}</span>
                              <span style={{ color: '#67e8f9', fontWeight: 700 }}>⚔{m.power}</span>
                            </div>
                            <div style={{ position: 'relative', width: 68, height: 84, alignSelf: 'center' }}>
                              {sprite
                                ? <img src={sprite} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom', filter: spriteGlow, animation: 'gm-report 3s ease-in-out infinite' }} />
                                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', filter: spriteGlow, animation: 'gm-report 3s ease-in-out infinite' }}><MercAvatar m={m} size={56} /></div>
                              }
                              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 26, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(4px)' }} />
                            </div>
                          </div>
                        )
                      })}
                      {occupants.length === 0 && souls.length === 0 && (
                        <p className="text-xs italic p-1" style={{ color: 'rgba(120,90,180,0.4)' }}>드래그하여 배치</p>
                      )}
                    </div>
                    {souls.length > 0 && (
                      <div className="px-1.5 pb-1 flex flex-col gap-1">
                        <p className="text-xs font-bold px-1" style={{ color: 'rgba(160,130,255,0.7)' }}>👻 영혼</p>
                        {souls.map(m => (
                          <div key={m.id} className="rounded-lg overflow-hidden"
                            style={{ background: 'rgba(70,40,140,0.2)', border: '1px solid rgba(160,130,255,0.32)' }}>
                            <div className="flex items-center gap-1.5 px-2 py-1">
                              <MercAvatar m={m} size={30} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate" style={{ color: 'rgba(200,180,255,0.85)' }}>{m.name}</p>
                                <p className="text-xs" style={{ color: 'rgba(160,130,255,0.55)' }}>{m.class} {m.grade}급 Lv{m.level}</p>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <button onClick={() => reviveMerc(m.id)}
                                  className="text-xs rounded px-1.5 py-0.5 font-bold transition hover:brightness-125"
                                  style={{ background: state.gold >= m.deathCost ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${state.gold >= m.deathCost ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.08)'}`, color: state.gold >= m.deathCost ? '#86efac' : 'rgba(80,80,80,0.5)', cursor: state.gold >= m.deathCost ? 'pointer' : 'not-allowed' }}>
                                  ✨{m.deathCost}G
                                </button>
                                <button onClick={() => ascendMerc(m.id)}
                                  className="text-xs rounded px-1.5 py-0.5 font-bold transition hover:brightness-125"
                                  style={{ background: 'rgba(160,130,255,0.15)', border: '1px solid rgba(160,130,255,0.28)', color: 'rgba(200,180,255,0.8)' }}>
                                  🕊+💎
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── 2F: 훈련소 (중간 훈련장) ── */}
            {(() => {
              const room = '훈련소' as const
              const cap = trainingCapacity(roomLevels[room] ?? 1)
              const occupants = mercs.filter(m => m.room === room && m.status === '대기중' && !pendingMercIds.has(m.id))
              const roomLv = roomLevels[room] ?? 1
              const costs = ROOM_UPGRADE_COSTS[room]
              const canUpgrade = roomLv < 3 && roomLv < (roomLevels['길드마스터룸'] ?? 1)
              const upgCost = canUpgrade && costs ? costs[roomLv - 1] : 0
              return (
                <div className={`gm-room-surface flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col ${selectedRoomId === room ? 'gm-room-selected' : ''} ${dropTargetRoom === room ? 'gm-room-drop-target' : ''}`}
                  style={{ background: 'rgba(22,8,4,0.32)', border: '1px solid rgba(220,100,50,0.35)', boxShadow: '0 2px 12px rgba(180,60,20,0.08)' }}
                  onClick={() => focusRoom(room)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnter={() => draggingMercId && setDropTargetRoom(room)}
                  onDragLeave={() => setDropTargetRoom(prev => prev === room ? null : prev)}
                  onDrop={e => { e.preventDefault(); const mid = e.dataTransfer.getData('roomMercId') || e.dataTransfer.getData('mercId'); if (mid) updateMercRoom(mid, room) }}>
                  <div className="flex items-center justify-between px-2 py-1 flex-shrink-0"
                    style={{ background: 'rgba(38,10,4,0.72)', borderBottom: '1px solid rgba(200,90,40,0.25)' }}>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,155,90,0.95)' }}>
                      ⚔️ {room} <span className="opacity-50">Lv{roomLv}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'rgba(120,180,120,0.7)' }}>{ROOM_EFFECTS[room].desc[roomLv - 1]}</span>
                      {canUpgrade && (
                        <button onClick={() => upgradeRoom(room)}
                          className="text-xs font-bold rounded px-1.5 py-0.5 text-white transition hover:brightness-125"
                          style={{ background: state.gold >= upgCost ? 'rgba(16,185,129,0.4)' : 'rgba(80,80,80,0.3)', border: '1px solid rgba(16,185,129,0.28)' }}>
                          ↑{upgCost}G
                        </button>
                      )}
                      <span className="gm-room-badge">{occupants.length}/{cap}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 p-2 items-end content-start overflow-y-auto flex-1 min-h-0">
                    {occupants.slice(0, cap).map(m => {
                      const isSel = selectedMercId === m.id
                      const isPend = pendingMercIds.has(m.id)
                      const sprite = getSprite(m.race, m.traits.gender, m.class)
                      const spriteGlow = m.grade === 'S'
                        ? 'drop-shadow(0 0 8px rgba(232,121,249,0.95)) drop-shadow(0 0 18px rgba(232,121,249,0.55))'
                        : m.grade === 'A'
                        ? 'drop-shadow(0 0 7px rgba(251,191,36,0.9)) drop-shadow(0 0 14px rgba(251,191,36,0.5))'
                        : m.grade === 'B'
                        ? 'drop-shadow(0 0 5px rgba(52,211,153,0.7))'
                        : 'none'
                      return (
                        <div key={m.id} draggable
                          onDragStart={e => { e.dataTransfer.setData('roomMercId', m.id); e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                          onDragEnd={() => { setDraggingMercId(null); setDropTargetRoom(null) }}
                          onClick={() => { setSelectedMercId(isSel ? null : m.id); setRoomMercPreview(m) }}
                          role="button" tabIndex={0}
                          className="flex flex-col items-center transition-all select-none"
                          style={{ width: 72, cursor: 'grab', opacity: draggingMercId === m.id ? 0.35 : 1, borderRadius: 8,
                            background: isSel ? 'rgba(251,191,36,0.1)' : isPend ? 'rgba(99,102,241,0.08)' : 'transparent',
                            outline: isSel ? '1px solid rgba(251,191,36,0.45)' : 'none' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: m.leavingAt ? 'rgba(239,68,68,0.9)' : 'rgba(220,185,100,0.95)', textAlign: 'center', width: '100%', padding: '2px 4px 1px' }}>{m.leavingAt ? '퇴단 예고' : `Lv.${m.level}`}</div>
                          <p style={{ fontSize: 11, color: '#ede4cc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 4px', textAlign: 'center' }}>{m.name}</p>
                          <div style={{ fontSize: 10, display: 'flex', gap: 4, padding: '1px 4px 3px', width: '100%', justifyContent: 'center', color: 'rgba(200,200,200,0.8)' }}>
                            <span>{ELEMENT_ICON[m.element]}</span>
                            <span style={{ color: '#67e8f9', fontWeight: 700 }}>⚔{m.power}</span>
                          </div>
                          <div style={{ position: 'relative', width: 68, height: 84, alignSelf: 'center' }}>
                            {sprite
                              ? <img src={sprite} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom', filter: spriteGlow, animation: 'gm-training 1.1s ease-in-out infinite' }} />
                              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', filter: spriteGlow, animation: 'gm-training 1.1s ease-in-out infinite' }}><MercAvatar m={m} size={56} /></div>
                            }
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 26, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(4px)' }} />
                          </div>
                        </div>
                      )
                    })}
                    {occupants.length === 0 && (
                      <p className="text-xs italic p-1" style={{ color: 'rgba(180,100,50,0.4)' }}>드래그하여 배치</p>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── 1F: 식당 (하단 선술집) ── */}
            {(() => {
              const room = '식당' as const
              const occupants = mercs.filter(m => m.room === room && m.status === '대기중')
              const roomLv = roomLevels[room] ?? 1
              const costs = ROOM_UPGRADE_COSTS[room]
              const canUpgrade = roomLv < 3 && roomLv < (roomLevels['길드마스터룸'] ?? 1)
              const upgCost = canUpgrade && costs ? costs[roomLv - 1] : 0
              return (
                <div className={`gm-room-surface flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col ${selectedRoomId === room ? 'gm-room-selected' : ''} ${dropTargetRoom === room ? 'gm-room-drop-target' : ''}`}
                  style={{ background: 'rgba(4,16,8,0.32)', border: '1px solid rgba(60,200,100,0.35)', boxShadow: '0 2px 12px rgba(20,140,60,0.08)' }}
                  onClick={() => focusRoom(room)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnter={() => draggingMercId && setDropTargetRoom(room)}
                  onDragLeave={() => setDropTargetRoom(prev => prev === room ? null : prev)}
                  onDrop={e => { e.preventDefault(); const mid = e.dataTransfer.getData('roomMercId') || e.dataTransfer.getData('mercId'); if (mid) updateMercRoom(mid, room) }}>
                  <div className="flex items-center justify-between px-2 py-1 flex-shrink-0"
                    style={{ background: 'rgba(4,25,10,0.72)', borderBottom: '1px solid rgba(50,180,80,0.25)' }}>
                    <span className="text-xs font-bold" style={{ color: 'rgba(80,230,125,0.95)' }}>
                      🍖 {room} <span className="opacity-50">Lv{roomLv}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'rgba(120,180,120,0.7)' }}>{ROOM_EFFECTS[room].desc[roomLv - 1]}</span>
                      {canUpgrade && (
                        <button onClick={() => upgradeRoom(room)}
                          className="text-xs font-bold rounded px-1.5 py-0.5 text-white transition hover:brightness-125"
                          style={{ background: state.gold >= upgCost ? 'rgba(16,185,129,0.4)' : 'rgba(80,80,80,0.3)', border: '1px solid rgba(16,185,129,0.28)' }}>
                          ↑{upgCost}G
                        </button>
                      )}
                      <span className="gm-room-badge">{occupants.length}/{maxHireCap(roomLevels['식당'] ?? 1)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 p-2 items-end content-start overflow-y-auto flex-1 min-h-0">
                    {occupants.map(m => {
                      const isSel = selectedMercId === m.id
                      const isPend = pendingMercIds.has(m.id)
                      const sprite = getSprite(m.race, m.traits.gender, m.class)
                      const spriteGlow = m.grade === 'S'
                        ? 'drop-shadow(0 0 8px rgba(232,121,249,0.95)) drop-shadow(0 0 18px rgba(232,121,249,0.55))'
                        : m.grade === 'A'
                        ? 'drop-shadow(0 0 7px rgba(251,191,36,0.9)) drop-shadow(0 0 14px rgba(251,191,36,0.5))'
                        : m.grade === 'B'
                        ? 'drop-shadow(0 0 5px rgba(52,211,153,0.7))'
                        : 'none'
                      return (
                        <div key={m.id} draggable
                          onDragStart={e => { e.dataTransfer.setData('roomMercId', m.id); e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                          onDragEnd={() => { setDraggingMercId(null); setDropTargetRoom(null) }}
                          onClick={() => { setSelectedMercId(isSel ? null : m.id); setRoomMercPreview(m) }}
                          role="button" tabIndex={0}
                          className="flex flex-col items-center transition-all select-none"
                          style={{ width: 72, cursor: 'grab', opacity: draggingMercId === m.id ? 0.35 : 1, borderRadius: 8,
                            background: isSel ? 'rgba(251,191,36,0.1)' : isPend ? 'rgba(99,102,241,0.08)' : 'transparent',
                            outline: isSel ? '1px solid rgba(251,191,36,0.45)' : 'none' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: m.leavingAt ? 'rgba(239,68,68,0.9)' : 'rgba(220,185,100,0.95)', textAlign: 'center', width: '100%', padding: '2px 4px 1px' }}>{m.leavingAt ? '퇴단 예고' : `Lv.${m.level}`}</div>
                          <p style={{ fontSize: 11, color: '#ede4cc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 4px', textAlign: 'center' }}>{m.name}</p>
                          <div style={{ fontSize: 10, display: 'flex', gap: 4, padding: '1px 4px 3px', width: '100%', justifyContent: 'center', color: 'rgba(200,200,200,0.8)' }}>
                            <span>{ELEMENT_ICON[m.element]}</span>
                            <span style={{ color: '#67e8f9', fontWeight: 700 }}>⚔{m.power}</span>
                          </div>
                          <div style={{ position: 'relative', width: 68, height: 84, alignSelf: 'center' }}>
                            {sprite
                              ? <img src={sprite} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom', filter: spriteGlow, animation: 'gm-eating 2s ease-in-out infinite' }} />
                              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', filter: spriteGlow, animation: 'gm-eating 2s ease-in-out infinite' }}><MercAvatar m={m} size={56} /></div>
                            }
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 26, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(4px)' }} />
                          </div>
                        </div>
                      )
                    })}
                    {occupants.length === 0 && (
                      <p className="text-xs italic p-1" style={{ color: 'rgba(50,150,80,0.4)' }}>드래그하여 배치</p>
                    )}
                  </div>
                </div>
              )
            })()}

          </div>
        </div>
        {/* (구 Wall/Rooms grid 이하는 위 3층 구조로 대체) */}
        <div style={{ display: 'none' }}>
            {/* Rooms grid in building: 2F top, 1F bottom */}
            <div className="relative z-10 flex flex-col gap-1 p-2 min-h-0" style={{ height: 'calc(100% - 50px)' }}>
              {/* 2F section */}
              <div className="flex flex-col flex-1 min-h-0 gap-1">
              <div className="text-sm font-bold px-1 flex-shrink-0" style={{ color: 'rgba(200,160,60,0.5)' }}>2F</div>
              <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                {(['길드마스터룸', '훈련소'] as const).map(room => {
                  const cap = maxHireCap(roomLevels['식당'] ?? 1)
                  const occupants = mercs.filter(m => m.room === room && m.status === '대기중' && !pendingMercIds.has(m.id))
                  const roomLv = roomLevels[room] ?? 1
                  const costs = ROOM_UPGRADE_COSTS[room]
                  const canUpgrade = roomLv < 3 && (room === '길드마스터룸' || roomLv < (roomLevels['길드마스터룸'] ?? 1))
                  const upgCost = canUpgrade && costs ? costs[roomLv - 1] : 0
                  return (
                    <div key={room} className="rounded-lg overflow-hidden flex flex-col min-h-0"
                      style={room === '길드마스터룸'
                        ? { background: 'rgba(12,8,28,0.78)', border: '2px solid rgba(160,110,255,0.5)', boxShadow: '0 4px 24px rgba(80,40,180,0.2), inset 0 0 20px rgba(80,40,160,0.08)' }
                        : { background: 'rgba(28,10,6,0.78)', border: '2px solid rgba(220,100,50,0.5)', boxShadow: '0 4px 24px rgba(180,60,20,0.2), inset 0 0 20px rgba(180,60,20,0.08)' }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const mid = e.dataTransfer.getData('roomMercId')
                        if (mid) updateMercRoom(mid, room)
                      }}>
                      <div className="flex flex-col px-1.5 pt-1 pb-0.5 flex-shrink-0"
                        style={room === '길드마스터룸'
                          ? { background: 'rgba(30,15,65,0.85)', borderBottom: '1px solid rgba(160,110,255,0.3)' }
                          : { background: 'rgba(55,15,8,0.85)', borderBottom: '1px solid rgba(220,100,50,0.3)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: room === '길드마스터룸' ? 'rgba(180,140,255,0.9)' : 'rgba(255,140,80,0.9)' }}>
                            {ROOM_EFFECTS[room].icon} {room}
                            <span className="ml-1 text-sm text-slate-500">Lv{roomLv}</span>
                          </span>
                          {canUpgrade && (
                            <button onClick={() => upgradeRoom(room)}
                              className="text-sm font-bold rounded px-1.5 py-0.5 text-white transition hover:brightness-125 flex-shrink-0"
                              style={{
                                background: state.gold >= upgCost ? 'rgba(16,185,129,0.5)' : 'rgba(100,100,100,0.3)',
                                border: '1px solid rgba(16,185,129,0.3)'
                              }}>
                              ↑{upgCost}G
                            </button>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: 'rgba(120,180,120,0.7)' }}>
                          {ROOM_EFFECTS[room].desc[roomLv - 1]}
                        </span>
                      </div>
                      <div className="flex flex-col overflow-y-auto flex-1 min-h-0">
                        <div className="flex flex-wrap gap-1 p-1.5 content-start">
                          {occupants.slice(0, cap).map(m => {
                            const isSel = selectedMercId === m.id
                            const isPend = pendingMercIds.has(m.id)
                            return (
                              <div key={m.id} draggable
                                onDragStart={e => { e.dataTransfer.setData('roomMercId', m.id); e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                                onDragEnd={() => { setDraggingMercId(null); setDropTargetRoom(null) }}
                                onClick={() => { setSelectedMercId(isSel ? null : m.id); setRoomMercPreview(m) }}
                                role="button" tabIndex={0}
                                className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-all select-none"
                                style={{
                                  minWidth: 82, cursor: 'grab', opacity: draggingMercId === m.id ? 0.4 : 1,
                                  background: isSel ? 'rgba(251,191,36,0.25)' : isPend ? 'rgba(99,102,241,0.2)' : 'rgba(15,12,8,0.7)',
                                  border: `1px solid ${isSel ? 'rgba(251,191,36,0.7)' : isPend ? 'rgba(99,102,241,0.5)' : 'rgba(100,70,30,0.3)'}`,
                                }}>
                                <MercAvatar m={m} size={44} />
                                <p className="text-sm font-semibold text-slate-300 truncate max-w-[80px]">{m.name}</p>
                                <span className={`text-sm font-bold ${gradeText(m.grade)}`}>{GRADE_STARS[m.grade] ?? m.grade} Lv{m.level}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`text-xs font-semibold ${m.condition >= 70 ? 'text-emerald-400' : m.condition >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{m.condition}%</span>
                                  <span className="text-xs" style={{ color: (m.morale ?? 70) >= 70 ? 'rgba(129,140,248,0.9)' : (m.morale ?? 70) >= 40 ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)' }}>⚡{m.morale ?? 70}</span>
                                  <span className="text-xs">{favEmoji(m.favorability)}</span>
                                </div>
                              </div>
                            )
                          })}
                          {occupants.length > cap && (
                            <p className="text-sm text-slate-600 p-1">+{occupants.length - cap}명 대기</p>
                          )}
                          {occupants.length === 0 && room !== '길드마스터룸' && (
                            <p className="text-sm italic p-1" style={{ color: 'rgba(100,80,50,0.4)' }}>드래그하여 배치</p>
                          )}
                        </div>
                        {/* 영혼 섹션 — 길드마스터룸 전용 */}
                        {room === '길드마스터룸' && (() => {
                          const souls = mercs.filter(m => m.status === '영혼')
                          if (souls.length === 0) return occupants.length === 0
                            ? <p className="text-sm italic px-2.5 pb-2" style={{ color: 'rgba(100,80,50,0.4)' }}>드래그하여 배치</p>
                            : null
                          return (
                            <div className="px-1.5 pb-1.5 flex flex-col gap-1.5">
                              <p className="text-xs font-bold px-1 pt-0.5" style={{ color: 'rgba(160,130,255,0.7)' }}>👻 영혼</p>
                              {souls.map(m => (
                                <div key={m.id} className="rounded-lg overflow-hidden"
                                  style={{ background: 'rgba(80,50,160,0.15)', border: '1px solid rgba(160,130,255,0.35)' }}>
                                  <div className="flex items-center gap-2 px-2 py-1.5">
                                    <MercAvatar m={m} size={36} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold truncate" style={{ color: 'rgba(200,180,255,0.85)' }}>{m.name}</p>
                                      <p className="text-xs" style={{ color: 'rgba(160,130,255,0.6)' }}>
                                        {m.class} {m.grade}급 Lv{m.level}
                                      </p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button onClick={() => reviveMerc(m.id)}
                                        className="text-xs rounded px-2 py-1 font-bold transition hover:brightness-125"
                                        style={{
                                          background: state.gold >= m.deathCost ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
                                          border: `1px solid ${state.gold >= m.deathCost ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                          color: state.gold >= m.deathCost ? '#86efac' : 'rgba(80,80,80,0.5)',
                                          cursor: state.gold >= m.deathCost ? 'pointer' : 'not-allowed',
                                        }}>
                                        ✨ 부활 {m.deathCost}G
                                      </button>
                                      <button onClick={() => ascendMerc(m.id)}
                                        className="text-xs rounded px-2 py-1 font-bold transition hover:brightness-125"
                                        style={{ background: 'rgba(160,130,255,0.15)', border: '1px solid rgba(160,130,255,0.3)', color: 'rgba(200,180,255,0.8)' }}>
                                        🕊 성불 +1💎
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
              </div>{/* end 2F wrapper */}
              {/* 1F section */}
              <div className="flex flex-col flex-1 min-h-0 gap-1">
              <div className="text-sm font-bold px-1 flex-shrink-0" style={{ color: 'rgba(200,160,60,0.5)' }}>1F</div>
              {/* 1F: 식당 full width */}
              {(() => {
                const room = '식당' as const
                const occupants = mercs.filter(m => m.room === room && m.status === '대기중')
                const roomLv = roomLevels[room] ?? 1
                const costs = ROOM_UPGRADE_COSTS[room]
                const canUpgrade = roomLv < 3 && roomLv < (roomLevels['길드마스터룸'] ?? 1)
                const upgCost = canUpgrade && costs ? costs[roomLv - 1] : 0
                return (
                  <div className="rounded-lg overflow-hidden flex flex-col flex-1 min-h-0"
                    style={{ background: 'rgba(6,22,12,0.78)', border: '2px solid rgba(60,200,100,0.45)', boxShadow: '0 4px 24px rgba(20,140,60,0.15), inset 0 0 20px rgba(20,140,60,0.06)' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const mid = e.dataTransfer.getData('roomMercId')
                      if (mid) updateMercRoom(mid, room)
                    }}>
                    <div className="flex flex-col px-1.5 pt-1 pb-0.5 flex-shrink-0"
                      style={{ background: 'rgba(8,40,20,0.85)', borderBottom: '1px solid rgba(60,200,100,0.25)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: 'rgba(80,220,120,0.9)' }}>
                          {ROOM_EFFECTS[room].icon} {room}
                          <span className="ml-1 text-sm text-slate-500">Lv{roomLv}</span>
                        </span>
                        {canUpgrade && (
                          <button onClick={() => upgradeRoom(room)}
                            className="text-sm font-bold rounded px-1.5 py-0.5 text-white transition hover:brightness-125 flex-shrink-0"
                            style={{
                              background: state.gold >= upgCost ? 'rgba(16,185,129,0.5)' : 'rgba(100,100,100,0.3)',
                              border: '1px solid rgba(16,185,129,0.3)'
                            }}>
                            ↑{upgCost}G
                          </button>
                        )}
                      </div>
                      <span className="text-sm" style={{ color: 'rgba(120,180,120,0.7)' }}>
                        {ROOM_EFFECTS[room].desc[roomLv - 1]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1.5 content-start overflow-y-auto flex-1 min-h-0">
                      {occupants.map(m => {
                        const isSel = selectedMercId === m.id
                        const isPend = pendingMercIds.has(m.id)
                        return (
                          <div key={m.id} draggable
                            onDragStart={e => { e.dataTransfer.setData('roomMercId', m.id); e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                            onDragEnd={() => { setDraggingMercId(null); setDropTargetRoom(null) }}
                            onClick={() => { setSelectedMercId(isSel ? null : m.id); setRoomMercPreview(m) }}
                            role="button" tabIndex={0}
                            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-all select-none"
                            style={{
                              minWidth: 82, cursor: 'grab', opacity: draggingMercId === m.id ? 0.4 : 1,
                              background: isSel ? 'rgba(251,191,36,0.25)' : isPend ? 'rgba(99,102,241,0.2)' : 'rgba(15,12,8,0.7)',
                              border: `1px solid ${isSel ? 'rgba(251,191,36,0.7)' : isPend ? 'rgba(99,102,241,0.5)' : 'rgba(100,70,30,0.3)'}`,
                            }}>
                            <MercAvatar m={m} size={44} />
                            <p className="text-sm font-semibold text-slate-300 truncate max-w-[80px]">{m.name}</p>
                            <span className={`text-sm font-bold ${gradeText(m.grade)}`}>{GRADE_STARS[m.grade]}Lv{m.level}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-sm font-semibold ${m.condition >= 70 ? 'text-emerald-400' : m.condition >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{m.condition}%</span>
                              <span className="text-sm">{favEmoji(m.favorability)}</span>
                            </div>
                          </div>
                        )
                      })}
                      {occupants.length === 0 && (
                        <p className="text-sm italic p-1" style={{ color: 'rgba(100,80,50,0.4)' }}>드래그하여 배치</p>
                      )}
                    </div>
                  </div>
                )
              })()}
              </div>{/* end 1F wrapper */}
            </div>
          </div>
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 24,
          backgroundImage: `url(${sceneFrontProps})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }} />
        </div>
        {isSceneZoomed && (
          <div className="absolute flex gap-1.5 rounded-2xl px-2 py-2 gm-float-card" style={{ left: 10, top: 8, zIndex: 42 }}>
            <button onClick={() => setShowQuestModal(true)}
              className="gm-button-chrome rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-all relative">
              퀘스트 관리
              {(activeQuests.length > 0 || Object.keys(pendingAssign).some(k => (pendingAssign[k] ?? []).some(Boolean))) && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs font-extrabold flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                  {activeQuests.length + Object.keys(pendingAssign).filter(k => (pendingAssign[k] ?? []).some(Boolean)).length}
                </span>
              )}
            </button>
            <button onClick={() => setShowMercModal(true)}
              className="gm-button-chrome rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-all">
              용병 목록
            </button>
            <button onClick={() => { setBattleResultPage(Math.max(0, battleResults.length - 1)); setShowLogModal(true) }}
              className="gm-button-muted rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
              style={{ color: 'rgba(230,205,160,0.95)' }}>
              결과{battleResults.length > 0 && <span className="ml-1 text-xs opacity-60">{battleResults.length}</span>}
            </button>
            <button onClick={refreshArrivals}
              className="gm-button-muted rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
              style={{
                color: state.gold >= ARRIVAL_REFRESH_COST ? 'rgba(255,210,80,0.9)' : 'rgba(100,75,25,0.4)',
              }}>
              갱신 ({ARRIVAL_REFRESH_COST}G)
            </button>
            <button onClick={premiumRefreshArrivals}
              className="gm-button-muted rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
              style={{
                color: (state.crystals ?? 0) >= PREMIUM_REFRESH_COST ? 'rgba(196,181,253,0.95)' : 'rgba(80,60,120,0.4)',
              }}>
              고급 ({PREMIUM_REFRESH_COST}◆)
            </button>
          </div>
        )}
        {selectedRoomOperation && isSceneZoomed && (
          <div className="absolute z-40 rounded-xl p-3 gm-panel-shell"
            style={{ right: 12, top: 56, width: 270, backdropFilter: 'blur(10px)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(220,170,90,0.7)' }}>Room Control</p>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  {ROOM_EFFECTS[selectedRoomOperation.room].icon} {selectedRoomOperation.room}
                  <span className="text-xs ml-1.5 text-slate-400">Lv{selectedRoomOperation.roomLv}</span>
                </h3>
              </div>
              <button onClick={() => setSelectedRoomId(null)} className="text-slate-500 hover:text-white text-lg leading-none px-1">×</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] text-slate-500">인원</p>
                <p className="text-sm font-bold text-white">{selectedRoomOperation.occupants.length}/{selectedRoomOperation.cap}</p>
              </div>
              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] text-slate-500">상태</p>
                <p className={selectedRoomOperation.occupants.length === 0 ? 'text-sm font-bold text-slate-400' : selectedRoomOperation.occupants.length >= selectedRoomOperation.cap ? 'text-sm font-bold text-amber-300' : 'text-sm font-bold text-emerald-300'}>{selectedRoomOperation.status}</p>
              </div>
              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] text-slate-500">효과</p>
                <p className="text-sm font-bold text-cyan-200">{ROOM_EFFECTS[selectedRoomOperation.room].desc[selectedRoomOperation.roomLv - 1]}</p>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: 'rgba(200,210,220,0.76)' }}>{selectedRoomOperation.action}</p>
            {selectedRoomOperation.subAction && (
              <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.72)' }}>{selectedRoomOperation.subAction}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {selectedRoomOperation.nextCost > 0 && (
                <button
                  disabled={!selectedRoomOperation.canUpgrade || state.gold < selectedRoomOperation.nextCost}
                  onClick={() => upgradeRoom(selectedRoomOperation.room)}
                  className="gm-button-primary rounded-lg px-3 py-1.5 text-xs font-extrabold text-white disabled:cursor-not-allowed">
                  업그레이드 {selectedRoomOperation.nextCost}G
                </button>
              )}
              <span className="text-xs" style={{ color: selectedRoomOperation.blocked ? 'rgba(251,191,36,0.82)' : 'rgba(148,163,184,0.72)' }}>
                {selectedRoomOperation.blocked ? '상위 조건 필요' : draggingMercId ? '방 위에 놓으면 배치' : '용병을 드래그해 배치'}
              </span>
            </div>
          </div>
        )}
        {isSceneZoomed && (
          <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'rgba(8,10,18,0.84)', border: '1px solid rgba(251,191,36,0.28)', boxShadow: '0 10px 30px rgba(0,0,0,0.34)', backdropFilter: 'blur(10px)' }}>
            <span className="text-xs font-bold" style={{ color: 'rgba(251,191,36,0.86)' }}>확대 보기</span>
            <span className="text-sm font-extrabold text-white">{sceneCamera.label}</span>
            <span className="text-xs font-bold" style={{ color: 'rgba(226,232,240,0.62)' }}>{Math.round(sceneCamera.scale * 100)}%</span>
            <button onClick={resetSceneCamera}
              className="rounded-lg px-2 py-1 text-xs font-bold text-white transition hover:brightness-125"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              전체 보기
            </button>
          </div>
        )}
      </div>

      {/* ── Arrival Preview Modal ─────────────── */}
      {previewArrival && (() => {
        const m = previewArrival
        const canHire = activeMercCount < maxHireCap(roomLevels['식당'] ?? 1) && state.gold >= m.cost
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
            onClick={() => setPreviewArrival(null)}>
            <div className="rounded-2xl p-5 w-80 flex flex-col gap-3"
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0d0b1a',
                border: `2px solid ${m.grade === 'S' ? 'rgba(217,70,239,0.6)' : m.grade === 'A' ? 'rgba(251,191,36,0.55)' : 'rgba(100,70,180,0.4)'}`,
                boxShadow: m.grade === 'S' ? '0 0 30px rgba(217,70,239,0.2)' : m.grade === 'A' ? '0 0 25px rgba(251,191,36,0.15)' : '0 8px 30px rgba(0,0,0,0.6)'
              }}>
              <div className="flex items-center gap-3">
                <MercAvatar m={m} size={72} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{m.name}</span>
                    <span className={`text-sm font-bold px-1.5 py-0.5 rounded text-white ${gradeBg(m.grade)}`}>{GRADE_STARS[m.grade] ?? m.grade}</span>
                    <span className={`text-base font-bold ${ELEMENT_COLOR[m.element]}`}>{ELEMENT_ICON[m.element]}</span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'rgba(160,120,60,0.85)' }}>{CLASS_ICONS[m.class]} {m.class} · {m.race} · {m.age}세</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(120,180,140,0.75)' }}>{RACE_BONUS_DESC[m.race]}</p>
                </div>
                <button onClick={() => setPreviewArrival(null)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-sm">
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-slate-500 mb-0.5">전투력</p>
                  <p className="text-cyan-300 font-bold text-sm">⚔ {m.power}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-slate-500 mb-0.5">함정해제</p>
                  <p className="text-purple-300 font-bold text-sm">🔧 {m.trap_disarm}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-slate-500 mb-0.5">협동심</p>
                  <p className="text-green-300 font-bold text-sm">🤝 {m.traits.cooperation}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-slate-500 mb-0.5">컨디션</p>
                  <p className={`font-bold text-sm ${m.condition >= 70 ? 'text-emerald-400' : m.condition >= 40 ? 'text-amber-400' : 'text-red-400'}`}>💪 {m.condition}%</p>
                </div>
              </div>
              <div className="flex justify-between items-center rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(180,140,20,0.08)', border: '1px solid rgba(180,140,20,0.2)' }}>
                <span className="text-amber-300 font-bold">고용비: {m.cost === 0 ? '무료' : `${m.cost}G`}</span>
                <span style={{ color: 'rgba(180,130,50,0.7)' }}>일급 {MISSION_PAY_PER_DAY[m.grade] ?? 15}G/일</span>
              </div>
              {!canHire && (
                <p className="text-sm text-center text-red-400">
                  {activeMercCount >= maxHireCap(roomLevels['식당'] ?? 1) ? '식당 용량 초과 — 식당을 업그레이드하세요' : `골드 부족 (보유 ${state.gold}G)`}
                </p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { dismissArrival(m.id); setPreviewArrival(null) }}
                  className="flex-1 rounded-xl py-2 text-sm font-bold transition hover:brightness-125"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.85)' }}>
                  ✕ 거절
                </button>
                <button
                  disabled={!canHire}
                  onClick={() => { hireMerc(m); setPreviewArrival(null) }}
                  className="flex-1 rounded-xl py-2 text-sm font-bold text-white transition active:scale-95"
                  style={{
                    background: canHire ? 'linear-gradient(135deg,#b45309,#f59e0b)' : 'rgba(100,80,30,0.3)',
                    border: canHire ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(100,80,30,0.2)',
                    opacity: canHire ? 1 : 0.5, cursor: canHire ? 'pointer' : 'not-allowed'
                  }}>
                  ⚔ 고용
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Room Merc Detail Modal ──────────────────────── */}
      {roomMercPreview && (() => {
        const m = roomMercPreview
        const passiveStats = getMercPassiveStats(m.passives ?? [])
        const slotLabel: Record<string, string> = { weapon: '무기', head: '머리', body: '몸통', accessory: '장신구' }
        const activeSynergies = PASSIVE_SYNERGIES.filter(s =>
          s.passiveIds.every(pid => (m.passives ?? []).includes(pid))
        )
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
            onClick={() => setRoomMercPreview(null)}>
            <div className="rounded-2xl p-5 flex flex-col gap-3 overflow-y-auto"
              style={{ width: 340, maxHeight: '85vh', background: '#0d0b1a',
                border: `2px solid ${m.grade === 'S' ? 'rgba(217,70,239,0.6)' : m.grade === 'A' ? 'rgba(251,191,36,0.55)' : m.grade === 'B' ? 'rgba(52,211,153,0.5)' : 'rgba(100,70,180,0.4)'}`,
                boxShadow: m.grade === 'S' ? '0 0 30px rgba(217,70,239,0.2)' : m.grade === 'A' ? '0 0 25px rgba(251,191,36,0.15)' : '0 8px 30px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center gap-3">
                <MercAvatar m={m} size={64} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-white">{m.name}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${gradeBg(m.grade)}`}>{GRADE_STARS[m.grade] ?? m.grade}</span>
                    <span className={`text-sm font-bold ${ELEMENT_COLOR[m.element]}`}>{ELEMENT_ICON[m.element]}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(160,120,60,0.85)' }}>Lv{m.level} · {CLASS_ICONS[m.class]} {m.class} · {m.race} · {m.age}세</p>
                  {m.leavingAt ? (
                    <p className="text-xs mt-0.5 font-bold text-red-400">📜 퇴단 예고 — {Math.max(0, Math.ceil((m.leavingAt - Date.now()) / 86400000))}일 후 떠남</p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(120,180,140,0.7)' }}>{RACE_BONUS_DESC[m.race]}</p>
                  )}
                </div>
                <button onClick={() => setRoomMercPreview(null)} className="text-slate-500 hover:text-white text-xl leading-none self-start">×</button>
              </div>
              {/* 상태바 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs mb-0.5">
                  <span style={{ color: 'rgba(130,130,150,0.7)' }}>컨디션</span>
                  <span className={m.condition >= 70 ? 'text-emerald-400' : m.condition >= 40 ? 'text-amber-400' : 'text-red-400'}>{m.condition}%</span>
                </div>
                {condBar(m.condition)}
                <div className="flex justify-between text-xs mb-0.5 mt-1.5">
                  <span style={{ color: 'rgba(130,130,150,0.7)' }}>사기</span>
                  <span className={(m.morale ?? 70) >= 70 ? 'text-indigo-400' : (m.morale ?? 70) >= 40 ? 'text-amber-400' : 'text-red-400'}>{m.morale ?? 70}%</span>
                </div>
                {moraleBar(m.morale ?? 70)}
                <div className="flex justify-between text-xs mt-1.5">
                  <span style={{ color: 'rgba(130,130,150,0.7)' }}>호감도</span>
                  <span className={m.favorability >= 61 ? 'text-rose-400' : m.favorability >= 41 ? 'text-slate-300' : 'text-slate-500'}>{favEmoji(m.favorability)} {m.favorability}</span>
                </div>
              </div>
              {/* 능력치 그리드 */}
              <div className="grid grid-cols-2 gap-1.5 text-sm">
                {[
                  { l: '실효 전력', v: effPower(m), c: 'text-cyan-300' },
                  { l: '공격력',   v: m.stats.공격력,    c: 'text-red-300' },
                  { l: '함정해제', v: m.trap_disarm,     c: 'text-purple-300' },
                  { l: '생존율',   v: m.stats.생존율,    c: 'text-emerald-300' },
                  { l: 'HP',       v: `${m.hp}/100`,     c: m.hp >= 70 ? 'text-emerald-400' : m.hp >= 40 ? 'text-amber-400' : 'text-red-400' },
                  { l: '협조성',   v: m.traits.cooperation, c: 'text-green-300' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="rounded-lg px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-slate-500 mb-0.5" style={{ fontSize: 11 }}>{l}</p>
                    <p className={`font-bold text-sm ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              {/* 장비 */}
              <div>
                <p className="text-xs font-bold mb-1.5" style={{ color: 'rgba(180,160,220,0.7)' }}>장비</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['weapon', 'head', 'body', 'accessory'] as const).map(slot => {
                    const item = m.equipment[slot] ? findEquip(m.equipment[slot]!) : null
                    return (
                      <div key={slot} className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${item ? 'rgba(180,140,60,0.35)' : 'rgba(255,255,255,0.06)'}` }}>
                        <p className="text-slate-600 mb-0.5" style={{ fontSize: 10 }}>{slotLabel[slot]}</p>
                        {item ? (
                          <p className="text-xs font-bold" style={{ color: item.grade === 'S' ? '#e879f9' : item.grade === 'A' ? '#fbbf24' : item.grade === 'B' ? '#34d399' : item.grade === 'C' ? '#38bdf8' : '#94a3b8' }}>{item.name}</p>
                        ) : (
                          <p className="text-xs text-slate-600">없음</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* 패시브 */}
              {(m.passives ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-1.5" style={{ color: 'rgba(180,160,220,0.7)' }}>패시브</p>
                  <div className="space-y-1">
                    {(m.passives ?? []).map(pid => {
                      const p = findPassive(pid)
                      if (!p) return null
                      return (
                        <div key={pid} className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <p className="text-xs font-bold text-purple-300">{p.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(160,140,200,0.6)' }}>{p.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                  {activeSynergies.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs font-bold" style={{ color: 'rgba(250,200,80,0.7)' }}>✦ 시너지</p>
                      {activeSynergies.map((s, i) => (
                        <div key={i} className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                          <p className="text-xs text-amber-300">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* XP */}
              <div className="rounded-lg px-3 py-2 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-slate-500">경험치</span>
                <span className="text-xs text-amber-300 font-bold">{m.experience} / {m.expToNext}</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Quest Modal (left-side panel) ─────────────── */}
      {showQuestModal && (
        <div className="gm-panel-shell fixed left-2 bottom-2 z-30 flex flex-col overflow-hidden rounded-2xl"
          style={{ top: 56, width: '40%', maxWidth: 620 }}>
          {/* ── 패널 헤더 ── */}
          <div className="gm-panel-titlebar flex-shrink-0">
            {/* 타이틀 행 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <span className="text-lg leading-none flex-shrink-0">📜</span>
                <span className="text-sm font-extrabold text-white tracking-wide flex-shrink-0">계약 관리</span>
                {activeQuests.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                    style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)' }}>
                    ⚔{activeQuests.length}건
                  </span>
                )}
              </div>
              <button onClick={() => setShowQuestModal(false)}
                className="gm-button-muted flex-shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-all"
                style={{ color: '#fca5a5' }}>
                ✕ 닫기
              </button>
            </div>
            {/* 탭 행 */}
            <div className="flex px-4 gap-1">
              {(['quests', 'buildings'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-1.5 text-sm font-bold transition-all rounded-t-lg"
                  style={activeTab === tab ? {
                    background: tab === 'quests' ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.18)',
                    color: tab === 'quests' ? '#93c5fd' : '#6ee7b7',
                    borderTop: `1px solid ${tab === 'quests' ? 'rgba(59,130,246,0.4)' : 'rgba(16,185,129,0.4)'}`,
                    borderLeft: `1px solid ${tab === 'quests' ? 'rgba(59,130,246,0.4)' : 'rgba(16,185,129,0.4)'}`,
                    borderRight: `1px solid ${tab === 'quests' ? 'rgba(59,130,246,0.4)' : 'rgba(16,185,129,0.4)'}`,
                    borderBottom: '2px solid rgba(4,4,12,0.98)',
                    marginBottom: '-1px',
                  } : {
                    background: 'transparent',
                    color: 'rgba(130,130,130,0.5)',
                    border: '1px solid transparent',
                    marginBottom: '-1px',
                  }}>
                  {tab === 'quests' ? '📜 계약' : '🏗 건물'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col overflow-hidden flex-1 min-h-0">

            {activeTab === 'quests' && (<>
                {/* ── 진행 중 섹션 (고정) ── */}
                <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: activeQuests.length > 0 ? '38%' : 0, borderBottom: activeQuests.length > 0 ? '2px solid rgba(14,165,233,0.2)' : 'none', background: 'rgba(4,10,22,0.95)' }}>
                  {activeQuests.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-bold mb-2 px-2 py-1 rounded inline-flex items-center gap-1.5"
                      style={{ color: '#38bdf8', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}>
                      ⚔ 파견 중 {activeQuests.length}건
                    </p>
                    <div className="space-y-2">
                      {activeQuests.map(aq => {
                        const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
                        const elapsed = Math.max(0, aq.durationMs - Math.max(0, aq.completesAt - tickTime))
                        const pct = Math.min(100, (elapsed / aq.durationMs) * 100)
                        return (
                          <div key={aq.questId} className="gm-card-chrome rounded-xl overflow-hidden"
                            style={{ background: 'rgba(8,20,35,0.9)', border: '1px solid rgba(14,165,233,0.4)' }}>
                            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, rgba(14,165,233,0.9) ${pct}%, rgba(14,165,233,0.15) ${pct}%)` }} />
                            <div className="px-3 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm ${ELEMENT_COLOR[quest.element]}`}>{ELEMENT_ICON[quest.element]}</span>
                                  <p className="text-sm font-bold text-white">{quest.name}</p>
                                  {quest.trapFocus && <span className="text-xs text-purple-300 font-bold">🔧함정</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < Math.ceil(pct / 20) ? '#0ea5e9' : 'rgba(255,255,255,0.08)' }} />
                                    ))}
                                  </div>
                                  <span className="text-xs font-bold text-sky-300 tabular-nums">⏱ {formatTimeLeft(aq.completesAt)}</span>
                                  <button onClick={() => instantCompleteQuest(aq.questId)}
                                    className="text-xs rounded px-1.5 py-0.5 font-bold transition hover:brightness-125"
                                    style={{
                                      background: state.crystals >= 1 ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${state.crystals >= 1 ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                      color: state.crystals >= 1 ? '#c4b5fd' : 'rgba(100,100,100,0.5)',
                                      cursor: state.crystals >= 1 ? 'pointer' : 'not-allowed',
                                    }}>
                                    💎×1
                                  </button>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0284c7,#38bdf8)' }} />
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {aq.assignedMercIds.map(mid => {
                                  const m = mercs.find(x => x.id === mid)
                                  if (!m) return null
                                  return (
                                    <span key={mid} className="text-xs rounded-full px-2 py-0.5 text-white flex items-center gap-1"
                                      style={{ background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.35)' }}>
                                      {RACE_ICONS[m.race]}{m.name}
                                      <span className={ELEMENT_COLOR[m.element]}>{ELEMENT_ICON[m.element]}</span>
                                      <span style={{ color: 'rgba(150,220,255,0.65)' }}>{m.condition}%</span>
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                </div>

                {/* ── 수주 가능 섹션 (스크롤) ── */}
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="text-sm font-bold mb-2 px-1 py-0.5 rounded"
                    style={{ color: 'rgba(200,160,60,0.9)', background: 'rgba(180,100,20,0.15)', display: 'inline-block' }}>
                    📋 수주 가능 {questPool.filter(id => !activeQuests.some(aq => aq.questId === id)).length}건
                  </p>
                  <div className="space-y-2">
                    {questPool
                      .map(id => ALL_QUESTS.find(q => q.id === id))
                      .filter((q): q is typeof ALL_QUESTS[0] => !!q && !activeQuests.some(aq => aq.questId === q.id))
                      .map(quest => {
                        const assigned = pendingAssign[quest.id] ?? []
                        const filledSlots = assigned.filter(Boolean)
                        const canLaunch = filledSlots.length >= 1
                        const totalAssignedEff = filledSlots.map(id => mercs.find(m => m.id === id)).filter(Boolean).reduce((s, m) => s + effPowerVs(m!, quest.element), 0)
                        const powerRatio = Math.min(1, totalAssignedEff / quest.difficulty)
                        const successRate = filledSlots.length > 0 ? calcSuccessRate(quest, filledSlots, mercs) : 0
                        const hasPending = filledSlots.length > 0
                        return (
                          <div key={quest.id} className="gm-card-chrome rounded-xl overflow-hidden"
                            style={{
                              background: hasPending ? 'rgba(251,191,36,0.06)' : 'rgba(8,7,18,0.8)',
                              border: `1px solid ${hasPending ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`,
                              boxShadow: hasPending ? '0 0 16px rgba(251,191,36,0.1)' : 'none',
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault()
                              const mid = e.dataTransfer.getData('mercId')
                              if (!mid) return
                              setPendingAssign(prev => {
                                const cleaned: Record<string, string[]> = Object.fromEntries(
                                  Object.entries(prev).map(([qid, slots]) => [qid, slots.map(s => s === mid ? null : s) as string[]])
                                )
                                const current = cleaned[quest.id] ?? Array(quest.slots).fill(null)
                                const next = [...current] as (string|null)[]
                                const emptyIdx = next.findIndex(v => !v)
                                if (emptyIdx >= 0) next[emptyIdx] = mid
                                return { ...cleaned, [quest.id]: next as string[] }
                              })
                              setDraggingMercId(null); setSelectedMercId(null)
                            }}>
                            {/* 속성 색상 상단 스트립 */}
                            <div className="h-0.5 w-full" style={{ background: ELEMENT_BG[quest.element].replace('0.2', '0.8').replace('0.25', '0.8') }} />
                            {/* Quest 헤더 */}
                            <div className="px-2 pt-2 pb-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                  <span className={`text-sm leading-none ${ELEMENT_COLOR[quest.element]}`}>{ELEMENT_ICON[quest.element]}</span>
                                  <p className="text-xs font-bold text-white">{quest.name}</p>
                                  {quest.trapFocus && (
                                    <span className="text-xs font-bold px-1 py-0.5 rounded-full" style={{ background: 'rgba(147,51,234,0.2)', color: '#c4b5fd', border: '1px solid rgba(147,51,234,0.3)' }}>🔧</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-xs rounded px-1 py-0.5 font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(160,160,160,0.75)' }}>
                                    💪{quest.difficulty}
                                  </span>
                                  <span className="text-xs rounded px-1 py-0.5 font-semibold" style={{ background: 'rgba(14,165,233,0.12)', color: 'rgba(125,211,252,0.85)' }}>
                                    ⏱{quest.duration}일
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* Reward row */}
                            <div className="flex gap-1 text-xs px-2 py-1.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="rounded px-1 py-0.5 font-semibold" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>+{quest.reward.gold}G</span>
                              <span className="rounded px-1 py-0.5 font-semibold" style={{ background: 'rgba(217,70,239,0.1)', color: '#e879f9' }}>+{quest.reward.fame}⭐</span>
                              <span className="rounded px-1 py-0.5 font-semibold" style={{ background: 'rgba(14,165,233,0.1)', color: '#7dd3fc' }}>+{quest.reward.exp}XP</span>
                              <span className="rounded px-1 py-0.5 ml-auto font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>☠{Math.round(quest.deathRisk * 100)}%</span>
                            </div>
                            <div className="px-2 pt-1.5">
                            {/* Wage preview */}
                            {filledSlots.length > 0 && (() => {
                              const wageCost = filledSlots.reduce((s, id) => {
                                const m = mercs.find(x => x.id === id)
                                return s + (m ? (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration : 0)
                              }, 0)
                              const net = quest.reward.gold - wageCost
                              return (
                                <div className="flex gap-2 text-xs mb-1.5">
                                  <span className="text-orange-400">급여 -{wageCost}G</span>
                                  <span className={net >= 0 ? 'text-emerald-400' : 'text-red-400'}>순이익 {net >= 0 ? '+' : ''}{net}G</span>
                                </div>
                              )
                            })()}
                            {/* Power bar */}
                            <div className="mb-1.5">
                              <div className="flex justify-between text-xs mb-0.5" style={{ color: 'rgba(120,120,120,0.6)' }}>
                                <span>전력 {totalAssignedEff}/{quest.difficulty}</span>
                                <span>{Math.round(powerRatio * 100)}%</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${Math.min(100, powerRatio * 100)}%`,
                                  background: powerRatio >= 1.0 ? '#22c55e' : powerRatio >= 0.6 ? '#f59e0b' : '#ef4444'
                                }} />
                              </div>
                            </div>
                            {/* Estimated clear time */}
                            {filledSlots.length > 0 && (() => {
                              const assignedMs = filledSlots.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
                              const estMs = calcQuestDurationMs(quest, assignedMs)
                              const baseMins = QUEST_BASE_TIMES_MIN[Math.min(quest.duration - 1, 7)]
                              const estMins = Math.round(estMs / 60000)
                              const speedUp = baseMins - estMins
                              const estLabel = estMins >= 60 ? `${Math.floor(estMins/60)}시간 ${estMins%60 > 0 ? `${estMins%60}분` : ''}` : `${estMins}분`
                              return (
                                <div className="flex items-center gap-1.5 mb-1.5 text-xs">
                                  <span style={{ color: 'rgba(120,120,120,0.6)' }}>예상 시간</span>
                                  <span className="font-bold" style={{ color: speedUp > 0 ? '#67e8f9' : 'rgba(160,160,160,0.7)' }}>⏱ {estLabel}</span>
                                  {speedUp > 0 && <span className="font-bold" style={{ color: '#4ade80' }}>⚡ -{speedUp}분</span>}
                                </div>
                              )
                            })()}
                            {/* Success rate */}
                            {filledSlots.length > 0 && (
                              <div className="mb-1.5">
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span style={{ color: 'rgba(120,120,120,0.6)' }}>성공률</span>
                                  <span className="font-bold" style={{ color: successRate >= 70 ? '#86efac' : successRate >= 45 ? '#fcd34d' : '#fca5a5' }}>{successRate}%</span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                  <div className="h-full rounded-full transition-all" style={{
                                    width: `${successRate}%`,
                                    background: successRate >= 70 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : successRate >= 45 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)'
                                  }} />
                                </div>
                              </div>
                            )}
                            {/* Chemistry score */}
                            {filledSlots.length >= 2 && (() => {
                              const partyM = filledSlots.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
                              const chem = calcChemistryScore(partyM)
                              const chemCol = chem >= 80 ? '#86efac' : chem >= 60 ? '#fcd34d' : chem >= 40 ? '#fb923c' : '#fca5a5'
                              const chemLabel = chem >= 80 ? '최고' : chem >= 60 ? '양호' : chem >= 40 ? '불안' : '최악'
                              return (
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-xs" style={{ color: 'rgba(120,120,120,0.6)' }}>케미</span>
                                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${chem}%`, background: chemCol }} />
                                  </div>
                                  <span className="text-xs font-bold" style={{ color: chemCol }}>{chem} {chemLabel}</span>
                                </div>
                              )
                            })()}
                            {/* Small party warning */}
                            {filledSlots.length > 0 && filledSlots.length < 3 && (
                              <div className="flex items-center gap-1 rounded px-2 py-0.5 mb-1.5 text-xs"
                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.9)' }}>
                                ⚠ 소규모 파티 — 사망 위험↑
                              </div>
                            )}
                            {/* Slots */}
                            <div className="flex gap-1 mb-1.5 flex-wrap">
                              {Array.from({ length: quest.slots }).map((_, si) => {
                                const assignedId = assigned[si] ?? null
                                const assignedMerc = assignedId ? mercs.find(m => m.id === assignedId) : null
                                const isRequired = false
                                const partyForRisk = filledSlots.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
                                const mercDeathRisk = assignedMerc && partyForRisk.length > 0
                                  ? calcMercDeathRisk(quest, assignedMerc, partyForRisk) : null
                                const elemMatch = assignedMerc && assignedMerc.element === quest.element
                                return (
                                  <div key={si}
                                    onClick={() => { if (assignedMerc) unassignMerc(quest.id, si); else if (selectedMercId) assignMerc(quest.id, si) }}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => {
                                      e.preventDefault(); e.stopPropagation()
                                      const mid = e.dataTransfer.getData('mercId')
                                      if (!mid) return
                                      setPendingAssign(prev => {
                                        const cleaned: Record<string, string[]> = Object.fromEntries(
                                          Object.entries(prev).map(([qid, slots]) => [qid, slots.map(s => s === mid ? null : s) as string[]])
                                        )
                                        const current = cleaned[quest.id] ?? Array(quest.slots).fill(null)
                                        const next = [...current] as (string|null)[]
                                        next[si] = mid
                                        return { ...cleaned, [quest.id]: next as string[] }
                                      })
                                      setDraggingMercId(null); setSelectedMercId(null)
                                    }}
                                    className="gm-slot-frame rounded cursor-pointer transition-all flex flex-col gap-0.5 flex-shrink-0"
                                    style={{
                                      padding: '3px 5px', minWidth: 70, maxWidth: 100,
                                      background: assignedMerc ? (elemMatch ? ELEMENT_BG[quest.element] : 'rgba(99,102,241,0.2)') :
                                        (selectedMercId || draggingMercId) ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${assignedMerc ? (elemMatch ? 'rgba(250,204,21,0.6)' : 'rgba(99,102,241,0.5)') :
                                        (selectedMercId || draggingMercId) ? 'rgba(251,191,36,0.4)' :
                                        isRequired ? 'rgba(255,100,100,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    }}>
                                    {assignedMerc ? (
                                      <>
                                        <div className="flex items-center gap-0.5 min-w-0">
                                          <span className="flex-shrink-0 text-sm">{RACE_ICONS[assignedMerc.race]}</span>
                                          <span className="text-xs text-white truncate flex-1 min-w-0">{assignedMerc.name}</span>
                                          <span className={`flex-shrink-0 text-xs ${ELEMENT_COLOR[assignedMerc.element]}`}>{ELEMENT_ICON[assignedMerc.element]}</span>
                                        </div>
                                        {mercDeathRisk !== null && (
                                          <span className="text-xs" style={{
                                            color: mercDeathRisk >= 0.3 ? 'rgba(252,165,165,0.9)' : mercDeathRisk >= 0.15 ? 'rgba(253,224,71,0.8)' : 'rgba(134,239,172,0.8)'
                                          }}>☠{Math.round(mercDeathRisk * 100)}%</span>
                                        )}
                                        {elemMatch && <span className="text-xs text-yellow-300">✦일치</span>}
                                      </>
                                    ) : (
                                      <span className="text-xs" style={{ color: isRequired ? 'rgba(255,130,130,0.6)' : 'rgba(120,120,120,0.5)' }}>
                                        {(selectedMercId || draggingMercId) ? '▶' : isRequired ? '필수' : '선택'}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex gap-1.5 mt-1.5">
                              <button onClick={() => launchQuest(quest.id)} disabled={!canLaunch}
                                className="gm-button-primary flex-1 rounded-lg py-1.5 text-xs font-extrabold transition-all"
                                style={{
                                  background: canLaunch ? 'linear-gradient(135deg,#92400e,#d97706)' : 'rgba(255,255,255,0.04)',
                                  color: canLaunch ? 'white' : 'rgba(100,100,100,0.4)',
                                  border: `1px solid ${canLaunch ? 'rgba(251,146,60,0.5)' : 'rgba(255,255,255,0.04)'}`,
                                  boxShadow: canLaunch ? '0 0 8px rgba(251,146,60,0.2)' : 'none',
                                  cursor: canLaunch ? 'pointer' : 'not-allowed',
                                }}>
                                {filledSlots.length === 0 ? '⚔ 용병 배치 후 파견' : '⚔ 파견하기'}
                              </button>
                              {assigned.some(Boolean) && (
                                <button onClick={() => cancelPending(quest.id)}
                                  className="gm-button-muted rounded-lg px-2 py-1.5 text-xs transition hover:text-white"
                                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(130,130,130,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  초기화
                                </button>
                              )}
                            </div>
                            </div>{/* end px-2 pt-1.5 */}
                          </div>
                        )
                      })}
                  </div>
                </div>
            </>)}

            {activeTab === 'buildings' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <p className="text-sm text-slate-500">건물을 건설·업그레이드하여 길드를 강화하세요.</p>
                {(() => {
                  const range = recruitLevelRange(buildings)
                  return (
                    <div className="gm-card-chrome rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold tracking-widest" style={{ color: 'rgba(125,211,252,0.68)' }}>RECRUIT PROFILE</p>
                          <p className="text-sm font-bold text-white mt-0.5">도착 용병 Lv{range.min}{range.max > range.min ? `~${range.max}` : ''}</p>
                        </div>
                        <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.24)' }}>
                          병영 기준
                        </span>
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'rgba(148,163,184,0.72)' }}>
                        병영은 기준 레벨, 훈련소 Lv3+는 신병 훈련 보너스, 선술집 Lv3+는 상한 변동을 제공합니다.
                      </p>
                    </div>
                  )
                })()}
                {/* Merchant / Dungeon badges */}
                {merchantState?.active && (
                  <button
                    onClick={() => setShowMerchant(true)}
                    className="gm-button-chrome w-full text-sm px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}
                  >
                    행상인 방문 중 — 클릭하여 구매
                  </button>
                )}
                {activeDungeon && activeDungeon.status === 'active' && (
                  <button
                    onClick={() => setShowDungeon(true)}
                    className="gm-button-chrome w-full text-sm px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }}
                  >
                    던전 진행 중: {activeDungeon.name} ({activeDungeon.currentFloor}/{activeDungeon.maxFloor}층)
                  </button>
                )}
                {/* 정기 원정 버튼 */}
                {(() => {
                  const now = Date.now()
                  const onExpedition = activeExpedition && !activeExpedition.result
                  const hasResult = activeExpedition?.result
                  const onCooldown = !activeExpedition && expeditionNextAt > now
                  const cooldownMin = onCooldown ? Math.ceil((expeditionNextAt - now) / 60000) : 0
                  return (
                    <button
                      onClick={() => setShowExpedition(true)}
                      className="gm-button-chrome w-full text-sm px-3 py-1.5 rounded-lg font-bold"
                      style={{
                        background: hasResult ? 'rgba(34,197,94,0.2)' : onExpedition ? 'rgba(139,92,246,0.15)' : onCooldown ? 'rgba(60,60,70,0.4)' : 'rgba(88,28,135,0.2)',
                        color: hasResult ? '#4ade80' : onExpedition ? '#c4b5fd' : onCooldown ? 'rgba(130,130,150,0.6)' : '#a78bfa',
                        border: `1px solid ${hasResult ? 'rgba(34,197,94,0.35)' : onExpedition ? 'rgba(139,92,246,0.3)' : onCooldown ? 'rgba(80,80,90,0.3)' : 'rgba(139,92,246,0.25)'}`,
                        cursor: onCooldown ? 'default' : 'pointer',
                      }}
                      disabled={onCooldown}
                    >
                      {hasResult ? '⚔ 원정 완료 — 보상 수령' : onExpedition ? `⚔ 원정 중 (${activeExpedition.assignedMercIds.length}명 파견)` : onCooldown ? `⚔ 원정 쿨다운 (${cooldownMin}분)` : '⚔ 정기 원정 출발'}
                    </button>
                  )
                })()}
                {(Object.keys(BUILDING_INFO) as Array<keyof typeof BUILDING_INFO>).map(id => {
                  const info = BUILDING_INFO[id]
                  const currentLv = buildings[id]
                  const isBuilt = currentLv > 0
                  const atMax = currentLv >= info.maxLevel
                  const cost = isBuilt ? upgradeCost(id, currentLv) : info.buildCost
                  const canAfford = state.gold >= cost
                  return (
                    <div key={id} className="gm-card-chrome rounded-xl overflow-hidden" style={{
                      background: isBuilt ? 'rgba(15,20,30,0.8)' : 'rgba(10,10,15,0.5)',
                      border: `1px solid ${isBuilt ? (atMax ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.05)'}`
                    }}>
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: isBuilt ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span className="text-base leading-none">{info.icon}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white">{info.name}</p>
                              {isBuilt && (
                                <span className="text-sm font-bold px-1 rounded" style={{
                                  background: atMax ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
                                  color: atMax ? '#fbbf24' : 'rgba(160,160,160,0.7)'
                                }}>Lv{currentLv}</span>
                              )}
                            </div>
                            <p className="text-sm mt-0.5" style={{ color: isBuilt ? 'rgba(140,200,140,0.75)' : 'rgba(120,120,120,0.5)' }}>
                              {isBuilt ? info.desc(currentLv) : '미건설'}
                            </p>
                          </div>
                        </div>
                        {!atMax && (
                          <button onClick={() => upgradeBuilding(id)} disabled={!canAfford}
                            className="gm-button-primary rounded-lg px-3 py-1.5 text-sm font-bold transition flex-shrink-0"
                            style={{
                              background: canAfford ? 'linear-gradient(135deg,#064e3b,#059669)' : 'rgba(255,255,255,0.04)',
                              color: canAfford ? '#6ee7b7' : 'rgba(100,100,100,0.4)',
                              border: `1px solid ${canAfford ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.04)'}`,
                              boxShadow: canAfford ? '0 0 8px rgba(16,185,129,0.15)' : 'none',
                              cursor: canAfford ? 'pointer' : 'not-allowed'
                            }}>
                            {isBuilt ? `↑ ${cost}G` : `건설 ${cost}G`}
                          </button>
                        )}
                        {atMax && <span className="text-sm font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>MAX</span>}
                      </div>
                      {isBuilt && (
                        <div className="flex gap-0.5 px-3 pb-2">
                          {Array.from({ length: info.maxLevel }).map((_, i) => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                              style={{ background: i < currentLv ? (atMax ? '#f59e0b' : '#10b981') : 'rgba(255,255,255,0.06)' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Merc Modal ─────────────────────────────────── */}
      {showMercModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-12 overflow-y-auto"
          onClick={() => setShowMercModal(false)}>
          <div className="gm-modal-frame w-full max-w-3xl rounded-2xl flex flex-col gap-3 p-4"
            onClick={e => e.stopPropagation()}>
            <div className="gm-panel-titlebar -mx-4 -mt-4 mb-1 flex items-center justify-between px-4 py-3">
              <h2 className="text-base font-bold text-white">👥 길드 용병 목록 <span className="text-sm text-slate-400 font-normal">({mercs.length}명)</span></h2>
              <button onClick={() => setShowMercModal(false)} className="text-slate-400 hover:text-white text-lg leading-none px-2">×</button>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* 용병 목록 */}
              <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 600 }}>
                {mercs.length === 0 && <p className="text-sm text-slate-600 text-center py-8">용병이 없습니다</p>}
                {mercs.map(m => {
                  const canDrag = m.status === '대기중' && !deployedMercIds.has(m.id)
                  return (
                    <MercCard key={m.id} merc={m}
                      onClick={() => setSelectedMercDetail(selectedMercDetail?.id === m.id ? null : m)}
                      selected={selectedMercId === m.id}
                      inParty={pendingMercIds.has(m.id)}
                      showDetail
                      isDraggable={canDrag}
                      isDragging={draggingMercId === m.id}
                      onDragStart={e => { e.dataTransfer.setData('mercId', m.id); e.dataTransfer.setData('roomMercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                      onDragEnd={() => { setDraggingMercId(null); setDropTargetRoom(null) }}
                      onEquipClick={() => setShowEquipModal(m.id)}
                    />
                  )
                })}
              </div>
              {/* 용병 상세 */}
              <div>
                {selectedMercDetail ? (
                  <div className="gm-card-chrome rounded-xl overflow-hidden sticky top-0" style={{ background: 'rgba(10,8,18,0.95)' }}>
                    {/* Header */}
                    <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="flex-shrink-0">
                          <MercAvatar m={selectedMercDetail} size={48} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white">{selectedMercDetail.name}</p>
                            <span className={`text-sm font-bold px-1.5 py-0.5 rounded text-white ${gradeBg(selectedMercDetail.grade)}`}>{GRADE_STARS[selectedMercDetail.grade] ?? selectedMercDetail.grade}</span>
                            <span className={`text-sm font-bold ${ELEMENT_COLOR[selectedMercDetail.element]}`}>{ELEMENT_ICON[selectedMercDetail.element]}</span>
                          </div>
                          <p className="text-sm mt-0.5" style={{ color: 'rgba(140,120,90,0.85)' }}>Lv{selectedMercDetail.level} · {selectedMercDetail.race} · {CLASS_ICONS[selectedMercDetail.class]} {selectedMercDetail.class}</p>
                          <div className="flex gap-2 mt-1 text-sm">
                            <span className={selectedMercDetail.status === '파견중' ? 'text-sky-300' : selectedMercDetail.status === '부상' ? 'text-red-400' : 'text-emerald-400'}>
                              {selectedMercDetail.status === '파견중' ? '⚔ 파견중' : selectedMercDetail.status === '부상' ? '🤕 부상' : '✓ 대기중'}
                            </span>
                            <span className={selectedMercDetail.favorability >= 61 ? 'text-rose-400' : selectedMercDetail.favorability >= 41 ? 'text-slate-300' : 'text-slate-500'}>
                              {favEmoji(selectedMercDetail.favorability)} {selectedMercDetail.favorability}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Condition bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm" style={{ color: 'rgba(120,120,120,0.6)' }}>
                          <span>컨디션</span>
                          <span className={selectedMercDetail.condition >= 70 ? 'text-emerald-400' : selectedMercDetail.condition >= 40 ? 'text-amber-400' : 'text-red-400'}>{selectedMercDetail.condition}%</span>
                        </div>
                        {condBar(selectedMercDetail.condition)}
                        <div className="flex justify-between text-sm mt-1" style={{ color: 'rgba(120,120,120,0.6)' }}>
                          <span>사기</span>
                          <span className={(selectedMercDetail.morale ?? 70) >= 70 ? 'text-indigo-400' : (selectedMercDetail.morale ?? 70) >= 40 ? 'text-amber-400' : 'text-red-400'}>{selectedMercDetail.morale ?? 70}%</span>
                        </div>
                        {moraleBar(selectedMercDetail.morale ?? 70)}
                        <div className="flex justify-between text-sm mt-1" style={{ color: 'rgba(120,120,120,0.6)' }}>
                          <span>HP</span>
                          <span className={selectedMercDetail.hp >= 70 ? 'text-emerald-400' : selectedMercDetail.hp >= 40 ? 'text-amber-400' : 'text-red-400'}>{selectedMercDetail.hp}/100</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${selectedMercDetail.hp}%`, background: selectedMercDetail.hp >= 70 ? '#22c55e' : selectedMercDetail.hp >= 40 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-0 text-sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {[
                        { l: '실효 전력', v: effPower(selectedMercDetail), c: 'text-cyan-300', bold: true },
                        { l: '공격력', v: Math.round(selectedMercDetail.stats.공격력 * (0.4 + 0.6 * selectedMercDetail.condition / 100)), c: 'text-red-300', bold: false },
                        { l: '함정해제', v: selectedMercDetail.trap_disarm, c: selectedMercDetail.trap_disarm >= 30 ? 'text-purple-300' : 'text-slate-400', bold: false },
                        { l: '생존율', v: Math.round(selectedMercDetail.stats.생존율 * (0.4 + 0.6 * selectedMercDetail.condition / 100)), c: 'text-emerald-300', bold: false },
                        { l: '경험치', v: `${selectedMercDetail.experience}/${selectedMercDetail.expToNext}`, c: 'text-amber-300', bold: false },
                        { l: '미션 급여', v: `${MISSION_PAY_PER_DAY[selectedMercDetail.grade] ?? 4}G/일`, c: 'text-amber-300', bold: false },
                        { l: '사망 보상금', v: `${selectedMercDetail.deathCost}G`, c: 'text-red-400', bold: false },
                        { l: '나이', v: `${selectedMercDetail.age}세`, c: 'text-slate-300', bold: false },
                      ].map(({ l, v, c, bold }, idx, arr) => (
                        <div key={l} className="flex justify-between items-center px-3 py-1.5"
                          style={{
                            borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            borderRight: idx % 2 === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                          }}>
                          <span style={{ color: 'rgba(130,130,150,0.7)' }}>{l}</span>
                          <span className={`${c} ${bold ? 'font-bold' : 'font-semibold'}`}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                    {/* 장비 섹션 */}
                    <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400 text-xs">장착 장비</span>
                        <button
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
                          onClick={() => setShowEquipModal(selectedMercDetail.id)}
                        >
                          관리
                        </button>
                      </div>
                      {(['weapon', 'head', 'body', 'accessory'] as const).map(slot => {
                        const itemId = selectedMercDetail.equipment[slot]
                        const item = itemId ? findEquip(itemId) : null
                        const slotLabel = { weapon: '무기', head: '머리', body: '몸통', accessory: '장신구' }[slot]
                        const gradeColor: Record<string, string> = { S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8' }
                        return (
                          <div key={slot} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-8">{slotLabel}</span>
                            {item
                              ? <span className="text-slate-300">{item.icon} {item.name} <span style={{ color: gradeColor[item.grade] }}>{item.grade}</span></span>
                              : <span className="text-slate-600">(없음)</span>
                            }
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-3">
                      <StatRadar mercenary={selectedMercDetail} />
                    </div>
                    {/* 패시브 섹션 */}
                    {(selectedMercDetail.passives ?? []).length > 0 && (() => {
                      const passiveStats = getMercPassiveStats(selectedMercDetail.passives ?? [])
                      const idSet = new Set(selectedMercDetail.passives ?? [])
                      const activeSynergies = PASSIVE_SYNERGIES.filter(s => idSet.has(s.passiveIds[0]) && idSet.has(s.passiveIds[1]))
                      return (
                        <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs font-bold" style={{ color: 'rgba(200,160,255,0.8)' }}>✦ 패시브</span>
                            <span className="text-xs" style={{ color: 'rgba(130,130,150,0.6)' }}>{selectedMercDetail.passives.length}/{GRADE_PASSIVE_SLOTS[selectedMercDetail.grade] ?? 1}</span>
                          </div>
                          <div className="space-y-1">
                            {(selectedMercDetail.passives ?? []).map(pid => {
                              const p = findPassive(pid)
                              if (!p) return null
                              return (
                                <div key={pid} className="flex justify-between items-center px-2 py-1 rounded text-xs"
                                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                  <span style={{ color: '#c4b5fd' }}>{p.name}</span>
                                  <span style={{ color: 'rgba(160,160,180,0.7)' }}>{p.desc}</span>
                                </div>
                              )
                            })}
                            {activeSynergies.map(syn => (
                              <div key={syn.passiveIds.join('+')} className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <span style={{ color: '#fbbf24' }}>⚡ 시너지</span>
                                <span style={{ color: 'rgba(200,170,100,0.8)' }}>{syn.desc}</span>
                              </div>
                            ))}
                          </div>
                          {passiveStats.xpMod > 0 && (
                            <p className="text-xs mt-1" style={{ color: 'rgba(180,160,120,0.6)' }}>경험치 획득 +{Math.round(passiveStats.xpMod * 100)}%</p>
                          )}
                        </div>
                      )
                    })()}
                    {/* 나이 동결 버튼 */}
                    {selectedMercDetail.status !== '영혼' && (() => {
                      const frozen = selectedMercDetail.ageLockedUntil && selectedMercDetail.ageLockedUntil > Date.now()
                      const remainMs = frozen ? selectedMercDetail.ageLockedUntil! - Date.now() : 0
                      const remainDays = Math.ceil(remainMs / (24 * 60 * 60 * 1000))
                      return (
                        <button
                          onClick={() => !frozen && freezeMercAge(selectedMercDetail.id)}
                          className="mt-3 w-full rounded-lg py-1.5 text-sm font-bold transition"
                          style={{
                            background: frozen ? 'rgba(14,165,233,0.12)' : 'rgba(99,102,241,0.15)',
                            color: frozen ? 'rgba(125,211,252,0.85)' : 'rgba(199,210,254,0.85)',
                            border: `1px solid ${frozen ? 'rgba(14,165,233,0.3)' : 'rgba(99,102,241,0.3)'}`,
                            cursor: frozen ? 'default' : 'pointer'
                          }}>
                          {frozen ? `🧊 나이 동결 중 (${remainDays}일 남음)` : `🧊 나이 동결 (-3💎) — 현재 ${selectedMercDetail.age}세`}
                        </button>
                      )
                    })()}
                    {selectedMercDetail.status !== '파견중' && (
                      <button
                        onClick={() => dismissMerc(selectedMercDetail)}
                        className="mt-3 w-full rounded-lg py-1.5 text-sm font-bold transition"
                        style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(252,165,165,0.85)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        해고
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', minHeight: 200 }}>
                    <p className="text-sm text-slate-600">용병을 클릭하면 상세 정보가 표시됩니다</p>
                  </div>
                )}
                {/* 현황 요약 */}
                <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {[
                      { l: '총 용병', v: `${mercs.length}명`, c: 'text-white' },
                      { l: '파견 중', v: `${mercs.filter(m => m.status === '파견중').length}명`, c: 'text-sky-300' },
                      { l: '부상', v: `${mercs.filter(m => m.status === '부상').length}명`, c: 'text-red-400' },
                      { l: '대기 중', v: `${mercs.filter(m => m.status === '대기중').length}명`, c: 'text-emerald-300' },
                      { l: '미션급여 합계', v: `${mercs.reduce((s,m)=>(MISSION_PAY_PER_DAY[m.grade]??15)+s,0)}G/건`, c: 'text-amber-300' },
                      { l: '다음 도착', v: formatArrivalCountdown(nextArrivalTime, tickTime), c: 'text-slate-300' },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="flex justify-between px-1">
                        <span className="text-slate-600">{l}</span>
                        <span className={`font-semibold ${c}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Soul Overflow Modal ────────────────────────── */}
      {showSoulOverflowModal && (() => {
        const souls = mercs.filter(m => m.status === '영혼')
        const cap = roomLevels['길드마스터룸'] ?? 1
        return (
          <div className="fixed inset-0 flex items-center justify-center bg-black/90" style={{ zIndex: 60 }}>
            <div className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
              style={{ background: 'rgba(12,6,28,0.99)', border: '1px solid rgba(160,130,255,0.4)', boxShadow: '0 0 40px rgba(120,80,255,0.2)' }}>
              <div className="px-5 pt-5 pb-3 text-center flex-shrink-0">
                <span className="text-4xl block mb-2">👻</span>
                <p className="text-base font-extrabold text-white">영혼 수용 한계 초과</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(160,130,255,0.8)' }}>
                  길드마스터룸에 영혼이 너무 많습니다 ({souls.length}/{cap})
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(180,160,255,0.55)' }}>
                  성불시킬 영혼을 선택하세요. 룸 업그레이드로 수용 한계를 늘릴 수 있습니다.
                </p>
              </div>
              <div className="px-4 pb-4 space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
                {souls.map(m => (
                  <div key={m.id} className="rounded-xl flex items-center gap-3 px-3 py-2.5"
                    style={{ background: 'rgba(80,50,160,0.18)', border: '1px solid rgba(160,130,255,0.3)' }}>
                    <MercAvatar m={m} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'rgba(210,190,255,0.9)' }}>{m.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(160,130,255,0.6)' }}>
                        {m.class} {m.grade}급 Lv{m.level}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => reviveMerc(m.id)}
                        disabled={state.gold < m.deathCost}
                        className="text-xs rounded px-2.5 py-1 font-bold transition hover:brightness-125"
                        style={{
                          background: state.gold >= m.deathCost ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${state.gold >= m.deathCost ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          color: state.gold >= m.deathCost ? '#86efac' : 'rgba(80,80,80,0.4)',
                          cursor: state.gold >= m.deathCost ? 'pointer' : 'not-allowed',
                        }}>
                        ✨ {m.deathCost}G
                      </button>
                      <button onClick={() => ascendMerc(m.id)}
                        className="text-xs rounded px-2.5 py-1 font-bold transition hover:brightness-125"
                        style={{ background: 'rgba(160,130,255,0.2)', border: '1px solid rgba(160,130,255,0.4)', color: 'rgba(210,190,255,0.9)', cursor: 'pointer' }}>
                        🕊 성불 +1💎
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Log Modal ──────────────────────────────────── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={() => setShowLogModal(false)}>
          <div className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
            style={{ background: 'rgba(8,6,20,0.98)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>

            {battleResults.length === 0 ? (
              <>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-sm font-bold text-white">전투 결과</span>
                  <button onClick={() => setShowLogModal(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
                </div>
                <p className="text-slate-600 text-sm text-center py-12">아직 결과가 없습니다</p>
              </>
            ) : (() => {
              const page = battleResults[battleResultPage]
              const hasPrev = battleResultPage > 0
              const hasNext = battleResultPage < battleResults.length - 1
              return (
                <>
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-xs text-slate-500">{battleResultPage + 1} / {battleResults.length}</span>
                    <span className="text-sm font-bold text-white">전투 결과</span>
                    <button onClick={() => setShowLogModal(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
                  </div>

                  {/* 결과 헤드라인 */}
                  <div className="flex flex-col items-center py-6 flex-shrink-0"
                    style={{ background: page.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)' }}>
                    <span className="text-5xl mb-2">{page.success ? '✅' : '❌'}</span>
                    <p className="text-base font-extrabold text-white">{page.questName}</p>
                    <p className={`text-sm font-bold mt-0.5 ${page.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {page.success ? '임무 성공' : '임무 실패'}
                    </p>
                  </div>

                  {/* 상세 로그 */}
                  <div className="overflow-y-auto px-4 py-3 space-y-1.5 flex-1 min-h-0">
                    {page.lines.map((line, i) => (
                      <p key={i} className="text-sm rounded-lg px-3 py-1.5"
                        style={{
                          background: line.startsWith('💀') ? 'rgba(239,68,68,0.1)'
                            : line.startsWith('⬆') ? 'rgba(251,191,36,0.08)'
                            : line.startsWith('⚠') ? 'rgba(251,146,60,0.08)'
                            : 'rgba(255,255,255,0.03)',
                          color: line.startsWith('💀') ? 'rgba(252,165,165,0.95)'
                            : line.startsWith('⬆') ? 'rgba(251,191,36,0.9)'
                            : line.startsWith('😒') ? 'rgba(251,146,60,0.85)'
                            : line.startsWith('⚠') ? 'rgba(251,146,60,0.85)'
                            : line.startsWith('💰') || line.startsWith('🌟') ? 'rgba(134,239,172,0.9)'
                            : 'rgba(180,180,180,0.8)'
                        }}>
                        {line}
                      </p>
                    ))}
                  </div>

                  {/* 네비게이션 */}
                  <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={() => setBattleResultPage(p => p - 1)}
                      disabled={!hasPrev}
                      className="rounded-lg px-3 py-1.5 text-sm font-bold transition-all"
                      style={{
                        background: hasPrev ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: hasPrev ? 'rgba(200,200,200,0.9)' : 'rgba(80,80,80,0.4)',
                        border: `1px solid ${hasPrev ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                        cursor: hasPrev ? 'pointer' : 'default',
                      }}>
                      ← 이전
                    </button>
                    <div className="flex gap-1">
                      {battleResults.map((r, i) => (
                        <button key={i} onClick={() => setBattleResultPage(i)}
                          className="w-2 h-2 rounded-full transition-all"
                          style={{ background: i === battleResultPage ? (r.success ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.15)' }} />
                      ))}
                    </div>
                    <button onClick={() => setBattleResultPage(p => p + 1)}
                      disabled={!hasNext}
                      className="rounded-lg px-3 py-1.5 text-sm font-bold transition-all"
                      style={{
                        background: hasNext ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: hasNext ? 'rgba(200,200,200,0.9)' : 'rgba(80,80,80,0.4)',
                        border: `1px solid ${hasNext ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                        cursor: hasNext ? 'pointer' : 'default',
                      }}>
                      다음 →
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
      {/* ── Pending Drop Modal ───────────────────────── */}
      {pendingDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-5" style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 380, width: '90vw' }}>
            <div className="text-center mb-4">
              <div className="text-2xl mb-1">{pendingDrop.icon}</div>
              <div className="text-white font-bold text-lg">전리품 획득!</div>
              <div className="text-amber-300 font-bold mt-1">[{pendingDrop.name} {pendingDrop.grade}등급]</div>
              <div className="text-slate-400 text-sm mt-2 flex justify-center gap-3 flex-wrap">
                {pendingDrop.powerBonus > 0 && <span>전력+{pendingDrop.powerBonus}</span>}
                {pendingDrop.atkBonus > 0 && <span>공격+{pendingDrop.atkBonus}</span>}
                {pendingDrop.trapBonus > 0 && <span>함정+{pendingDrop.trapBonus}</span>}
                {pendingDrop.survBonus > 0 && <span>생존+{pendingDrop.survBonus}</span>}
              </div>
              {pendingDrop.passive && <div className="text-purple-400 text-sm mt-1">{pendingDrop.passive.condition}</div>}
              <div className="text-slate-500 text-xs mt-1">구매가: {pendingDrop.buyCost}G</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => acceptDrop(pendingDrop)}
                className="flex-1 py-2 rounded-lg font-bold text-sm"
                style={{ background: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac' }}
              >
                인벤토리에 추가
              </button>
              <button
                onClick={() => rejectDrop(pendingDrop)}
                className="flex-1 py-2 rounded-lg font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              >
                거절 (자동 장착 시도)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Equipment Modal ───────────────────────────── */}
      {showEquipModal && (() => {
        const merc = mercs.find(m => m.id === showEquipModal)
        if (!merc) return null
        return (
          <EquipmentModal
            merc={merc}
            guildInventory={guildInventory}
            onEquip={equipItem}
            onClose={() => setShowEquipModal(null)}
          />
        )
      })()}

      {/* ── Merchant Panel ────────────────────────────── */}
      {showMerchant && merchantState?.active && (
        <MerchantPanel
          merchant={merchantState}
          gold={state.gold}
          guildInventory={guildInventory}
          onBuy={item => buyFromMerchant(
            item, state.gold, guildInventory,
            (bought, cost) => {
              setState(prev => ({ ...prev, gold: prev.gold - cost }))
              setGuildInventory(prev => [...prev, bought])
            },
            log,
          )}
          onClose={() => setShowMerchant(false)}
        />
      )}

      {/* ── Dungeon Panel ─────────────────────────────── */}
      {showDungeon && activeDungeon && (() => {
        const baseQuest = ALL_QUESTS.find(q => q.difficulty >= 100) ?? ALL_QUESTS[0]
        const floorQuest: Quest = {
          ...baseQuest,
          id: `dg-floor-${activeDungeon.currentFloor}`,
          name: `${activeDungeon.name} ${activeDungeon.currentFloor}층`,
          difficulty: dungeonFloorDifficulty(baseQuest.difficulty, activeDungeon.currentFloor),
          deathRisk: dungeonFloorDeathRisk(baseQuest.deathRisk, activeDungeon.currentFloor),
          element: activeDungeon.element,
          reward: {
            gold: dungeonFloorGold(activeDungeon.currentFloor),
            fame: 0,
            exp: dungeonFloorXp(activeDungeon.currentFloor),
          },
          duration: 2 + activeDungeon.currentFloor,
        }
        return (
          <DungeonPanel
            dungeon={activeDungeon}
            floorQuest={floorQuest}
            availableMercs={mercs.filter(m => m.status === '대기중')}
            onDispatch={() => {}}
            onAbandon={() => { abandonDungeon(); setShowDungeon(false) }}
            onClose={() => setShowDungeon(false)}
          />
        )
      })()}

      {/* ── Expedition Panel ─────────────────────────── */}
      {showExpedition && activeExpedition && (
        <ExpeditionPanel
          expedition={activeExpedition}
          mercs={mercs}
          onClose={() => setShowExpedition(false)}
          onClaim={claimExpedition}
        />
      )}
      {/* ── Expedition Launch Modal (메르크 선택) ──────── */}
      {showExpedition && !activeExpedition && (
        <ExpeditionLaunchModal
          mercs={mercs.filter(m => m.status === '대기중')}
          onLaunch={launchExpedition}
          onClose={() => setShowExpedition(false)}
        />
      )}
      {/* ── Story Modal ──────────────────────────────── */}
      {showStoryModal && storyContent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/95" style={{ zIndex: 70 }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'linear-gradient(180deg,#0a0414 0%,#070210 100%)', border: '1px solid rgba(160,130,255,0.25)', boxShadow: '0 0 60px rgba(120,80,220,0.3)', maxHeight: '85vh' }}>
            {/* 상단 체인 배지 */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(160,130,255,0.15)' }}>
              <div className="flex-1">
                <div className="text-xs font-bold mb-0.5" style={{ color: 'rgba(180,150,255,0.6)', letterSpacing: '0.1em' }}>{storyContent.chainName.toUpperCase()}</div>
                <div className="text-base font-bold text-white">{storyContent.title}</div>
              </div>
              <div className="text-xs rounded-full px-2 py-0.5 font-semibold" style={{ background: 'rgba(160,130,255,0.15)', color: 'rgba(200,180,255,0.85)', border: '1px solid rgba(160,130,255,0.3)' }}>
                {storyContent.questName} 완료
              </div>
            </div>
            {/* 스토리 텍스트 */}
            <div className="px-5 py-5 flex-1 overflow-y-auto space-y-3">
              {storyContent.lines.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{
                  color: line.startsWith('"') ? 'rgba(220,200,255,0.95)' : line.startsWith('새로운') ? 'rgba(250,204,21,0.9)' : 'rgba(180,165,200,0.85)',
                  fontStyle: line.startsWith('"') ? 'italic' : 'normal',
                  fontWeight: line.startsWith('새로운') ? 600 : 400,
                  paddingLeft: line.startsWith('"') ? '0.75rem' : 0,
                  borderLeft: line.startsWith('"') ? '2px solid rgba(160,130,255,0.4)' : 'none',
                }}>
                  {line}
                </p>
              ))}
            </div>
            {/* 계속 버튼 */}
            <div className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid rgba(160,130,255,0.1)' }}>
              <button
                onClick={() => setShowStoryModal(false)}
                className="w-full rounded-xl py-2.5 text-sm font-bold transition-all"
                style={{ background: 'rgba(160,130,255,0.2)', color: 'rgba(220,200,255,0.95)', border: '1px solid rgba(160,130,255,0.4)' }}>
                계속 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

export default App
