import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, copyFileSync } from 'fs'
import { join, resolve } from 'path'
import { execSync, spawnSync } from 'child_process'

const root = resolve(import.meta.dirname, '..')
const pkgPath = join(root, 'package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
pkg.version = `${major}.${minor}.${patch + 1}`
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`버전 업: v${[major, minor, patch].join('.')} → v${pkg.version}`)

// 구 HTML 릴리스 파일 전부 삭제
const releaseDir = join(root, 'release')
if (existsSync(releaseDir)) {
  for (const f of readdirSync(releaseDir)) {
    if (f.endsWith('.html')) rmSync(join(releaseDir, f))
  }
}

// 루트에 있는 구 EXE 삭제 (실행 중인 파일은 건너뜀)
for (const f of readdirSync(root)) {
  if (f.endsWith('.exe')) try { rmSync(join(root, f)) } catch { /* locked, skip */ }
}

execSync('npm run build', { cwd: root, stdio: 'inherit' })
execSync('node scripts/inline-build.js', { cwd: root, stdio: 'inherit' })

// Electron 빌드 (node_modules 설치된 경우에만)
const electronDir = join(root, 'electron')
const electronModules = join(electronDir, 'node_modules')

if (existsSync(electronModules)) {
  console.log('\nElectron 빌드 시작...')

  // electron/release 구 파일 정리 (win-unpacked 폴더, 구 exe, yml)
  const eReleaseDir = join(electronDir, 'release')
  if (existsSync(eReleaseDir)) {
    for (const f of readdirSync(eReleaseDir)) {
      const fp = join(eReleaseDir, f)
      try { rmSync(fp, { recursive: true, force: true }) } catch { /* locked file, skip */ }
    }
  }

  // electron/package.json 버전 동기화
  const ePkgPath = join(electronDir, 'package.json')
  const ePkg = JSON.parse(readFileSync(ePkgPath, 'utf-8'))
  ePkg.version = pkg.version
  writeFileSync(ePkgPath, JSON.stringify(ePkg, null, 2) + '\n')

  // dist/ → electron/dist/ 복사
  const distSrc = join(root, 'dist')
  const distDst = join(electronDir, 'dist')
  execSync(`xcopy /E /I /Y "${distSrc}" "${distDst}"`, { stdio: 'pipe', shell: true })

  let ebDone = false
  try {
    const ebResult = spawnSync(
      process.execPath,
      ['./node_modules/electron-builder/cli.js', '--win', '--x64'],
      { cwd: electronDir, stdio: 'pipe', encoding: 'utf8' }
    )
    if (ebResult.stdout) process.stdout.write(ebResult.stdout)
    if (ebResult.stderr) process.stderr.write(ebResult.stderr)
    ebDone = true
  } catch (e) {
    console.error('spawnSync error:', e)
  }

  const exeName = `GuildManager_v${pkg.version}_portable.exe`
  const exeSrc = join(eReleaseDir, exeName)
  const exeDst = join(root, exeName)

  if (existsSync(exeSrc)) {
    copyFileSync(exeSrc, exeDst)
    console.log(`\n✅ 실행 파일: ${exeDst}`)
  } else if (ebDone) {
    console.log('Electron 빌드 완료 (exe 경로 확인 필요)')
  } else {
    console.log('Electron 빌드 실패')
  }
} else {
  console.log('\n💡 .exe 빌드하려면 electron/ 폴더에서 npm install 실행 후 재빌드하세요.')
}
