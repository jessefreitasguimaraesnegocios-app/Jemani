import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles, Clock3 } from 'lucide-react'
import { usarIdioma } from '@/i18n/usarIdioma'

export function LandingPage() {
  const { t } = usarIdioma()

  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 lg:px-8">
        <p className="fonte-display text-3xl tracking-tight">Jemani</p>
        <div className="flex gap-2">
          <Link to="/entrar" className="btn-secundario !py-2 !px-4">
            {t('comum.entrar')}
          </Link>
          <Link to="/cadastrar" className="btn-primario !py-2 !px-4 hidden sm:inline-flex">
            {t('comum.criarConta')}
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-4 pb-16 pt-6 lg:grid-cols-2 lg:px-8">
        <div className="animar-entrada relative z-10">
          <p className="fonte-display mb-4 text-5xl leading-none text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
            Jemani
          </p>
          <h1 className="max-w-md text-xl text-[var(--color-slate)] sm:text-2xl">
            {t('landing.tagline')}
          </h1>
          <p className="mt-4 max-w-md text-[var(--color-slate)]">{t('landing.texto')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/cadastrar" className="btn-ouro">
              {t('landing.ctaReservar')}
              <ArrowRight size={18} />
            </Link>
            <Link to="/entrar" className="btn-secundario">
              {t('landing.ctaConta')}
            </Link>
          </div>
        </div>

        <div className="animar-entrada relative min-h-[320px] overflow-hidden rounded-[28px] bg-[var(--color-ink)] shadow-[0_30px_80px_rgba(12,18,34,0.25)] lg:min-h-[520px]">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                'linear-gradient(160deg, rgba(184,149,108,0.35) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12), transparent 35%), linear-gradient(180deg, #1a2336 0%, #0c1222 100%)',
            }}
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="relative z-10 flex h-full flex-col justify-end p-8 text-white">
            <p className="fonte-display text-4xl leading-tight">LAX → Beverly Hills</p>
            <p className="mt-2 text-white/65">JEMANI VAN · Pontualidade · Discrição</p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] bg-white/40 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3 lg:px-8">
          {[
            {
              icon: Sparkles,
              title: t('landing.card1Titulo'),
              text: t('landing.card1Texto'),
            },
            {
              icon: ShieldCheck,
              title: t('landing.card2Titulo'),
              text: t('landing.card2Texto'),
            },
            {
              icon: Clock3,
              title: t('landing.card3Titulo'),
              text: t('landing.card3Texto'),
            },
          ].map((item) => (
            <div key={item.title} className="cartao">
              <item.icon className="mb-3 text-[var(--color-gold-deep)]" size={22} />
              <h2 className="fonte-display text-2xl">{item.title}</h2>
              <p className="mt-2 text-sm text-[var(--color-slate)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
