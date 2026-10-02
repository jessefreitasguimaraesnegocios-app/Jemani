import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Float } from '@react-three/drei'
import gsap from 'gsap'
import { SLUG_SHIELD } from '@/data/seed'
import type { CategoriaVeiculo } from '@/types'
import { ModeloCarro3D } from './ModeloCarro3D'
import { obterEstiloCarro } from './paletaCarro'
import './SeletorCategoria3D.css'

type Props = {
  categorias: CategoriaVeiculo[]
  categoriaId: string
  passageiros: number
  aoSelecionar: (id: string) => void
  formatarAdicional: (valor: number) => string
}

function CameraCentralizada() {
  const { camera, size } = useThree()

  useLayoutEffect(() => {
    camera.position.set(0, 1.15, 4.6)
    camera.lookAt(0, 0.25, 0)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  return null
}

function CenaCarro({ slug }: { slug: string }) {
  const estilo = obterEstiloCarro(slug)
  return (
    <>
      <color attach="background" args={['#0a0e18']} />
      <fog attach="fog" args={['#0a0e18', 8, 18]} />
      <CameraCentralizada />
      <ambientLight intensity={0.55} color={estilo.luzAmbiente} />
      <spotLight
        position={[3.5, 5.5, 2.5]}
        angle={0.5}
        penumbra={0.75}
        intensity={2.4}
        color={estilo.luzPonto}
        castShadow
      />
      <spotLight position={[-3, 3, -2]} angle={0.6} penumbra={0.8} intensity={0.9} color="#8aa4ff" />
      <pointLight position={[0, 2.5, 3]} intensity={0.55} color="#fff4e0" />
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.22}>
        <ModeloCarro3D slug={slug} />
      </Float>
      <ContactShadows
        position={[0, -0.55, 0]}
        opacity={0.65}
        scale={10}
        blur={2.6}
        far={5}
        color="#000000"
      />
      <Environment preset="city" environmentIntensity={0.85} />
    </>
  )
}

export function SeletorCategoria3D({
  categorias,
  categoriaId,
  passageiros,
  aoSelecionar,
  formatarAdicional,
}: Props) {
  const palcoRef = useRef<HTMLDivElement>(null)
  const brilhoRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const inicioX = useRef(0)
  const [slugVisivel, setSlugVisivel] = useState(
    () => categorias.find((c) => c.id === categoriaId)?.slug ?? categorias[0]?.slug ?? '',
  )

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

  const animarTroca = useCallback((proximoSlug: string) => {
    const palco = palcoRef.current
    const brilho = brilhoRef.current
    const info = infoRef.current
    if (!palco) {
      setSlugVisivel(proximoSlug)
      return () => undefined
    }

    const timeline = gsap.timeline()

    timeline
      .to(palco, { scale: 0.94, opacity: 0.4, duration: 0.28, ease: 'power2.in' }, 0)
      .to(brilho, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0.05)
      .to(info, { y: 12, opacity: 0.4, duration: 0.22, ease: 'power2.in' }, 0)
      .add(() => setSlugVisivel(proximoSlug))
      .to(palco, { scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' })
      .to(brilho, { opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.35')
      .to(info, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.4')

    return () => {
      timeline.kill()
    }
  }, [])

  useEffect(() => {
    const slug = selecionada?.slug
    if (!slug || slug === slugVisivel) return
    return animarTroca(slug)
  }, [selecionada?.slug, slugVisivel, animarTroca])

  function escolherCategoria(id: string, serve: boolean) {
    if (!serve) return
    aoSelecionar(id)
  }

  function aoPonteiroBaixo(e: ReactPointerEvent<HTMLDivElement>) {
    inicioX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function aoPonteiroCima(e: ReactPointerEvent<HTMLDivElement>) {
    const delta = e.clientX - inicioX.current
    if (Math.abs(delta) < 48) return

    const indice = categoriasValidas.findIndex((c) => c.id === categoriaId)
    if (indice < 0) return

    const passo = delta < 0 ? 1 : -1
    let proximo = indice + passo
    while (proximo >= 0 && proximo < categoriasValidas.length) {
      if (categoriasValidas[proximo].serve) {
        aoSelecionar(categoriasValidas[proximo].id)
        return
      }
      proximo += passo
    }
  }

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD

  return (
    <div className="seletor-3d">
      <div
        ref={palcoRef}
        className="seletor-3d-palco"
        onPointerDown={aoPonteiroBaixo}
        onPointerUp={aoPonteiroCima}
      >
        <Canvas
          className="seletor-3d-canvas"
          camera={{ position: [0, 1.15, 4.6], fov: 32, near: 0.1, far: 40 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          shadows
        >
          <Suspense fallback={null}>
            <CenaCarro slug={slugVisivel || selecionada.slug} />
          </Suspense>
        </Canvas>
        <div ref={brilhoRef} className="seletor-3d-brilho" />
      </div>

      <div ref={infoRef} className="seletor-3d-info">
        {elite && <span className="seletor-3d-selo">Top 1 · Proteção de elite</span>}
        <h3 className="seletor-3d-nome">{selecionada.nome}</h3>
        <p className="seletor-3d-desc">{selecionada.descricao}</p>
        <p className="seletor-3d-meta">
          {selecionada.capacidade_min}–{selecionada.capacidade_max} passageiros
          {selecionada.adicional_preco > 0
            ? ` · +${formatarAdicional(selecionada.adicional_preco)}`
            : ''}
        </p>
      </div>

      <div className="seletor-3d-faixa" role="listbox" aria-label="Categorias de veículo">
        {categoriasValidas.map((c) => {
          const ativa = c.id === categoriaId
          const ehElite = c.slug === SLUG_SHIELD
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={ativa}
              disabled={!c.serve}
              onClick={() => escolherCategoria(c.id, c.serve)}
              className={`seletor-3d-chip ${ativa ? 'seletor-3d-chip--ativo' : ''} ${
                ehElite ? 'seletor-3d-chip--elite' : ''
              }`}
            >
              <span className="seletor-3d-chip-titulo">
                {c.nome.replace(/^JEMANI\s+/i, '')}
              </span>
              <span className="seletor-3d-chip-sub">
                {c.serve
                  ? `${c.capacidade_min}–${c.capacidade_max} pax`
                  : 'Capacidade insuficiente'}
              </span>
            </button>
          )
        })}
      </div>

      <p className="seletor-3d-dica">Deslize o carro ou toque numa categoria</p>
    </div>
  )
}
