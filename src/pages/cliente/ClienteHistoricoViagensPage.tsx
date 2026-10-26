import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import { separarAgendamentos } from '@/services/agendamentoCliente'
import { useDemoStore } from '@/store/demoStore'
import type { Viagem } from '@/types'
import { CartaoReservaCliente } from './CartaoReservaCliente'
import './ClienteViagensPage.css'

const POR_PAGINA = 10

const GRUPOS: { chave: ChaveTraducao; filtro: (v: Viagem) => boolean }[] = [
  {
    chave: 'cliente.viagens.grupoConcluidas',
    filtro: (v) => v.status === 'viagem_finalizada',
  },
  {
    chave: 'cliente.viagens.grupoCanceladas',
    filtro: (v) => v.status === 'cancelada' || v.status === 'expired',
  },
]

export function ClienteHistoricoViagensPage() {
  const { usuario } = useAuth()
  const { t } = usarIdioma()
  const todasViagens = useDemoStore((s) => s.viagens)
  const avaliacoes = useDemoStore((s) => s.avaliacoes)
  const empresas = useDemoStore((s) => s.empresas)
  const motoristas = useDemoStore((s) => s.motoristas)
  const categorias = useDemoStore((s) => s.categorias)
  const [visiveis, setVisiveis] = useState<Record<string, number>>({})
  const idsAvaliados = useMemo(
    () => new Set(avaliacoes.map((a) => a.viagem_id)),
    [avaliacoes],
  )

  const historico = useMemo(() => {
    const doCliente = todasViagens.filter((v) => v.cliente_id === usuario?.id)
    return separarAgendamentos(doCliente).historico
  }, [todasViagens, usuario?.id])

  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])
  const mapaEmpresas = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.nome_comercial])),
    [empresas],
  )
  const mapaMotoristas = useMemo(() => new Map(motoristas.map((m) => [m.id, m.nome])), [motoristas])

  function limiteGrupo(chave: string) {
    return visiveis[chave] ?? POR_PAGINA
  }

  function verMais(chave: string) {
    setVisiveis((atual) => ({
      ...atual,
      [chave]: (atual[chave] ?? POR_PAGINA) + POR_PAGINA,
    }))
  }

  return (
    <div className="cliente-agenda animar-entrada">
      <Link to="/app/viagens" className="cliente-agenda-voltar">
        <ArrowLeft size={16} />
        {t('cliente.viagens.voltar')}
      </Link>
      <div>
        <h1 className="fonte-display cliente-agenda-titulo">{t('cliente.viagens.historico')}</h1>
        <p className="cliente-agenda-sub">{t('cliente.viagens.historicoTexto')}</p>
      </div>

      {historico.length === 0 ? (
        <p className="cliente-viagens-vazio">{t('cliente.viagens.historicoVazio')}</p>
      ) : (
        GRUPOS.map((grupo) => {
          const lista = historico.filter(grupo.filtro)
          if (lista.length === 0) return null
          const limite = limiteGrupo(grupo.chave)
          const visivel = lista.slice(0, limite)
          const temMais = lista.length > limite
          return (
            <section key={grupo.chave}>
              <h2 className="cliente-viagens-grupo-titulo">{t(grupo.chave)}</h2>
              <div className="cliente-viagens-lista">
                {visivel.map((viagem) => (
                  <CartaoReservaCliente
                    key={viagem.id}
                    viagem={viagem}
                    categoria={mapaCategorias.get(viagem.categoria_id)}
                    empresa={viagem.empresa_id ? mapaEmpresas.get(viagem.empresa_id) : undefined}
                    motorista={
                      viagem.motorista_id ? mapaMotoristas.get(viagem.motorista_id) : undefined
                    }
                    pedirAvaliacao={
                      viagem.status === 'viagem_finalizada' &&
                      Boolean(viagem.empresa_id) &&
                      !idsAvaliados.has(viagem.id)
                    }
                  />
                ))}
              </div>
              {temMais && (
                <button
                  type="button"
                  className="cliente-historico-ver-mais"
                  onClick={() => verMais(grupo.chave)}
                >
                  {t('comum.verMais')}
                </button>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
