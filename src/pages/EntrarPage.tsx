import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, rotaPorTipo } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'

const CONTAS_DEMO: Array<{ email: string; chave: ChaveTraducao }> = [
  { email: 'cliente@jemani.app', chave: 'entrar.perfilCliente' },
  { email: 'empresa@laxshuttle.app', chave: 'entrar.perfilEmpresaLax' },
  { email: 'empresa@lapremier.app', chave: 'entrar.perfilEmpresaLa' },
  { email: 'empresa@beverlyconcierge.app', chave: 'entrar.perfilEmpresaBeverly' },
  { email: 'motorista@jemani.app', chave: 'entrar.perfilMotorista' },
  { email: 'admin@jemani.app', chave: 'entrar.perfilAdmin' },
]

export function EntrarPage() {
  const { entrar, modoDemo, senhaDemo } = useAuth()
  const navigate = useNavigate()
  const { t } = usarIdioma()
  const [email, setEmail] = useState('cliente@jemani.app')
  const [senha, setSenha] = useState(senhaDemo)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const usuario = await entrar(email, senha)
      navigate(rotaPorTipo(usuario.tipo))
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('entrar.falha'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="fonte-display mb-8 text-center text-4xl text-[var(--color-ink)]">
        Jemani
      </Link>
      <div className="cartao animar-entrada">
        <h1 className="fonte-display text-3xl">{t('entrar.titulo')}</h1>
        <p className="mt-1 text-sm text-[var(--color-slate)]">{t('entrar.subtitulo')}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="rotulo" htmlFor="email">
              {t('comum.email')}
            </label>
            <input
              id="email"
              className="campo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="senha">
              {t('comum.senha')}
            </label>
            <input
              id="senha"
              className="campo"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <button type="submit" className="btn-primario w-full" disabled={carregando}>
            {carregando ? t('entrar.entrando') : t('comum.entrar')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-slate)]">
          {t('entrar.semConta')}{' '}
          <Link to="/cadastrar" className="text-[var(--color-gold-deep)]">
            {t('entrar.cadastre')}
          </Link>
        </p>
      </div>

      {modoDemo && (
        <div className="cartao mt-4">
          <p className="text-sm font-medium">{t('entrar.contasDemo')}</p>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            {t('config.demoTexto', { senha: senhaDemo })}
          </p>
          <div className="mt-3 space-y-2">
            {CONTAS_DEMO.map((c) => (
              <button
                key={c.email}
                type="button"
                className="btn-secundario w-full !justify-between !py-2 text-left text-sm"
                onClick={() => {
                  setEmail(c.email)
                  setSenha(senhaDemo)
                }}
              >
                <span>{t(c.chave)}</span>
                <span className="text-[var(--color-slate)]">{c.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
