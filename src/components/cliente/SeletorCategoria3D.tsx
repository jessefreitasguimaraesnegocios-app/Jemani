import { useEffect, useMemo, useRef, useState } from 'react'
import { SLUG_SHIELD } from '@/data/seed'
import { veiculoDestaqueDaCategoria } from '@/services/frotaCliente'
import type { CategoriaVeiculo, Empresa, Veiculo } from '@/types'
import { fotoDaFrota, rotuloCurtoFrota } from './fotosFrota'
import './SeletorCategoria3D.css'

type Props = {
  categorias: CategoriaVeiculo[]
  categoriaId: string
  passageiros: number
  veiculos?: Veiculo[]
  empresas?: Empresa[]
  aoSelecionar: (id: string) => void
  formatarAdicional: (valor: number) => string
}

type CartaoFrota = CategoriaVeiculo & { serve: boolean }

export function SeletorCategoria3D({
  categorias,
  categoriaId,
  passageiros,
  veiculos = [],
  empresas = [],
  aoSelecionar,
  formatarAdicional,
}: Props) {
  const faixaRef = useRef<HTMLDivElement>(null)
  const pausaFaixa = useRef(0)
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

  function fotoCategoria(categoria: CategoriaVeiculo) {
    const destaque = veiculoDestaqueDaCategoria(categoria.id, veiculos, empresas)
    return destaque?.fotos[0] ?? fotoDaFrota(categoria.slug)
  }

  function rotuloCategoria(categoria: CategoriaVeiculo) {
    const destaque = veiculoDestaqueDaCategoria(categoria.id, veiculos, empresas)
    if (destaque) return `${destaque.marca} ${destaque.modelo}`.trim()
    return rotuloCurtoFrota(categoria.slug, categoria.nome)
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setMovimento(!media.matches)
    aplicar()
    media.addEventListener('change', aplicar)
    return () => media.removeEventListener('change', aplicar)
  }, [])

  useEffect(() => {
    const trilho = faixaRef.current
    if (!trilho || !movimento) return
    let quadro = 0
    const andar = () => {
      if (Date.now() >= pausaFaixa.current) {
        const metade = trilho.scrollWidth / 2
        if (metade > 0 && trilho.scrollLeft >= metade) trilho.scrollLeft -= metade
        trilho.scrollLeft += 0.55
      }
      quadro = window.requestAnimationFrame(andar)
    }
    const pausar = () => {
      pausaFaixa.current = Number.POSITIVE_INFINITY
    }
    const seguir = () => {
      pausaFaixa.current = 0
    }
    trilho.addEventListener('pointerenter', pausar)
    trilho.addEventListener('pointerleave', seguir)
    trilho.addEventListener('pointerdown', pausar)
    trilho.addEventListener('pointerup', seguir)
    trilho.addEventListener('pointercancel', seguir)
    quadro = window.requestAnimationFrame(andar)
    return () => {
      window.cancelAnimationFrame(quadro)
      trilho.removeEventListener('pointerenter', pausar)
      trilho.removeEventListener('pointerleave', seguir)
      trilho.removeEventListener('pointerdown', pausar)
      trilho.removeEventListener('pointerup', seguir)
      trilho.removeEventListener('pointercancel', seguir)
    }
  }, [movimento, categoriasValidas.length])

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD
  const veiculoSelecionado = veiculoDestaqueDaCategoria(selecionada.id, veiculos, empresas)
  const foto = fotoCategoria(selecionada)
  const copias = movimento ? [0, 1] : [0]

  function escolher(id: string, serve: boolean) {
    if (!serve) return
    pausaFaixa.current = Date.now() + 1800
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
        <img src={fotoCategoria(c)} alt="" loading="lazy" decoding="async" />
        <span>{rotuloCategoria(c)}</span>
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
        {veiculoSelecionado && (
          <p className="showroom-modelo">
            {veiculoSelecionado.marca} {veiculoSelecionado.modelo} · {veiculoSelecionado.ano}
          </p>
        )}
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

      <div className="showroom-faixa" ref={faixaRef} role="listbox" aria-label="Frota">
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
    </section>
  )
}
