import { useEffect, useMemo, useRef, useState } from 'react'
import { SLUG_SHIELD } from '@/data/seed'
import type { CategoriaVeiculo } from '@/types'
import { fotoDaFrota, rotuloCurtoFrota } from './fotosFrota'
import './SeletorCategoria3D.css'

type Props = {
  categorias: CategoriaVeiculo[]
  categoriaId: string
  passageiros: number
  aoSelecionar: (id: string) => void
  formatarAdicional: (valor: number) => string
}

type CartaoFrota = CategoriaVeiculo & { serve: boolean }

export function SeletorCategoria3D({
  categorias,
  categoriaId,
  passageiros,
  aoSelecionar,
  formatarAdicional,
}: Props) {
  const escolhaTravada = useRef(false)
  const [movimento, setMovimento] = useState(true)

  const selecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId) ?? categorias[0],
    [categorias, categoriaId],
  )

  const categoriasValidas = useMemo(
    () =>
      categorias.map((c) => ({
        ...c,
        serve: passageiros >= c.capacidade_min && passageiros <= c.capacidade_max,
      })),
    [categorias, passageiros],
  )

  const idsQueServem = useMemo(
    () => categoriasValidas.filter((c) => c.serve).map((c) => c.id).join('|'),
    [categoriasValidas],
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setMovimento(!media.matches)
    aplicar()
    media.addEventListener('change', aplicar)
    return () => media.removeEventListener('change', aplicar)
  }, [])

  useEffect(() => {
    if (!movimento) return
    const ids = idsQueServem.split('|').filter(Boolean)
    if (ids.length < 2) return
    const timer = window.setInterval(() => {
      if (escolhaTravada.current) return
      const atual = ids.indexOf(categoriaId)
      const proxima = ids[(atual + 1) % ids.length]
      if (proxima && proxima !== categoriaId) aoSelecionar(proxima)
    }, 3800)
    return () => window.clearInterval(timer)
  }, [movimento, idsQueServem, categoriaId, aoSelecionar])

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD
  const foto = fotoDaFrota(selecionada.slug)
  const copias = movimento ? [0, 1] : [0]

  function escolher(id: string, serve: boolean) {
    if (!serve) return
    escolhaTravada.current = true
    aoSelecionar(id)
  }

  function cartao(c: CartaoFrota, copia: number) {
    const ativa = c.id === categoriaId
    return (
      <button
        key={`${copia}-${c.id}`}
        type="button"
        role="option"
        aria-selected={ativa}
        tabIndex={copia === 1 ? -1 : undefined}
        disabled={!c.serve}
        className={`showroom-card ${ativa ? 'showroom-card--ativo' : ''} ${
          c.slug === SLUG_SHIELD ? 'showroom-card--elite' : ''
        }`}
        onClick={() => escolher(c.id, c.serve)}
      >
        <img src={fotoDaFrota(c.slug)} alt="" loading="lazy" decoding="async" />
        <span>{rotuloCurtoFrota(c.slug, c.nome)}</span>
      </button>
    )
  }

  return (
    <section className="showroom">
      <header className="showroom-cabeca">
        <p className="showroom-marca">Jemani</p>
        <p className="showroom-kicker">Frota de luxo</p>
        {elite && <span className="showroom-selo">Top 1 · Proteção de elite</span>}
        <h3 className="showroom-nome">{selecionada.nome}</h3>
        <p className="showroom-desc">{selecionada.descricao}</p>
      </header>

      <div className="showroom-palco">
        <img key={selecionada.id} className="showroom-foto" src={foto} alt={selecionada.nome} />
        <span className="showroom-anel" aria-hidden="true" />
      </div>

      <ul className="showroom-specs">
        <li>
          <span className="showroom-spec-valor">
            {selecionada.capacidade_min}–{selecionada.capacidade_max}
          </span>
          <span className="showroom-spec-rotulo">Passageiros</span>
        </li>
        <li>
          <span className="showroom-spec-valor">
            {selecionada.adicional_preco > 0
              ? `+${formatarAdicional(selecionada.adicional_preco)}`
              : 'Incluso'}
          </span>
          <span className="showroom-spec-rotulo">Adicional</span>
        </li>
        <li>
          <span className="showroom-spec-valor">{elite ? 'Elite' : 'Preto'}</span>
          <span className="showroom-spec-rotulo">Acabamento</span>
        </li>
      </ul>

      <div className="showroom-faixa" role="listbox" aria-label="Frota">
        <div className={movimento ? 'showroom-faixa-trilho showroom-faixa-trilho--loop' : 'showroom-faixa-trilho'}>
          {copias.map((copia) => (
            <div
              key={copia}
              className="showroom-faixa-grupo"
              aria-hidden={copia === 1 ? true : undefined}
            >
              {categoriasValidas.map((c) => cartao(c, copia))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
