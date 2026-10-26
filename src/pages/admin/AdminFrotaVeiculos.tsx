import { useMemo, useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { SeletorFotoVeiculo } from '@/components/SeletorFotoVeiculo'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { StatusEntidade, Veiculo } from '@/types'
import '../empresa/EmpresaVeiculosPage.css'
import './AdminFrotaVeiculos.css'

export function AdminFrotaVeiculos() {
  const { t } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)
  const veiculos = useDemoStore((s) => s.veiculos)
  const viagens = useDemoStore((s) => s.viagens)
  const salvarVeiculo = useDemoStore((s) => s.salvarVeiculo)
  const excluirVeiculo = useDemoStore((s) => s.excluirVeiculo)

  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? '')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? '')
  const [capacidade, setCapacidade] = useState(4)
  const [placa, setPlaca] = useState('')
  const [status, setStatus] = useState<StatusEntidade>('disponivel')
  const [fotoUrl, setFotoUrl] = useState<string | undefined>()
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const mapaEmpresas = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.nome_comercial])),
    [empresas],
  )
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])

  const lista = useMemo(() => {
    const base = filtroEmpresa
      ? veiculos.filter((v) => v.empresa_id === filtroEmpresa)
      : veiculos
    return [...base].sort((a, b) => {
      const ea = mapaEmpresas.get(a.empresa_id) ?? ''
      const eb = mapaEmpresas.get(b.empresa_id) ?? ''
      if (ea !== eb) return ea.localeCompare(eb)
      return `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`)
    })
  }, [veiculos, filtroEmpresa, mapaEmpresas])

  function limparFormulario() {
    setEditandoId(null)
    setNovoAberto(false)
    setEmpresaId(filtroEmpresa || empresas[0]?.id || '')
    setMarca('')
    setModelo('')
    setAno(new Date().getFullYear())
    setCategoriaId(categorias[0]?.id ?? '')
    setCapacidade(4)
    setPlaca('')
    setStatus('disponivel')
    setFotoUrl(undefined)
  }

  function abrirEdicao(veiculo: Veiculo) {
    setEditandoId(veiculo.id)
    setNovoAberto(true)
    setEmpresaId(veiculo.empresa_id)
    setMarca(veiculo.marca)
    setModelo(veiculo.modelo)
    setAno(veiculo.ano)
    setCategoriaId(veiculo.categoria_id)
    setCapacidade(veiculo.capacidade)
    setPlaca(veiculo.placa ?? '')
    setStatus(veiculo.status)
    setFotoUrl(veiculo.fotos[0])
    setMsg('')
    setErro('')
  }

  function veiculoEmViagem(id: string) {
    return viagens.some(
      (viagem) =>
        viagem.veiculo_id === id &&
        viagem.status !== 'viagem_finalizada' &&
        viagem.status !== 'cancelada' &&
        viagem.status !== 'expired',
    )
  }

  function enviar() {
    if (!empresaId) {
      setErro('Selecione a empresa do veículo.')
      throw new Error('empresa')
    }
    if (!marca.trim() || !modelo.trim()) {
      setErro('Informe marca e modelo.')
      throw new Error('campos')
    }
    const eraEdicao = Boolean(editandoId)
    salvarVeiculo({
      id: editandoId ?? undefined,
      empresa_id: empresaId,
      marca: marca.trim(),
      modelo: modelo.trim(),
      ano,
      categoria_id: categoriaId,
      capacidade,
      placa: placa.trim(),
      fotos: fotoUrl ? [fotoUrl] : [],
      ar_condicionado: true,
      bagageiro: true,
      status,
    })
    limparFormulario()
    setErro('')
    setMsg(eraEdicao ? t('empresa.veiculos.atualizado') : t('empresa.veiculos.salvo'))
  }

  function excluir() {
    if (!editandoId) return
    if (veiculoEmViagem(editandoId)) {
      setErro(t('empresa.veiculos.emViagem'))
      throw new Error('emViagem')
    }
    excluirVeiculo(editandoId)
    limparFormulario()
    setErro('')
    setMsg(t('empresa.veiculos.excluido'))
  }

  function rotuloStatus(s: StatusEntidade) {
    if (s === 'disponivel') return t('comum.disponivel')
    if (s === 'ocupado') return t('comum.ocupado')
    return t('empresa.veiculos.inativo')
  }

  return (
    <div className="admin-frota space-y-4">
      <div className="admin-frota-topo">
        <div>
          <h2 className="fonte-display text-2xl">{t('admin.frota.titulo')}</h2>
          <p className="admin-frota-sub">{t('admin.frota.sub')}</p>
        </div>
        <div className="admin-frota-filtros">
          <select
            className="campo"
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            aria-label={t('admin.frota.filtrarEmpresa')}
          >
            <option value="">{t('admin.frota.todasEmpresas')}</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome_comercial}
              </option>
            ))}
          </select>
          {!novoAberto && (
            <button
              type="button"
              className="btn-primario"
              onClick={() => {
                limparFormulario()
                setNovoAberto(true)
                setMsg('')
                setErro('')
              }}
            >
              {t('empresa.veiculos.cadastrar')}
            </button>
          )}
        </div>
      </div>

      {(msg || erro) && (
        <p className={erro ? 'veiculo-erro' : 'veiculo-ok'}>{erro || msg}</p>
      )}

      {novoAberto && (
        <div className="cartao veiculo-form">
          <h3 className="fonte-display text-xl">
            {editandoId ? t('empresa.veiculos.editarTitulo') : t('empresa.veiculos.cadastrar')}
          </h3>
          <div className="veiculo-grade">
            <div className="veiculo-campo-largo">
              <label className="rotulo" htmlFor="admin-vei-empresa">
                {t('admin.frota.empresa')}
              </label>
              <select
                id="admin-vei-empresa"
                className="campo"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                required
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome_comercial}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-marca">
                {t('empresa.veiculos.marca')}
              </label>
              <input
                id="admin-vei-marca"
                className="campo"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-modelo">
                {t('empresa.veiculos.modelo')}
              </label>
              <input
                id="admin-vei-modelo"
                className="campo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-ano">
                {t('empresa.veiculos.ano')}
              </label>
              <input
                id="admin-vei-ano"
                className="campo"
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-cap">
                {t('empresa.veiculos.capacidade')}
              </label>
              <input
                id="admin-vei-cap"
                className="campo"
                type="number"
                min={1}
                value={capacidade}
                onChange={(e) => setCapacidade(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-cat">
                {t('empresa.veiculos.categoria')}
              </label>
              <select
                id="admin-vei-cat"
                className="campo"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-placa">
                {t('empresa.veiculos.placa')}
              </label>
              <input
                id="admin-vei-placa"
                className="campo"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="admin-vei-status">
                Status
              </label>
              <select
                id="admin-vei-status"
                className="campo"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusEntidade)}
              >
                <option value="disponivel">{t('comum.disponivel')}</option>
                <option value="ocupado">{t('comum.ocupado')}</option>
                <option value="inativo">{t('empresa.veiculos.inativo')}</option>
              </select>
            </div>
            <div className="veiculo-campo-largo">
              <SeletorFotoVeiculo urlAtual={fotoUrl} onEscolher={setFotoUrl} />
            </div>
          </div>
          <div className="veiculo-form-acoes">
            <BotaoSalvar className="btn-primario" aoSalvar={enviar}>
              {t('empresa.veiculos.salvar')}
            </BotaoSalvar>
            <button type="button" className="btn-secundario" onClick={limparFormulario}>
              {t('comum.cancelar')}
            </button>
            {editandoId && (
              <button type="button" className="btn-perigo" onClick={excluir}>
                {t('empresa.veiculos.excluir')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="veiculo-lista">
        {lista.length === 0 ? (
          <p className="admin-empresas-vazio">{t('admin.frota.vazio')}</p>
        ) : (
          lista.map((v) => (
            <div key={v.id} className="cartao veiculo-card">
              <div className="veiculo-card-info">
                {v.fotos[0] && <img src={v.fotos[0]} alt="" className="veiculo-card-foto" />}
                <p className="veiculo-nome">
                  {v.marca} {v.modelo} ({v.ano})
                </p>
                <p className="veiculo-meta">
                  {mapaEmpresas.get(v.empresa_id) ?? '—'} ·{' '}
                  {mapaCategorias.get(v.categoria_id) ?? ''} ·{' '}
                  {t('empresa.veiculos.lugares', { n: v.capacidade })}
                  {v.placa ? ` · ${v.placa}` : ''}
                </p>
                <div className="veiculo-acoes">
                  <button type="button" className="btn-secundario" onClick={() => abrirEdicao(v)}>
                    {t('empresa.veiculos.editar')}
                  </button>
                </div>
              </div>
              <span className="badge-status">{rotuloStatus(v.status)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
