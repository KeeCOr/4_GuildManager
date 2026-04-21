import type { Quest } from '../types'

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
