export type QuestResultSectionKey =
  | 'rewards'
  | 'injuries'
  | 'deaths'
  | 'materials'
  | 'items'
  | 'consequences'
  | 'details'

export type QuestResultSection = {
  key: QuestResultSectionKey
  label: string
  tone: 'positive' | 'warning' | 'danger' | 'neutral'
  lines: string[]
}

const SECTION_META: Array<Omit<QuestResultSection, 'lines'>> = [
  { key: 'rewards', label: '보상 및 성장', tone: 'positive' },
  { key: 'injuries', label: '부상', tone: 'warning' },
  { key: 'deaths', label: '전사', tone: 'danger' },
  { key: 'materials', label: '부산물', tone: 'positive' },
  { key: 'items', label: '특별 아이템', tone: 'positive' },
  { key: 'consequences', label: '후속 영향', tone: 'warning' },
  { key: 'details', label: '임무 기록', tone: 'neutral' },
]

export function classifyQuestResultLine(line: string): QuestResultSectionKey {
  if (line.startsWith('🤕')) return 'injuries'
  if (line.startsWith('💀')) return 'deaths'
  if (line.startsWith('🎒')) return 'materials'
  if (line.startsWith('🏺')) return 'items'
  if (/^(💰|🌟|⬆)/u.test(line)) return 'rewards'
  if (/^(⚠|📉|😒|😔|💼|🔙)/u.test(line)) return 'consequences'
  return 'details'
}

export function groupQuestResultLines(lines: string[]): QuestResultSection[] {
  const grouped = new Map<QuestResultSectionKey, string[]>()
  for (const line of lines) {
    const key = classifyQuestResultLine(line)
    grouped.set(key, [...(grouped.get(key) ?? []), line])
  }

  return SECTION_META.flatMap(section => {
    const sectionLines = grouped.get(section.key) ?? []
    return sectionLines.length > 0 ? [{ ...section, lines: sectionLines }] : []
  })
}
