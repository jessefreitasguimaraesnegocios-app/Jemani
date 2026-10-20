import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
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
  // APK no celular não enxerga 127.0.0.1 do PC — Stripe vai pelas Edge Functions.
  VITE_STRIPE_API_URL: '',
}

function run(command, args, cwd = root) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: windows,
    env: buildEnv,
  })
}

function lerVersaoAndroid() {
  const gradlePath = resolve(root, 'android/app/build.gradle')
  const texto = readFileSync(gradlePath, 'utf8')
  const match = texto.match(/versionCode\s+(\d+)/)
  const versionCode = match ? Number(match[1]) : 1
  const nomeMatch = texto.match(/versionName\s+"([^"]+)"/)
  return {
    versionCode: Number.isFinite(versionCode) ? versionCode : 1,
    versionName: nomeMatch?.[1] ?? `1.0.${versionCode || 1}`,
    gradlePath,
    texto,
  }
}

function gravarVersaoAndroid(versionCode, versionName) {
  const { gradlePath, texto: original } = lerVersaoAndroid()
  let texto = original
  if (!/versionCode\s+\d+/.test(texto)) {
    throw new Error('versionCode não encontrado em android/app/build.gradle')
  }
  texto = texto.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  if (/versionName\s+"[^"]+"/.test(texto)) {
    texto = texto.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`)
  } else {
    texto = texto.replace(
      /versionCode\s+\d+/,
      `versionCode ${versionCode}\n        versionName "${versionName}"`,
    )
  }
  writeFileSync(gradlePath, texto, 'utf8')
}

function incrementarVersaoAndroid() {
  const atual = lerVersaoAndroid()
  const versionCode = atual.versionCode + 1
  const versionName = `1.0.${versionCode}`
  gravarVersaoAndroid(versionCode, versionName)
  return { versionCode, versionName, anterior: atual }
}

function gravarManifestoAtualizacao({ versionCode, versionName }) {
  const site =
    (process.env.VITE_APP_UPDATE_URL || 'https://jemani.vercel.app').replace(/\/$/, '')
  const manifesto = {
    versionCode,
    versionName,
    apkUrl: `${site}/downloads/jemani-android.apk`,
    atualizadoEm: new Date().toISOString(),
  }
  writeFileSync(
    resolve(downloads, 'versao-android.json'),
    `${JSON.stringify(manifesto, null, 2)}\n`,
    'utf8',
  )
  console.log(
    `Manifesto de atualização: versionCode ${versionCode} (${versionName}) → ${manifesto.apkUrl}`,
  )
}

const builtApk = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk')
const downloads = resolve(root, 'public/downloads')
const publishedApk = resolve(downloads, 'jemani-android.apk')
const stagedApk = resolve(root, '.native-apk-backup')
mkdirSync(downloads, { recursive: true })
if (existsSync(stagedApk)) rmSync(stagedApk)
if (existsSync(publishedApk)) renameSync(publishedApk, stagedApk)

const versao = incrementarVersaoAndroid()
try {
  run(windows ? 'npm.cmd' : 'npm', ['run', 'build'])
  run(windows ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'])

  const gradle = windows ? 'gradlew.bat' : './gradlew'
  run(gradle, ['assembleDebug'], resolve(root, 'android'))
  copyFileSync(builtApk, publishedApk)
  gravarManifestoAtualizacao(versao)
  console.log(`APK pronto: ${publishedApk} (${(statSync(publishedApk).size / 1024 / 1024).toFixed(1)} MB)`)
} catch (erro) {
  gravarVersaoAndroid(versao.anterior.versionCode, versao.anterior.versionName)
  throw erro
} finally {
  if (existsSync(stagedApk)) {
    if (existsSync(publishedApk)) rmSync(stagedApk)
    else renameSync(stagedApk, publishedApk)
  }
}
