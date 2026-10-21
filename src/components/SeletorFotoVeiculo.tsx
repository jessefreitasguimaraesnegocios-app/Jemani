import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { FotoCatalogoVeiculo } from '@/types'
import './SeletorFotoVeiculo.css'

function textoBusca(valor?: string | number | null) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function SeletorFotoVeiculo({
  urlAtual,
  onEscolher,
}: {
  urlAtual?: string
  onEscolher: (url: string | undefined) => void
}) {
  const { t } = usarIdioma()
  const fotos = useDemoStore((s) => s.fotosCatalogoVeiculo)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const termo = textoBusca(busca).trim()
    if (!termo) return fotos
    return fotos.filter((foto) => {
      const bloco = [foto.nome, foto.marca, foto.modelo, foto.ano].map(textoBusca).join(' ')
      return bloco.includes(termo)
    })
  }, [fotos, busca])

  function escolher(foto: FotoCatalogoVeiculo) {
    onEscolher(foto.url)
    setAberto(false)
  }

  return (
    <div className="seletor-foto-veiculo">
      <span className="rotulo">{t('empresa.veiculos.foto')}</span>
      <div className="seletor-foto-veiculo-atual">
        {urlAtual ? (
          <img src={urlAtual} alt="" className="seletor-foto-veiculo-preview" />
        ) : (
          <div className="seletor-foto-veiculo-vazio">{t('empresa.veiculos.semFoto')}</div>
        )}
        <div className="seletor-foto-veiculo-acoes">
          <button type="button" className="btn-secundario" onClick={() => setAberto(true)}>
            {t('empresa.veiculos.escolherFoto')}
          </button>
          {urlAtual && (
            <button type="button" className="btn-secundario" onClick={() => onEscolher(undefined)}>
              {t('empresa.veiculos.removerFoto')}
            </button>
          )}
        </div>
      </div>

      {aberto &&
        createPortal(
          <div
            className="seletor-foto-veiculo-popup"
            role="presentation"
            onClick={() => setAberto(false)}
          >
            <div
              className="seletor-foto-veiculo-painel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="seletor-foto-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="seletor-foto-titulo" className="fonte-display text-2xl">
                {t('empresa.veiculos.galeria')}
              </h2>
              <input
                className="campo"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t('admin.catalogo.busca')}
                autoComplete="off"
              />
              {filtradas.length === 0 ? (
                <p className="seletor-foto-veiculo-hint">{t('empresa.veiculos.galeriaVazia')}</p>
              ) : (
                <div className="seletor-foto-veiculo-grade">
                  {filtradas.map((foto) => (
                    <button
                      key={foto.id}
                      type="button"
                      className={`seletor-foto-veiculo-item${
                        urlAtual === foto.url ? ' seletor-foto-veiculo-item--ativo' : ''
                      }`}
                      onClick={() => escolher(foto)}
                    >
                      <img src={foto.url} alt={foto.nome} />
                      <span>
                        {foto.marca} {foto.modelo} · {foto.ano}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="btn-secundario" onClick={() => setAberto(false)}>
                {t('comum.cancelar')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
