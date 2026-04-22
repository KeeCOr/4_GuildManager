import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initialMercenaries, ALL_QUESTS, generateMercenary, EXP_TO_NEXT, WEAPONS, DEFAULT_WEAPON, RACE_BONUS_DESC } from './data/mercenaries'
import { StatRadar } from './components/StatRadar'
import type { Mercenary, Quest, ActiveQuest, GuildBuildings, CampaignState } from './types'

// ── Display helpers ────────────────────────────────────────────────────────

const RACE_ICONS: Record<string, string> = { 엘프: '🧝', 인간: '⚜️', 드워프: '⛏️', 수인: '🐺' }
const CLASS_ICONS: Record<string, string> = { 전사: '⚔️', 궁수: '🏹', 도적: '🗡️', 마법사: '🪄', 성직자: '🕊️' }
const GRADE_STARS: Record<string, string> = { S: '★★★★★', A: '★★★★', B: '★★★', C: '★★', D: '★' }

// 속성 아이콘·색상
const ELEMENT_ICON: Record<string, string> = { 불: '🔥', 얼음: '🧊', 번개: '⚡', 자연: '🌿', 암흑: '🌑', 빛: '✨' }
// 속성 일치 시 발동되는 특수 효과 설명
const ELEMENT_BONUS_DESC: Record<string, string> = {
  불:   '전투력 +15%',
  얼음: '컨디션 소모 -50%',
  번개: '소요시간 -25%',
  자연: '사망 위험 -35%',
  암흑: '함정 적중 +15%',
  빛:   '파티 회생 -30%',
}
const ELEMENT_COLOR: Record<string, string> = {
  불: 'text-orange-400', 얼음: 'text-cyan-300', 번개: 'text-yellow-300',
  자연: 'text-green-400', 암흑: 'text-purple-400', 빛: 'text-yellow-100'
}
const ELEMENT_BG: Record<string, string> = {
  불: 'rgba(234,88,12,0.25)', 얼음: 'rgba(34,211,238,0.2)', 번개: 'rgba(250,204,21,0.2)',
  자연: 'rgba(34,197,94,0.2)', 암흑: 'rgba(147,51,234,0.2)', 빛: 'rgba(253,224,71,0.2)'
}

const gradeText = (g: string) =>
  ({ S: 'text-fuchsia-300', A: 'text-amber-300', B: 'text-emerald-300', C: 'text-sky-300', D: 'text-slate-400' }[g] ?? 'text-slate-400')
const gradeBg = (g: string) =>
  ({ S: 'bg-fuchsia-700', A: 'bg-amber-700', B: 'bg-emerald-700', C: 'bg-sky-800', D: 'bg-slate-700' }[g] ?? 'bg-slate-700')

// 미션 급여: 등급별 1일당 지급액 (퀘스트 완료 시 duration만큼 정산)
const MISSION_PAY_PER_DAY: Record<string, number> = { D: 15, C: 30, B: 58, A: 100, S: 175 }
const ARRIVAL_REFRESH_COST = 150

// 호감도 이모지
const favEmoji = (fav: number) =>
  fav >= 81 ? '❤️' : fav >= 61 ? '😊' : fav >= 41 ? '😐' : fav >= 21 ? '😒' : '💔'

// ── 무기 헬퍼 ─────────────────────────────────────────────────────────────
const weaponOf = (m: Mercenary) => WEAPONS.find(w => w.id === m.weaponId)
const wPow  = (m: Mercenary) => { const w = weaponOf(m); return w ? w.powerBonus + (w.raceBonus[m.race] ?? 0) : 0 }
const wAtk  = (m: Mercenary) => weaponOf(m)?.atkBonus  ?? 0
const wTrap = (m: Mercenary) => weaponOf(m)?.trapBonus ?? 0
const wSurv = (m: Mercenary) => weaponOf(m)?.survBonus ?? 0

// Effective power = 기본전력 + 무기보정 + 컨디션 + 호감도 보정 (퀘스트 내부 계산용)
const effPower = (m: Mercenary) => {
  const favMod = 1 + (m.favorability - 50) / 500  // -0.1 ~ +0.1
  return Math.round((m.power + wPow(m)) * (0.4 + 0.6 * m.condition / 100) * favMod)
}
// 전투력 = 컨디션 반영 공격력 (UI 표시용)
const combatPower = (m: Mercenary) =>
  Math.round((m.stats.공격력 + wAtk(m)) * (0.4 + 0.6 * m.condition / 100))
// 함정 해제 능력 보유 직업 (도적·궁수만)
const canTrap = (m: Mercenary) => m.class === '도적' || m.class === '궁수'

const condBar = (cond: number) => {
  const pct = cond
  const col = cond >= 70 ? '#22c55e' : cond >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col }} />
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
    body: '금화·식량·사기 세 가지를 동시에 관리해야 길드가 유지됩니다.',
    tips: [
      '식량 🌾: 용병 1명당 하루 5 소비 — 파견 중엔 추가',
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
               desc: (lv: number) => `${[3,3,2,2][lv-1]}일마다 ${[1,2,3,4][lv-1]}명 도착` },
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

function drawQuestPool(hallLevel: number, activeQuestIds: string[], fame: number): string[] {
  const count = [5, 7, 9, 12][Math.min(hallLevel - 1, 3)]
  const guildLv  = computeGuildLevel(fame)
  const maxDiff  = GUILD_MAX_QUEST_DIFF[Math.min(guildLv - 1, 4)]
  const nextDiff = guildLv < 5 ? GUILD_MAX_QUEST_DIFF[guildLv] : 9999
  // 이전 티어 상한 (Lv1이면 0 = 하위 없음)
  const prevDiff = guildLv >= 2 ? GUILD_MAX_QUEST_DIFF[guildLv - 2] : 0

  const avail = ALL_QUESTS.filter(q => !activeQuestIds.includes(q.id))

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
  '식당':         { icon: '🍖', desc: ['최대 6명 고용', '최대 9명, 도착+1명', '최대 12명, 도착+2명'] },
}

// Room-level derived helpers
const trainingCapacity  = (lv: number) => [2, 4, 6][Math.min(lv - 1, 2)]
const trainingXPPerDay  = (lv: number) => [1, 3, 6][Math.min(lv - 1, 2)]
const masterCapacity    = (lv: number) => [1, 2, 3][Math.min(lv - 1, 2)]
const masterFavBonus    = (lv: number) => [1, 2, 3][Math.min(lv - 1, 2)]
const maxHireCap        = (lv: number) => [6, 9, 12][Math.min(lv - 1, 2)]
const diningArrivalBonus = (lv: number) => [0, 1, 2][Math.min(lv - 1, 2)]
const diningTavernBonus  = (lv: number) => [0, 1, 2][Math.min(lv - 1, 2)]

// Building effects
const maxSimultaneousQuests = (hallLv: number) => [2, 3, 4, 5][Math.min(hallLv - 1, 3)]
const arrivalInterval = (barracksLv: number) => [3, 3, 2, 2][barracksLv - 1] ?? 3
const arrivalCount    = (barracksLv: number) => [3, 4, 5, 6][barracksLv - 1] ?? 3
const condRecovery    = (infLv: number)      => [0, 8, 15, 25, 40][infLv] ?? 0
const xpMultiplier    = (trainLv: number)    => [1.0, 1.3, 1.7, 2.2][trainLv - 1] ?? 1.0

// ── Real-time quest duration ───────────────────────────────────────────────
// duration 1→5분, 2→15분, 3→30분, 4→60분, 5→90분, 6→120분, 7→180분, 8→240분
const QUEST_BASE_TIMES_MIN = [5, 15, 30, 60, 90, 120, 180, 240] as const

