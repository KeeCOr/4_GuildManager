/**
 * Crop 8 character sprite sheets (5 classes each) into individual WebP files.
 * Output: src/assets/Character/cropped/{sheet}_{class}.webp
 *
 * Class order per sheet (identified visually):
 *   c1_human : [전사, 궁수, 도적, 마법사, 성직자]
 *   c2_elf   : [전사, 궁수, 도적, 마법사, 성직자]
 *   c3_dwarf : [전사, 궁수, 마법사, 도적, 성직자]
 *   c4_beast : [전사, 도적, 궁수, 마법사, 성직자]
 *   c5_human : [전사, 도적, 마법사, 궁수, 성직자]
 *   c6_dwarf : [전사, 성직자, 도적, 궁수, 마법사]
 *   c7_elf   : [궁수, 전사, 마법사, 도적, 성직자]
 *   c8_beast : [전사, 도적, 성직자, 궁수, 마법사]
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const inDir  = join(root, 'src', 'assets', 'Character')
const outDir = join(root, 'src', 'assets', 'Character', 'cropped')
mkdirSync(outDir, { recursive: true })

const SHEETS = [
  { file: 'c1_human', gender: '남', race: '인간', classes: ['전사','궁수','도적','마법사','성직자'] },
  { file: 'c2_elf',   gender: '여', race: '엘프', classes: ['전사','궁수','도적','마법사','성직자'] },
  { file: 'c3_dwarf', gender: '남', race: '드워프', classes: ['전사','궁수','마법사','도적','성직자'] },
  { file: 'c4_beast', gender: '남', race: '수인',  classes: ['전사','도적','궁수','마법사','성직자'] },
  { file: 'c5_human', gender: '여', race: '인간', classes: ['전사','도적','마법사','궁수','성직자'] },
  { file: 'c6_dwarf', gender: '여', race: '드워프', classes: ['전사','성직자','도적','궁수','마법사'] },
  { file: 'c7_elf',   gender: '남', race: '엘프', classes: ['궁수','전사','마법사','도적','성직자'] },
  { file: 'c8_beast', gender: '여', race: '수인',  classes: ['전사','도적','성직자','궁수','마법사'] },
]

// Output size — small enough to inline comfortably, large enough for 56–112px avatars
const OUT_W = 120
const OUT_H = 160

for (const sheet of SHEETS) {
  const src = join(inDir, `${sheet.file}.png`)
  const meta = await sharp(src).metadata()
  const { width, height } = meta

  const colW = Math.floor(width / 5)

  for (let i = 0; i < 5; i++) {
    const cls = sheet.classes[i]
    const outName = `${sheet.race}_${sheet.gender}_${cls}.webp`
    const outPath = join(outDir, outName)

    await sharp(src)
      .extract({ left: colW * i, top: 0, width: colW, height })
      .resize(OUT_W, OUT_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82 })
      .toFile(outPath)

    console.log(`✓ ${outName}`)
  }
}

console.log('\n✅ 스프라이트 크롭 완료')
