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
const PASSO_CARTAO = LARGURA_CARTAO + GAP_CARTAO
const VELOCIDADE_AUTO = 33 / 1000
const COPIA_PRINCIPAL = 1

function posicaoNoLoop(posicao: number, largura: number) {
  if (largura <= 0) return posicao

  // A cópia central tem espaço para deslizar nos dois sentidos.
  return largura + ((posicao % largura) + largura) % largura
}

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
  const grupoRef = useRef<HTMLDivElement>(null)
  const larguraLoop = useRef(0)
  const pausaAte = useRef(0)
  const mouseSobreFaixa = useRef(false)
  const arrasto = useRef<EstadoArrasto | null>(null)
  const bloqueiaClick = useRef(false)
  const [movimento, setMovimento] = useState(true)
  const [temOverflow, setTemOverflow] = useState(false)
  const [totalCopias, setTotalCopias] = useState(3)

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
      // Sem escolha do cliente: só preview visual, sem marcar cartão ativo.
      if (!categoriaId) {
        return frota.find((item) => item.serve) ?? frota[0] ?? null
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

  function deslizar(direcao: -1 | 1) {
    const trilho = faixaRef.current
    if (!trilho) return
    const posicao = posicaoNoLoop(trilho.scrollLeft, larguraLoop.current)
    if (posicao !== trilho.scrollLeft) trilho.scrollLeft = posicao

    pausarAuto(3200)
    trilho.scrollBy({ left: direcao * PASSO_CARTAO, behavior: 'smooth' })
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

  const repetir = movimento && (usarVeiculos ? frota.length : categoriasValidas.length) > 1

  useEffect(() => {
    const trilho = faixaRef.current
    const grupo = grupoRef.current
    if (!trilho || !grupo || !chaveFaixa) return

    let quadro = 0
    let quadroAnterior: number | undefined
    let fracao = 0
    larguraLoop.current = 0

    const andar = (agora: number) => {
      const intervalo = Math.min(agora - (quadroAnterior ?? agora), 50)
      quadroAnterior = agora
      if (
        larguraLoop.current > 0 &&
        !mouseSobreFaixa.current &&
        !arrasto.current &&
        Date.now() >= pausaAte.current
      ) {
        // O navegador pode arredondar scrollLeft. Acumule as frações até completar um pixel.
        fracao += intervalo * VELOCIDADE_AUTO
        const pixels = Math.floor(fracao)
        if (pixels > 0) {
          fracao -= pixels
          trilho.scrollLeft = posicaoNoLoop(trilho.scrollLeft + pixels, larguraLoop.current)
        }
      } else {
        fracao = 0
      }
      quadro = window.requestAnimationFrame(andar)
    }

    const aoWheel = (evento: WheelEvent) => {
      if (trilho.scrollWidth <= trilho.clientWidth + 2) return
      const delta =
        Math.abs(evento.deltaY) > Math.abs(evento.deltaX) ? evento.deltaY : evento.deltaX
      if (delta === 0) return
      evento.preventDefault()
      trilho.scrollLeft = posicaoNoLoop(trilho.scrollLeft + delta, larguraLoop.current)
      pausarAuto(1800)
    }

    const aoPointerDown = (evento: PointerEvent) => {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return
      // Clique em cartão: não captura o pointer (senão o click some).
      const noCartao = (evento.target as HTMLElement | null)?.closest?.('.showroom-card')
      arrasto.current = {
        pointerId: evento.pointerId,
        inicioX: evento.clientX,
        scrollInicio: trilho.scrollLeft,
        moveu: false,
      }
      bloqueiaClick.current = false
      pausaAte.current = Number.POSITIVE_INFINITY
      if (noCartao) return
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
      if (!estado.moveu && Math.abs(delta) > 6) {
        estado.moveu = true
        bloqueiaClick.current = true
        trilho.classList.add('showroom-faixa--arrastando')
        try {
          trilho.setPointerCapture(evento.pointerId)
        } catch {
          /* ignore */
        }
      }
      if (!estado.moveu) return
      evento.preventDefault()
      trilho.scrollLeft = posicaoNoLoop(estado.scrollInicio - delta, larguraLoop.current)
    }

    const soltar = (evento: PointerEvent) => {
      const estado = arrasto.current
      if (!estado || estado.pointerId !== evento.pointerId) return
      arrasto.current = null
      trilho.classList.remove('showroom-faixa--arrastando')
      try {
        if (trilho.hasPointerCapture?.(evento.pointerId)) {
          trilho.releasePointerCapture(evento.pointerId)
        }
      } catch {
        /* ignore */
      }
      pausarAuto(estado.moveu ? 2600 : 900)
      // Libera o bloqueio no próximo tick para o click do cartão ainda passar.
      if (estado.moveu) {
        window.setTimeout(() => {
          bloqueiaClick.current = false
        }, 0)
      } else {
        bloqueiaClick.current = false
      }
    }

    const aoResize = () => {
      const anterior = trilho.firstElementChild
      if (repetir && anterior) {
        const largura = Math.round(grupo.getBoundingClientRect().left - anterior.getBoundingClientRect().left)
        if (largura > 0) {
          // Número suficiente de cópias para preencher também telas largas com pouca frota.
          const necessarias = Math.max(3, Math.ceil((trilho.clientWidth + PASSO_CARTAO) / largura) + 2)
          setTotalCopias(necessarias)
          if (totalCopias >= necessarias && largura !== larguraLoop.current) {
            trilho.scrollLeft = posicaoNoLoop(trilho.scrollLeft, largura)
            larguraLoop.current = largura
          }
        }
      }
      setTemOverflow(trilho.scrollWidth > trilho.clientWidth + 8)
    }

    trilho.scrollLeft = 0
    pausaAte.current = 0
    aoResize()

    const observer = new ResizeObserver(aoResize)
    observer.observe(trilho)
    observer.observe(grupo)

    trilho.addEventListener('wheel', aoWheel, { passive: false })
    trilho.addEventListener('pointerdown', aoPointerDown)
    window.addEventListener('pointermove', aoPointerMove)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    quadro = window.requestAnimationFrame(andar)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(quadro)
      trilho.removeEventListener('wheel', aoWheel)
      trilho.removeEventListener('pointerdown', aoPointerDown)
      window.removeEventListener('pointermove', aoPointerMove)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [repetir, chaveFaixa, totalCopias])

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD
  const foto = veiculoSelecionado
    ? fotoVeiculo(veiculoSelecionado, selecionada)
    : fotoCategoria(selecionada)
  const copias = repetir ? Array.from({ length: totalCopias }, (_, indice) => indice) : [COPIA_PRINCIPAL]
  const mostrarSetas = temOverflow

  function escolherCategoria(id: string, serve: boolean) {
    if (!serve) return
    if (bloqueiaClick.current) {
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
    if (bloqueiaClick.current) {
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
        tabIndex={copia !== COPIA_PRINCIPAL ? -1 : undefined}
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
    const ativa = Boolean(veiculoId) && item.id === veiculoId
    return (
      <button
        key={`${copia}-${item.id}`}
        type="button"
        role="option"
        aria-selected={ativa}
        tabIndex={copia !== COPIA_PRINCIPAL ? -1 : undefined}
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

      <div
        className={`showroom-faixa-envolve ${mostrarSetas ? 'showroom-faixa-envolve--setas' : ''}`}
        onPointerEnter={(evento) => {
          if (evento.pointerType === 'mouse') mouseSobreFaixa.current = true
        }}
        onPointerLeave={(evento) => {
          if (evento.pointerType === 'mouse') mouseSobreFaixa.current = false
        }}
      >
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
              ref={copia === COPIA_PRINCIPAL ? grupoRef : undefined}
              className="showroom-faixa-grupo"
              aria-hidden={copia !== COPIA_PRINCIPAL ? true : undefined}
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
