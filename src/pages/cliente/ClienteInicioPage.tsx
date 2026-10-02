import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'
import './ClienteInicioPage.css'

export function ClienteInicioPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todasViagens = useDemoStore((s) => s.viagens)
  const viagens = useMemo(
    () =>
      todasViagens
        .filter((v) => v.cliente_id === usuario?.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 3),
    [todasViagens, usuario?.id],
  )

  return (
    <div className="cliente-inicio animar-entrada">
      <section className="cliente-inicio-hero">
        <p className="fonte-display cliente-inicio-hero-marca">Jemani</p>
        <p className="cliente-inicio-hero-texto">{t('landing.tagline')}</p>
        <Link to="/app/reservar" className="cliente-inicio-cta">
          {t('landing.ctaReservar')}
          <ArrowRight size={18} />
        </Link>
      </section>

      <section>
        <div className="cliente-inicio-secao-topo">
          <h2 className="fonte-display cliente-inicio-secao-titulo">{t('cliente.inicio.suas')}</h2>
          <Link to="/app/viagens" className="cliente-inicio-link">
            {t('cliente.inicio.verTodas')}
          </Link>
        </div>
        {viagens.length === 0 ? (
          <div className="cliente-inicio-vazio">{t('cliente.inicio.vazio')}</div>
        ) : (
          <div className="cliente-inicio-lista">
            {viagens.map((v) => (
              <Link key={v.id} to={`/app/viagens/${v.id}`} className="cliente-inicio-cartao">
                <div className="cliente-inicio-cartao-linha">
                  <div>
                    <p className="cliente-inicio-cartao-codigo">{v.codigo}</p>
                    <p className="cliente-inicio-cartao-rota">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span>
                        {v.origem} → {v.destino}
                      </span>
                    </p>
                    <p className="cliente-inicio-cartao-meta">
                      {formatarData(v.data_viagem, locale)} · {v.horario} ·{' '}
                      {formatarMoeda(v.preco_total, locale)}
                    </p>
                  </div>
                  <BadgeStatus status={v.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
