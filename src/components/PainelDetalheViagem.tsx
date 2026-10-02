import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import type {
  CategoriaVeiculo,
  Empresa,
  HistoricoDistribuicao,
  HistoricoStatus,
  Motorista,
  Perfil,
  Veiculo,
  Viagem,
} from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './PainelDetalheViagem.css'

interface Props {
  viagem: Viagem
  cliente?: Perfil
  empresa?: Empresa
  motorista?: Motorista
  veiculo?: Veiculo
  categoria?: CategoriaVeiculo
  historicos: HistoricoStatus[]
  distribuicoes: HistoricoDistribuicao[]
  mapaEmpresas: Map<string, Empresa>
  onFechar: () => void
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="painel-detalhe-rotulo">{rotulo}</p>
      <p className="painel-detalhe-valor">{valor}</p>
    </div>
  )
}

export function PainelDetalheViagem({
  viagem,
  cliente,
  empresa,
  motorista,
  veiculo,
  categoria,
  historicos,
  distribuicoes,
  mapaEmpresas,
  onFechar,
}: Props) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return (
    <>
      <button
        type="button"
        className="painel-detalhe-fundo"
        aria-label="Fechar detalhe da corrida"
        onClick={onFechar}
      />
      <aside className="painel-detalhe" role="dialog" aria-labelledby="painel-corrida-titulo">
        <div className="painel-detalhe-topo">
          <div>
            <h2 id="painel-corrida-titulo" className="fonte-display text-3xl painel-detalhe-codigo">
              {viagem.codigo}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-slate)]">
              {viagem.origem} → {viagem.destino}
            </p>
          </div>
          <button type="button" className="btn-secundario !py-2 painel-detalhe-fechar" onClick={onFechar}>
            Fechar
          </button>
        </div>

        <div>
          <BadgeStatus status={viagem.status} />
        </div>

        <div className="cartao painel-detalhe-bloco">
          <h3 className="fonte-display text-xl">Corrida</h3>
          <div className="painel-detalhe-grade">
            <Campo rotulo="Data" valor={`${formatarData(viagem.data_viagem)} · ${viagem.horario}`} />
            <Campo rotulo="Categoria" valor={categoria?.nome ?? '—'} />
            <Campo rotulo="Passageiros" valor={String(viagem.passageiros)} />
            <Campo rotulo="Pagamento" valor={viagem.payment_status === 'paid' ? 'Pago' : 'Pendente'} />
            {viagem.malas != null && <Campo rotulo="Malas" valor={String(viagem.malas)} />}
            {viagem.numero_voo && <Campo rotulo="Voo" valor={viagem.numero_voo} />}
            {viagem.nome_passageiro && <Campo rotulo="Passageiro" valor={viagem.nome_passageiro} />}
          </div>
          {viagem.observacoes && (
            <div className="mt-3">
              <Campo rotulo="Observações" valor={viagem.observacoes} />
            </div>
          )}
        </div>

        <div className="cartao painel-detalhe-bloco">
          <h3 className="fonte-display text-xl">Pessoas</h3>
          <div className="painel-detalhe-grade">
            <Campo rotulo="Cliente" valor={cliente?.nome ?? '—'} />
            <Campo rotulo="Empresa" valor={empresa?.nome_comercial ?? 'Sem empresa'} />
            <Campo rotulo="Motorista" valor={motorista?.nome ?? '—'} />
            <Campo
              rotulo="Veículo"
              valor={veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
            />
          </div>
          <div className="painel-detalhe-links">
            {cliente && <Link to={`/admin/clientes/${cliente.id}`}>Histórico do cliente</Link>}
            {empresa && <Link to={`/admin/empresas/${empresa.id}`}>Histórico da empresa</Link>}
          </div>
        </div>

        <div className="cartao painel-detalhe-bloco">
          <h3 className="fonte-display text-xl">Valores</h3>
          <div className="painel-detalhe-grade">
            <Campo rotulo="Total" valor={formatarMoeda(viagem.preco_total)} />
            <Campo rotulo="Comissão" valor={formatarMoeda(viagem.valor_plataforma)} />
            <Campo rotulo="Empresa" valor={formatarMoeda(viagem.valor_empresa)} />
            <Campo rotulo="Comissão %" valor={`${viagem.comissao_percentual}%`} />
          </div>
        </div>

        <div className="cartao painel-detalhe-bloco">
          <h3 className="fonte-display text-xl">Mudanças de status</h3>
          {historicos.length === 0 ? (
            <p className="text-sm text-[var(--color-slate)]">
              Ainda sem linha do tempo. Status atual: o badge acima.
            </p>
          ) : (
            <ol className="painel-linha-tempo">
              {historicos.map((item) => (
                <li key={item.id} className="painel-linha-item">
                  <span className="painel-linha-ponto" />
                  <div>
                    <BadgeStatus status={item.status_novo} />
                    <p className="painel-linha-hora">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                      {item.observacao ? ` · ${item.observacao}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {distribuicoes.length > 0 && (
          <div className="cartao painel-detalhe-bloco">
            <h3 className="fonte-display text-xl">Distribuição por proximidade</h3>
            <ol className="painel-distribuicao">
              {distribuicoes.map((item) => (
                <li key={item.id}>
                  {mapaEmpresas.get(item.empresa_id)?.nome_comercial ?? 'Empresa'} ·{' '}
                  {item.distancia_km} km · {item.resultado}
                  {item.motivo ? ` · ${item.motivo}` : ''}
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </>
  )
}
