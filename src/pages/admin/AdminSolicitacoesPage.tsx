import { useMemo, useState } from 'react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import {
  listarCorridasAguardandoOferta,
  ordenarEmpresasPorProximidade,
} from '@/services/distribuicaoService'
import { useDemoStore } from '@/store/demoStore'
import type { Empresa } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './AdminSolicitacoesPage.css'

export function AdminSolicitacoesPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const empresas = useDemoStore((s) => s.empresas)
  const veiculos = useDemoStore((s) => s.veiculos)
  const viagens = useDemoStore((s) => s.viagens)
  const atribuicoes = useDemoStore((s) => s.atribuicoes)
  const enviarOfertaEmailEmpresa = useDemoStore((s) => s.enviarOfertaEmailEmpresa)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const corridasDisponiveis = useMemo(
    () => listarCorridasAguardandoOferta(viagens),
    [viagens],
  )

  const rankingPorViagem = useMemo(() => {
    const mapa = new Map<
      string,
      Array<{ empresa: Empresa; distancia_km: number; emailEnviado: boolean }>
    >()
    for (const viagem of corridasDisponiveis) {
      if (typeof viagem.origem_lat !== 'number' || typeof viagem.origem_lng !== 'number') {
        mapa.set(viagem.id, [])
        continue
      }
      const { ordenadas } = ordenarEmpresasPorProximidade(
        empresas,
        viagem.origem_lat,
        viagem.origem_lng,
        viagem.categoria_id,
        veiculos,
      )
      mapa.set(
        viagem.id,
        ordenadas.slice(0, 5).map((o) => ({
          empresa: o.empresa,
          distancia_km: o.distancia_km,
          emailEnviado: Boolean(
            atribuicoes.find(
              (a) =>
                a.viagem_id === viagem.id &&
                a.empresa_id === o.empresa.id &&
                a.email_enviado_em,
            ),
          ),
        })),
      )
    }
    return mapa
  }, [corridasDisponiveis, empresas, atribuicoes, veiculos])

  async function enviarOferta(viagemId: string, empresaId: string) {
    setErro('')
    setMsg('')
    try {
      const { viagem, modo } = await enviarOfertaEmailEmpresa(viagemId, empresaId, usuario?.id)
      setMsg(
        t(
          modo === 'automatico'
            ? 'admin.solicitacoes.msgEnviado'
            : 'admin.solicitacoes.msgEnviadoGmail',
          { codigo: viagem.codigo },
        ),
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('admin.solicitacoes.erroEnviar'))
    }
  }

  return (
    <div className="animar-entrada space-y-6">
      <div>
        <h1 className="fonte-display text-3xl">{t('admin.solicitacoes.titulo')}</h1>
        <p className="mt-1 text-sm text-[var(--color-slate)]">{t('admin.solicitacoes.sub')}</p>
      </div>

      <div className="admin-solicitacoes-intro">
        <p className="font-medium text-[var(--color-ink)]">{t('admin.solicitacoes.comoTitulo')}</p>
        <p>{t('admin.solicitacoes.como1')}</p>
        <p>{t('admin.solicitacoes.como2')}</p>
      </div>

      {(msg || erro) && (
        <div className="cartao">
          {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
        </div>
      )}

      <section className="admin-solicitacoes-secao">
        <h2 className="fonte-display text-2xl">
          {t('admin.solicitacoes.corridas', { n: corridasDisponiveis.length })}
        </h2>
        {corridasDisponiveis.length === 0 ? (
          <p className="admin-solicitacoes-vazio">{t('admin.solicitacoes.vazio')}</p>
        ) : (
          corridasDisponiveis.map((viagem) => {
            const ranking = rankingPorViagem.get(viagem.id) ?? []
            return (
              <div key={viagem.id} className="cartao admin-solicitacao-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{viagem.codigo}</p>
                    <p className="admin-solicitacao-meta">
                      {viagem.origem} → {viagem.destino}
                    </p>
                    <p className="admin-solicitacao-meta">
                      {formatarData(viagem.data_viagem)} · {viagem.horario} ·{' '}
                      {formatarMoeda(viagem.preco_total)}
                    </p>
                  </div>
                  <BadgeStatus status={viagem.status} />
                </div>

                {ranking.length === 0 ? (
                  <p className="admin-solicitacoes-vazio">{t('admin.solicitacoes.semEmpresas')}</p>
                ) : (
                  <ul className="admin-solicitacao-ranking">
                    {ranking.map((item, idx) => (
                      <li
                        key={item.empresa.id}
                        className={`admin-solicitacao-ranking-item ${
                          item.emailEnviado
                            ? 'admin-solicitacao-ranking-item--enviado'
                            : idx === 0
                              ? 'admin-solicitacao-ranking-item--topo'
                              : ''
                        }`}
                      >
                        <div className="admin-solicitacao-ranking-info">
                          <strong>
                            {idx === 0
                              ? t('admin.solicitacoes.maisProxima', {
                                  nome: item.empresa.nome_comercial,
                                })
                              : t('admin.solicitacoes.posicao', {
                                  n: idx + 1,
                                  nome: item.empresa.nome_comercial,
                                })}
                          </strong>
                          <span>
                            {t('admin.solicitacoes.distanciaEmail', {
                              km: item.distancia_km,
                              email: item.empresa.email,
                            })}
                          </span>
                        </div>
                        {item.emailEnviado ? (
                          <span className="admin-solicitacao-badge">{t('admin.solicitacoes.emailEnviado')}</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-ouro !py-2"
                                    onClick={() => void enviarOferta(viagem.id, item.empresa.id)}
                          >
                            {t('admin.solicitacoes.enviarEmail')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
