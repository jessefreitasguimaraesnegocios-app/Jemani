import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { usarIdioma } from '@/i18n/usarIdioma'
import {
  abrirDownloadApk,
  verificarAtualizacaoApp,
  type InfoVersaoRemota,
} from '@/services/atualizacaoApp'
import './AvisoAtualizacaoApp.css'

const CHAVE_SESSAO = 'jemani.atualizacao.ignorar'

export function AvisoAtualizacaoApp() {
  const { t } = usarIdioma()
  const [remota, setRemota] = useState<InfoVersaoRemota | null>(null)
  const [instalada, setInstalada] = useState('')
  const [aberto, setAberto] = useState(false)
  const [baixando, setBaixando] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (sessionStorage.getItem(CHAVE_SESSAO) === '1') return
    let vivo = true
    void verificarAtualizacaoApp().then((resultado) => {
      if (!vivo || !resultado?.precisaAtualizar || !resultado.remota) return
      setRemota(resultado.remota)
      setInstalada(resultado.instalada?.versionName ?? '')
      setAberto(true)
    })
    return () => {
      vivo = false
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

  function depois() {
    sessionStorage.setItem(CHAVE_SESSAO, '1')
    setAberto(false)
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
          <button type="button" className="btn-secundario" onClick={depois}>
            {t('atualizacao.depois')}
          </button>
        </div>
        <p className="aviso-atualizacao-dica">{t('atualizacao.dica')}</p>
      </div>
    </div>
  )
}
