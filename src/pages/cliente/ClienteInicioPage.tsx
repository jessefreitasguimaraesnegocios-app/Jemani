import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { separarAgendamentos } from '@/services/agendamentoCliente'
import { useDemoStore } from '@/store/demoStore'
import { rotuloRotaCliente } from '@/utils/contatoViagem'
import { formatarData, formatarMoeda } from '@/utils/format'
import './ClienteInicioPage.css'

export function ClienteInicioPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todasViagens = useDemoStore((s) => s.viagens)
  const proxima = useMemo(() => {
    const doCliente = todasViagens.filter((v) => v.cliente_id === usuario?.id)
    return separarAgendamentos(doCliente).proxima
  }, [todasViagens, usuario?.id])

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

      <section>
        <div className="cliente-inicio-secao-topo">
          <h2 className="fonte-display cliente-inicio-secao-titulo">{t('cliente.inicio.suas')}</h2>
          <Link to="/app/viagens" className="cliente-inicio-link">
            {t('cliente.inicio.verTodas')}
          </Link>
        </div>
        {!proxima ? (
          <div className="cliente-inicio-vazio">{t('cliente.inicio.vazio')}</div>
        ) : (
          <div className="cliente-inicio-lista">
            <Link to={`/app/viagens/${proxima.id}`} className="cliente-inicio-cartao">
              <div className="cliente-inicio-cartao-linha">
                <div>
                  <p className="cliente-inicio-cartao-codigo">{proxima.codigo}</p>
                  <p className="cliente-inicio-cartao-rota">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span>{rotuloRotaCliente(proxima)}</span>
                  </p>
                  <p className="cliente-inicio-cartao-meta">
                    {formatarData(proxima.data_viagem, locale)} · {proxima.horario} ·{' '}
                    {formatarMoeda(proxima.preco_total, locale)}
                  </p>
                </div>
                <BadgeStatus status={proxima.status} />
              </div>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
