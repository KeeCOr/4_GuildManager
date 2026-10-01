import type { MercenaryClass } from '../types'

export interface ClassTrait {
  role: string
  description: string
  statWeights: { atk: number; trap: number; surv: number }
  deathRiskMultiplier: number
}

export const CLASS_TRAITS: Record<MercenaryClass, ClassTrait> = {
  전사: { role: '전열 수호', description: '후열 생존 지원 · 소수 몬스터 특화 · 본인이 공격을 대신 받음', statWeights: { atk: 1.05, trap: 0.9, surv: 1.2 }, deathRiskMultiplier: 0.88 },
  궁수: { role: '원거리 지원', description: '원거리 화력 · 보조 함정 대응 · 비행/도주 적 특화', statWeights: { atk: 1.3, trap: 0.8, surv: 1.0 }, deathRiskMultiplier: 1.0 },
  도적: { role: '탐사 전문가', description: '함정 해제 · 전리품과 퀘스트 아이템 발견률 상승', statWeights: { atk: 0.9, trap: 1.4, surv: 0.95 }, deathRiskMultiplier: 1.0 },
  마법사: { role: '광역 섬멸', description: '최고 수준 화력 · 높은 사망 위험 · 다수 몬스터 특화', statWeights: { atk: 1.35, trap: 1.0, surv: 0.9 }, deathRiskMultiplier: 1.4 },
  성직자: { role: '생존 지원', description: '장기전 안정 · 전열 생존 지원 · 언데드 특화', statWeights: { atk: 0.75, trap: 1.0, surv: 1.25 }, deathRiskMultiplier: 1.3 },
}
