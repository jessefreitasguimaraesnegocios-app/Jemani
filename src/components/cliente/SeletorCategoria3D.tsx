import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

type EstadoArrasto = {
  pointerId: number
  inicioX: number
  scrollInicio: number
  moveu: boolean
}

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
  const pausaAte = useRef(0)
  const arrasto = useRef<EstadoArrasto | null>(null)
  const bloqueiaClick = useRef(false)
  const [movimento, setMovimento] = useState(true)
  const [podeVoltar, setPodeVoltar] = useState(false)
  const [podeAvancar, setPodeAvancar] = useState(true)

  const selecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId) ?? categorias[0],
    [categorias, categoriaId],
  )

  const categoriasValidas = useMemo(
    () =>
      categorias.map((c) => ({
        ...c,
        serve: passageiros <= c.capacidade_max,
      })),
    [categorias, passageiros],
  )

  function fotoCategoria(categoria: CategoriaVeiculo) {
    const destaque = veiculoDestaqueDaCategoria(categoria.id, veiculos, empresas, categorias)
    return destaque?.fotos[0] ?? fotoDaFrota(categoria.slug)
  }

  function rotuloCategoria(categoria: CategoriaVeiculo) {
    const destaque = veiculoDestaqueDaCategoria(categoria.id, veiculos, empresas, categorias)
    if (destaque) return `${destaque.marca} ${destaque.modelo}`.trim()
    return rotuloCurtoFrota(categoria.slug, categoria.nome)
  }

  function pausarAuto(ms = 2000) {
    pausaAte.current = Date.now() + ms
  }

  function atualizarSetas() {
    const trilho = faixaRef.current
    if (!trilho) return
    const max = Math.max(0, trilho.scrollWidth - trilho.clientWidth)
    setPodeVoltar(trilho.scrollLeft > 4)
    setPodeAvancar(max > 4 && trilho.scrollLeft < max - 4)
  }

  function normalizarLoop() {
    const trilho = faixaRef.current
    if (!trilho || !movimento) return
    const metade = trilho.scrollWidth / 2
    if (metade <= 0) return
    if (trilho.scrollLeft >= metade) trilho.scrollLeft -= metade
    if (trilho.scrollLeft < 0) trilho.scrollLeft += metade
  }

  function deslizar(direcao: -1 | 1) {
    const trilho = faixaRef.current
    if (!trilho) return
    const passo = Math.max(180, Math.floor(trilho.clientWidth * 0.75))
    trilho.scrollBy({ left: direcao * passo, behavior: 'smooth' })
    pausarAuto(2800)
    window.setTimeout(atualizarSetas, 320)
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setMovimento(!media.matches)
    aplicar()
    media.addEventListener('change', aplicar)
    return () => media.removeEventListener('change', aplicar)
  }, [])

  const chaveFaixa = categoriasValidas.map((c) => c.id).join('|')

  useEffect(() => {
    const trilho = faixaRef.current
    if (!trilho || !chaveFaixa) return

    let quadro = 0
    let vivo = true

    const andar = () => {
      if (!vivo) return
      if (movimento && !arrasto.current && Date.now() >= pausaAte.current) {
        normalizarLoop()
        trilho.scrollLeft += 0.55
      }
      atualizarSetas()
      quadro = window.requestAnimationFrame(andar)
    }

    const aoScroll = () => {
      normalizarLoop()
      atualizarSetas()
    }

    const aoWheel = (evento: WheelEvent) => {
      if (trilho.scrollWidth <= trilho.clientWidth + 2) return
      const delta =
        Math.abs(evento.deltaY) > Math.abs(evento.deltaX) ? evento.deltaY : evento.deltaX
      if (delta === 0) return
      evento.preventDefault()
      trilho.scrollLeft += delta
      normalizarLoop()
      pausarAuto(1800)
      atualizarSetas()
    }

    const aoPointerDown = (evento: PointerEvent) => {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return
      arrasto.current = {
        pointerId: evento.pointerId,
        inicioX: evento.clientX,
        scrollInicio: trilho.scrollLeft,
        moveu: false,
      }
      bloqueiaClick.current = false
      pausaAte.current = Number.POSITIVE_INFINITY
      trilho.classList.add('showroom-faixa--arrastando')
      try {
        trilho.setPointerCapture(evento.pointerId)
      } catch {
        /* ignore */
      }
    }

    const aoPointerMove = (evento: PointerEvent) => {
      const estado = arrasto.current
      if (!estado || estado.pointerId !== evento.pointerId) return
      const delta = evento.clientX - estado.inicioX
      if (!estado.moveu && Math.abs(delta) > 5) {
        estado.moveu = true
        bloqueiaClick.current = true
      }
      if (!estado.moveu) return
      evento.preventDefault()
      trilho.scrollLeft = estado.scrollInicio - delta
      normalizarLoop()
      atualizarSetas()
    }

    const soltar = (evento: PointerEvent) => {
      const estado = arrasto.current
      if (!estado || estado.pointerId !== evento.pointerId) return
      arrasto.current = null
      trilho.classList.remove('showroom-faixa--arrastando')
      try {
        trilho.releasePointerCapture(evento.pointerId)
      } catch {
        /* ignore */
      }
      pausarAuto(estado.moveu ? 2400 : 900)
      atualizarSetas()
    }

    trilho.scrollLeft = 0
    pausaAte.current = 0
    atualizarSetas()

    trilho.addEventListener('scroll', aoScroll, { passive: true })
    trilho.addEventListener('wheel', aoWheel, { passive: false })
    trilho.addEventListener('pointerdown', aoPointerDown)
    trilho.addEventListener('pointermove', aoPointerMove)
    trilho.addEventListener('pointerup', soltar)
    trilho.addEventListener('pointercancel', soltar)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    quadro = window.requestAnimationFrame(andar)

    return () => {
      vivo = false
      window.cancelAnimationFrame(quadro)
      trilho.removeEventListener('scroll', aoScroll)
      trilho.removeEventListener('wheel', aoWheel)
      trilho.removeEventListener('pointerdown', aoPointerDown)
      trilho.removeEventListener('pointermove', aoPointerMove)
      trilho.removeEventListener('pointerup', soltar)
      trilho.removeEventListener('pointercancel', soltar)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [movimento, chaveFaixa])

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD
  const veiculoSelecionado = veiculoDestaqueDaCategoria(
    selecionada.id,
    veiculos,
    empresas,
    categorias,
  )
  const foto = fotoCategoria(selecionada)
  const copias = movimento ? [0, 1] : [0]

  function escolher(id: string, serve: boolean) {
    if (!serve) return
    if (bloqueiaClick.current || arrasto.current?.moveu) {
      bloqueiaClick.current = false
      return
    }
    pausarAuto(1800)
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
        <img src={fotoCategoria(c)} alt="" loading="lazy" decoding="async" draggable={false} />
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
          <span className="showroom-spec-valor">até {selecionada.capacidade_max}</span>
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

      <div className="showroom-faixa-envolve">
        <button
          type="button"
          className="showroom-seta showroom-seta--esquerda"
          aria-label="Ver veículos anteriores"
          disabled={!podeVoltar}
          onClick={() => deslizar(-1)}
        >
          <ChevronLeft size={18} />
        </button>
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
        <button
          type="button"
          className="showroom-seta showroom-seta--direita"
          aria-label="Ver próximos veículos"
          disabled={!podeAvancar}
          onClick={() => deslizar(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}
