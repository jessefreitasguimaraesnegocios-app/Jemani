import { Link } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { usarIdioma } from '@/i18n/usarIdioma'
import { montarGruposHistorico } from '@/services/historicoCorridas'
import type { CategoriaVeiculo, Empresa, Motorista, Perfil, Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './ListaHistoricoCorridas.css'

interface Props {
  viagens: Viagem[]
  visao: 'cliente' | 'empresa'
  mapaEmpresas: Map<string, Empresa>
  mapaClientes: Map<string, Perfil>
  mapaCategorias: Map<string, CategoriaVeiculo>
  mapaMotoristas: Map<string, Motorista>
  caminhoDetalhe?: (id: string) => string
}

export function ListaHistoricoCorridas({
  viagens,
  visao,
  mapaEmpresas,
  mapaClientes,
  mapaCategorias,
  mapaMotoristas,
  caminhoDetalhe,
}: Props) {
  const { t, locale } = usarIdioma()
  const grupos = montarGruposHistorico(viagens)

  return (
    <div className="lista-historico">
      {grupos.map((grupo) => (
        <section key={grupo.id} className="lista-historico-grupo">
          <h2 className="lista-historico-titulo">
            {t(grupo.chaveTitulo)} ({grupo.viagens.length})
          </h2>
          {grupo.viagens.length === 0 ? (
            <p className="lista-historico-vazio">{t('hist.vazio')}</p>
          ) : (
            <div className="lista-historico-cards">
              {grupo.viagens.map((viagem) => {
                const empresa = viagem.empresa_id
                  ? mapaEmpresas.get(viagem.empresa_id)
                  : undefined
                const cliente = mapaClientes.get(viagem.cliente_id)
                const categoria = mapaCategorias.get(viagem.categoria_id)
                const motorista = viagem.motorista_id
                  ? mapaMotoristas.get(viagem.motorista_id)
                  : undefined
                const valor =
                  visao === 'empresa' ? viagem.valor_empresa : viagem.preco_total
                const conteudo = (
                  <>
                    <div>
                      <p className="font-medium">
                        {viagem.codigo}
                        {categoria ? ` · ${categoria.nome}` : ''}
                      </p>
                      <p className="lista-historico-rota">
                        {viagem.origem} → {viagem.destino}
                      </p>
                      <p className="lista-historico-meta">
                        {formatarData(viagem.data_viagem, locale)} {viagem.horario} ·{' '}
                        {formatarMoeda(valor, locale)}
                      </p>
                      {visao === 'cliente' && (
                        <p className="lista-historico-meta">
                          {t('comum.empresa')}:{' '}
                          {empresa?.nome_comercial ?? t('comum.semEmpresa')}
                          {motorista
                            ? ` · ${t('comum.motorista')}: ${motorista.nome}`
                            : ''}
                        </p>
                      )}
                      {visao === 'empresa' && (
                        <p className="lista-historico-meta">
                          {t('comum.cliente')}: {cliente?.nome ?? '—'}
                          {motorista
                            ? ` · ${t('comum.motorista')}: ${motorista.nome}`
                            : ''}
                        </p>
                      )}
                    </div>
                    <BadgeStatus status={viagem.status} />
                  </>
                )
                const detalhe = caminhoDetalhe?.(viagem.id)
                return detalhe ? (
                  <Link
                    key={viagem.id}
                    to={detalhe}
                    className="cartao lista-historico-item"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div key={viagem.id} className="cartao lista-historico-item">
                    {conteudo}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
