export type OnboardingActionIntent =
  | 'openQuest'
  | 'recommendParty'
  | 'launchQuest'
  | 'openReplay'
  | 'focusUpgrade'

export interface OnboardingAdvisorInput {
  showTutorial: boolean
  showQuestModal: boolean
  activeQuestCount: number
  completedQuestCount: number
  pendingAssignCount: number
  availableMercCount: number
  gateArrivalCount: number
  readyFacilityUpgradeCount: number
}

export interface OnboardingAction {
  id: string
  title: string
  detail: string
  cta: string
  intent: OnboardingActionIntent
  tone: 'primary' | 'reward' | 'watch'
}

const hasFirstDispatchProgress = (input: OnboardingAdvisorInput) =>
  input.activeQuestCount > 0 || input.completedQuestCount > 0

export function createOnboardingAction(input: OnboardingAdvisorInput): OnboardingAction | null {
  if (input.showTutorial) return null

  if (!hasFirstDispatchProgress(input)) {
    if (input.pendingAssignCount > 0) {
      return {
        id: 'launch-first-contract',
        title: '첫 파견 준비 완료',
        detail: '편성된 용병을 바로 보내고 전술 리플레이로 진행을 확인하세요.',
        cta: '파견 시작',
        intent: 'launchQuest',
        tone: 'primary',
      }
    }

    if (input.showQuestModal && input.availableMercCount > 0) {
      return {
        id: 'recommend-party',
        title: '첫 계약을 자동 편성하세요',
        detail: '대기 용병 중 조건이 맞는 후보를 골라 성공률을 먼저 확보합니다.',
        cta: '추천 편성',
        intent: 'recommendParty',
        tone: 'primary',
      }
    }

    return {
      id: 'open-first-contract',
      title: '첫 계약을 보내 길드를 움직이세요',
      detail: input.gateArrivalCount > 0
        ? '용병 고용은 잠시 뒤에도 가능합니다. 먼저 쉬운 계약을 열어 파견 루프를 확인하세요.'
        : '계약을 열고 용병을 배치하면 보상, 재료, 성장 흐름이 시작됩니다.',
      cta: '계약 열기',
      intent: 'openQuest',
      tone: 'primary',
    }
  }

  if (input.activeQuestCount > 0) {
    return {
      id: 'watch-first-dispatch',
      title: '파견 상황을 지켜보세요',
      detail: '전술 리플레이에서 이동, 교전, 보상 지점을 배속으로 확인할 수 있습니다.',
      cta: '전술 보기',
      intent: 'openReplay',
      tone: 'watch',
    }
  }

  if (input.readyFacilityUpgradeCount > 0) {
    return {
      id: 'spend-first-materials',
      title: '획득한 재료로 시설을 키우세요',
      detail: '시설을 모두 올리면 방 자체 업그레이드 조건이 열립니다.',
      cta: '업그레이드 보기',
      intent: 'focusUpgrade',
      tone: 'reward',
    }
  }

  return null
}

export function shouldShowHintOverlay(hintId: string, currentAction: OnboardingAction | null): boolean {
  if (!currentAction) return true
  if (hintId !== 'hire' && hintId !== 'quest') return true
  return ![
    'open-first-contract',
    'recommend-party',
    'launch-first-contract',
  ].includes(currentAction.id)
}