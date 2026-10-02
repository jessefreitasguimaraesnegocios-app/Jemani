import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { FormularioNovaEmpresa } from '@/components/FormularioNovaEmpresa'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { ordenarEmpresasPorProximidade } from '@/services/distribuicaoService'
import { agruparCorridasPorEmpresa, montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import type { Empresa, Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './AdminEmpresasPage.css'

export function AdminEmpresasPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)
  const salvarEmpresa = useDemoStore((s) => s.salvarEmpresa)
  const criarEmpresa = useDemoStore((s) => s.criarEmpresa)
  const enviarOfertaEmailEmpresa = useDemoStore((s) => s.enviarOfertaEmailEmpresa)
  const motoristas = useDemoStore((s) => s.motoristas)
  const veiculos = useDemoStore((s) => s.veiculos)
  const viagens = useDemoStore((s) => s.viagens)
  const atribuicoes = useDemoStore((s) => s.atribuicoes)
  const corridasPorEmpresa = useMemo(() => agruparCorridasPorEmpresa(viagens), [viagens])
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  const corridasDisponiveis = useMemo(
    () =>
      viagens
        .filter(
          (v) =>
            v.payment_status === 'paid' &&
            ['aguardando_empresa', 'oferta_enviada', 'paid'].includes(v.status) &&
            !v.empresa_id,
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
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
  }, [corridasDisponiveis, empresas, atribuicoes])

  function enviarOferta(viagemId: string, empresaId: string) {
    setErro('')
    setMsg('')
    try {
      const { viagem } = enviarOfertaEmailEmpresa(viagemId, empresaId, usuario?.id)
      setMsg(
        `Gmail aberto · oferta marcada como enviada · ${viagem.codigo} agora está “Oferta enviada por e-mail”.`,
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar oferta')
    }
  }

  function corridasProximasDaEmpresa(empresa: Empresa) {
    const itens: Array<{ viagem: Viagem; distancia_km: number; emailEnviado: boolean; posicao: number }> =
      []
    for (const viagem of corridasDisponiveis) {
      const ranking = rankingPorViagem.get(viagem.id) ?? []
      const idx = ranking.findIndex((r) => r.empresa.id === empresa.id)
      if (idx < 0) continue
      itens.push({
        viagem,
        distancia_km: ranking[idx].distancia_km,
        emailEnviado: ranking[idx].emailEnviado,
        posicao: idx + 1,
      })
    }
    return itens.sort((a, b) => a.distancia_km - b.distancia_km)
  }

  return (
    <div className="animar-entrada space-y-6">
      <div className="admin-empresas-cabecalho">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.empresas.titulo')}</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">{t('admin.empresas.sub')}</p>
        </div>
        {!mostrarForm && (
          <button type="button" className="btn-ouro" onClick={() => setMostrarForm(true)}>
            {t('admin.empresas.add')}
          </button>
        )}
      </div>

      {mostrarForm && (
        <FormularioNovaEmpresa
          categorias={categorias}
          onCancelar={() => setMostrarForm(false)}
          onCriada={(empresa, senha) => {
            criarEmpresa(empresa, senha)
            setMostrarForm(false)
            setErro('')
            setMsg(`Empresa ${empresa.nome_comercial} salva no Supabase e já aparece na lista.`)
          }}
        />
      )}

      <div className="admin-empresas-intro">
        <p className="font-medium text-[var(--color-ink)]">Como funciona</p>
        <p>
          Corridas pagas entram na fila. O sistema ordena empresas pela distância até o local de
          embarque. Você envia o e-mail (Gmail) à mais próxima; a corrida muda para{' '}
          <strong>Oferta enviada por e-mail</strong> e a empresa vê a solicitação no painel.
        </p>
        <p>
          O Jemani abre o Gmail para você revisar — não confirma entrega automática no servidor de
          e-mail.
        </p>
      </div>

      {(msg || erro) && (
        <div className="cartao">
          {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
        </div>
      )}

      <section className="admin-empresas-secao">
        <h2 className="fonte-display text-2xl">
          Corridas disponíveis ({corridasDisponiveis.length})
        </h2>
        {corridasDisponiveis.length === 0 ? (
          <p className="admin-empresas-vazio">
            Nenhuma corrida paga aguardando oferta no momento.
          </p>
        ) : (
          corridasDisponiveis.map((viagem) => {
            const ranking = rankingPorViagem.get(viagem.id) ?? []
            return (
              <div key={viagem.id} className="cartao admin-corrida-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{viagem.codigo}</p>
                    <p className="admin-corrida-meta">
                      {viagem.origem} → {viagem.destino}
                    </p>
                    <p className="admin-corrida-meta">
                      {formatarData(viagem.data_viagem)} · {viagem.horario} ·{' '}
                      {formatarMoeda(viagem.preco_total)}
                    </p>
                  </div>
                  <BadgeStatus status={viagem.status} />
                </div>

                {ranking.length === 0 ? (
                  <p className="admin-empresas-vazio">
                    Sem empresas elegíveis com coordenadas para este trecho.
                  </p>
                ) : (
                  <ul className="admin-ranking">
                    {ranking.map((item, idx) => (
                      <li
                        key={item.empresa.id}
                        className={`admin-ranking-item ${
                          item.emailEnviado
                            ? 'admin-ranking-item--enviado'
                            : idx === 0
                              ? 'admin-ranking-item--topo'
                              : ''
                        }`}
                      >
                        <div className="admin-ranking-info">
                          <strong>
                            {idx === 0 ? '1ª mais próxima · ' : `${idx + 1}ª · `}
                            {item.empresa.nome_comercial}
                          </strong>
                          <span>
                            {item.distancia_km} km do embarque · {item.empresa.email}
                          </span>
                        </div>
                        {item.emailEnviado ? (
                          <span className="admin-badge-enviado">E-mail enviado</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-ouro !py-2"
                            onClick={() => enviarOferta(viagem.id, item.empresa.id)}
                          >
                            Enviar e-mail
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

      <section className="admin-empresas-secao">
        <h2 className="fonte-display text-2xl">
          {t('admin.empresas.parceiras', { n: empresas.length })}
        </h2>
        {empresas.map((e) => {
          const proximas = corridasProximasDaEmpresa(e)
          const historico = corridasPorEmpresa.get(e.id) ?? []
          const resumo = montarResumoHistorico(historico, 'empresa')
          return (
            <div key={e.id} className="cartao admin-empresa-card">
              <div className="admin-empresa-topo">
                <div>
                  <p className="font-medium">{e.nome_comercial}</p>
                  <p className="text-sm text-[var(--color-slate)]">
                    {e.razao_social} · {e.cnpj} · {e.cidade}
                  </p>
                  <p className="text-sm text-[var(--color-slate)]">
                    {e.endereco_base ?? '—'}
                    {typeof e.latitude === 'number'
                      ? ` · ${e.latitude.toFixed(4)}, ${e.longitude?.toFixed(4)}`
                      : ''}
                  </p>
                  <p className="text-sm text-[var(--color-slate)]">
                    {e.email} · {motoristas.filter((m) => m.empresa_id === e.id).length} motoristas ·{' '}
                    {veiculos.filter((v) => v.empresa_id === e.id).length} veículos
                  </p>
                </div>
                <span className="badge-status">{e.status}</span>
              </div>

              <div className="admin-empresa-bloco">
                <h3>
                  Corridas próximas desta base
                  {proximas.length > 0 ? ` (${proximas.length})` : ''}
                </h3>
                {proximas.length === 0 ? (
                  <p className="admin-empresas-vazio">
                    Nenhuma corrida aberta ranqueada para esta empresa agora.
                  </p>
                ) : (
                  proximas.map(({ viagem, distancia_km, emailEnviado, posicao }) => (
                    <div key={viagem.id} className="admin-corrida-empresa">
                      <div>
                        <p className="text-sm font-medium">
                          {viagem.codigo} · {posicao}ª mais próxima ({distancia_km} km)
                        </p>
                        <p className="text-xs text-[var(--color-slate)]">
                          {viagem.origem} → {viagem.destino}
                        </p>
                        {emailEnviado && (
                          <span className="admin-badge-enviado mt-1">E-mail já enviado</span>
                        )}
                      </div>
                      {!emailEnviado && (
                        <button
                          type="button"
                          className="btn-ouro !py-2"
                          onClick={() => enviarOferta(viagem.id, e.id)}
                        >
                          Enviar e-mail
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="admin-empresa-bloco">
                <h3>Histórico de corridas desta empresa</h3>
                <p className="admin-empresas-vazio">
                  {resumo.total} aceitas · {resumo.realizadas} realizadas · {resumo.canceladas}{' '}
                  canceladas · {formatarMoeda(resumo.valor)}
                </p>
                <Link to={`/admin/empresas/${e.id}`} className="admin-empresa-historico-link">
                  {t('admin.empresas.historico')}
                </Link>
              </div>

              <div className="admin-empresa-bloco">
                <h3>Gestão de status</h3>
                <div className="admin-empresa-acoes">
                  <button
                    type="button"
                    className="btn-secundario !py-2"
                    onClick={() =>
                      salvarEmpresa({ id: e.id, status: 'aprovada', habilitada_receber: true })
                    }
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="btn-secundario !py-2"
                    onClick={() =>
                      salvarEmpresa({ id: e.id, status: 'ativa', habilitada_receber: true })
                    }
                  >
                    Ativar
                  </button>
                  <button
                    type="button"
                    className="btn-secundario !py-2"
                    onClick={() =>
                      salvarEmpresa({ id: e.id, status: 'inativa', habilitada_receber: false })
                    }
                  >
                    Desativar
                  </button>
                  <button
                    type="button"
                    className="btn-perigo !py-2"
                    onClick={() =>
                      salvarEmpresa({ id: e.id, status: 'bloqueada', habilitada_receber: false })
                    }
                  >
                    Bloquear
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
