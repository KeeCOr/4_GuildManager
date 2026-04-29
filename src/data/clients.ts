// src/data/clients.ts
import type { Client } from '../types'

export const ALL_CLIENTS: Client[] = [
  { id: 'merchant', name: '상인 연합',  faction: 'merchant', icon: '🪙',  description: '아이언홀드 주요 무역로를 관리하는 상인 길드.', questBonus: 15 },
  { id: 'noble',    name: '귀족 가문',  faction: 'noble',    icon: '⚜️', description: '도시 북쪽 저택가의 귀족 연합.',                   questBonus: 12 },
  { id: 'church',   name: '성광 교단',  faction: 'church',   icon: '🕊️', description: '빛의 신을 섬기는 교단.',                          questBonus: 10 },
  { id: 'military', name: '왕국 군부',  faction: 'military', icon: '🛡',  description: '왕국 북방 수비대. 대규모 토벌 의뢰.',              questBonus: 20 },
  { id: 'mage',     name: '마법사 탑',  faction: 'mage',     icon: '🔮',  description: '고대 유물과 마법 연구를 후원하는 마법사 조합.',    questBonus: 18 },
  { id: 'rogue',    name: '그림자 길드',faction: 'rogue',    icon: '🗡️', description: '표면 아래에서 암약하는 정보 조직.',                questBonus: 22 },
  { id: 'guild',    name: '용병 조합',  faction: 'merchant', icon: '📜',  description: '길드 내부 훈련·교류 의뢰.',                       questBonus: 8  },
]

export const getClient = (id: string): Client | undefined =>
  ALL_CLIENTS.find(c => c.id === id)

/** 관계도에 따른 금화 보너스 배율 (0.0~0.xx) */
export function clientGoldBonus(relation: number, questBonus: number): number {
  if (relation >= 80) return questBonus / 100
  return 0
}

/** 관계도에 따른 명성 패널티 배율 */
export function clientFamePenaltyMult(relation: number): number {
  if (relation <= 20) return 1.5
  if (relation >= 80) return 0.7
  return 1.0
}

export const INITIAL_CLIENT_RELATION = 50
