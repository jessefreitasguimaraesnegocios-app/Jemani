import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronRight, History } from 'lucide-react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { separarAgendamentos, viagemEmAndamento } from '@/services/agendamentoCliente'
import { useDemoStore } from '@/store/demoStore'
import type { Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import { CartaoReservaCliente } from './CartaoReservaCliente'
import './ClienteViagensPage.css'

export function ClienteViagensPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todasViagens = useDemoStore((s) => s.viagens)
  const empresas = useDemoStore((s) => s.empresas)
  const motoristas = useDemoStore((s) => s.motoristas)
  const categorias = useDemoStore((s) => s.categorias)

  const viagens = useMemo(
    () => todasViagens.filter((v) => v.cliente_id === usuario?.id),
    [todasViagens, usuario?.id],
  )
  const { proxima, outras, historico } = useMemo(() => separarAgendamentos(viagens), [viagens])

  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])
  const mapaEmpresas = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.nome_comercial])),
    [empresas],
  )
  const mapaMotoristas = useMemo(() => new Map(motoristas.map((m) => [m.id, m.nome])), [motoristas])

  const emAndamento = proxima ? viagemEmAndamento(proxima) : false

  return (
    <div className="cliente-agenda animar-entrada">
      <div className="cliente-agenda-topo">
        <div>
          <p className="cliente-agenda-olho">{t('cliente.viagens.olho')}</p>
          <h1 className="fonte-display cliente-agenda-titulo">{t('cliente.viagens.titulo')}</h1>
          <p className="cliente-agenda-sub">{t('cliente.viagens.sub')}</p>
        </div>
        <Link to="/app/reservar" className="cliente-viagens-nova">
          <CalendarPlus size={16} />
          {t('cliente.viagens.nova')}
        </Link>
      </div>

      {proxima ? (
        <ProximoAgendamento
          viagem={proxima}
          emAndamento={emAndamento}
          categoria={mapaCategorias.get(proxima.categoria_id)}
          empresa={proxima.empresa_id ? mapaEmpresas.get(proxima.empresa_id) : undefined}
          motorista={proxima.motorista_id ? mapaMotoristas.get(proxima.motorista_id) : undefined}
          locale={locale}
        />
      ) : (
        <section className="cliente-agenda-vazio">
          <p className="cliente-agenda-vazio-titulo">{t('cliente.viagens.vazio')}</p>
          <p className="cliente-agenda-vazio-texto">{t('cliente.viagens.vazioTexto')}</p>
          <Link to="/app/reservar" className="cliente-viagens-nova">
            {t('cliente.viagens.vazioAcao')}
          </Link>
        </section>
      )}

      <Link to="/app/viagens/historico" className="cliente-agenda-historico">
        <span className="cliente-agenda-historico-icone" aria-hidden>
          <History size={22} />
        </span>
        <span className="cliente-agenda-historico-texto">
          <span className="cliente-agenda-historico-titulo">{t('cliente.viagens.historico')}</span>
          <span className="cliente-agenda-historico-sub">
            {historico.length === 0
              ? t('cliente.viagens.historicoVazio')
              : t('cliente.viagens.historicoTexto')}
          </span>
        </span>
        <span className="cliente-agenda-historico-qtd">{historico.length}</span>
        <ChevronRight size={20} className="cliente-agenda-historico-seta" />
      </Link>

      {outras.length > 0 && (
        <details className="cliente-agenda-outras">
          <summary>
            <span>{t('cliente.viagens.outras')}</span>
            <span className="cliente-agenda-outras-qtd">{outras.length}</span>
          </summary>
          <p className="cliente-agenda-nota">{t('cliente.viagens.outrasTexto')}</p>
          <div className="cliente-viagens-lista">
            {outras.map((viagem) => (
              <CartaoReservaCliente
                key={viagem.id}
                viagem={viagem}
                categoria={mapaCategorias.get(viagem.categoria_id)}
                empresa={viagem.empresa_id ? mapaEmpresas.get(viagem.empresa_id) : undefined}
                motorista={
                  viagem.motorista_id ? mapaMotoristas.get(viagem.motorista_id) : undefined
                }
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function ProximoAgendamento({
  viagem,
  emAndamento,
  categoria,
  empresa,
  motorista,
  locale,
}: {
  viagem: Viagem
  emAndamento: boolean
  categoria?: string
  empresa?: string
  motorista?: string
  locale: string
}) {
  const { t } = usarIdioma()
  const faltaPagamento =
    viagem.status === 'pending_payment' || viagem.payment_status === 'pending_payment'

  return (
    <section className="cliente-agenda-proxima" aria-labelledby="proximo-agendamento">
      <div className="cliente-agenda-proxima-topo">
        <p id="proximo-agendamento" className="cliente-agenda-selo">
          {emAndamento ? t('cliente.viagens.andamento') : t('cliente.viagens.proximo')}
        </p>
        <BadgeStatus status={viagem.status} />
      </div>
      <p className="cliente-agenda-explicacao">
        {emAndamento ? t('cliente.viagens.andamentoTexto') : t('cliente.viagens.proximoTexto')}
      </p>
      <p className="fonte-display cliente-agenda-quando">
        {formatarData(viagem.data_viagem, locale)}
        <span> · {viagem.horario}</span>
      </p>

      <div className="cliente-agenda-trajeto">
        <div className="cliente-agenda-ponto">
          <span className="cliente-agenda-marca" aria-hidden />
          <div>
            <p className="cliente-agenda-rotulo">{t('cliente.viagens.embarque')}</p>
            <p className="cliente-agenda-endereco">{viagem.origem}</p>
          </div>
        </div>
        <div className="cliente-agenda-ponto">
          <span className="cliente-agenda-marca cliente-agenda-marca--fim" aria-hidden />
          <div>
            <p className="cliente-agenda-rotulo">{t('cliente.viagens.destino')}</p>
            <p className="cliente-agenda-endereco">{viagem.destino}</p>
          </div>
        </div>
      </div>

      <p className="cliente-agenda-meta">
        {viagem.codigo}
        {categoria ? ` · ${categoria}` : ''} · {formatarMoeda(viagem.preco_total, locale)}
      </p>
      {empresa && (
        <p className="cliente-agenda-meta">
          {t('comum.empresa')}: {empresa}
          {motorista ? ` · ${t('comum.motorista')}: ${motorista}` : ''}
        </p>
      )}
      {faltaPagamento && <p className="cliente-agenda-aviso">{t('cliente.viagens.pagar')}</p>}

      <Link to={`/app/viagens/${viagem.id}`} className="cliente-agenda-ver">
        {t('cliente.viagens.ver')}
        <ChevronRight size={18} />
      </Link>
    </section>
  )
}
