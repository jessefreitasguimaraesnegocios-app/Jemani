import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SLUG_SHIELD } from '@/data/seed'
import {
  veiculoDestaqueDaCategoria,
  veiculosParaCarrosselReserva,
} from '@/services/frotaCliente'
import type { CategoriaVeiculo, Empresa, Veiculo } from '@/types'
import { fotoDaFrota, rotuloCurtoFrota } from './fotosFrota'
import './SeletorCategoria3D.css'

type Props = {
  categorias: CategoriaVeiculo[]
  categoriaId: string
  veiculoId?: string
  passageiros: number
  veiculos?: Veiculo[]
  empresas?: Empresa[]
  aoSelecionar: (categoriaId: string, veiculoId?: string) => void
  formatarAdicional: (valor: number) => string
}

type CartaoCategoria = CategoriaVeiculo & { serve: boolean }

type EstadoArrasto = {
  pointerId: number
  inicioX: number
  scrollInicio: number
  moveu: boolean
}

const LARGURA_CARTAO = 128
const GAP_CARTAO = 10

export function SeletorCategoria3D({
  categorias,
  categoriaId,
  veiculoId,
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
  const [temOverflow, setTemOverflow] = useState(false)

  const frota = useMemo(
    () => veiculosParaCarrosselReserva(veiculos, empresas, categorias, passageiros),
    [veiculos, empresas, categorias, passageiros],
  )

  const usarVeiculos = frota.length > 0

  const categoriasValidas = useMemo(
    () =>
      categorias.map((c) => ({
        ...c,
        serve: passageiros <= c.capacidade_max,
      })),
    [categorias, passageiros],
  )

  const veiculoSelecionado = useMemo(() => {
    if (usarVeiculos) {
      if (veiculoId) {
        const direto = frota.find((item) => item.id === veiculoId)
        if (direto) return direto
      }
      return (
        frota.find((item) => item.categoria_id === categoriaId && item.serve) ??
        frota.find((item) => item.categoria_id === categoriaId) ??
        frota.find((item) => item.serve) ??
        frota[0] ??
        null
      )
    }
    const destaque = veiculoDestaqueDaCategoria(
      categoriaId,
      veiculos,
      empresas,
      categorias,
    )
    if (!destaque) return null
    const categoria =
      categorias.find((c) => c.id === destaque.categoria_id) ??
      categorias.find((c) => c.id === categoriaId) ??
      categorias[0]
    if (!categoria) return null
    return { ...destaque, categoria, serve: passageiros <= categoria.capacidade_max }
  }, [
    usarVeiculos,
    veiculoId,
    frota,
    categoriaId,
    veiculos,
    empresas,
    categorias,
    passageiros,
  ])

  const selecionada = useMemo(() => {
    if (veiculoSelecionado) return veiculoSelecionado.categoria
    return categorias.find((c) => c.id === categoriaId) ?? categorias[0]
  }, [veiculoSelecionado, categorias, categoriaId])

  useEffect(() => {
    if (!usarVeiculos || !frota.length) return
    const atual = veiculoId ? frota.find((item) => item.id === veiculoId) : undefined
    if (atual && (atual.serve || !frota.some((item) => item.serve))) return
    const preferido =
      frota.find((item) => item.categoria_id === categoriaId && item.serve) ??
      frota.find((item) => item.serve) ??
      frota[0]
    if (!preferido) return
    if (preferido.id === veiculoId && preferido.categoria_id === categoriaId) return
    aoSelecionar(preferido.categoria_id, preferido.id)
  }, [usarVeiculos, frota, veiculoId, categoriaId, aoSelecionar])

  function fotoCategoria(categoria: CategoriaVeiculo) {
    const destaque = veiculoDestaqueDaCategoria(categoria.id, veiculos, empresas, categorias)
    return destaque?.fotos[0] ?? fotoDaFrota(categoria.slug)
  }

  function rotuloCategoria(categoria: CategoriaVeiculo) {
    const destaque = veiculoDestaqueDaCategoria(categoria.id, veiculos, empresas, categorias)
    if (destaque) return `${destaque.marca} ${destaque.modelo}`.trim()
    return rotuloCurtoFrota(categoria.slug, categoria.nome)
  }

  function fotoVeiculo(veiculo: Veiculo, categoria: CategoriaVeiculo) {
    return veiculo.fotos[0] || fotoDaFrota(categoria.slug)
  }

  function pausarAuto(ms = 2200) {
    pausaAte.current = Date.now() + ms
  }

  function medirOverflow() {
    const trilho = faixaRef.current
    if (!trilho) return
    setTemOverflow(trilho.scrollWidth > trilho.clientWidth + 8)
  }

  function deslizar(direcao: -1 | 1) {
    const trilho = faixaRef.current
    if (!trilho) return
    const passo = LARGURA_CARTAO + GAP_CARTAO
    const alvo = trilho.scrollLeft + direcao * passo
    trilho.scrollTo({ left: alvo, behavior: 'smooth' })
    pausarAuto(3200)
    window.setTimeout(() => {
      const metade = trilho.scrollWidth / 2
      if (movimento && metade > 0) {
        if (trilho.scrollLeft >= metade) trilho.scrollLeft -= metade
        if (trilho.scrollLeft < 0) trilho.scrollLeft += metade
      }
      medirOverflow()
    }, 360)
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setMovimento(!media.matches)
    aplicar()
    media.addEventListener('change', aplicar)
    return () => media.removeEventListener('change', aplicar)
  }, [])

  const chaveFaixa = usarVeiculos
    ? frota.map((item) => item.id).join('|')
    : categoriasValidas.map((c) => c.id).join('|')

  useEffect(() => {
    const trilho = faixaRef.current
    if (!trilho || !chaveFaixa) return

    let quadro = 0
    let vivo = true

    const andar = () => {
      if (!vivo) return
      if (movimento && !arrasto.current && Date.now() >= pausaAte.current) {
        const metade = trilho.scrollWidth / 2
        if (metade > 0 && trilho.scrollLeft >= metade) trilho.scrollLeft -= metade
        trilho.scrollLeft += 0.6
      }
      medirOverflow()
      quadro = window.requestAnimationFrame(andar)
    }

    const aoWheel = (evento: WheelEvent) => {
      if (trilho.scrollWidth <= trilho.clientWidth + 2) return
      const delta =
        Math.abs(evento.deltaY) > Math.abs(evento.deltaX) ? evento.deltaY : evento.deltaX
      if (delta === 0) return
      evento.preventDefault()
      trilho.scrollLeft += delta
      const metade = trilho.scrollWidth / 2
      if (movimento && metade > 0) {
        if (trilho.scrollLeft >= metade) trilho.scrollLeft -= metade
        if (trilho.scrollLeft < 0) trilho.scrollLeft += metade
      }
      pausarAuto(1800)
      medirOverflow()
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
      const metade = trilho.scrollWidth / 2
      if (movimento && metade > 0) {
        if (trilho.scrollLeft >= metade) {
          trilho.scrollLeft -= metade
          estado.scrollInicio = trilho.scrollLeft
          estado.inicioX = evento.clientX
        } else if (trilho.scrollLeft < 0) {
          trilho.scrollLeft += metade
          estado.scrollInicio = trilho.scrollLeft
          estado.inicioX = evento.clientX
        }
      }
      medirOverflow()
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
      pausarAuto(estado.moveu ? 2600 : 900)
      medirOverflow()
    }

    const aoResize = () => medirOverflow()

    trilho.scrollLeft = movimento ? 4 : 0
    pausaAte.current = 0
    medirOverflow()

    trilho.addEventListener('wheel', aoWheel, { passive: false })
    trilho.addEventListener('pointerdown', aoPointerDown)
    trilho.addEventListener('pointermove', aoPointerMove)
    trilho.addEventListener('pointerup', soltar)
    trilho.addEventListener('pointercancel', soltar)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    window.addEventListener('resize', aoResize)
    quadro = window.requestAnimationFrame(andar)

    return () => {
      vivo = false
      window.cancelAnimationFrame(quadro)
      trilho.removeEventListener('wheel', aoWheel)
      trilho.removeEventListener('pointerdown', aoPointerDown)
      trilho.removeEventListener('pointermove', aoPointerMove)
      trilho.removeEventListener('pointerup', soltar)
      trilho.removeEventListener('pointercancel', soltar)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      window.removeEventListener('resize', aoResize)
    }
  }, [movimento, chaveFaixa])

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD
  const foto = veiculoSelecionado
    ? fotoVeiculo(veiculoSelecionado, selecionada)
    : fotoCategoria(selecionada)
  const copias = movimento ? [0, 1] : [0]
  const mostrarSetas = temOverflow || movimento

  function escolherCategoria(id: string, serve: boolean) {
    if (!serve) return
    if (bloqueiaClick.current || arrasto.current?.moveu) {
      bloqueiaClick.current = false
      return
    }
    pausarAuto(1800)
    aoSelecionar(id)
  }

  function escolherVeiculo(
    item: ReturnType<typeof veiculosParaCarrosselReserva>[number],
  ) {
    if (!item.serve) return
    if (bloqueiaClick.current || arrasto.current?.moveu) {
      bloqueiaClick.current = false
      return
    }
    pausarAuto(1800)
    aoSelecionar(item.categoria_id, item.id)
  }

  function cartaoCategoria(c: CartaoCategoria, copia: number) {
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
        onClick={() => escolherCategoria(c.id, c.serve)}
      >
        <img src={fotoCategoria(c)} alt="" loading="lazy" decoding="async" draggable={false} />
        <span>{rotuloCategoria(c)}</span>
      </button>
    )
  }

  function cartaoVeiculo(
    item: ReturnType<typeof veiculosParaCarrosselReserva>[number],
    copia: number,
  ) {
    const ativa = veiculoSelecionado?.id === item.id
    return (
      <button
        key={`${copia}-${item.id}`}
        type="button"
        role="option"
        aria-selected={ativa}
        tabIndex={copia === 1 ? -1 : undefined}
        disabled={!item.serve}
        className={`showroom-card ${ativa ? 'showroom-card--ativo' : ''} ${
          item.categoria.slug === SLUG_SHIELD ? 'showroom-card--elite' : ''
        }`}
        onClick={() => escolherVeiculo(item)}
      >
        <img
          src={fotoVeiculo(item, item.categoria)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span>
          {item.marca} {item.modelo}
        </span>
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
        <img
          key={veiculoSelecionado?.id ?? selecionada.id}
          className="showroom-foto"
          src={foto}
          alt={
            veiculoSelecionado
              ? `${veiculoSelecionado.marca} ${veiculoSelecionado.modelo}`
              : selecionada.nome
          }
        />
        <span className="showroom-anel" aria-hidden="true" />
      </div>

      <ul className="showroom-specs">
        <li>
          <span className="showroom-spec-valor">
            até {veiculoSelecionado?.capacidade || selecionada.capacidade_max}
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

      <div className={`showroom-faixa-envolve ${mostrarSetas ? 'showroom-faixa-envolve--setas' : ''}`}>
        {mostrarSetas && (
          <button
            type="button"
            className="showroom-seta showroom-seta--esquerda"
            aria-label="Ver veículos anteriores"
            onClick={() => deslizar(-1)}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="showroom-faixa" ref={faixaRef} role="listbox" aria-label="Frota">
          {copias.map((copia) => (
            <div
              key={copia}
              className="showroom-faixa-grupo"
              aria-hidden={copia === 1 ? true : undefined}
            >
              {usarVeiculos
                ? frota.map((item) => cartaoVeiculo(item, copia))
                : categoriasValidas.map((c) => cartaoCategoria(c, copia))}
            </div>
          ))}
        </div>
        {mostrarSetas && (
          <button
            type="button"
            className="showroom-seta showroom-seta--direita"
            aria-label="Ver próximos veículos"
            onClick={() => deslizar(1)}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </section>
  )
}
