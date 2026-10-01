import { computeGuildLevel } from './quest'

export const gradeText = (g: string) =>
  ({ S: 'text-fuchsia-300', A: 'text-amber-300', B: 'text-emerald-300', C: 'text-sky-300', D: 'text-slate-400' }[g] ?? 'text-slate-400')

export const gradeBg = (g: string) =>
  ({ S: 'bg-fuchsia-700', A: 'bg-amber-700', B: 'bg-emerald-700', C: 'bg-sky-800', D: 'bg-slate-700' }[g] ?? 'bg-slate-700')

export const favEmoji = (fav: number) =>
  fav >= 81 ? '❤️' : fav >= 61 ? '😊' : fav >= 41 ? '😐' : fav >= 21 ? '😒' : '💔'

export const masterRoomMaxLevel = (fame: number): number =>
  Math.min(3, computeGuildLevel(fame))

export const formatTimeLeft = (completesAt: number, now: number): string => {
  const ms = completesAt - now
  if (ms <= 0) return '완료 처리 중...'
  const totalSecs = Math.ceil(ms / 1000)
  const totalMins = Math.floor(totalSecs / 60)
  if (totalMins >= 60) return `${Math.floor(totalMins / 60)}시간 ${totalMins % 60}분`
  const secs = totalSecs % 60
  return `${totalMins}분 ${secs}초`
}
