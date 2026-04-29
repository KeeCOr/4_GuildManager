import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mercenary, ActiveQuest, CampaignState, GuildBuildings, QuestType } from '../types'
import { checkPotentialReveal } from '../utils/potential'
import { ALL_QUESTS } from '../data/quests'
import { MISSION_PAY_PER_DAY, URGENT_QUEST_MISS_FAME_PENALTY } from '../constants'
import { xpMultiplier } from '../data/buildings'
import { EXP_TO_NEXT } from '../data/mercenaries'
import { calcSuccessRate, calcMercDeathRisk } from '../utils/quest'
import { updateQuestHistory, checkNewTags } from '../utils/specialty'
import { SPECIALTY_TAG_DESC } from '../constants'
import { getClient, clientGoldBonus, clientFamePenaltyMult, INITIAL_CLIENT_RELATION } from '../data/clients'
import { growthMultiplier } from '../utils/retirement'

interface GameLoopRefs {
  mercs: Mercenary[]
  state: CampaignState
  buildings: GuildBuildings
  roomLevels: Record<string, number>
  activeQuests: ActiveQuest[]
  urgentQuestIds: string[]
  urgentQuestExpiries: Record<string, number>
  clientRelations: Record<string, number>
}

interface GameLoopCallbacks {
  setMercs: React.Dispatch<React.SetStateAction<Mercenary[]>>
  setState: React.Dispatch<React.SetStateAction<CampaignState>>
  setActiveQuests: React.Dispatch<React.SetStateAction<ActiveQuest[]>>
  setQuestLog: React.Dispatch<React.SetStateAction<string[]>>
  setShowLogModal: React.Dispatch<React.SetStateAction<boolean>>
  onQuestResult: (success: boolean, deaths: number) => void
  setUrgentQuestIds: React.Dispatch<React.SetStateAction<string[]>>
  setUrgentQuestExpiries: React.Dispatch<React.SetStateAction<Record<string, number>>>
  setClientRelations: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export function useGameLoop(refs: GameLoopRefs, callbacks: GameLoopCallbacks) {
  const dataRef = useRef(refs)
  dataRef.current = refs

  const { setMercs, setState, setActiveQuests, setQuestLog, setShowLogModal, onQuestResult, setUrgentQuestIds, setUrgentQuestExpiries, setClientRelations } = callbacks

  const processCompletions = useCallback(() => {
    const now = Date.now()
    const { mercs, state, buildings, activeQuests, urgentQuestIds, urgentQuestExpiries, clientRelations } = dataRef.current
    const localClientRelations = { ...clientRelations }
    const completed = activeQuests.filter(aq => aq.completesAt <= now)
    if (completed.length === 0) return

    let g = state.gold, fame = state.fame, morale = state.morale
    let nextMercs = [...mercs]
    const logs: string[] = []
    const questResults: Array<{ success: boolean; deaths: number }> = []
    let totalMagicStones = 0

    for (const aq of completed) {
      const quest = ALL_QUESTS.find(q => q.id === aq.questId)!
      nextMercs = nextMercs.map(m => {
        if (!aq.assignedMercIds.includes(m.id)) return m
        const drain = (m.element === '얼음' && quest.element === '얼음')
          ? Math.round(quest.conditionDrain * 0.5)
          : quest.conditionDrain
        return { ...m, condition: Math.max(0, m.condition - drain) }
      })
      const assignedMercs = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
      const success = Math.random() < calcSuccessRate(quest, aq.assignedMercIds, nextMercs) / 100
      let questDeaths = 0

      if (success) {
        fame += quest.reward.fame
        morale = Math.min(100, morale + 5)
        const totalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
        const rewardGold = quest.reward.gold
        const guildGold = Math.max(0, rewardGold - totalWages)
        g += guildGold
        const wageFullyPaid = rewardGold >= totalWages
        if (wageFullyPaid) {
          logs.push(`✅ [${quest.name}] 성공! 길드 +${guildGold}G +${quest.reward.fame}명성`)
          if (totalWages > 0) logs.push(`💰 급여 전액 지급 (${totalWages}G)`)
        } else {
          logs.push(`✅ [${quest.name}] 성공! +${quest.reward.fame}명성`)
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
          const growMult = growthMultiplier(m.age)
          const statGain = Math.max(1, Math.round(sb * growMult))
          const leveled = { ...m, level, experience: exp, expToNext,
            favorability: Math.min(100, m.favorability + 5),
            power: m.power + statGain * 4,
            trap_disarm: m.trap_disarm + statGain * 2,
            stats: { 공격력: m.stats.공격력 + statGain * 2, 함정해제: m.stats.함정해제 + statGain * 2,
                     생존율: m.stats.생존율 + statGain * 2, 협조성: m.stats.협조성 + statGain } }
          const potentialChecked = checkPotentialReveal(leveled)
          if (potentialChecked.potential.revealed && !m.potential.revealed) {
            logs.push(`✨ ${m.name}의 잠재력 공개! — 최대 ${potentialChecked.potential.maxGrade}급`)
          }
          return potentialChecked
        })
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
        // lowCond 카운터 업데이트 (iron_will용)
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          if (m.condition <= 30) {
            const h = { ...(m.questHistory as Record<string, number>), _lowCond: ((m.questHistory as any)['_lowCond'] ?? 0) + 1 }
            return { ...m, questHistory: h as typeof m.questHistory }
          }
          return m
        })
        // shadow_walker 카운터 업데이트
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          if (m.element === '암흑' && quest.element === '암흑') {
            const h = { ...(m.questHistory as Record<string, number>), _shadow: ((m.questHistory as any)['_shadow'] ?? 0) + 1 }
            return { ...m, questHistory: h as typeof m.questHistory }
          }
          return m
        })
        // 성공 완료 용병 questHistory 업데이트 + 태그 획득
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          const withHistory = updateQuestHistory(m, quest, aq.assignedMercIds.length)
          const newTags = checkNewTags(withHistory, quest, aq.assignedMercIds.length, m.condition)
          if (newTags.length > 0) {
            newTags.forEach(tag => {
              const desc = (SPECIALTY_TAG_DESC as Record<string, { label: string }>)[tag]
              logs.push(`🏷 ${m.name} 전문성 획득: [${desc?.label ?? tag}]`)
            })
          }
          return { ...withHistory, specialtyTags: [...withHistory.specialtyTags, ...newTags] }
        })
        if (aq.assignedMercIds.length < 3) {
          const party = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
          for (const mid of aq.assignedMercIds) {
            const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
            if (Math.random() < calcMercDeathRisk(quest, merc, party) * 0.35) {
              g -= merc.deathCost; nextMercs = nextMercs.filter(m => m.id !== mid)
              questDeaths++
              logs.push(`💀 ${merc.name} 성공 중 전사! (소규모 파티) -${merc.deathCost}G`)
            }
          }
        }
        // 의뢰인 관계 갱신
        const clientId = quest.clientId
        if (clientId) {
          const prev = localClientRelations[clientId] ?? INITIAL_CLIENT_RELATION
          localClientRelations[clientId] = Math.min(100, prev + 5)
          const client = getClient(clientId)
          if (client && localClientRelations[clientId] >= 80) {
            const bonus = Math.round(quest.reward.gold * clientGoldBonus(localClientRelations[clientId], client.questBonus))
            if (bonus > 0) {
              g += bonus
              logs.push(`🪙 [${client.name}] 관계 보너스 +${bonus}G`)
            }
          }
        }
        // 마석 드랍 (던전/몬스터/사냥 퀘스트)
        const MAGIC_STONE_TYPES: QuestType[] = ['dungeon', 'monster', 'hunt']
        let magicStonesDrop = 0
        if (quest.questType && MAGIC_STONE_TYPES.includes(quest.questType) && Math.random() < 0.15) {
          magicStonesDrop = 1
          logs.push(`💎 마석 1개 획득! (${quest.name})`)
        }
        totalMagicStones += magicStonesDrop
      } else {
        morale = Math.max(0, morale - 8)
        const clientId = quest.clientId
        const penaltyMult = clientFamePenaltyMult(localClientRelations[clientId] ?? INITIAL_CLIENT_RELATION)
        const fameLoss = Math.round((quest.famePenalty ?? 0) * penaltyMult)
        if (fameLoss > 0) {
          fame = Math.max(0, fame - fameLoss)
          logs.push(`⭐ 명성 -${fameLoss} (${quest.name} 실패)`)
        }
        if (clientId) {
          const prev = localClientRelations[clientId] ?? INITIAL_CLIENT_RELATION
          localClientRelations[clientId] = Math.max(0, prev - 10)
          if (localClientRelations[clientId] === 0) {
            const client = getClient(clientId)
            logs.push(`❗ [${client?.name ?? clientId}] 신뢰도 바닥! 의뢰 중단 위험`)
          }
        }
        logs.push(`❌ [${quest.name}] 실패! 부대가 귀환했습니다.`)
        const failTotalWages = assignedMercs.reduce((s, m) => s + (MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration, 0)
        const expectedFailWage = Math.round(failTotalWages * 0.5)
        if (expectedFailWage > 0) logs.push(`💰 실패 - 급여 미지급 (예정 ${expectedFailWage}G, 보상 없음)`)
        nextMercs = nextMercs.map(m => {
          if (!aq.assignedMercIds.includes(m.id)) return m
          const expectedWage = Math.round((MISSION_PAY_PER_DAY[m.grade] ?? 15) * quest.duration * 0.5)
          const wagePenalty = expectedWage > 0 ? Math.min(10, Math.max(2, Math.ceil(expectedWage / 15))) : 2
          const mentalMod = m.traits?.mentality >= 80 ? 0.7 : 1.0
          return { ...m, favorability: Math.max(0, m.favorability - Math.round((5 + wagePenalty) * mentalMod)) }
        })
        const failParty = aq.assignedMercIds.map(id => nextMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
        const deadIds: string[] = []
        for (const mid of aq.assignedMercIds) {
          const merc = nextMercs.find(m => m.id === mid); if (!merc) continue
          if (Math.random() < calcMercDeathRisk(quest, merc, failParty)) {
            g -= merc.deathCost; nextMercs = nextMercs.filter(m => m.id !== mid)
            deadIds.push(mid); fame = Math.max(0, fame - 2); questDeaths++
            logs.push(`💀 ${merc.name} 전사! -${merc.deathCost}G`)
          } else {
            nextMercs = nextMercs.map(m => m.id === mid ? { ...m, status: '부상', hp: Math.max(0, m.hp - 30) } : m)
          }
        }
        if (deadIds.length > 0) nextMercs = nextMercs.map(m =>
          aq.assignedMercIds.includes(m.id) && !deadIds.includes(m.id)
            ? { ...m, favorability: Math.max(0, m.favorability - 3) }
            : m)
      }
      nextMercs = nextMercs.map(m =>
        aq.assignedMercIds.includes(m.id) && m.status === '파견중' ? { ...m, status: '대기중', idleDays: 0, lastDispatchEndDay: dataRef.current.state.day } : m)
      questResults.push({ success, deaths: questDeaths })
    }

    const nowMs = Date.now()
    const expiredIds = urgentQuestIds.filter(qid => (urgentQuestExpiries[qid] ?? Infinity) <= nowMs)
    if (expiredIds.length > 0) {
      fame = Math.max(0, fame - expiredIds.length * URGENT_QUEST_MISS_FAME_PENALTY)
      logs.push(`⚠ 긴급 의뢰 ${expiredIds.length}건 미수주 — 명성 -${expiredIds.length * URGENT_QUEST_MISS_FAME_PENALTY}`)
      setUrgentQuestIds(prev => prev.filter(id => !expiredIds.includes(id)))
      setUrgentQuestExpiries(prev => {
        const next = { ...prev }
        expiredIds.forEach(id => delete next[id])
        return next
      })
    }

    setClientRelations(localClientRelations)
    setMercs(nextMercs)
    setState(prev => ({ ...prev, day: state.day, gold: Math.max(0, g), fame: Math.max(0, fame), morale, magicStones: Math.min(99, (prev.magicStones ?? 0) + totalMagicStones) }))
    setActiveQuests(prev => prev.filter(aq => aq.completesAt > now))
    setQuestLog(prev => [...prev, ...logs].slice(-20))
    if (logs.some(l => l.startsWith('✅') || l.startsWith('❌') || l.startsWith('💀'))) setShowLogModal(true)
    for (const r of questResults) onQuestResult(r.success, r.deaths)
  }, [setMercs, setState, setActiveQuests, setQuestLog, setShowLogModal, onQuestResult, setUrgentQuestIds, setUrgentQuestExpiries, setClientRelations])

  useEffect(() => {
    const timer = setInterval(processCompletions, 2_000)
    return () => clearInterval(timer)
  }, [processCompletions])

  const [tickTime, setTickTime] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setTickTime(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [])

  return { tickTime }
}
