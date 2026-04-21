import type { Mercenary } from '../types'
import {
  RACE_ICONS, CLASS_ICONS, GRADE_STARS, ELEMENT_ICON, ELEMENT_COLOR, ELEMENT_BG, MISSION_PAY_PER_DAY,
} from '../constants'
import { combatPower, canTrap } from '../utils/power'
import { gradeBg } from '../utils/format'
import { CondBar } from './CondBar'

interface MercCardProps {
  merc: Mercenary
  onClick: () => void
  selected?: boolean
  inParty?: boolean
  showDetail?: boolean
  isDraggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
  matchElement?: boolean
}

export function MercCard({
  merc, onClick, selected, inParty, showDetail,
  isDraggable, onDragStart, onDragEnd, isDragging, matchElement
}: MercCardProps) {
  const isDeployed = merc.status === '파견중'
  const isInjured  = merc.status === '부상'

  let bg     = 'rgba(255,255,255,0.04)'
  let border = 'rgba(255,255,255,0.08)'
  if (isDeployed)    { bg = 'rgba(14,165,233,0.12)';  border = 'rgba(14,165,233,0.5)' }
  else if (selected) { bg = 'rgba(251,191,36,0.15)';  border = 'rgba(251,191,36,0.6)' }
  else if (inParty)  { bg = 'rgba(99,102,241,0.15)';  border = 'rgba(99,102,241,0.5)' }
  else if (isInjured){ bg = 'rgba(239,68,68,0.1)';    border = 'rgba(239,68,68,0.35)' }
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
          {showDetail && <div className="mt-1"><CondBar cond={merc.condition} /></div>}
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
