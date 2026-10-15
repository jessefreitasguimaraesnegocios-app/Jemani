import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const windows = process.platform === 'win32'
const env = {
  ...process.env,
  VITE_DEMO_MODE: 'false',
  VITE_ALLOW_DEV_PAYMENT: 'false',
}

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: 'inherit', shell: windows, env })
}

const downloads = resolve(root, 'public/downloads')
const publishedApk = resolve(downloads, 'jemani-android.apk')
const stagedApk = resolve(root, '.native-apk-backup')
mkdirSync(downloads, { recursive: true })
if (existsSync(stagedApk)) rmSync(stagedApk)
if (existsSync(publishedApk)) renameSync(publishedApk, stagedApk)

try {
  run(windows ? 'npm.cmd' : 'npm', ['run', 'build'])
  run(windows ? 'npx.cmd' : 'npx', ['cap', 'sync', 'ios'])
  console.log('Assets do Jemani sincronizados para iOS. A compilação/assinatura do IPA requer macOS e Xcode.')
} finally {
  if (existsSync(stagedApk)) {
    if (existsSync(publishedApk)) rmSync(stagedApk)
    else renameSync(stagedApk, publishedApk)
  }
}
