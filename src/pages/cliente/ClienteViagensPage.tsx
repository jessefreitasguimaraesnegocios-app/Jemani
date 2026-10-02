import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem, Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './ClienteViagensPage.css'

const GRUPOS: { chave: ChaveTraducao; filtro: (v: Viagem) => boolean }[] = [
  {
    chave: 'cliente.viagens.grupoPagamento',
    filtro: (v) => v.status === 'pending_payment' || v.payment_status === 'pending_payment',
  },
  {
    chave: 'cliente.viagens.grupoProximas',
    filtro: (v) =>
      [
        'paid',
        'solicitada',
        'aguardando_empresa',
        'oferta_enviada',
        'empresa_confirmada',
        'motorista_atribuido',
      ].includes(v.status),
  },
  {
    chave: 'cliente.viagens.grupoAndamento',
    filtro: (v) =>
      (
        [
          'motorista_a_caminho',
          'motorista_chegou',
          'passageiro_embarcou',
          'viagem_em_andamento',
        ] as StatusViagem[]
      ).includes(v.status),
  },
  {
    chave: 'cliente.viagens.grupoConcluidas',
    filtro: (v) => v.status === 'viagem_finalizada',
  },
  {
    chave: 'cliente.viagens.grupoCanceladas',
    filtro: (v) => v.status === 'cancelada' || v.status === 'expired',
  },
]

export function ClienteViagensPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todasViagens = useDemoStore((s) => s.viagens)
  const viagens = useMemo(
    () => todasViagens.filter((v) => v.cliente_id === usuario?.id),
    [todasViagens, usuario?.id],
  )
  const empresas = useDemoStore((s) => s.empresas)
  const motoristas = useDemoStore((s) => s.motoristas)
  const categorias = useDemoStore((s) => s.categorias)

  const mapaCategorias = useMemo(() => {
    const mapa = new Map(categorias.map((c) => [c.id, c.nome]))
    return mapa
  }, [categorias])

  const mapaEmpresas = useMemo(() => {
    const mapa = new Map(empresas.map((e) => [e.id, e.nome_comercial]))
    return mapa
  }, [empresas])

  const mapaMotoristas = useMemo(() => {
    const mapa = new Map(motoristas.map((m) => [m.id, m.nome]))
    return mapa
  }, [motoristas])

  return (
    <div className="cliente-viagens animar-entrada">
      <div className="cliente-viagens-topo">
        <h1 className="fonte-display cliente-viagens-titulo">{t('cliente.viagens.titulo')}</h1>
        <Link to="/app/reservar" className="cliente-viagens-nova">
          {t('cliente.viagens.nova')}
        </Link>
      </div>

      {GRUPOS.map((g) => {
        const lista = viagens.filter(g.filtro)
        return (
          <section key={g.chave}>
            <h2 className="cliente-viagens-grupo-titulo">{t(g.chave)}</h2>
            {lista.length === 0 ? (
              <p className="cliente-viagens-vazio">{t('cliente.viagens.vazioGrupo')}</p>
            ) : (
              <div className="cliente-viagens-lista">
                {lista.map((v) => (
                  <Link key={v.id} to={`/app/viagens/${v.id}`} className="cliente-viagens-cartao">
                    <div className="cliente-viagens-cartao-linha">
                      <div>
                        <p className="cliente-viagens-cartao-titulo">
                          {v.codigo} · {mapaCategorias.get(v.categoria_id) ?? '—'}
                        </p>
                        <p className="cliente-viagens-cartao-texto">
                          {v.origem} → {v.destino}
                        </p>
                        <p className="cliente-viagens-cartao-texto">
                          {formatarData(v.data_viagem, locale)} {v.horario} ·{' '}
                          {formatarMoeda(v.preco_total, locale)}
                        </p>
                        {v.empresa_id && (
                          <p className="cliente-viagens-cartao-extra">
                            {t('comum.empresa')}: {mapaEmpresas.get(v.empresa_id) ?? '—'}
                            {v.motorista_id
                              ? ` · ${t('comum.motorista')}: ${mapaMotoristas.get(v.motorista_id) ?? '—'}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <BadgeStatus status={v.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
