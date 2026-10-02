import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, rotaPorTipo } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'

export function CadastrarPage() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()
  const { t } = usarIdioma()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const usuario = await cadastrar({ nome, email, senha, telefone, tipo: 'cliente' })
      navigate(rotaPorTipo(usuario.tipo))
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('cadastrar.falha'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="fonte-display mb-8 text-center text-4xl">
        Jemani
      </Link>
      <div className="cartao animar-entrada">
        <h1 className="fonte-display text-3xl">{t('cadastrar.titulo')}</h1>
        <p className="mt-1 text-sm text-[var(--color-slate)]">{t('cadastrar.subtitulo')}</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="rotulo" htmlFor="nome">
              {t('cadastrar.nomeCompleto')}
            </label>
            <input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <label className="rotulo" htmlFor="email">
              {t('comum.email')}
            </label>
            <input
              id="email"
              type="email"
              className="campo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="telefone">
              {t('comum.telefone')}
            </label>
            <input
              id="telefone"
              className="campo"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="senha">
              {t('comum.senha')}
            </label>
            <input
              id="senha"
              type="password"
              className="campo"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <button type="submit" className="btn-primario w-full" disabled={carregando}>
            {carregando ? t('cadastrar.criando') : t('cadastrar.botao')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--color-slate)]">
          {t('cadastrar.jaTem')}{' '}
          <Link to="/entrar" className="text-[var(--color-gold-deep)]">
            {t('comum.entrar')}
          </Link>
        </p>
      </div>
    </div>
  )
}
