import { useMemo, useRef, useState, type FormEvent } from 'react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { FotoPerfilCliente } from '@/components/FotoPerfilCliente'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { enviarFotoMotorista } from '@/services/fotoMotorista'
import {
  dataEstaNoPeriodo,
  filtrarCorridas,
  montarHistoricoMotorista,
  type PeriodoMotorista,
} from '@/services/historicoMotorista'
import { useDemoStore } from '@/store/demoStore'
import { cn, formatarData, formatarDuracao, formatarMoeda } from '@/utils/format'
import './EmpresaMotoristasPage.css'

const PERIODOS: PeriodoMotorista[] = ['dia', 'semana', 'mes', 'tudo']

const ROTULO_PERIODO: Record<PeriodoMotorista, 'empresa.motoristas.hoje' | 'empresa.motoristas.semana' | 'empresa.motoristas.mes' | 'empresa.motoristas.tudo'> = {
  dia: 'empresa.motoristas.hoje',
  semana: 'empresa.motoristas.semana',
  mes: 'empresa.motoristas.mes',
  tudo: 'empresa.motoristas.tudo',
}

function textoKm(km: number | null, locale: string) {
  if (km == null) return '—'
  const numero = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(km) ? 0 : 1,
  }).format(km)
  return `${numero} km`
}

