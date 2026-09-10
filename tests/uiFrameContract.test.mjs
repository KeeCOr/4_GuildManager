import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const cssUrl = new URL('../src/index.css', import.meta.url)

async function readCss() {
  return readFile(cssUrl, 'utf8')
}

function extractRuleBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\}\\s*${escaped}\\s*\\{`, '')
  let match = pattern.exec(css)
  if (!match) {
    const startPattern = new RegExp(`^\\s*${escaped}\\s*\\{`, 'm')
    match = startPattern.exec(css)
  }
  assert.ok(match, `Expected to find an isolated rule block for selector "${selector}"`)
  const start = match.index + match[0].length
  let depth = 1
  let i = start
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return css.slice(start, i - 1)
}

function assertNineSliceContract(css, selector) {
  const block = extractRuleBlock(css, selector)

  assert.match(
    block,
    /border-image-source\s*:\s*[^;]+;/,
    `${selector} should declare a border-image-source for its frame art`,
  )

  const sliceMatch = /border-image-slice\s*:\s*([^;]+);/.exec(block)
  assert.ok(sliceMatch, `${selector} should declare border-image-slice`)
  const sliceValue = sliceMatch[1].trim()
  assert.match(
    sliceValue,
    /\d/,
    `${selector} border-image-slice should contain numeric slice values`,
  )
  assert.match(
    sliceValue,
    /\bfill\b/,
    `${selector} border-image-slice should include the "fill" keyword so the center renders`,
  )

  assert.match(
    block,
    /border-image-width\s*:\s*[^;]+;/,
    `${selector} should declare border-image-width`,
  )

  assert.doesNotMatch(
    block,
    /background-size\s*:\s*100%\s+100%/,
    `${selector} should not stretch its frame art with background-size: 100% 100%`,
  )
}

test('body font-family prioritizes local Pretendard, Noto Sans KR, and Malgun Gothic before generic sans-serif', async () => {
  const css = await readCss()
  const block = extractRuleBlock(css, 'body')
  const match = /font-family\s*:\s*([^;]+);/.exec(block)
  assert.ok(match, 'Expected body rule to declare font-family')

  const families = match[1]
    .split(',')
    .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))

  const requiredLocalFonts = ['Pretendard', 'Noto Sans KR', 'Malgun Gothic']
  for (const fontName of requiredLocalFonts) {
    assert.ok(
      families.includes(fontName),
      `Expected body font-family to include "${fontName}"`,
    )
  }

  const genericIndex = families.indexOf('sans-serif')
  assert.ok(genericIndex !== -1, 'Expected a generic sans-serif fallback in body font-family')

  for (const fontName of requiredLocalFonts) {
    assert.ok(
      families.indexOf(fontName) < genericIndex,
      `Expected "${fontName}" to be listed before the generic sans-serif fallback`,
    )
  }
})

test('.gm-modal-frame and .gm-panel-shell use a real nine-slice border-image contract', async () => {
  const css = await readCss()
  assertNineSliceContract(css, '.gm-modal-frame')
  assertNineSliceContract(css, '.gm-panel-shell')
})

test('.gm-button-primary, .gm-button-chrome, .gm-button-muted use nine-slice border images', async () => {
  const css = await readCss()
  assertNineSliceContract(css, '.gm-button-primary')
  assertNineSliceContract(css, '.gm-button-chrome')
  assertNineSliceContract(css, '.gm-button-muted')
})

test('.gm-card-chrome, .gm-resource-pill, .gm-slot-frame use nine-slice border images', async () => {
  const css = await readCss()
  assertNineSliceContract(css, '.gm-card-chrome')
  assertNineSliceContract(css, '.gm-resource-pill')
  assertNineSliceContract(css, '.gm-slot-frame')
})

test('.gm-float-card and .gm-toast-frame use nine-slice border images', async () => {
  const css = await readCss()
  assertNineSliceContract(css, '.gm-float-card')
  assertNineSliceContract(css, '.gm-toast-frame')
})

test('existing responsive guards for fixed modal/panel/float elements and long text wrapping remain present', async () => {
  const css = await readCss()

  const fixedSizingGuard = /\.gm-panel-shell\.fixed\s*,\s*\.gm-modal-frame\.fixed\s*,\s*\.gm-float-card\.fixed\s*\{\s*max-width\s*:\s*calc\(100vw - 1rem\);\s*max-height\s*:\s*calc\(100dvh - 1rem\);\s*\}/
  assert.match(
    css,
    fixedSizingGuard,
    'Expected fixed modal/panel/float elements to keep their viewport-relative max-width/max-height guard',
  )

  const textWrapGuard = /\.gm-panel-shell :where\(p, span, h1, h2, h3, button\),\s*\.gm-modal-frame :where\(p, span, h1, h2, h3, button\),\s*\.gm-float-card :where\(p, span, h1, h2, h3, button\),\s*\.gm-card-chrome :where\(p, span, h1, h2, h3, button\)\s*\{\s*min-width\s*:\s*0;\s*max-width\s*:\s*100%;\s*overflow-wrap\s*:\s*anywhere;\s*\}/
  assert.match(
    css,
    textWrapGuard,
    'Expected long text inside frame chrome to keep wrapping via min-width: 0 / overflow-wrap: anywhere',
  )

  const agentLabelBlock = extractRuleBlock(css, '.gm-room-agent-label')
  assert.match(
    agentLabelBlock,
    /white-space\s*:\s*normal;/,
    'Expected .gm-room-agent-label to keep wrapping long names instead of truncating',
  )
  assert.match(
    agentLabelBlock,
    /overflow-wrap\s*:\s*anywhere;/,
    'Expected .gm-room-agent-label to keep breaking long words anywhere',
  )
})
