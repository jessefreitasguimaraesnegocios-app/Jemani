import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export type InfoVersaoRemota = {
  versionCode: number
  versionName: string
  apkUrl: string
  atualizadoEm?: string
}

const URL_PADRAO =
  (import.meta.env.VITE_APP_UPDATE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://jemani.vercel.app'

export function urlManifestoAtualizacao() {
  return `${URL_PADRAO}/downloads/versao-android.json`
}

export async function lerVersaoInstalada(): Promise<{ versionCode: number; versionName: string } | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const info = await App.getInfo()
    const versionCode = Number(info.build)
    if (!Number.isFinite(versionCode)) return null
    return { versionCode, versionName: info.version || String(versionCode) }
  } catch {
    return null
  }
}

export async function buscarVersaoRemota(): Promise<InfoVersaoRemota | null> {
  try {
    const res = await fetch(urlManifestoAtualizacao(), { cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as Partial<InfoVersaoRemota>
    const versionCode = Number(json.versionCode)
    if (!Number.isFinite(versionCode) || versionCode < 1) return null
    const apkUrl =
      typeof json.apkUrl === 'string' && json.apkUrl.trim()
        ? json.apkUrl.trim()
        : `${URL_PADRAO}/downloads/jemani-android.apk`
    return {
      versionCode,
      versionName: String(json.versionName ?? `1.0.${versionCode}`),
      apkUrl,
      atualizadoEm: typeof json.atualizadoEm === 'string' ? json.atualizadoEm : undefined,
    }
  } catch {
    return null
  }
}

export async function verificarAtualizacaoApp(): Promise<{
  precisaAtualizar: boolean
  instalada?: { versionCode: number; versionName: string }
  remota?: InfoVersaoRemota
} | null> {
  if (!Capacitor.isNativePlatform()) return null
  const instalada = await lerVersaoInstalada()
  if (!instalada) return null
  const remota = await buscarVersaoRemota()
  if (!remota) return null
  return {
    precisaAtualizar: remota.versionCode > instalada.versionCode,
    instalada,
    remota,
  }
}

export async function abrirDownloadApk(apkUrl: string) {
  await Browser.open({ url: apkUrl })
}