export function EmpresaMotoristasPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todosMotoristas = useDemoStore((s) => s.motoristas)
  const perfis = useDemoStore((s) => s.perfis)
  const viagens = useDemoStore((s) => s.viagens)
  const historicos = useDemoStore((s) => s.historicos)
  const turnos = useDemoStore((s) => s.turnos)
  const veiculos = useDemoStore((s) => s.veiculos)
  const agendamentos = useDemoStore((s) => s.agendamentosVeiculo)
  const motoristas = useMemo(
    () => todosMotoristas.filter((m) => m.empresa_id === empresa?.id),
    [todosMotoristas, empresa?.id],
  )
  const mapaPerfis = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const mapaVeiculos = useMemo(() => new Map(veiculos.map((v) => [v.id, v])), [veiculos])
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
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [motoristaId, setMotoristaId] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoMotorista>('tudo')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')
  const [okFoto, setOkFoto] = useState('')
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const motoristaAberto = motoristas.find((m) => m.id === motoristaId) ?? null
  const historico = useMemo(() => {
    if (!empresa || !motoristaAberto) return null
    return montarHistoricoMotorista({
      motoristaId: motoristaAberto.id,
      empresaId: empresa.id,
      viagens,
      historicos,
      turnos,
    })
  }, [empresa, motoristaAberto, viagens, historicos, turnos])

  const corridasPeriodo = useMemo(
    () => (historico ? filtrarCorridas(historico.corridas, periodo) : []),
    [historico, periodo],
  )
  const agendamentosPeriodo = useMemo(() => {
    if (!empresa || !motoristaAberto) return []
    return (agendamentos ?? [])
      .filter(
        (item) =>
          item.motorista_id === motoristaAberto.id &&
          item.empresa_id === empresa.id &&
          dataEstaNoPeriodo(item.data, periodo),
      )
      .sort((a, b) => `${b.data}T${b.horario}`.localeCompare(`${a.data}T${a.horario}`))
  }, [agendamentos, empresa, motoristaAberto, periodo])

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
      setCadastroAberto(false)
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

  function abrirHistorico(id: string) {
    setMotoristaId(id)
    setPeriodo('tudo')
    setErroFoto('')
    setOkFoto('')
  }

  async function aoEscolherFoto(arquivo?: File | null) {
    if (!motoristaAberto || !arquivo) return
    setErroFoto('')
    setOkFoto('')
    setEnviandoFoto(true)
    try {
      const url = await enviarFotoMotorista(motoristaAberto.id, arquivo)
      salvarMotorista({
        ...motoristaAberto,
        foto_url: url,
      })
      setOkFoto(t('empresa.motoristas.fotoSalva'))
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : t('empresa.motoristas.fotoErro'))
    } finally {
      setEnviandoFoto(false)
      if (inputFotoRef.current) inputFotoRef.current.value = ''
    }
  }

  function aoRemoverFoto() {
    if (!motoristaAberto?.foto_url) return
    setErroFoto('')
    setOkFoto('')
    salvarMotorista({
      ...motoristaAberto,
      foto_url: undefined,
    })
    setOkFoto(t('empresa.motoristas.fotoRemovida'))
  }

  if (motoristaAberto && historico) {
    const perfil = motoristaAberto.usuario_id
      ? mapaPerfis.get(motoristaAberto.usuario_id)
      : undefined
    const resumo = historico.resumos[periodo]
    return (
      <div className="animar-entrada space-y-4">
        <div>
          <button type="button" className="btn-secundario motorista-voltar" onClick={() => setMotoristaId(null)}>
            {t('empresa.motoristas.voltar')}
          </button>
          <div className="motorista-detalhe-topo">
            <FotoPerfilCliente
              url={motoristaAberto.foto_url}
              nome={motoristaAberto.nome}
              tamanho="perfil"
            />
            <div>
              <h1 className="fonte-display text-3xl">{motoristaAberto.nome}</h1>
              <p className="motorista-historico-sub">
                {perfil?.email ? `${perfil.email} · ` : ''}
                {motoristaAberto.telefone} · CNH {motoristaAberto.categoria_cnh} ·{' '}
                {motoristaAberto.experiencia_anos} anos
              </p>
            </div>
          </div>
        </div>

        <div className="cartao motorista-foto-bloco">
          <div>
            <p className="rotulo">{t('empresa.motoristas.foto')}</p>
            <p className="motorista-foto-dica">{t('empresa.motoristas.fotoDica')}</p>
            <div className="motorista-foto-botoes">
              <button
                type="button"
                className="btn-secundario"
                disabled={enviandoFoto}
                onClick={() => inputFotoRef.current?.click()}
              >
                {enviandoFoto
                  ? t('empresa.motoristas.enviandoFoto')
                  : t('empresa.motoristas.trocarFoto')}
              </button>
              {motoristaAberto.foto_url && (
                <button
                  type="button"
                  className="btn-perigo"
                  disabled={enviandoFoto}
                  onClick={aoRemoverFoto}
                >
                  {t('empresa.motoristas.removerFoto')}
                </button>
              )}
            </div>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="motorista-foto-input"
              onChange={(e) => void aoEscolherFoto(e.target.files?.[0])}
            />
            {erroFoto && <p className="motorista-erro">{erroFoto}</p>}
            {okFoto && <p className="motorista-ok">{okFoto}</p>}
          </div>
        </div>

        <div className="motorista-periodos">
          {PERIODOS.map((item) => (
            <button
              key={item}
              type="button"
              className={cn('motorista-periodo', periodo === item && 'motorista-periodo--ativo')}
              onClick={() => setPeriodo(item)}
            >
              <span>{t(ROTULO_PERIODO[item])}</span>
              <strong>{historico.resumos[item].corridas}</strong>
            </button>
          ))}
        </div>

        <div className="motorista-metricas">
          <div className="motorista-metrica">
            <span>{t('empresa.motoristas.horasCorrida')}</span>
            <strong>{formatarDuracao(resumo.horasCorridaMs)}</strong>
          </div>
          <div className="motorista-metrica">
            <span>{t('empresa.motoristas.km')}</span>
            <strong>{textoKm(resumo.km, locale)}</strong>
          </div>
          <div className="motorista-metrica">
            <span>{t('empresa.motoristas.horasInativo')}</span>
            <strong>{formatarDuracao(resumo.horasInativasMs)}</strong>
          </div>
          <div className="motorista-metrica">
            <span>{t('empresa.motoristas.horasTurno')}</span>
            <strong>{formatarDuracao(resumo.horasTurnoMs)}</strong>
          </div>
          <div className="motorista-metrica">
            <span>{t('empresa.veiculos.mecanica')}</span>
            <strong>{agendamentosPeriodo.filter((item) => item.tipo === 'mecanica').length}</strong>
          </div>
          <div className="motorista-metrica">
            <span>{t('empresa.veiculos.lavaJato')}</span>
            <strong>{agendamentosPeriodo.filter((item) => item.tipo === 'lava_jato').length}</strong>
          </div>
        </div>

        <div className="cartao motorista-corridas">
          <p className="font-medium">{t('empresa.motoristas.corridas')}</p>
          {corridasPeriodo.length === 0 && <p className="motorista-vazio">{t('empresa.motoristas.semCorrida')}</p>}
          {corridasPeriodo.map((corrida) => {
            const veiculo = corrida.veiculoId ? mapaVeiculos.get(corrida.veiculoId) : undefined
            const detalhes = [
              `${formatarData(corrida.data, locale)} · ${corrida.horario}`,
              textoKm(corrida.km, locale),
              formatarDuracao(corrida.duracaoMs),
              formatarMoeda(corrida.preco, locale),
              t(
                corrida.passageiros === 1
                  ? 'empresa.motoristas.passageiro'
                  : 'empresa.motoristas.passageiros',
                { n: corrida.passageiros },
              ),
              veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '',
              corrida.nomePassageiro ?? '',
              corrida.numeroVoo ? t('empresa.motoristas.voo', { codigo: corrida.numeroVoo }) : '',
            ].filter(Boolean)
            return (
              <article key={corrida.id} className="motorista-corrida">
                <div className="motorista-corrida-topo">
                  <strong>{corrida.codigo}</strong>
                  <BadgeStatus status={corrida.status} />
                </div>
                <p className="motorista-corrida-rota">
                  {corrida.origem} → {corrida.destino}
                </p>
                <p className="motorista-corrida-detalhe">{detalhes.join(' · ')}</p>
              </article>
            )
          })}
        </div>

        <div className="cartao motorista-corridas">
          <p className="font-medium">{t('empresa.motoristas.agendamentos')}</p>
          {agendamentosPeriodo.length === 0 && (
            <p className="motorista-vazio">{t('empresa.motoristas.semAgendamento')}</p>
          )}
          {agendamentosPeriodo.map((item) => {
            const veiculo = mapaVeiculos.get(item.veiculo_id)
            return (
              <article key={item.id} className="motorista-corrida">
                <div className="motorista-corrida-topo">
                  <strong>
                    {item.tipo === 'mecanica'
                      ? t('empresa.veiculos.mecanica')
                      : t('empresa.veiculos.lavaJato')}
                  </strong>
                </div>
                <p className="motorista-corrida-detalhe">
                  {[
                    `${formatarData(item.data, locale)} · ${item.horario.slice(0, 5)}`,
                    veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '',
                    item.observacao ?? '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.motoristas.titulo')}</h1>
      <div className="motorista-lista">
        {motoristas.map((m) => {
          const perfil = m.usuario_id ? mapaPerfis.get(m.usuario_id) : undefined
          return (
            <div key={m.id} className="cartao motorista-card">
              <div className="motorista-card-info">
                <button
                  type="button"
                  className="motorista-card-foto"
                  onClick={() => abrirHistorico(m.id)}
                  aria-label={m.nome}
                >
                  <FotoPerfilCliente url={m.foto_url} nome={m.nome} tamanho="corrida" />
                </button>
                <div>
                  <button type="button" className="motorista-nome" onClick={() => abrirHistorico(m.id)}>
                    {m.nome}
                  </button>
                  <p className="motorista-meta">
                    {perfil?.email ? `${perfil.email} · ` : ''}
                    {m.telefone} · CNH {m.categoria_cnh} · {m.experiencia_anos} anos
                  </p>
                </div>
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

      {!cadastroAberto && (
        <div className="motorista-cadastro">
          <button
            type="button"
            className="btn-primario"
            onClick={() => {
              setCadastroAberto(true)
              setMsg('')
              setErro('')
            }}
          >
            {t('empresa.motoristas.cadastrar')}
          </button>
          {msg && <p className="motorista-ok">{msg}</p>}
        </div>
      )}

      {cadastroAberto && (
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

        <div className="motorista-form-acoes">
          <button type="submit" className="btn-primario">
            {t('empresa.motoristas.salvar')}
          </button>
          <button
            type="button"
            className="btn-secundario"
            onClick={() => {
              setCadastroAberto(false)
              setErro('')
            }}
          >
            {t('comum.cancelar')}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
