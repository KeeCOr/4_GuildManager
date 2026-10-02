import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, resolve } from 'path'

const root    = resolve(import.meta.dirname, '..')
const distDir = join(root, 'dist', 'assets')
const outDir  = join(root, 'release')

// 버전은 package.json에서 자동으로 읽어옴
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))

const jsFile  = readdirSync(distDir).find(f => f.endsWith('.js'))
const cssFile = readdirSync(distDir).find(f => f.endsWith('.css'))

if (!jsFile || !cssFile) { console.error('빌드 파일을 찾을 수 없습니다.'); process.exit(1) }

const js  = readFileSync(join(distDir, jsFile),  'utf-8')
const css = readFileSync(join(distDir, cssFile), 'utf-8')

const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Medieval Mercenary Manager v${version}</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>`

mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `GM-v${version}.html`)
writeFileSync(outPath, html, 'utf-8')

const kb = (readFileSync(outPath).length / 1024).toFixed(1)
console.log(`완료: ${outPath}`)
console.log(`크기: ${kb} KB`)
