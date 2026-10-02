import sprite1 from './cropped/인간_남_전사.webp'
import sprite2 from './cropped/인간_남_궁수.webp'
import sprite3 from './cropped/인간_남_도적.webp'
import sprite4 from './cropped/인간_남_마법사.webp'
import sprite5 from './cropped/인간_남_성직자.webp'
import sprite6 from './cropped/인간_여_전사.webp'
import sprite7 from './cropped/인간_여_궁수.webp'
import sprite8 from './cropped/인간_여_도적.webp'
import sprite9 from './cropped/인간_여_마법사.webp'
import sprite10 from './cropped/인간_여_성직자.webp'
import sprite11 from './cropped/엘프_남_전사.webp'
import sprite12 from './cropped/엘프_남_궁수.webp'
import sprite13 from './cropped/엘프_남_도적.webp'
import sprite14 from './cropped/엘프_남_마법사.webp'
import sprite15 from './cropped/엘프_남_성직자.webp'
import sprite16 from './cropped/엘프_여_전사.webp'
import sprite17 from './cropped/엘프_여_궁수.webp'
import sprite18 from './cropped/엘프_여_도적.webp'
import sprite19 from './cropped/엘프_여_마법사.webp'
import sprite20 from './cropped/엘프_여_성직자.webp'
import sprite21 from './cropped/드워프_남_전사.webp'
import sprite22 from './cropped/드워프_남_궁수.webp'
import sprite23 from './cropped/드워프_남_도적.webp'
import sprite24 from './cropped/드워프_남_마법사.webp'
import sprite25 from './cropped/드워프_남_성직자.webp'
import sprite26 from './cropped/드워프_여_전사.webp'
import sprite27 from './cropped/드워프_여_궁수.webp'
import sprite28 from './cropped/드워프_여_도적.webp'
import sprite29 from './cropped/드워프_여_마법사.webp'
import sprite30 from './cropped/드워프_여_성직자.webp'
import sprite31 from './cropped/수인_남_전사.webp'
import sprite32 from './cropped/수인_남_궁수.webp'
import sprite33 from './cropped/수인_남_도적.webp'
import sprite34 from './cropped/수인_남_마법사.webp'
import sprite35 from './cropped/수인_남_성직자.webp'
import sprite36 from './cropped/수인_여_전사.webp'
import sprite37 from './cropped/수인_여_궁수.webp'
import sprite38 from './cropped/수인_여_도적.webp'
import sprite39 from './cropped/수인_여_마법사.webp'
import sprite40 from './cropped/수인_여_성직자.webp'

const SPRITES: Record<string, string> = {
  '인간_남_전사': sprite1,
  '인간_남_궁수': sprite2,
  '인간_남_도적': sprite3,
  '인간_남_마법사': sprite4,
  '인간_남_성직자': sprite5,
  '인간_여_전사': sprite6,
  '인간_여_궁수': sprite7,
  '인간_여_도적': sprite8,
  '인간_여_마법사': sprite9,
  '인간_여_성직자': sprite10,
  '엘프_남_전사': sprite11,
  '엘프_남_궁수': sprite12,
  '엘프_남_도적': sprite13,
  '엘프_남_마법사': sprite14,
  '엘프_남_성직자': sprite15,
  '엘프_여_전사': sprite16,
  '엘프_여_궁수': sprite17,
  '엘프_여_도적': sprite18,
  '엘프_여_마법사': sprite19,
  '엘프_여_성직자': sprite20,
  '드워프_남_전사': sprite21,
  '드워프_남_궁수': sprite22,
  '드워프_남_도적': sprite23,
  '드워프_남_마법사': sprite24,
  '드워프_남_성직자': sprite25,
  '드워프_여_전사': sprite26,
  '드워프_여_궁수': sprite27,
  '드워프_여_도적': sprite28,
  '드워프_여_마법사': sprite29,
  '드워프_여_성직자': sprite30,
  '수인_남_전사': sprite31,
  '수인_남_궁수': sprite32,
  '수인_남_도적': sprite33,
  '수인_남_마법사': sprite34,
  '수인_남_성직자': sprite35,
  '수인_여_전사': sprite36,
  '수인_여_궁수': sprite37,
  '수인_여_도적': sprite38,
  '수인_여_마법사': sprite39,
  '수인_여_성직자': sprite40,
}

export const getSprite = (race: string, gender: string, mercenaryClass: string) =>
  SPRITES[`${race}_${gender}_${mercenaryClass}`] ?? null

