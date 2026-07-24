import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../', import.meta.url)

async function loadAdvisor() {
  const sourceUrl = new URL('src/utils/onboardingAdvisor.ts', root)
  const source = await readFile(sourceUrl, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`)
}

test('onboarding advisor points fresh players to the first contract before other chores', async () => {
  const { createOnboardingAction } = await loadAdvisor()

  const action = createOnboardingAction({
    showTutorial: false,
    showQuestModal: false,
    activeQuestCount: 0,
    completedQuestCount: 0,
    pendingAssignCount: 0,
    availableMercCount: 3,
    gateArrivalCount: 3,
    readyFacilityUpgradeCount: 0,
  })

  assert.equal(action.id, 'open-first-contract')
  assert.equal(action.cta, '계약 열기')
  assert.equal(action.intent, 'openQuest')
})

test('onboarding advisor advances from quest modal to recommend and launch actions', async () => {
  const { createOnboardingAction } = await loadAdvisor()

  const recommend = createOnboardingAction({
    showTutorial: false,
    showQuestModal: true,
    activeQuestCount: 0,
    completedQuestCount: 0,
    pendingAssignCount: 0,
    availableMercCount: 2,
    gateArrivalCount: 0,
    readyFacilityUpgradeCount: 0,
  })
  const launch = createOnboardingAction({
    showTutorial: false,
    showQuestModal: true,
    activeQuestCount: 0,
    completedQuestCount: 0,
    pendingAssignCount: 1,
    availableMercCount: 1,
    gateArrivalCount: 0,
    readyFacilityUpgradeCount: 0,
  })

  assert.equal(recommend.id, 'recommend-party')
  assert.equal(recommend.intent, 'recommendParty')
  assert.equal(launch.id, 'launch-first-contract')
  assert.equal(launch.intent, 'launchQuest')
})

test('onboarding advisor suppresses blocking hint overlays during first dispatch path', async () => {
  const { createOnboardingAction, shouldShowHintOverlay } = await loadAdvisor()

  const action = createOnboardingAction({
    showTutorial: false,
    showQuestModal: false,
    activeQuestCount: 0,
    completedQuestCount: 0,
    pendingAssignCount: 0,
    availableMercCount: 3,
    gateArrivalCount: 3,
    readyFacilityUpgradeCount: 0,
  })

  assert.equal(shouldShowHintOverlay('hire', action), false)
  assert.equal(shouldShowHintOverlay('quest', action), false)
  assert.equal(shouldShowHintOverlay('economy', action), true)
})

test('onboarding advisor switches to replay or upgrade once the first dispatch loop exists', async () => {
  const { createOnboardingAction } = await loadAdvisor()

  const replay = createOnboardingAction({
    showTutorial: false,
    showQuestModal: false,
    activeQuestCount: 1,
    completedQuestCount: 0,
    pendingAssignCount: 0,
    availableMercCount: 2,
    gateArrivalCount: 0,
    readyFacilityUpgradeCount: 0,
  })
  const upgrade = createOnboardingAction({
    showTutorial: false,
    showQuestModal: false,
    activeQuestCount: 0,
    completedQuestCount: 1,
    pendingAssignCount: 0,
    availableMercCount: 2,
    gateArrivalCount: 0,
    readyFacilityUpgradeCount: 1,
  })

  assert.equal(replay.intent, 'openReplay')
  assert.equal(upgrade.intent, 'focusUpgrade')
})