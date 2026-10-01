export const RACE_ICONS: Record<string, string> = {
  엘프: '🧝', 인간: '⚜️', 드워프: '⛏️', 수인: '🐺',
}

export const CLASS_ICONS: Record<string, string> = {
  전사: '⚔️', 궁수: '🏹', 도적: '🗡️', 마법사: '🪄', 성직자: '🕊️',
}

export const GRADE_STARS: Record<string, string> = {
  S: '★★★★★', A: '★★★★', B: '★★★', C: '★★', D: '★',
}

export const ELEMENT_ICON: Record<string, string> = {
  불: '🔥', 얼음: '🧊', 번개: '⚡', 자연: '🌿', 암흑: '🌑', 빛: '✨',
}

export const ELEMENT_BONUS_DESC: Record<string, string> = {
  불:   '전투력 +15%',
  얼음: '컨디션 소모 -50%',
  번개: '소요시간 -25%',
  자연: '사망 위험 -35%',
  암흑: '함정 적중 +15%',
  빛:   '파티 회생 -30%',
}

export const ELEMENT_COLOR: Record<string, string> = {
  불: 'text-orange-400', 얼음: 'text-cyan-300', 번개: 'text-yellow-300',
  자연: 'text-green-400', 암흑: 'text-purple-400', 빛: 'text-yellow-100',
}

export const ELEMENT_BG: Record<string, string> = {
  불: 'rgba(234,88,12,0.25)', 얼음: 'rgba(34,211,238,0.2)', 번개: 'rgba(250,204,21,0.2)',
  자연: 'rgba(34,197,94,0.2)', 암흑: 'rgba(147,51,234,0.2)', 빛: 'rgba(253,224,71,0.2)',
}

export const MISSION_PAY_PER_DAY: Record<string, number> = {
  D: 4, C: 10, B: 45, A: 90, S: 160,
}

export const ARRIVAL_REFRESH_COST = 50

export const GUILD_LEVEL_FAME = [0, 30, 80, 180, 350] as const

export const GUILD_MAX_QUEST_DIFF = [120, 210, 330, 560, 9999] as const

export const QUEST_BASE_TIMES_MIN = [5, 15, 30, 60, 90, 120, 180, 240] as const

export const RACE_BONUS_DESC: Record<string, string> = {
  엘프: '함정해제·마법 특화',
  인간: '전 능력치 균형 +1',
  드워프: '생존율·전사 특화',
  수인: '도적·은밀 특화',
}