function calcQuestDurationMs(quest: Quest, assignedMercs: Mercenary[]): number {
  const baseMins = QUEST_BASE_TIMES_MIN[Math.min(quest.duration - 1, 7)]
  const totalEff = assignedMercs.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalEff / quest.difficulty
  let mult = 1.0
  if      (powerRatio >= 2.0) mult = 0.40
  else if (powerRatio >= 1.5) mult = 0.55
  else if (powerRatio >= 1.2) mult = 0.70
  else if (powerRatio >= 1.0) mult = 0.85
  // ⚡ 번개 속성 일치 용병: 소요시간 -25% (최대 -40%)
  if (quest.element === '번개') {
    const cnt = assignedMercs.filter(m => m.element === '번개').length
    if (cnt > 0) mult *= Math.max(0.6, 1 - cnt * 0.12)
  }
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
  isDraggable, onDragStart, onDragEnd, isDragging, matchElement
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
  matchElement?: boolean  // true = element matches current quest
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
        <div className="relative flex-shrink-0 flex flex-col items-center gap-0.5">
          <span className="text-xl leading-none">{RACE_ICONS[merc.race]}</span>
          <span className="text-sm leading-none">{CLASS_ICONS[merc.class]}</span>
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
          {showDetail && <div className="mt-1">{condBar(merc.condition)}</div>}
        </div>
        <div className="flex-shrink-0 text-right">
          {isDeployed
            ? <div className="text-sm font-bold rounded px-1.5 py-0.5 text-white" style={{ background: 'rgba(14,165,233,0.4)', border: '1px solid rgba(14,165,233,0.6)' }}>⚔ 파견중</div>
            : isInjured
              ? <div className="text-sm font-bold rounded px-1.5 py-0.5 text-white" style={{ background: 'rgba(239,68,68,0.4)', border: '1px solid rgba(239,68,68,0.6)' }}>🤕 부상</div>
              : <div className="text-sm font-bold text-amber-300">{MISSION_PAY_PER_DAY[merc.grade] ?? 15}G<span className="text-slate-600">/일</span></div>
          }
        </div>
      </div>
    </div>
  )
}

// ── Quest Calculations (pure, module-level) ───────────────────────────────

