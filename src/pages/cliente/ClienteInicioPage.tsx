import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  MapPin,
  Navigation,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import { separarAgendamentos } from '@/services/agendamentoCliente'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem, Viagem } from '@/types'
import './ClienteInicioPage.css'

const STATUS_ANDAMENTO: StatusViagem[] = [
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
]

const STATUS_CONFIRMADA: StatusViagem[] = [
  'paid',
  'aguardando_empresa',
  'oferta_enviada',
  'empresa_confirmada',
  'parceiro_externo',
  ...STATUS_ANDAMENTO,
]

function destinoCurto(viagem: Viagem): string {
  if (viagem.modalidade === 'hourly') {
    const origem = viagem.origem_endereco
    if (origem?.cidade) {
      return origem.estado ? `${origem.cidade}, ${origem.estado}` : origem.cidade
    }
    return viagem.origem.split(',')[0]?.trim() || viagem.origem
  }
  const destino = viagem.destino_endereco
  if (destino?.cidade) {
    return destino.estado ? `${destino.cidade}, ${destino.estado}` : destino.cidade
  }
  return viagem.destino.split(',')[0]?.trim() || viagem.destino
}

function rotuloDataAgenda(dataIso: string, locale: string, hojeLabel: string, amanhaLabel: string) {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  if (!ano || !mes || !dia) return dataIso
  const alvo = new Date(ano, mes - 1, dia)
  const agora = new Date()
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const amanha = new Date(hoje)
  amanha.setDate(hoje.getDate() + 1)
  const dataCurta = alvo.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
  if (alvo.getTime() === hoje.getTime()) return `${hojeLabel}, ${dataCurta}`
  if (alvo.getTime() === amanha.getTime()) return `${amanhaLabel}, ${dataCurta}`
  const semana = alvo.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')
  return `${semana}, ${dataCurta}`
}

function textosDoStatus(
  status: StatusViagem,
  t: (chave: ChaveTraducao, vars?: Record<string, string | number>) => string,
) {
  if (status === 'pending_payment') {
    return {
      titulo: t('cliente.inicio.cartao.tituloPendente'),
      sub: t('cliente.inicio.cartao.subPendente'),
      badge: t('cliente.inicio.cartao.badgePendente'),
      tom: 'pendente' as const,
    }
  }
  if (STATUS_ANDAMENTO.includes(status)) {
    return {
      titulo: t('cliente.inicio.cartao.tituloAndamento'),
      sub: t('cliente.inicio.cartao.subAndamento'),
      badge: t(`status.${status}` as ChaveTraducao),
      tom: 'ok' as const,
    }
  }
  if (STATUS_CONFIRMADA.includes(status)) {
    return {
      titulo: t('cliente.inicio.cartao.tituloConfirmada'),
      sub: t('cliente.inicio.cartao.subConfirmada'),
      badge: t('cliente.inicio.cartao.badgeConfirmada'),
      tom: 'ok' as const,
    }
  }
  return {
    titulo: t('cliente.inicio.cartao.tituloPadrao'),
    sub: t('cliente.inicio.cartao.subPadrao'),
    badge: t(`status.${status}` as ChaveTraducao),
    tom: 'neutro' as const,
  }
}

export function ClienteInicioPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todasViagens = useDemoStore((s) => s.viagens)
  const proxima = useMemo(() => {
    const doCliente = todasViagens.filter((v) => v.cliente_id === usuario?.id)
    return separarAgendamentos(doCliente).proxima
  }, [todasViagens, usuario?.id])

  const textos = proxima ? textosDoStatus(proxima.status, t) : null

  return (
    <div className="cliente-inicio animar-entrada">
      <section className="cliente-inicio-hero" aria-label="Jemani">
        <div className="cliente-inicio-hero-cena" aria-hidden="true">
          <div className="cliente-inicio-cartao-3d">
            <div className="cliente-inicio-cartao-face cliente-inicio-cartao-frente">
              <img src="/images/jemani-cartao-frente.png" alt="" draggable={false} />
            </div>
            <div className="cliente-inicio-cartao-face cliente-inicio-cartao-verso">
              <img src="/images/jemani-cartao-verso.png" alt="" draggable={false} />
            </div>
          </div>
        </div>
        <div className="cliente-inicio-hero-fade" aria-hidden="true" />
        <Link to="/app/reservar" className="cliente-inicio-cta">
          {t('landing.ctaReservar')}
          <ArrowRight size={18} />
        </Link>
      </section>

      <p className="cliente-inicio-hero-linha">{t('landing.tagline')}</p>

      <section className="cliente-inicio-agenda">
        <div className="cliente-inicio-secao-topo">
          <h2 className="cliente-inicio-secao-titulo">{t('cliente.inicio.suas')}</h2>
          {proxima ? (
            <Link to={`/app/viagens/${proxima.id}`} className="cliente-inicio-link">
              {t('cliente.inicio.verDetalhes')}
              <ArrowRight size={14} />
            </Link>
          ) : (
            <Link to="/app/viagens" className="cliente-inicio-link">
              {t('cliente.inicio.verTodas')}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {!proxima || !textos ? (
          <div className="cliente-inicio-vazio">{t('cliente.inicio.vazio')}</div>
        ) : (
          <article className="cliente-inicio-proxima">
            <div className="cliente-inicio-proxima-topo">
              <div className="cliente-inicio-proxima-icone" aria-hidden="true">
                <CarFront size={22} strokeWidth={1.75} />
              </div>
              <div className="cliente-inicio-proxima-textos">
                <p className="cliente-inicio-proxima-titulo">{textos.titulo}</p>
                <p className="cliente-inicio-proxima-sub">{textos.sub}</p>
              </div>
              <span
                className={`cliente-inicio-proxima-badge cliente-inicio-proxima-badge--${textos.tom}`}
              >
                {textos.tom === 'ok' && <Check size={12} strokeWidth={3} aria-hidden />}
                {textos.badge}
              </span>
            </div>

            <div className="cliente-inicio-proxima-metas">
              <div className="cliente-inicio-proxima-meta">
                <CalendarDays size={16} aria-hidden />
                <div>
                  <span>{t('reserva.data')}</span>
                  <strong>
                    {rotuloDataAgenda(
                      proxima.data_viagem,
                      locale,
                      t('cliente.inicio.hoje'),
                      t('cliente.inicio.amanha'),
                    )}
                  </strong>
                </div>
              </div>
              <div className="cliente-inicio-proxima-meta">
                <Clock3 size={16} aria-hidden />
                <div>
                  <span>{t('reserva.horario')}</span>
                  <strong>{proxima.horario}</strong>
                </div>
              </div>
              <div className="cliente-inicio-proxima-meta">
                <MapPin size={16} aria-hidden />
                <div>
                  <span>{t('cliente.inicio.destino')}</span>
                  <strong>{destinoCurto(proxima)}</strong>
                </div>
              </div>
            </div>

            <Link to={`/app/viagens/${proxima.id}`} className="cliente-inicio-proxima-cta">
              <Navigation size={16} aria-hidden />
              {t('cliente.inicio.acompanhar')}
            </Link>
          </article>
        )}
      </section>
    </div>
  )
}
