import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'

const root = resolve(import.meta.dirname, '..')
const pkgPath = join(root, 'package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
pkg.version = `${major}.${minor}.${patch + 1}`
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`버전 업: v${[major, minor, patch].join('.')} → v${pkg.version}`)

execSync('npm run build', { cwd: root, stdio: 'inherit' })
execSync('node scripts/inline-build.js', { cwd: root, stdio: 'inherit' })
