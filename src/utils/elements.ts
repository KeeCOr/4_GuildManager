// ── 속성 상성 ──────────────────────────────────────────────────────────────
// ELEMENT_ADVANTAGE[A] = B  →  A 속성 용병이 B 속성 퀘스트에서 상성 이득
const ELEMENT_ADVANTAGE: Record<string, string> = {
  불: '자연', 자연: '얼음', 얼음: '불',
  빛: '암흑', 암흑: '빛',
}

/** 속성 관계: 'match' | 'advantage' | 'disadvantage' | 'neutral' */
export function elementRelation(
  mercElem: string,
  questElem: string,
): 'match' | 'advantage' | 'disadvantage' | 'neutral' {
  if (mercElem === questElem) return 'match'
  if (ELEMENT_ADVANTAGE[mercElem] === questElem) return 'advantage'
  if (ELEMENT_ADVANTAGE[questElem] === mercElem) return 'disadvantage'
  return 'neutral'
}