function calcSuccessRate(quest: Quest, assignedIds: string[], allMercs: Mercenary[]): number {
  const assigned = assignedIds.filter(Boolean).map(id => allMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
  if (assigned.length === 0) return 0
  const totalEff = assigned.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalEff / quest.difficulty
  // base: 0 power=10%, 1x=85%, capped 95%
  let rate = Math.round(Math.min(95, powerRatio * 75 + 10))
  // Class bonuses
  const classes = assigned.map(m => m.class)
  if (classes.includes('성직자')) rate = Math.min(95, rate + 8)   // healer buffs party
  if (classes.includes('전사'))   rate = Math.min(95, rate + 3)   // frontline stability
  if (classes.includes('도적') && (quest.trapFocus || quest.conditionDrain >= 20)) rate = Math.min(95, rate + 10)
  // 속성 일치: 속성별 고유 성공률 보너스
  for (const m of assigned.filter(m => m.element === quest.element)) {
    switch (m.element) {
      case '불':   rate = Math.min(95, rate + 13); break  // 전투력 폭발적 증가
      case '얼음': rate = Math.min(95, rate + 8);  break  // 컨디션 절약, 안정형
      case '번개': rate = Math.min(95, rate + 9);  break  // 속도 특화
      case '자연': rate = Math.min(95, rate + 10); break  // 생존·지속 특화
      case '암흑': rate = Math.min(95, rate + 11); break  // 은밀·함정 특화
      case '빛':   rate = Math.min(95, rate + 14); break  // 파티 지원·회복
    }
  }
  // 암흑 속성 + 함정 집중 퀘스트: 추가 보너스
  if (quest.trapFocus && quest.element === '암흑') {
    const darkMatch = assigned.filter(m => m.element === '암흑').length
    rate = Math.min(95, rate + darkMatch * 8)
  }
  // 함정 퀘스트: 도적·궁수의 함정해제 합산이 높으면 보너스
  if (quest.trapFocus) {
    const totalTrap = assigned.filter(m => canTrap(m)).reduce((s, m) => s + m.trap_disarm + wTrap(m), 0)
    if (totalTrap >= 80) rate = Math.min(95, rate + 10)
    else if (totalTrap >= 50) rate = Math.min(95, rate + 5)
  }
  // Fill ratio penalty
  const fillRatio = assigned.length / quest.slots
  if (fillRatio < 0.5)       rate = Math.max(5, rate - 15)
  else if (fillRatio < 0.75) rate = Math.max(5, rate - 5)
  // Condition penalty
  const avgCond = assigned.reduce((s, m) => s + m.condition, 0) / assigned.length
  if (avgCond < 50)      rate = Math.max(5, rate - 10)
  else if (avgCond < 70) rate = Math.max(5, rate - 5)
  return Math.max(5, Math.min(95, rate))
}

// calcMercDeathRisk — 사망률은 등급이 아닌 퀘스트 종류·파티 구성·능력치 조합으로 결정
// party: 이 퀘스트에 배치된 전체 용병 배열
function calcMercDeathRisk(quest: Quest, merc: Mercenary, party: Mercenary[]): number {
  let risk = quest.deathRisk
  const partySize = party.length

  // ── 0. 파티 전력 vs 요구 전력 — 전력 부족 시 사망률 급증 ──
  const totalPartyEff = party.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalPartyEff / quest.difficulty
  if      (powerRatio < 0.4) risk *= 5.0   // 심각한 전력 부족: 학살 수준
  else if (powerRatio < 0.6) risk *= 3.0   // 전력 크게 부족
  else if (powerRatio < 0.8) risk *= 1.8   // 전력 부족
  else if (powerRatio < 0.95) risk *= 1.2  // 약간 부족
  else if (powerRatio >= 1.5) risk *= 0.6  // 압도적 전력: 위험 감소

  // ── 1. 퀘스트 종류별 요구 능력치 ──────────────────
  // 함정/던전형 (conditionDrain ≥ 20): 도적·궁수의 함정해제 능력이 낮으면 위험
  if (quest.conditionDrain >= 20 && canTrap(merc)) {
    const trapFactor = Math.max(0.5, 1.6 - (merc.trap_disarm + wTrap(merc)) / 35)
    risk *= trapFactor
  }
  // 전투형 (deathRisk ≥ 0.12): 공격력이 낮으면 적에게 압도됨
  if (quest.deathRisk >= 0.12) {
    const atkFactor = Math.max(0.55, 1.45 - (merc.stats.공격력 + wAtk(merc)) / 55)
    risk *= atkFactor
  }
  // 장기 원정형 (duration ≥ 4): 생존율이 시간에 따라 복리로 중요해짐
  if (quest.duration >= 4) {
    const durFactor = Math.max(0.5, 1.35 - (merc.stats.생존율 + wSurv(merc)) / 75)
    risk *= durFactor
  }

  // ── 2. 개인 생존율 스탯 (항상 적용) ──────────────
  risk *= Math.max(0.28, 1 - (merc.stats.생존율 + wSurv(merc)) / 120)

  // ── 3. 파티 구성 시너지 ────────────────────────────
  const partyClasses = party.map(m => m.class)
  const hasHealer  = partyClasses.includes('성직자')
  const hasTank    = partyClasses.includes('전사')
  const hasRogue   = partyClasses.includes('도적')

  // 성직자: 파티 전원 회복 → 사망률 대폭 감소
  if (hasHealer) risk *= 0.65
  // 전사: 비전사 용병을 방어 → 전선 뒤쪽 직업 보호
  if (hasTank && merc.class !== '전사') risk *= 0.82
  // 도적: 함정 퀘스트에서 파티 전원 보호
  if (hasRogue && quest.conditionDrain >= 20) risk *= 0.78

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

  // ── 6. 직업-퀘스트 미스매치 페널티 ──────────────────
  // 마법사: 근접전/저위험 퀘스트에서 근접 방어력 부재
  if (merc.class === '마법사' && quest.deathRisk < 0.12 && !hasHealer) risk *= 1.18
  // 성직자: 후방 유지로 위험 낮음
  if (merc.class === '성직자') risk *= 0.72
  // 전사: 어떤 퀘스트든 내구력으로 버팀
  if (merc.class === '전사') risk *= 0.88

  // ── 7. 파티 내 상대 전력 — 가장 약한 유닛이 먼저 쓰러짐 ──
  // 파티 평균 실효 전력 대비 이 유닛이 얼마나 약한가를 사망률에 반영
  // relStrength < 1 → 평균보다 약함 → 사망률 급증
  // relStrength > 1 → 평균보다 강함 → 사망률 완만 감소
  if (partySize >= 2) {
    const partyAvgEff = party.reduce((s, m) => s + effPower(m), 0) / partySize
    const mercEff = effPower(merc)
    const relStrength = mercEff / Math.max(1, partyAvgEff)
    // pow(1/rel, 0.75): rel=1.0 → ×1.0, rel=0.5 → ×1.68, rel=0.3 → ×2.4, rel=1.5 → ×0.74
    const relFactor = Math.max(0.65, Math.min(2.4, Math.pow(1 / Math.max(0.1, relStrength), 0.75)))
    risk *= relFactor
  }

  // ── 8. 속성 효과 ────────────────────────────────────────
  // 🌿 자연 속성 일치: 이 용병의 사망 위험 -35%
  if (merc.element === '자연' && quest.element === '자연') risk *= 0.65
  // ✨ 빛 속성 일치 파티원: 파티 전원 사망 위험 -30% (누적 가능)
  const lightMatchCount = party.filter(m => m.element === '빛' && quest.element === '빛').length
  if (lightMatchCount > 0) risk *= Math.pow(0.72, lightMatchCount)

  return Math.min(0.98, Math.max(0.01, risk))
}

// ── Save System ────────────────────────────────────────────────────────────

interface SaveSlotData {
  name: string
  day: number
  timestamp: number
  mercs: Mercenary[]
  activeQuests: ActiveQuest[]
  buildings: GuildBuildings
  campaignState: CampaignState
  questLog: string[]
  gateArrivals: Mercenary[]
  nextArrivalDay: number
  questPool: string[]
  roomLevels: Record<string, number>
}

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
  const [nextArrivalDay, setNextArrivalDay] = useState(4)
  const [buildings, setBuildings] = useState<GuildBuildings>({
    hall: 1, barracks: 1, training: 1, tavern: 0, infirmary: 0
  })
  const [state, setState] = useState<CampaignState>({
    day: 1, gold: 380, food: 280, fame: 5, morale: 80
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
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showQuestModal, setShowQuestModal] = useState(false)
  const [showMercModal, setShowMercModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [saveSlots, setSaveSlots] = useState<(SaveSlotData | null)[]>(loadAllSaveSlots)
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / 1600, window.innerHeight / 900))
  const [zoomDelta, setZoomDelta] = useState(0)
  const [previewArrival, setPreviewArrival] = useState<Mercenary | null>(null)
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const [questPool, setQuestPool] = useState<string[]>(() => drawQuestPool(1, [], 5))
  const [roomLevels, setRoomLevels] = useState<Record<string, number>>({ 길드마스터룸: 1, 훈련소: 1, 식당: 1 })

  // ── Derived ──────────────────────────────────────
  const deployedMercIds = useMemo(
    () => new Set(activeQuests.flatMap(aq => aq.assignedMercIds)),
    [activeQuests]
  )
  const pendingMercIds = useMemo(
    () => new Set(Object.values(pendingAssign).flat()),
    [pendingAssign]
  )
  // ── Game logic ───────────────────────────────────

  const log = (msg: string) => setQuestLog(prev => [...prev, msg].slice(-20))

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
    setGateArrivals(Array.from({ length: cnt }, () => generateMercenary(buildings.tavern + diningTavernBonus(diningLv))))
    log(`🔄 도착 목록 새로고침 (-${ARRIVAL_REFRESH_COST}G)`)
  }

  const dismissArrival = (mercId: string) => {
    setGateArrivals(prev => prev.filter(m => m.id !== mercId))
  }

  const dismissMerc = (merc: Mercenary) => {
    if (merc.status === '파견중') { log(`${merc.name}은 파견 중이라 해고할 수 없습니다.`); return }
    setMercs(prev => prev.filter(m => m.id !== merc.id))
    setSelectedMercDetail(null)
    log(`${merc.name} 해고. (잔여 급여 정산 없음)`)
  }

  const upgradeWeapon = (merc: Mercenary) => {
    const cur = WEAPONS.find(w => w.id === merc.weaponId)
    if (!cur || cur.tier >= 3) { log(`${merc.name}의 무기는 이미 최고 등급입니다.`); return }
    if (cur.upgradeCost <= 0) { log('업그레이드 비용 정보 없음'); return }
    if (state.gold < cur.upgradeCost) { log(`금화 부족: 무기 업그레이드 불가 (${cur.upgradeCost}G 필요)`); return }
    const next = WEAPONS.find(w => w.class === cur.class && w.tier === (cur.tier + 1) as 1|2|3)
    if (!next) { log('다음 티어 무기를 찾을 수 없습니다.'); return }
    setState(prev => ({ ...prev, gold: prev.gold - cur.upgradeCost }))
    setMercs(prev => prev.map(m => m.id === merc.id ? { ...m, weaponId: next.id } : m))
    setSelectedMercDetail(prev => prev?.id === merc.id ? { ...prev, weaponId: next.id } : prev)
    log(`${merc.name}의 무기: ${cur.icon}${cur.name} → ${next.icon}${next.name} (Tier${cur.tier}→${next.tier}) -${cur.upgradeCost}G`)
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
    const durationMs = calcQuestDurationMs(quest, assignedMercs)
    const completesAt = Date.now() + durationMs
    const mins = Math.round(durationMs / 60000)
    const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`
    const newAQ: ActiveQuest = { questId, assignedMercIds: slots, completesAt, durationMs }
    setActiveQuests(prev => [...prev, newAQ])
    setMercs(prev => prev.map(m => slots.includes(m.id) ? { ...m, status: '파견중' } : m))
    setPendingAssign(prev => { const n = { ...prev }; delete n[questId]; return n })
    log(`[${quest.name}] 파견 출발! (${timeStr} 소요, ${slots.length}명)`)

    // 풀의 모든 퀘스트가 파견됐으면 즉시 재충전
    const afterActiveIds = [...activeQuests.map(aq => aq.questId), questId]
    if (questPool.every(id => afterActiveIds.includes(id))) {
      setQuestPool(drawQuestPool(buildings.hall, afterActiveIds, state.fame))
      log('📋 모든 계약 수주 완료! 새 계약이 갱신되었습니다.')
    }
  }

  const cancelPending = (questId: string) => {
    setPendingAssign(prev => { const n = { ...prev }; delete n[questId]; return n })
  }

  const saveGame = (slotIdx: number) => {
    const data: SaveSlotData = {
      name: `Day ${state.day}`,
      day: state.day,
      timestamp: Date.now(),
      mercs, activeQuests, buildings,
      campaignState: state,
      questLog, gateArrivals, nextArrivalDay,
      questPool, roomLevels
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
      return { ...migrated, weaponId: migrated.weaponId ?? DEFAULT_WEAPON[migrated.class] }
    }))
    setActiveQuests(data.activeQuests.map((aq: any) => {
      if (typeof aq.completesAt === 'number') return aq as ActiveQuest
      const turns = Math.max(1, aq.turnsLeft ?? 1)
      const dur = turns * 5 * 60 * 1000
      return { questId: aq.questId, assignedMercIds: aq.assignedMercIds, completesAt: Date.now() + dur, durationMs: dur } as ActiveQuest
    }))
    setBuildings(data.buildings)
    setState(data.campaignState)
    setQuestLog(data.questLog)
    setGateArrivals(data.gateArrivals)
    setNextArrivalDay(data.nextArrivalDay)
    setQuestPool(data.questPool ?? drawQuestPool(data.buildings.hall, data.activeQuests.map(aq => aq.questId), data.campaignState.fame))
    setRoomLevels(data.roomLevels ?? { 길드마스터룸: 1, 훈련소: 1, 식당: 1 })
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

  const advanceDay = () => {
    let g = state.gold
    let f = state.food
    let morale = state.morale
    let fame = state.fame
    const nextDay = state.day + 1
    let nextMercs = mercs.map(m => ({ ...m }))
    const logs: string[] = []

    // ── 1. Daily costs for active quests (supply + food) ──────────────────
    for (const aq of activeQuests) {
      const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
      g -= quest.dailyGoldCost
      f -= Math.ceil(aq.assignedMercIds.length * 2)
    }

    // ── 3. Food cost ──────────────────────────────
    const foodCost = nextMercs.length * 5
    f -= foodCost
    if (f < 0) {
      f = 0; morale = Math.max(0, morale - 20)
      logs.push('🌾 식량 부족! 굶주림으로 사기 급락.')
      nextMercs = nextMercs.map(m => ({ ...m, condition: Math.max(0, m.condition - 15) }))
    }

    // ── 4. Condition recovery ──────────────────────────
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

    // ── 5. 방 효과 (훈련소 XP, 길드마스터룸 호감도) ──────────
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

      if (m.room === '훈련소') {
        const inTraining = trainMercs.some(t => t.id === m.id)
        if (inTraining && trainXP > 0) {
          const weakFactor = avgTrainPower > 0 ? Math.max(1, 2 - m.power / avgTrainPower) : 1
          const xpGain = Math.round(trainXP * weakFactor)
          let exp = m.experience + xpGain, level = m.level, expToNext = m.expToNext
          while (exp >= expToNext && level < 10) {
            exp -= expToNext; level++; expToNext = EXP_TO_NEXT(level)
            logs.push(`⬆ ${m.name} 훈련으로 Lv${level - 1}→Lv${level}!`)
          }
          const sb = level - m.level
          upd = { ...upd, experience: exp, level, expToNext,
            power: m.power + sb * 4,
            trap_disarm: m.trap_disarm + sb * 2,
            stats: { 공격력: m.stats.공격력 + sb * 2, 함정해제: m.stats.함정해제 + sb * 2,
                     생존율: m.stats.생존율 + sb * 2, 협조성: m.stats.협조성 + sb } }
        }
      }

      if (masterMercIds.has(m.id)) {
        upd.favorability = Math.min(100, m.favorability + masterFav)
      }

      return Object.keys(upd).length > 0 ? { ...m, ...upd } : m
    })

    // ── 6. Morale natural recovery ─────────────────
    if (g > 0 && f > 0) morale = Math.min(100, morale + 1)

    // ── 7. Arrival check ──────────────────────────
    let newGateArrivals = [...gateArrivals]
    let newNextArrivalDay = nextArrivalDay
    if (nextDay >= nextArrivalDay) {
      const diningLv = roomLevels['식당'] ?? 1
      const count = arrivalCount(buildings.barracks) + diningArrivalBonus(diningLv)
      const interval = arrivalInterval(buildings.barracks)
      const arrivals = Array.from({ length: count }, () => generateMercenary(buildings.tavern + diningTavernBonus(diningLv)))
      newGateArrivals = arrivals
      newNextArrivalDay = nextDay + interval
      const grades = arrivals.map(a => a.grade).join(', ')
      logs.push(`🚶 새 용병 ${count}명 도착! (${grades}급)`)
    }

    // ── 8. 퀘스트 풀 날짜별 갱신 ──────────────────────
    const newQuestPool = drawQuestPool(buildings.hall, activeQuests.map(aq => aq.questId), fame)

    setMercs(nextMercs)
    setGateArrivals(newGateArrivals)
    setNextArrivalDay(newNextArrivalDay)
    setQuestPool(newQuestPool)
    setState({ day: nextDay, gold: Math.max(0, g), food: Math.max(0, f), fame: Math.max(0, fame), morale })
    setQuestLog(prev => [...prev, ...logs].slice(-20))
  }

  // ── Real-time quest completion ────────────────────────────────────────────
  const completionDataRef = useRef({ mercs, state, questLog, buildings, roomLevels, activeQuests })
  completionDataRef.current = { mercs, state, questLog, buildings, roomLevels, activeQuests }

  const processCompletions = useCallback(() => {
    const now = Date.now()
    const { mercs, state, questLog: _log, buildings, activeQuests } = completionDataRef.current
    const completed = activeQuests.filter(aq => aq.completesAt <= now)
    if (completed.length === 0) return

    let g = state.gold, f = state.food, fame = state.fame, morale = state.morale
    let nextMercs = [...mercs]
    const logs: string[] = []

    for (const aq of completed) {
      const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
      // Condition drain on completion (🧊 얼음 속성 일치: -50%)
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
        f += quest.reward.food; fame += quest.reward.fame
        morale = Math.min(100, morale + 5)
        // 급여를 보상 금화에서 우선 지급, 남은 금액만 길드 수입
        const totalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
        const rewardGold = quest.reward.gold
        const guildGold = Math.max(0, rewardGold - totalWages)
        g += guildGold
        const wageFullyPaid = rewardGold >= totalWages
        if (wageFullyPaid) {
          logs.push(`✅ [${quest.name}] 성공! 길드 +${guildGold}G +${quest.reward.food}식량 +${quest.reward.fame}명성`)
          if (totalWages > 0) logs.push(`💰 급여 전액 지급 (${totalWages}G)`)
        } else {
          logs.push(`✅ [${quest.name}] 성공! +${quest.reward.food}식량 +${quest.reward.fame}명성`)
          logs.push(`⚠ 보상(${rewardGold}G) < 급여(${totalWages}G): 비례 분배, 길드 수입 없음`)
        }
        const xpGain = Math.round(quest.reward.exp * xpMultiplier(buildings.training))
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          let exp = m.experience + xpGain, level = m.level, expToNext = m.expToNext
          while (exp >= expToNext && level < 10) {
            exp -= expToNext; level++; expToNext = EXP_TO_NEXT(level)
            logs.push(`⬆ ${m.name} Lv${level - 1}→Lv${level} 레벨업!`)
          }
          const sb = level - m.level
          return { ...m, level, experience: exp, expToNext,
            favorability: Math.min(100, m.favorability + 5),
            power: m.power + sb * 4,
            trap_disarm: m.trap_disarm + sb * 2,
            stats: { 공격력: m.stats.공격력 + sb * 2, 함정해제: m.stats.함정해제 + sb * 2, 생존율: m.stats.생존율 + sb * 2, 협조성: m.stats.협조성 + sb } }
        })
        // 급여 미달 시 비례 분배 + 호감도 패널티
        if (!wageFullyPaid && totalWages > 0) {
          nextMercs = nextMercs.map(m => {
            if (!aq.assignedMercIds.includes(m.id)) return m
            const expectedWage = (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration
            const actualWage = Math.floor(rewardGold * expectedWage / totalWages)
            const deficit = expectedWage - actualWage
            const favPenalty = Math.max(1, Math.ceil((deficit / expectedWage) * 20))
            logs.push(`😒 ${m.name} 급여 미달(${actualWage}/${expectedWage}G) 호감도 -${favPenalty}`)
            return { ...m, favorability: Math.max(0, m.favorability - favPenalty) }
          })
        }
        if (aq.assignedMercIds.length < 3) {
          const party = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
          for (const mid of aq.assignedMercIds) {
            const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
            if (Math.random() < calcMercDeathRisk(quest, merc, party) * 0.35) {
              g -= merc.deathCost; nextMercs = nextMercs.filter(m => m.id !== mid)
              logs.push(`💀 ${merc.name} 성공 중 전사! (소규모 파티) -${merc.deathCost}G`)
            }
          }
        }
      } else {
        morale = Math.max(0, morale - 8)
        logs.push(`❌ [${quest.name}] 실패! 부대가 귀환했습니다.`)
        // 실패 시 보상 없음 → 급여 전액 미지급, 호감도 하락
        const failTotalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
        const expectedFailWage = Math.round(failTotalWages * 0.5)
        if (expectedFailWage > 0) logs.push(`💰 실패 - 급여 미지급 (예정 ${expectedFailWage}G, 보상 없음)`)
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          const expectedWage = Math.round((MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration * 0.5)
          const wagePenalty = expectedWage > 0 ? Math.min(10, Math.max(2, Math.ceil(expectedWage / 15))) : 2
          return { ...m, favorability: Math.max(0, m.favorability - 5 - wagePenalty) }
        })
        const failParty = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
        const deadIds: string[] = []
        for (const mid of aq.assignedMercIds) {
          const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
          if (Math.random() < calcMercDeathRisk(quest, merc, failParty)) {
            g -= merc.deathCost; nextMercs = nextMercs.filter(m => m.id !== mid)
            deadIds.push(mid); fame = Math.max(0, fame - 2)
            logs.push(`💀 ${merc.name} 전사! -${merc.deathCost}G`)
          } else {
            nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '부상', hp: Math.max(0, m.hp - 30) } : m)
          }
        }
        if (deadIds.length > 0) nextMercs = nextMercs.map(m =>
          aq.assignedMercIds.includes(m.id) && !deadIds.includes(m.id) ? { ...m, favorability: Math.max(0, m.favorability - 3) } : m)
      }
      nextMercs = nextMercs.map(m =>
        aq.assignedMercIds.includes(m.id) && m.status === '파견중' ? { ...m, status: '대기중' } : m)
    }

    setMercs(nextMercs)
    setState({ day: state.day, gold: Math.max(0, g), food: Math.max(0, f), fame: Math.max(0, fame), morale })
    setActiveQuests(prev => prev.filter(aq => aq.completesAt > now))
    setQuestLog(prev => [...prev, ...logs].slice(-20))
    if (logs.some(l => l.startsWith('✅') || l.startsWith('❌') || l.startsWith('💀'))) setShowLogModal(true)
  }, []) // empty deps - always reads from ref

  // 10초마다 퀘스트 완료 체크
  useEffect(() => {
    const timer = setInterval(processCompletions, 10_000)
    return () => clearInterval(timer)
  }, [processCompletions])

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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4">
            <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#0d0b1c', border: '1px solid rgba(120,80,200,0.35)', boxShadow: '0 0 60px rgba(80,40,160,0.2)', maxHeight: '85vh' }}>

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
      })()}

      {/* ── 플레이 힌트 카드 (우하단 플로팅) ── */}
      {activeHint && (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#0f0d20', border: '1px solid rgba(120,80,200,0.45)', boxShadow: '0 0 30px rgba(80,40,160,0.25)' }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: 'rgba(120,80,200,0.15)', borderBottom: '1px solid rgba(120,80,200,0.2)' }}>
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
        style={{ background: 'rgba(6,6,14,0.97)', borderColor: 'rgba(255,255,255,0.06)', height: 48 }}>
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

        {/* 좌측 액션 버튼 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={advanceDay}
            className="rounded-lg px-4 py-1.5 text-sm font-extrabold text-white transition hover:brightness-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#6d28d9,#9333ea)',
              boxShadow: '0 0 14px rgba(139,92,246,0.3)',
            }}>
            다음 날 ▶
          </button>
        </div>

        {/* 자원 스탯 그룹 — 우측 정렬 */}
        <div className="ml-auto flex items-center gap-1">
          {[
            { icon: '📅', v: `Day ${state.day}`, c: 'text-cyan-300', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.15)' },
            { icon: '💰', v: `${state.gold}G`, c: 'text-amber-300', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.18)' },
            { icon: '🌾', v: `${state.food}`, c: 'text-emerald-300', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
            { icon: '⭐', v: `${state.fame}`, c: 'text-fuchsia-300', bg: 'rgba(217,70,239,0.08)', border: 'rgba(217,70,239,0.15)' },
            { icon: '❤️', v: `${state.morale}%`, c: 'text-rose-300', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.15)' },
            { icon: '👥', v: `${mercs.length}명`, c: 'text-slate-300', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
          ].map(({ icon, v, c, bg, border }) => (
            <div key={icon} className="flex items-center gap-1 rounded-md px-1.5 py-1"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <span className="text-sm leading-none">{icon}</span>
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
      <div className="relative overflow-hidden flex-1" style={{ minHeight: 0 }}>
        {/* Sky */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg,#03030a 0%,#08062a 25%,#160840 55%,#2d1205 80%,#0a0400 100%)'
        }} />
        {stars.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`, opacity: s.opacity }} />
        ))}
        {/* Moon */}
        <div className="absolute pointer-events-none" style={{
          top: 24, right: 90, width: 48, height: 48, borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%,#fffde0,#e8cc78)',
          boxShadow: '0 0 30px 14px rgba(232,200,80,0.12)'
        }} />
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
          height: 60, background: 'linear-gradient(0deg,#0d0702 40%,transparent 100%)'
        }} />
        {/* Road */}
        <div className="absolute pointer-events-none" style={{
          bottom: 14, left: 0, right: '45%', height: 30,
          background: 'linear-gradient(180deg,#3a2616,#261508)',
          borderTop: '2px solid #5a3820'
        }} />

        {/* ── Arrival panel (left) ── */}
        <div className="absolute flex flex-col justify-end gap-2 pb-2" style={{ left: 10, bottom: 48, width: '40%', maxHeight: 360 }}>
          {/* 버튼 행 */}
          <div className="flex gap-1.5">
            <button onClick={() => setShowQuestModal(true)}
              className="rounded-xl px-3 py-2 text-sm font-bold text-white transition-all hover:brightness-115 active:scale-95 relative"
              style={{
                background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)',
                border: '1px solid rgba(59,130,246,0.55)',
                backdropFilter: 'blur(8px)',
                boxShadow: activeQuests.length > 0 ? '0 0 14px rgba(59,130,246,0.25)' : '0 2px 8px rgba(0,0,0,0.4)',
                letterSpacing: '0.01em'
              }}>
              📜 계약 관리
              {(activeQuests.length > 0 || Object.keys(pendingAssign).some(k => (pendingAssign[k] ?? []).some(Boolean))) && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-sm font-extrabold flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}>
                  {activeQuests.length + Object.keys(pendingAssign).filter(k => (pendingAssign[k] ?? []).some(Boolean)).length}
                </span>
              )}
            </button>
            <button onClick={() => setShowMercModal(true)}
              className="rounded-xl px-3 py-2 text-sm font-bold text-white transition-all hover:brightness-115 active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#14532d,#166534)',
                border: '1px solid rgba(34,197,94,0.45)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                letterSpacing: '0.01em'
              }}>
              👥 용병 목록
            </button>
            <button onClick={() => setShowLogModal(true)}
              className="rounded-xl px-3 py-2 text-sm font-semibold transition-all hover:brightness-115 active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(180,170,150,0.85)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
              📋 전투 결과
            </button>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
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
          </div>
          {gateArrivals.length === 0 ? (
            <p className="text-center text-sm py-3" style={{ color: 'rgba(100,80,50,0.5)' }}>
              다음 도착: Day {nextArrivalDay}
            </p>
          ) : (
            gateArrivals.map((m) => (
              <div key={m.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: 'rgba(8,6,2,0.92)',
                  border: `1px solid ${m.grade === 'S' ? 'rgba(217,70,239,0.55)' : m.grade === 'A' ? 'rgba(251,191,36,0.5)' : 'rgba(160,90,20,0.35)'}`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: m.grade === 'S' ? '0 0 14px rgba(217,70,239,0.15)' : m.grade === 'A' ? '0 0 12px rgba(251,191,36,0.12)' : 'none'
                }}>
                <div className="flex items-center gap-2.5 cursor-pointer hover:brightness-110"
                  style={{ padding: '10px 14px' }}
                  onClick={() => setPreviewArrival(m)}>
                  <span className="text-2xl leading-none flex-shrink-0">{RACE_ICONS[m.race]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm font-bold text-white truncate max-w-[90px]">{m.name}</span>
                      <span className={`text-sm font-bold px-1 py-0.5 rounded text-white flex-shrink-0 ${gradeBg(m.grade)}`}>{GRADE_STARS[m.grade] ?? m.grade}</span>
                      <span className={`text-sm font-bold flex-shrink-0 ${ELEMENT_COLOR[m.element]}`}>{ELEMENT_ICON[m.element]}</span>
                    </div>
                    <p className="text-sm mt-0.5 truncate" style={{ color: 'rgba(140,110,70,0.85)' }}>{CLASS_ICONS[m.class]} {m.class} · {m.race}</p>
                    <div className="flex gap-2 text-sm mt-0.5">
                      <span className="text-cyan-300">⚔{m.power}</span>
                      {m.trap_disarm > 0 && <span className="text-purple-300">🔧{m.trap_disarm}</span>}
                      <span className="text-amber-300 ml-auto">{m.cost === 0 ? '무료' : `${m.cost}G`}</span>
                    </div>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className="text-sm font-bold rounded-lg px-2.5 py-1.5 text-white"
                      style={{ background: 'linear-gradient(135deg,rgba(180,100,20,0.7),rgba(251,146,60,0.5))', border: '1px solid rgba(251,146,60,0.35)' }}>
                      상세
                    </div>
                  </div>
                </div>
                <div className="flex border-t" style={{ borderColor: 'rgba(160,90,20,0.15)' }}>
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
                </div>
              </div>
            ))
          )}
          <p className="text-center text-sm" style={{ color: 'rgba(100,80,50,0.4)' }}>
            다음 도착: Day {nextArrivalDay}
          </p>
        </div>

        {/* ── Guild Building (right) ── */}
        <div className="absolute right-0 bottom-0 flex flex-col" style={{ width: '56%', height: '96%' }}>
          <p className="text-center text-sm font-bold uppercase tracking-widest mb-1 pointer-events-none"
            style={{ color: 'rgba(251,191,36,0.7)' }}>⚔ 용병단 길드 홀 Lv{buildings.hall} ⚔</p>
          {/* Battlements */}
          <div className="flex flex-shrink-0" style={{ height: 30 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                alignSelf: 'flex-end',
                height: i % 2 === 0 ? 30 : 16,
                background: i % 2 === 0 ? '#2d3748' : '#1f2937',
                borderTop: `2px solid ${i % 2 === 0 ? '#4a5568' : '#374151'}`
              }} />
            ))}
          </div>
          {/* Wall */}
          <div className="flex-1 relative overflow-hidden" style={{
            borderLeft: '3px solid #4a5568', borderRight: '3px solid #4a5568',
            background: 'linear-gradient(180deg,#1a2030 0%,#111827 60%,#0d1420 100%)'
          }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 50% 30%,rgba(200,110,20,0.15) 0%,transparent 70%)'
            }} />
            {/* Torches */}
            {[12, null, null, null, null, -12].map((pos, i) => pos !== null && (
              <div key={i} className="absolute pointer-events-none" style={{
                [pos > 0 ? 'left' : 'right']: Math.abs(pos), top: 10, width: 5, height: 12,
                background: 'linear-gradient(180deg,#fb923c,#92400e)', borderRadius: 2,
                boxShadow: '0 0 10px 5px rgba(251,146,60,0.3)'
              }} />
            ))}
            {/* Rooms grid in building: 2F top, 1F bottom */}
            <div className="relative z-10 flex flex-col gap-1 p-2 min-h-0" style={{ height: 'calc(100% - 50px)' }}>
              {/* 2F section */}
              <div className="flex flex-col flex-1 min-h-0 gap-1">
              <div className="text-sm font-bold px-1 flex-shrink-0" style={{ color: 'rgba(200,160,60,0.5)' }}>2F</div>
              <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                {(['길드마스터룸', '훈련소'] as const).map(room => {
                  const cap = maxHireCap(roomLevels['식당'] ?? 1)
                  const occupants = mercs.filter(m => m.room === room && m.status === '대기중')
                  const roomLv = roomLevels[room] ?? 1
                  const costs = ROOM_UPGRADE_COSTS[room]
                  const canUpgrade = roomLv < 3 && (room === '길드마스터룸' || roomLv < (roomLevels['길드마스터룸'] ?? 1))
                  const upgCost = canUpgrade && costs ? costs[roomLv - 1] : 0
                  return (
                    <div key={room} className="rounded-lg overflow-hidden flex flex-col min-h-0"
                      style={room === '길드마스터룸'
                        ? { background: 'rgba(20,15,40,0.88)', border: '2px solid rgba(120,80,220,0.45)', boxShadow: 'inset 0 0 20px rgba(100,60,200,0.1)' }
                        : { background: 'rgba(35,12,8,0.88)', border: '2px solid rgba(220,80,40,0.4)', boxShadow: 'inset 0 0 20px rgba(200,60,20,0.1)' }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const mid = e.dataTransfer.getData('roomMercId')
                        if (mid) updateMercRoom(mid, room)
                      }}>
                      <div className="flex flex-col px-1.5 pt-1 pb-0.5 flex-shrink-0"
                        style={room === '길드마스터룸'
                          ? { background: 'rgba(40,20,80,0.7)', borderBottom: '1px solid rgba(120,80,220,0.25)' }
                          : { background: 'rgba(60,15,8,0.7)', borderBottom: '1px solid rgba(220,80,40,0.25)' }}>
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
                      <div className="flex flex-wrap gap-1 p-1.5 content-start overflow-y-auto flex-1 min-h-0">
                        {occupants.slice(0, cap).map(m => {
                          const isSel = selectedMercId === m.id
                          const isPend = pendingMercIds.has(m.id)
                          return (
                            <div key={m.id} draggable
                              onDragStart={e => { e.dataTransfer.setData('roomMercId', m.id); e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                              onDragEnd={() => setDraggingMercId(null)}
                              onClick={() => setSelectedMercId(isSel ? null : m.id)}
                              role="button" tabIndex={0}
                              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-all select-none"
                              style={{
                                minWidth: 82, cursor: 'grab', opacity: draggingMercId === m.id ? 0.4 : 1,
                                background: isSel ? 'rgba(251,191,36,0.25)' : isPend ? 'rgba(99,102,241,0.2)' : 'rgba(15,12,8,0.7)',
                                border: `1px solid ${isSel ? 'rgba(251,191,36,0.7)' : isPend ? 'rgba(99,102,241,0.5)' : 'rgba(100,70,30,0.3)'}`,
                              }}>
                              <span className="text-2xl leading-none">{RACE_ICONS[m.race]}</span>
                              <p className="text-sm font-semibold text-slate-300 truncate max-w-[80px]">{m.name}</p>
                              <span className={`text-sm font-bold ${gradeText(m.grade)}`}>{GRADE_STARS[m.grade] ?? m.grade} Lv{m.level}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`text-sm font-semibold ${m.condition >= 70 ? 'text-emerald-400' : m.condition >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{m.condition}%</span>
                                <span className="text-sm">{favEmoji(m.favorability)}</span>
                              </div>
                            </div>
                          )
                        })}
                        {occupants.length > cap && (
                          <p className="text-sm text-slate-600 p-1">+{occupants.length - cap}명 대기</p>
                        )}
                        {occupants.length === 0 && (
                          <p className="text-sm italic p-1" style={{ color: 'rgba(100,80,50,0.4)' }}>드래그하여 배치</p>
                        )}
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
                const hireCap = maxHireCap(roomLv)
                return (
                  <div className="rounded-lg overflow-hidden flex flex-col flex-1 min-h-0"
                    style={{ background: 'rgba(8,25,15,0.88)', border: '2px solid rgba(40,180,80,0.4)', boxShadow: 'inset 0 0 20px rgba(20,160,60,0.08)' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const mid = e.dataTransfer.getData('roomMercId')
                      if (mid) updateMercRoom(mid, room)
                    }}>
                    <div className="flex flex-col px-1.5 pt-1 pb-0.5 flex-shrink-0"
                      style={{ background: 'rgba(8,40,20,0.7)', borderBottom: '1px solid rgba(40,180,80,0.2)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: 'rgba(80,220,120,0.9)' }}>
                          {ROOM_EFFECTS[room].icon} {room}
                          <span className="ml-1 text-sm text-slate-500">Lv{roomLv}</span>
                          <span className="ml-1 text-sm" style={{ color: 'rgba(120,180,120,0.6)' }}>{mercs.length}/{hireCap}명</span>
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
                            onDragEnd={() => setDraggingMercId(null)}
                            onClick={() => setSelectedMercId(isSel ? null : m.id)}
                            role="button" tabIndex={0}
                            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-all select-none"
                            style={{
                              minWidth: 82, cursor: 'grab', opacity: draggingMercId === m.id ? 0.4 : 1,
                              background: isSel ? 'rgba(251,191,36,0.25)' : isPend ? 'rgba(99,102,241,0.2)' : 'rgba(15,12,8,0.7)',
                              border: `1px solid ${isSel ? 'rgba(251,191,36,0.7)' : isPend ? 'rgba(99,102,241,0.5)' : 'rgba(100,70,30,0.3)'}`,
                            }}>
                            <span className="text-2xl leading-none">{RACE_ICONS[m.race]}</span>
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
            {/* Gate */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
              width: 50, height: 46, background: '#08080f', borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              border: '3px solid #4a5568', borderBottom: 'none'
            }} />
          </div>
          <div className="flex-shrink-0" style={{
            height: 18, background: '#1a2030',
            borderLeft: '3px solid #4a5568', borderRight: '3px solid #4a5568', borderBottom: '3px solid #374151'
          }} />
        </div>
      </div>

      {/* ── Arrival Preview Modal ─────────────── */}
      {previewArrival && (() => {
        const m = previewArrival
        const canHire = mercs.length < maxHireCap(roomLevels['식당'] ?? 1) && state.gold >= m.cost
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
                <span className="text-5xl leading-none">{RACE_ICONS[m.race]}</span>
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
                  {mercs.length >= maxHireCap(roomLevels['식당'] ?? 1) ? '식당 용량 초과 — 식당을 업그레이드하세요' : `골드 부족 (보유 ${state.gold}G)`}
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

      {/* ── Quest Modal (left-side panel) ─────────────── */}
      {showQuestModal && (
        <div className="fixed left-0 top-0 bottom-0 z-30 flex flex-col overflow-hidden"
          style={{ width: '46%', background: 'rgba(5,5,15,0.97)', borderRight: '2px solid rgba(59,130,246,0.4)' }}>
          {/* 고정 헤더 - 스크롤과 무관하게 항상 표시 */}
          <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(59,130,246,0.2)', background: 'rgba(5,5,15,0.98)' }}>
            <h2 className="text-base font-bold text-white">📜 계약 관리</h2>
            <div className="flex items-center gap-2">
              {(['quests', 'buildings'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="text-sm font-bold rounded-lg px-3 py-1.5 transition-all"
                  style={activeTab === tab ? {
                    background: tab === 'quests' ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.25)',
                    color: tab === 'quests' ? '#93c5fd' : '#6ee7b7',
                    border: `1px solid ${tab === 'quests' ? 'rgba(59,130,246,0.5)' : 'rgba(16,185,129,0.5)'}`,
                    boxShadow: `0 0 8px ${tab === 'quests' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}`
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(140,140,140,0.6)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                  {tab === 'quests' ? '📜 계약' : '🏗 건물'}
                </button>
              ))}
              <button onClick={() => setShowQuestModal(false)}
                className="rounded-lg px-2.5 py-1 text-sm font-bold transition hover:brightness-110"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: 'rgba(252,165,165,0.9)' }}>
                ✕ 닫기
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1 min-h-0">

            {activeTab === 'quests' && (
              <div className="space-y-3">
                {/* ── 진행 중 quests ── */}
                {activeQuests.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-2 px-1 py-0.5 rounded"
                      style={{ color: '#38bdf8', background: 'rgba(14,165,233,0.1)', display: 'inline-block' }}>
                      ⚔ 진행 중 {activeQuests.length}건
                    </p>
                    <div className="space-y-2">
                      {activeQuests.map(aq => {
                        const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
                        const elapsed = Math.max(0, aq.durationMs - Math.max(0, aq.completesAt - tickTime))
                        const pct = Math.min(100, (elapsed / aq.durationMs) * 100)
                        return (
                          <div key={aq.questId} className="rounded-xl p-3"
                            style={{ background: 'rgba(14,165,233,0.1)', border: '2px solid rgba(14,165,233,0.4)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${ELEMENT_COLOR[quest.element]}`}>{ELEMENT_ICON[quest.element]}</span>
                                <p className="text-sm font-bold text-white">{quest.name}</p>
                                {quest.trapFocus && <span className="text-sm text-purple-300">🔧함정</span>}
                              </div>
                              <span className="text-sm font-bold text-sky-300">⏱ {formatTimeLeft(aq.completesAt)}</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0ea5e9,#38bdf8)' }} />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {aq.assignedMercIds.map(mid => {
                                const m = mercs.find(x => x.id === mid)
                                if (!m) return null
                                return (
                                  <span key={mid} className="text-sm rounded-full px-2 py-0.5 text-white flex items-center gap-1"
                                    style={{ background: 'rgba(14,165,233,0.3)', border: '1px solid rgba(14,165,233,0.5)' }}>
                                    {RACE_ICONS[m.race]} {m.name}
                                    <span className={ELEMENT_COLOR[m.element]}>{ELEMENT_ICON[m.element]}</span>
                                    <span style={{ color: 'rgba(150,220,255,0.7)' }}>{m.condition}%</span>
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── 수주 가능 quests ── */}
                <div>
                  <p className="text-sm font-bold mb-2 px-1 py-0.5 rounded"
                    style={{ color: 'rgba(200,160,60,0.9)', background: 'rgba(180,100,20,0.15)', display: 'inline-block' }}>
                    📋 수주 가능 {questPool.filter(id => !activeQuests.some(aq => aq.questId === id)).length}건
                  </p>
                  {/* 배치할 용병 선택 피커 */}
                  <div className="rounded-xl p-2 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm text-slate-500 mb-1.5">배치할 용병 (클릭 선택 후 슬롯 클릭 또는 드래그)</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {mercs.filter(m => m.status === '대기중' && !deployedMercIds.has(m.id)).map(m => (
                        <div key={m.id}
                          draggable
                          onDragStart={e => { e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                          onDragEnd={() => setDraggingMercId(null)}
                          onClick={() => setSelectedMercId(selectedMercId === m.id ? null : m.id)}
                          className="rounded-lg px-2 py-1 cursor-pointer transition-all select-none"
                          style={{
                            background: selectedMercId === m.id ? 'rgba(251,191,36,0.2)' : pendingMercIds.has(m.id) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${selectedMercId === m.id ? 'rgba(251,191,36,0.6)' : pendingMercIds.has(m.id) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            opacity: draggingMercId === m.id ? 0.4 : 1
                          }}>
                          <span className="text-sm text-white">{RACE_ICONS[m.race]} {CLASS_ICONS[m.class]} {m.name}</span>
                          <span className={`text-sm ml-1 font-bold ${gradeText(m.grade)}`}>{GRADE_STARS[m.grade] ?? m.grade}</span>
                          <span className={`text-sm ml-0.5 ${ELEMENT_COLOR[m.element]}`}>{ELEMENT_ICON[m.element]}</span>
                          {pendingMercIds.has(m.id) && <span className="text-sm ml-1 text-indigo-300">배치됨</span>}
                        </div>
                      ))}
                      {mercs.filter(m => m.status === '대기중' && !deployedMercIds.has(m.id)).length === 0 && (
                        <p className="text-sm text-slate-600 py-1">배치 가능한 용병 없음</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {questPool
                      .map(id => ALL_QUESTS.find(q => q.id === id))
                      .filter((q): q is typeof ALL_QUESTS[0] => !!q && !activeQuests.some(aq => aq.questId === q.id))
                      .map(quest => {
                        const assigned = pendingAssign[quest.id] ?? []
                        const filledSlots = assigned.filter(Boolean)
                        const canLaunch = filledSlots.length >= 1
                        const totalAssignedEff = filledSlots.map(id => mercs.find(m => m.id === id)).filter(Boolean).reduce((s, m) => s + effPower(m!), 0)
                        const powerRatio = Math.min(1, totalAssignedEff / quest.difficulty)
                        const successRate = filledSlots.length > 0 ? calcSuccessRate(quest, filledSlots, mercs) : 0
                        const hasPending = filledSlots.length > 0
                        return (
                          <div key={quest.id} className="rounded-xl overflow-hidden"
                            style={{
                              background: hasPending ? 'rgba(251,191,36,0.07)' : 'rgba(10,8,4,0.65)',
                              border: `1px solid ${hasPending ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.07)'}`,
                              boxShadow: hasPending ? '0 0 12px rgba(251,191,36,0.08)' : 'none'
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
                            {/* Quest header strip */}
                            <div className="px-4 pt-3 pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-sm ${ELEMENT_COLOR[quest.element]}`}>{ELEMENT_ICON[quest.element]}</span>
                                <p className="text-sm font-bold text-white">{quest.name}</p>
                                {quest.trapFocus && (
                                  <span className="text-sm font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(147,51,234,0.2)', color: '#c4b5fd', border: '1px solid rgba(147,51,234,0.3)' }}>🔧 함정</span>
                                )}
                                <span className="text-sm rounded-full px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(140,140,140,0.7)' }}>
                                  전력 {quest.difficulty}
                                </span>
                                <span className="text-sm rounded-full px-1.5 py-0.5" style={{ background: 'rgba(14,165,233,0.1)', color: 'rgba(125,211,252,0.8)' }}>
                                  ⏱ {quest.duration}일
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: 'rgba(140,130,110,0.7)' }}>{quest.description}</p>
                            </div>
                            {/* Reward row */}
                            <div className="flex gap-1.5 text-sm px-3 py-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>+{quest.reward.gold}G</span>
                              <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac' }}>+{quest.reward.food}🌾</span>
                              <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(217,70,239,0.1)', color: '#e879f9' }}>+{quest.reward.fame}⭐</span>
                              <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(14,165,233,0.1)', color: '#7dd3fc' }}>+{quest.reward.exp}XP</span>
                              <span className="rounded px-1.5 py-0.5 ml-auto font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>☠ {Math.round(quest.deathRisk * 100)}%</span>
                            </div>
                            <div className="px-3 pt-2">
                            {/* Wage preview */}
                            {filledSlots.length > 0 && (() => {
                              const wageCost = filledSlots.reduce((s, id) => {
                                const m = mercs.find(x => x.id === id)
                                return s + (m ? (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration : 0)
                              }, 0)
                              const net = quest.reward.gold - wageCost
                              return (
                                <div className="flex gap-2 text-sm mb-2">
                                  <span className="text-orange-400">급여 -{wageCost}G</span>
                                  <span className={net >= 0 ? 'text-emerald-400' : 'text-red-400'}>순이익 {net >= 0 ? '+' : ''}{net}G</span>
                                </div>
                              )
                            })()}
                            {/* Power bar */}
                            <div className="mb-2">
                              <div className="flex justify-between text-sm mb-0.5" style={{ color: 'rgba(120,120,120,0.6)' }}>
                                <span>배치 전력 {totalAssignedEff} / 요구 {quest.difficulty}</span>
                                <span>{Math.round(powerRatio * 100)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${powerRatio * 100}%`,
                                  background: powerRatio >= 0.9 ? '#22c55e' : powerRatio >= 0.6 ? '#f59e0b' : '#ef4444'
                                }} />
                              </div>
                            </div>
                            {/* Success rate */}
                            {filledSlots.length > 0 && (
                              <div className="mb-2">
                                <div className="flex justify-between text-sm mb-0.5">
                                  <span style={{ color: 'rgba(120,120,120,0.6)' }}>성공률</span>
                                  <span className="font-bold" style={{ color: successRate >= 70 ? '#86efac' : successRate >= 45 ? '#fcd34d' : '#fca5a5' }}>{successRate}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                  <div className="h-full rounded-full transition-all" style={{
                                    width: `${successRate}%`,
                                    background: successRate >= 70 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : successRate >= 45 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)'
                                  }} />
                                </div>
                              </div>
                            )}
                            {/* Small party warning */}
                            {filledSlots.length > 0 && filledSlots.length < 3 && (
                              <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 mb-2 text-sm"
                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.9)' }}>
                                ⚠ 소규모 파티! 성공해도 사망 위험 증가
                              </div>
                            )}
                            {/* Slots */}
                            <div className="flex gap-1.5 mb-2 flex-wrap">
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
                                    className="rounded-lg cursor-pointer transition-all flex flex-col gap-0.5 flex-shrink-0"
                                    style={{
                                      padding: '4px 6px', minWidth: 80, maxWidth: 110,
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
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => launchQuest(quest.id)} disabled={!canLaunch}
                                className="flex-1 rounded-lg py-2 text-sm font-extrabold transition-all"
                                style={{
                                  background: canLaunch ? 'linear-gradient(135deg,#92400e,#d97706)' : 'rgba(255,255,255,0.04)',
                                  color: canLaunch ? 'white' : 'rgba(100,100,100,0.4)',
                                  border: `1px solid ${canLaunch ? 'rgba(251,146,60,0.5)' : 'rgba(255,255,255,0.04)'}`,
                                  boxShadow: canLaunch ? '0 0 10px rgba(251,146,60,0.2)' : 'none',
                                  cursor: canLaunch ? 'pointer' : 'not-allowed',
                                  letterSpacing: canLaunch ? '0.03em' : undefined
                                }}>
                                {filledSlots.length === 0 ? '⚔ 용병 배치 후 파견' : '⚔ 파견하기'}
                              </button>
                              {assigned.some(Boolean) && (
                                <button onClick={() => cancelPending(quest.id)}
                                  className="rounded-lg px-3 py-2 text-sm transition hover:text-white"
                                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(130,130,130,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  초기화
                                </button>
                              )}
                            </div>
                            </div>{/* end px-3 pt-2 */}
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'buildings' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">건물을 건설·업그레이드하여 길드를 강화하세요.</p>
                {(Object.keys(BUILDING_INFO) as Array<keyof typeof BUILDING_INFO>).map(id => {
                  const info = BUILDING_INFO[id]
                  const currentLv = buildings[id]
                  const isBuilt = currentLv > 0
                  const atMax = currentLv >= info.maxLevel
                  const cost = isBuilt ? upgradeCost(id, currentLv) : info.buildCost
                  const canAfford = state.gold >= cost
                  return (
                    <div key={id} className="rounded-xl overflow-hidden" style={{
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
                            className="rounded-lg px-3 py-1.5 text-sm font-bold transition flex-shrink-0"
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
          <div className="w-full max-w-3xl rounded-2xl flex flex-col gap-3 p-4"
            style={{ background: '#0d0d1a', border: '1px solid rgba(34,197,94,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
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
                      onDragStart={e => { e.dataTransfer.setData('mercId', m.id); setDraggingMercId(m.id); setSelectedMercId(m.id) }}
                      onDragEnd={() => setDraggingMercId(null)}
                    />
                  )
                })}
              </div>
              {/* 용병 상세 */}
              <div>
                {selectedMercDetail ? (
                  <div className="rounded-xl overflow-hidden sticky top-0" style={{ background: 'rgba(10,8,18,0.95)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    {/* Header */}
                    <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: ELEMENT_BG[selectedMercDetail.element], border: '1px solid rgba(255,255,255,0.1)' }}>
                          <span className="text-2xl leading-none">{RACE_ICONS[selectedMercDetail.race]}</span>
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
                        { l: '미션 급여', v: `${MISSION_PAY_PER_DAY[selectedMercDetail.grade] ?? 15}G/일`, c: 'text-amber-300', bold: false },
                        { l: '사망 보상금', v: `${selectedMercDetail.deathCost}G`, c: 'text-red-400', bold: false },
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
                    {/* 무기 섹션 */}
                    {(() => {
                      const cur = weaponOf(selectedMercDetail)
                      const next = cur && cur.tier < 3 ? WEAPONS.find(w => w.class === cur.class && w.tier === (cur.tier + 1) as 1|2|3) : null
                      const canUpgrade = cur && cur.tier < 3 && cur.upgradeCost > 0 && state.gold >= cur.upgradeCost
                      return (
                        <div className="mt-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-sm text-slate-500 mb-1.5">장착 무기</p>
                          {cur ? (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-white">{cur.icon} {cur.name} <span className="text-sm text-slate-500">Tier{cur.tier}</span></span>
                                <div className="flex gap-1 text-sm">
                                  {cur.atkBonus > 0 && <span className="text-red-300">공+{cur.atkBonus}</span>}
                                  {cur.trapBonus > 0 && <span className="text-purple-300">함+{cur.trapBonus}</span>}
                                  {cur.survBonus > 0 && <span className="text-emerald-300">생+{cur.survBonus}</span>}
                                  {(cur.raceBonus[selectedMercDetail.race] ?? 0) > 0 && <span className="text-amber-300">종족+{cur.raceBonus[selectedMercDetail.race]}</span>}
                                </div>
                              </div>
                              {next && (
                                <div className="text-sm text-slate-600 mb-1.5">다음: {next.icon} {next.name} (Tier{next.tier})</div>
                              )}
                              {cur.tier < 3 ? (
                                <button
                                  onClick={() => upgradeWeapon(selectedMercDetail)}
                                  disabled={!canUpgrade}
                                  className="w-full rounded-lg py-1 text-sm font-bold transition"
                                  style={{
                                    background: canUpgrade ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'rgba(255,255,255,0.04)',
                                    color: canUpgrade ? 'white' : 'rgba(100,100,100,0.5)',
                                    border: `1px solid ${canUpgrade ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.05)'}`,
                                    cursor: canUpgrade ? 'pointer' : 'not-allowed'
                                  }}>
                                  {canUpgrade ? `업그레이드 ${cur.upgradeCost}G` : state.gold < cur.upgradeCost ? `금화 부족 (${cur.upgradeCost}G)` : '최고 등급'}
                                </button>
                              ) : (
                                <div className="text-center text-sm text-amber-400 py-0.5">최고 등급 무기</div>
                              )}
                            </>
                          ) : <span className="text-sm text-slate-600">무기 없음</span>}
                        </div>
                      )
                    })()}
                    <div className="mt-3">
                      <StatRadar mercenary={selectedMercDetail} />
                    </div>
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
                      { l: '다음 도착', v: `Day ${nextArrivalDay}`, c: 'text-slate-300' },
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

      {/* ── Log Modal ──────────────────────────────────── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16 overflow-y-auto"
          onClick={() => setShowLogModal(false)}>
          <div className="w-full max-w-lg rounded-2xl flex flex-col gap-3 p-4"
            style={{ background: '#0d0d1a', border: '1px solid rgba(251,146,60,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">📋 전투 결과 로그</h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white text-lg leading-none px-2">×</button>
            </div>
            <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 560 }}>
              {[...questLog].reverse().map((entry, i) => (
                <p key={i} className="rounded-lg px-3 py-2 text-sm leading-relaxed"
                  style={{
                    background: i === 0 ? 'rgba(180,100,20,0.12)' : 'rgba(255,255,255,0.02)',
                    color: entry.startsWith('✅') ? 'rgba(134,239,172,0.95)' :
                      entry.startsWith('❌') ? 'rgba(252,165,165,0.95)' :
                      entry.startsWith('💀') ? 'rgba(239,68,68,0.95)' :
                      entry.startsWith('⬆') ? 'rgba(251,191,36,0.95)' :
                      entry.startsWith('🚶') ? 'rgba(134,239,172,0.8)' :
                      i === 0 ? 'rgba(230,180,80,0.9)' : 'rgba(160,160,160,0.75)'
                  }}>
                  {entry}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

export default App
