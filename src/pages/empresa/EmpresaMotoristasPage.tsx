import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import './EmpresaMotoristasPage.css'

export function EmpresaMotoristasPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todosMotoristas = useDemoStore((s) => s.motoristas)
  const perfis = useDemoStore((s) => s.perfis)
  const motoristas = useMemo(
    () => todosMotoristas.filter((m) => m.empresa_id === empresa?.id),
    [todosMotoristas, empresa?.id],
  )
  const mapaPerfis = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const salvarMotorista = useDemoStore((s) => s.salvarMotorista)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cnh, setCnh] = useState('')
  const [categoria, setCategoria] = useState('B')
  const [ehShield, setEhShield] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  if (!empresa) return null

  function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setMsg('')
    try {
      salvarMotorista({
        empresa_id: empresa!.id,
        nome: nome.trim(),
        email: email.trim(),
        senha,
        telefone: telefone.trim(),
        cnh: cnh.trim(),
        categoria_cnh: categoria,
        experiencia_anos: 1,
        eh_categoria_shield: ehShield,
      })
      setNome('')
      setEmail('')
      setSenha('')
      setTelefone('')
      setCnh('')
      setEhShield(false)
      setMsg(t('empresa.motoristas.acessoDica'))
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('cadastrar.falha'))
    }
  }

  function alternarShield(id: string, atual: boolean) {
    const motorista = motoristas.find((m) => m.id === id)
    if (!motorista) return
    salvarMotorista({
      ...motorista,
      eh_categoria_shield: !atual,
    })
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.motoristas.titulo')}</h1>
      <div className="motorista-lista">
        {motoristas.map((m) => {
          const perfil = m.usuario_id ? mapaPerfis.get(m.usuario_id) : undefined
          return (
            <div key={m.id} className="cartao motorista-card">
              <div>
                <p className="font-medium">{m.nome}</p>
                <p className="motorista-meta">
                  {perfil?.email ? `${perfil.email} · ` : ''}
                  {m.telefone} · CNH {m.categoria_cnh} · {m.experiencia_anos} anos
                </p>
              </div>
              <div className="motorista-lado">
                {m.eh_categoria_shield && <span className="motorista-selo-shield">Shield</span>}
                <span className="badge-status">
                  {m.disponivel ? t('comum.disponivel') : t('comum.ocupado')}
                </span>
                <button
                  type="button"
                  className="btn-secundario !py-2"
                  onClick={() => alternarShield(m.id, Boolean(m.eh_categoria_shield))}
                >
                  {m.eh_categoria_shield
                    ? t('empresa.motoristas.tirarShield')
                    : t('empresa.motoristas.marcarShield')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <form className="cartao motorista-form" onSubmit={enviar}>
        <div>
          <h2 className="fonte-display text-2xl">{t('empresa.motoristas.cadastrar')}</h2>
          <p className="motorista-form-sub">{t('empresa.motoristas.acessoDica')}</p>
        </div>

        <div className="motorista-grade">
          <div>
            <label className="rotulo" htmlFor="mot-nome">
              {t('comum.nome')}
            </label>
            <input
              id="mot-nome"
              className="campo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="mot-telefone">
              {t('comum.telefone')}
            </label>
            <input
              id="mot-telefone"
              className="campo"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="motorista-acesso">
          <p className="motorista-acesso-titulo">{t('empresa.motoristas.acesso')}</p>
          <div className="motorista-grade">
            <div>
              <label className="rotulo" htmlFor="mot-email">
                {t('comum.email')}
              </label>
              <input
                id="mot-email"
                className="campo"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="mot-senha">
                {t('comum.senha')}
              </label>
              <input
                id="mot-senha"
                className="campo"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="motorista-grade">
          <div>
            <label className="rotulo" htmlFor="mot-cnh">
              {t('empresa.motoristas.cnh')}
            </label>
            <input
              id="mot-cnh"
              className="campo"
              value={cnh}
              onChange={(e) => setCnh(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="mot-cat">
              {t('empresa.motoristas.categoriaCnh')}
            </label>
            <select
              id="mot-cat"
              className="campo"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {['B', 'C', 'D', 'E'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="motorista-campo-shield">
          <input
            type="checkbox"
            checked={ehShield}
            onChange={(e) => setEhShield(e.target.checked)}
          />
          <span>
            <strong>{t('empresa.motoristas.shield')}</strong>
            <span>{t('empresa.motoristas.shieldDesc')}</span>
          </span>
        </label>

        {erro && <p className="motorista-erro">{erro}</p>}
        {msg && <p className="motorista-ok">{msg}</p>}

        <button type="submit" className="btn-primario">
          {t('empresa.motoristas.salvar')}
        </button>
      </form>
    </div>
  )
}
