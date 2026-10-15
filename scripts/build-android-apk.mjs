import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const windows = process.platform === 'win32'
const javaCandidates = windows
  ? [resolve(process.env.ProgramFiles || 'C:/Program Files', 'Android/Android Studio/jbr')]
  : []
const javaHome = process.env.JAVA_HOME || javaCandidates.find((candidate) => existsSync(candidate))
const androidSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
  (windows ? resolve(process.env.LOCALAPPDATA || '', 'Android/Sdk') : undefined)
const gradleHome = process.env.GRADLE_USER_HOME ||
  resolve(root, '.gradle-home')
const buildEnv = {
  ...process.env,
  ...(javaHome ? { JAVA_HOME: javaHome, PATH: `${resolve(javaHome, 'bin')}${windows ? ';' : ':'}${process.env.PATH || ''}` } : {}),
  ...(androidSdk ? { ANDROID_HOME: androidSdk } : {}),
  GRADLE_USER_HOME: gradleHome,
  VITE_DEMO_MODE: 'false',
  VITE_ALLOW_DEV_PAYMENT: 'false',
}

function run(command, args, cwd = root) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: windows,
    env: buildEnv,
  })
}

const builtApk = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk')
const downloads = resolve(root, 'public/downloads')
const publishedApk = resolve(downloads, 'jemani-android.apk')
const stagedApk = resolve(root, '.native-apk-backup')
mkdirSync(downloads, { recursive: true })
if (existsSync(stagedApk)) rmSync(stagedApk)
if (existsSync(publishedApk)) renameSync(publishedApk, stagedApk)

try {
  run(windows ? 'npm.cmd' : 'npm', ['run', 'build'])
  run(windows ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'])

  const gradle = windows ? 'gradlew.bat' : './gradlew'
  run(gradle, ['assembleDebug'], resolve(root, 'android'))
  copyFileSync(builtApk, publishedApk)
  console.log(`APK pronto: ${publishedApk} (${(statSync(publishedApk).size / 1024 / 1024).toFixed(1)} MB)`)
} finally {
  if (existsSync(stagedApk)) {
    if (existsSync(publishedApk)) rmSync(stagedApk)
    else renameSync(stagedApk, publishedApk)
  }
}
