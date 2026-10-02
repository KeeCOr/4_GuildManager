import type { Quest } from '../types'

// 급여 기준 (MISSION_PAY_PER_DAY): D=4, C=10, B=45, A=90, S=160
// 보상 설계 원칙: 시간 비례(~10G/분), 최대 1,400G 상한
// duration 1→5분, 2→15분, 3→30분, 4→60분, 5→90분, 6→120분, 7→180분, 8→240분
export const ALL_QUESTS: Quest[] = [
  // ── Tier 1 (difficulty ≤ 120) — D~C급 ────────────────────────────────────
  {
    id: 'q20', name: '길드 심부름', difficulty: 18, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.00, conditionDrain: 2, dailyGoldCost: 0, element: '자연', trapFocus: false,
    description: '인근 길드에 서류를 전달합니다. 누구나 할 수 있는 가벼운 심부름.',
    reward: { gold: 18, fame: 1, exp: 7 }
  },
  {
    id: 'q21', name: '약초 수집', difficulty: 35, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.01, conditionDrain: 3, dailyGoldCost: 1, element: '자연', trapFocus: false,
    description: '마을 약재상 의뢰로 근교 숲에서 약초를 수집합니다.',
    reward: { gold: 28, fame: 2, exp: 11 }
  },
  {
    id: 'q1', name: '쥐 사냥', difficulty: 30, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.01, conditionDrain: 8, dailyGoldCost: 1, element: '자연', trapFocus: false,
    description: '마을 창고를 침입한 쥐 떼를 제거합니다. 초보에게 적합.',
    reward: { gold: 32, fame: 2, exp: 14 }
  },
  {
    id: 'q11', name: '마을 치유 봉사', difficulty: 55, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.01, conditionDrain: 5, dailyGoldCost: 1, element: '빛', trapFocus: false,
    description: '역병이 도는 마을에서 부상자를 치료합니다. 성직자가 있으면 효율이 크게 높아집니다.',
    reward: { gold: 40, fame: 3, exp: 16 }
  },
  {
    id: 'q22', name: '불량배 제압', difficulty: 68, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.02, conditionDrain: 7, dailyGoldCost: 2, element: '암흑', trapFocus: false,
    description: '시장 근처를 어슬렁대는 불량배들을 쫓아냅니다.',
    reward: { gold: 44, fame: 3, exp: 16 }
  },
  {
    id: 'q23', name: '유령 퇴치', difficulty: 82, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.02, conditionDrain: 6, dailyGoldCost: 2, element: '빛', trapFocus: false,
    description: '폐가에 출몰하는 유령을 퇴치합니다. 빛 속성 용병이 유리합니다.',
    reward: { gold: 50, fame: 3, exp: 18 }
  },
  {
    id: 'q24', name: '광부 구조', difficulty: 105, slots: 4, minSlots: 1, duration: 1,
    deathRisk: 0.03, conditionDrain: 10, dailyGoldCost: 2, element: '불', trapFocus: true,
    description: '붕괴 사고가 난 광산에서 매몰 광부를 구출합니다. 함정 해제 능력이 도움이 됩니다.',
    reward: { gold: 58, fame: 4, exp: 22 }
  },
  {
    id: 'q2', name: '야간 경비', difficulty: 50, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.02, conditionDrain: 10, dailyGoldCost: 2, element: '암흑', trapFocus: false,
    description: '마을 외곽 야간 순찰 및 경비 임무입니다.',
    reward: { gold: 88, fame: 4, exp: 22 },
    chainId: 'dark', chainName: '어둠의 각성',
    storyAfter: {
      title: '1장 — 그림자',
      lines: [
        '순찰을 마치고 귀환하던 용병들은 발걸음을 멈췄다.',
        '사람의 것이 아닌 발자국이 진흙 위에 선명하게 남아있었다.',
        '\"이건... 마수의 흔적이 아니야.\"',
        '어둠 속에서 기이한 기척이 느껴졌다. 무언가가 이 마을을 지켜보고 있다.',
      ]
    }
  },
  {
    id: 'q3', name: '상인 호위', difficulty: 85, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.04, conditionDrain: 12, dailyGoldCost: 4, element: '자연', trapFocus: false,
    description: '인근 도시까지 상인 일행을 호위합니다.',
    reward: { gold: 120, fame: 6, exp: 32 },
    chainId: 'shadow', chainName: '밀수의 그림자',
    storyAfter: {
      title: '1장 — 숨겨진 의뢰',
      lines: [
        '무사히 도시에 도착한 뒤, 상인이 조용히 다가왔다.',
        '\"사실은... 밀수단에 쫓기고 있소. 왕국 물자를 횡령하는 자들이오.\"',
        '\"그들의 창고가 이 근방에 있다는 정보를 입수했소. 도와줄 수 있겠소?\"',
        '새로운 의뢰가 열렸다 — [밀수단 추적]',
      ]
    }
  },
  {
    id: 'q12', name: '얼음 동굴 수색', difficulty: 90, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.03, conditionDrain: 14, dailyGoldCost: 3, element: '얼음', trapFocus: false,
    description: '마을 근처 얼음 동굴에서 실종자를 수색합니다. 혹한 환경으로 생존율 관리가 중요합니다.',
    reward: { gold: 115, fame: 5, exp: 30 },
    chainId: 'ice', chainName: '얼음 아래의 비밀',
    storyAfter: {
      title: '1장 — 고대의 각인',
      lines: [
        '실종자 대신, 동굴 깊숙한 벽면에 새겨진 고대 문양을 발견했다.',
        '수천 년은 된 것으로 보이는 그 각인에서 희미한 기운이 느껴졌다.',
        '\"이건 용의 언어야. 봉인 문자다...\"',
        '무언가가 이 얼음 아래에서 잠을 깨려 하고 있다.',
        '새로운 의뢰가 열렸다 — [설원 요새 탈환]',
      ]
    }
  },

  // ── Tier 2 (difficulty 121~220) — C~B급 ──────────────────────────────────
  {
    id: 'q13', name: '독숲 정찰', difficulty: 145, slots: 4, minSlots: 1, duration: 2,
    deathRisk: 0.06, conditionDrain: 18, dailyGoldCost: 6, element: '자연', trapFocus: true,
    description: '독가스와 함정이 가득한 마법 숲을 정찰합니다. 도적의 함정해제가 시너지를 이룹니다.',
    reward: { gold: 155, fame: 7, exp: 44 },
    chainId: 'dark', chainName: '어둠의 각성',
    requiredQuestId: 'q2',
    storyAfter: {
      title: '2장 — 인위적인 독',
      lines: [
        '숲의 독은 자연이 아니었다.',
        '용병들은 정교하게 배치된 독 주머니와 기이한 제단을 발견했다.',
        '\"누군가 의도적으로 이 숲을 오염시켰어. 그리고 최근에.\"',
        '흔적을 따라가자 오래된 던전의 입구가 모습을 드러냈다.',
        '새로운 의뢰가 열렸다 — [던전 탐사]',
      ]
    }
  },
  {
    id: 'q4', name: '도둑단 소탕', difficulty: 150, slots: 4, minSlots: 2, duration: 3,
    deathRisk: 0.08, conditionDrain: 18, dailyGoldCost: 7, element: '불', trapFocus: false,
    description: '주변을 위협하는 도둑단을 소탕합니다. C급 이상 권장.',
    reward: { gold: 230, fame: 11, exp: 52 }
  },
  {
    id: 'q5', name: '광산 함정 해제', difficulty: 180, slots: 4, minSlots: 2, duration: 3,
    deathRisk: 0.10, conditionDrain: 20, dailyGoldCost: 9, element: '암흑', trapFocus: true,
    description: '버려진 광산에서 함정을 해제하고 자원을 회수합니다. 도적·함정해제 권장.',
    reward: { gold: 260, fame: 13, exp: 62 }
  },
  {
    id: 'q14', name: '자연 정령 포획', difficulty: 185, slots: 4, minSlots: 2, duration: 3,
    deathRisk: 0.08, conditionDrain: 18, dailyGoldCost: 8, element: '자연', trapFocus: false,
    description: '폭주하는 자연 정령을 포획해 마법사 조합에 납품합니다.',
    reward: { gold: 245, fame: 11, exp: 58 }
  },

  // ── Tier 3 (difficulty 221~360) — B급 ────────────────────────────────────
  {
    id: 'q15', name: '설원 요새 탈환', difficulty: 245, slots: 4, minSlots: 2, duration: 4,
    deathRisk: 0.10, conditionDrain: 24, dailyGoldCost: 10, element: '얼음', trapFocus: false,
    description: '얼음 마족에게 점령된 요새를 탈환합니다. 성직자의 회복 지원이 핵심입니다.',
    reward: { gold: 480, fame: 17, exp: 80 },
    chainId: 'ice', chainName: '얼음 아래의 비밀',
    requiredQuestId: 'q12',
    storyAfter: {
      title: '2장 — 봉인된 제단',
      lines: [
        '요새를 탈환한 용병들은 지하 깊은 곳에서 제단을 발견했다.',
        '얼음 마족들이 지키던 것은 바로 이것이었다.',
        '제단에는 고룡의 각인이, 그리고 균열이 가는 봉인석이 놓여있었다.',
        '\"서둘러야 해. 봉인이 깨지기 전에 원정을 보내야 한다.\"',
        '새로운 의뢰가 열렸다 — [빙원 극지 원정]',
      ]
    }
  },
  {
    id: 'q6', name: '밀수단 추적', difficulty: 260, slots: 4, minSlots: 2, duration: 4,
    deathRisk: 0.12, conditionDrain: 22, dailyGoldCost: 11, element: '암흑', trapFocus: false,
    description: '왕국 물자를 횡령한 밀수단을 추적 체포합니다. B급 이상 권장.',
    reward: { gold: 520, fame: 19, exp: 84 },
    chainId: 'shadow', chainName: '밀수의 그림자',
    requiredQuestId: 'q3',
    storyAfter: {
      title: '2장 — 왕실의 그림자',
      lines: [
        '창고를 급습한 용병들은 예상치 못한 것을 발견했다.',
        '물자 목록 사이에 왕실 인장이 찍힌 비밀 서류가 숨겨져 있었다.',
        '\"이건... 왕의 측근이 관련된 거야. 이 서류를 함부로 꺼내면 우리 목숨이 위험해.\"',
        '진실은 예상보다 훨씬 깊은 곳에 있었다.',
        '길드의 명성이 크게 높아졌다. +50 명성 (특별 보상)',
      ]
    }
  },
  {
    id: 'q16', name: '성소 수호 임무', difficulty: 285, slots: 4, minSlots: 2, duration: 4,
    deathRisk: 0.09, conditionDrain: 16, dailyGoldCost: 12, element: '빛', trapFocus: false,
    description: '어둠의 세력이 침범하는 성소에서 사제들을 수호합니다. 성직자의 빛 속성이 큰 우위를 가져옵니다.',
    reward: { gold: 560, fame: 21, exp: 90 }
  },
  {
    id: 'q7', name: '귀족 저택 장기 경비', difficulty: 300, slots: 4, minSlots: 2, duration: 5,
    deathRisk: 0.08, conditionDrain: 15, dailyGoldCost: 13, element: '빛', trapFocus: false,
    description: '귀족 저택에서 장기 경비 임무를 수행합니다. B급 이상 권장.',
    reward: { gold: 700, fame: 26, exp: 98 }
  },

  // ── Tier 4 (difficulty 361~580) — A급 ────────────────────────────────────
  {
    id: 'q17', name: '마법사 탑 잠입', difficulty: 390, slots: 4, minSlots: 2, duration: 5,
    deathRisk: 0.15, conditionDrain: 26, dailyGoldCost: 16, element: '암흑', trapFocus: true,
    description: '마법 함정이 가득한 탑에 잠입해 금지된 마법서를 회수합니다. 마법사와 도적의 조합이 이상적입니다.',
    reward: { gold: 850, fame: 34, exp: 138 }
  },
  {
    id: 'q9', name: '북방 약탈자 토벌', difficulty: 520, slots: 4, minSlots: 3, duration: 5,
    deathRisk: 0.18, conditionDrain: 25, dailyGoldCost: 18, element: '얼음', trapFocus: false,
    description: '북방 대규모 약탈자 집단을 격멸합니다. A급 이상 권장.',
    reward: { gold: 920, fame: 52, exp: 175 }
  },
  {
    id: 'q8', name: '던전 탐사', difficulty: 420, slots: 4, minSlots: 3, duration: 6,
    deathRisk: 0.20, conditionDrain: 28, dailyGoldCost: 18, element: '암흑', trapFocus: true,
    description: '심층 던전에서 유물을 회수합니다. A급 이상 권장. 함정해제 필수.',
    reward: { gold: 1050, fame: 40, exp: 155 },
    chainId: 'dark', chainName: '어둠의 각성',
    requiredQuestId: 'q13',
    storyAfter: {
      title: '3장 — 각성',
      lines: [
        '던전의 심층. 용병들은 마침내 그 실체와 마주했다.',
        '고대 마족의 사령관 — 수천 년 전 봉인된 존재가 깨어나고 있었다.',
        '\"이것은 끝이 아니다. 봉인석은 셋이다.\"',
        '사령관은 마지막 숨에 그 말을 남기고 사라졌다.',
        '어둠의 각성 — 완료. 길드의 전설이 시작된다.',
      ]
    }
  },
  {
    id: 'q18', name: '빙원 극지 원정', difficulty: 490, slots: 4, minSlots: 3, duration: 6,
    deathRisk: 0.16, conditionDrain: 32, dailyGoldCost: 20, element: '얼음', trapFocus: false,
    description: '극지방 빙원을 원정하며 고대 유물을 수습합니다. 성직자 치유와 전사 방어가 필수입니다.',
    reward: { gold: 1100, fame: 47, exp: 168 },
    chainId: 'ice', chainName: '얼음 아래의 비밀',
    requiredQuestId: 'q15',
    storyAfter: {
      title: '3장 — 잠든 자',
      lines: [
        '극지의 심장부. 끝없는 설원 아래, 거대한 공동이 존재했다.',
        '그 중심에 — 수천 년을 잠들어온 고룡의 알이 금빛으로 빛나고 있었다.',
        '\"이게 깨어나면... 이 대륙은 끝이야.\"',
        '용병들은 알을 봉인하는 마지막 의식을 수행했다.',
        '얼음 아래의 비밀 — 완료. 대륙의 운명이 당신의 손에 달려있었다.',
      ]
    }
  },

  // ── Tier 5 (difficulty 580+) — S급 ────────────────────────────────────────
  {
    id: 'q10', name: '드래곤 토벌', difficulty: 700, slots: 4, minSlots: 4, duration: 8,
    deathRisk: 0.35, conditionDrain: 40, dailyGoldCost: 30, element: '불', trapFocus: false,
    description: '대륙 최강 드래곤을 토벌합니다. S급 필요. 극고위험.',
    reward: { gold: 1400, fame: 125, exp: 330 }
  },
]
