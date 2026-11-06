import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { usarIdioma } from '@/i18n/usarIdioma'
import {
  abrirDownloadApk,
  verificarAtualizacaoApp,
  type InfoVersaoRemota,
} from '@/services/atualizacaoApp'
import './AvisoAtualizacaoApp.css'

export function AvisoAtualizacaoApp() {
  const { t } = usarIdioma()
  const [remota, setRemota] = useState<InfoVersaoRemota | null>(null)
  const [instalada, setInstalada] = useState('')
  const [aberto, setAberto] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const downloadDisparadoRef = useRef<number | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let vivo = true
    let listenerApp: PluginListenerHandle | null = null

    async function dispararDownload(info: InfoVersaoRemota) {
      if (downloadDisparadoRef.current === info.versionCode) return
      downloadDisparadoRef.current = info.versionCode
      setBaixando(true)
      try {
        await abrirDownloadApk(info.apkUrl)
      } finally {
        if (vivo) setBaixando(false)
      }
    }

    async function checar() {
      const resultado = await verificarAtualizacaoApp()
      if (!vivo || !resultado?.precisaAtualizar || !resultado.remota) {
        if (vivo && resultado && !resultado.precisaAtualizar) {
          setAberto(false)
          setRemota(null)
        }
        return
      }
      setRemota(resultado.remota)
      setInstalada(resultado.instalada?.versionName ?? '')
      setAberto(true)
      void dispararDownload(resultado.remota)
    }

    void checar()

    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void checar()
    }).then((handle) => {
      listenerApp = handle
    })

    const aoVisivel = () => {
      if (document.visibilityState === 'visible') void checar()
    }
    document.addEventListener('visibilitychange', aoVisivel)

    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', aoVisivel)
      void listenerApp?.remove()
    }
  }, [])

  if (!aberto || !remota) return null

  async function atualizarAgora() {
    setBaixando(true)
    try {
      await abrirDownloadApk(remota!.apkUrl)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="aviso-atualizacao" role="dialog" aria-modal="true" aria-labelledby="aviso-atualizacao-titulo">
      <div className="aviso-atualizacao-cartao">
        <p className="aviso-atualizacao-olho">{t('atualizacao.olho')}</p>
        <h2 id="aviso-atualizacao-titulo" className="fonte-display">
          {t('atualizacao.titulo')}
        </h2>
        <p className="aviso-atualizacao-texto">{t('atualizacao.texto')}</p>
        <p className="aviso-atualizacao-versoes">
          {t('atualizacao.versoes', {
            atual: instalada || '—',
            nova: remota.versionName,
          })}
        </p>
        <div className="aviso-atualizacao-acoes">
          <button type="button" className="btn-primario" disabled={baixando} onClick={() => void atualizarAgora()}>
            {baixando ? t('atualizacao.abrindo') : t('atualizacao.botao')}
          </button>
        </div>
        <p className="aviso-atualizacao-dica">{t('atualizacao.dica')}</p>
      </div>
    </div>
  )
}
