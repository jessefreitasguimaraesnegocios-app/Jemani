import { useMemo } from 'react'
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

export function SeletorCategoria3D({
  categorias,
  categoriaId,
  passageiros,
  aoSelecionar,
  formatarAdicional,
}: Props) {
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

  if (!selecionada) return null

  const elite = selecionada.slug === SLUG_SHIELD
  const foto = fotoDaFrota(selecionada.slug)

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
        <img className="showroom-foto" src={foto} alt={selecionada.nome} />
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
        {categoriasValidas.map((c) => {
          const ativa = c.id === categoriaId
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={ativa}
              disabled={!c.serve}
              className={`showroom-card ${ativa ? 'showroom-card--ativo' : ''} ${
                c.slug === SLUG_SHIELD ? 'showroom-card--elite' : ''
              }`}
              onClick={() => {
                if (c.serve) aoSelecionar(c.id)
              }}
            >
              <img src={fotoDaFrota(c.slug)} alt="" loading="lazy" decoding="async" />
              <span>{rotuloCurtoFrota(c.slug, c.nome)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
