import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'

export function EmpresaVeiculosPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todosVeiculos = useDemoStore((s) => s.veiculos)
  const veiculos = useMemo(
    () => todosVeiculos.filter((v) => v.empresa_id === empresa?.id),
    [todosVeiculos, empresa?.id],
  )
  const categorias = useDemoStore((s) => s.categorias)
  const salvarVeiculo = useDemoStore((s) => s.salvarVeiculo)
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? '')
  const [capacidade, setCapacidade] = useState(4)
  const [placa, setPlaca] = useState('')

  if (!empresa) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    salvarVeiculo({
      empresa_id: empresa!.id,
      marca,
      modelo,
      ano,
      categoria_id: categoriaId,
      capacidade,
      placa,
      ar_condicionado: true,
      bagageiro: true,
    })
    setMarca('')
    setModelo('')
    setPlaca('')
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.veiculos.titulo')}</h1>
      <div className="space-y-3">
        {veiculos.map((v) => (
          <div key={v.id} className="cartao flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-medium">
                {v.marca} {v.modelo} ({v.ano})
              </p>
              <p className="text-sm text-[var(--color-slate)]">
                {categorias.find((c) => c.id === v.categoria_id)?.nome} · {v.capacidade} lugares ·{' '}
                {v.placa}
              </p>
            </div>
            <span className="badge-status">{v.status}</span>
          </div>
        ))}
      </div>
      <form className="cartao grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <h2 className="fonte-display text-2xl sm:col-span-2">Cadastrar veículo</h2>
        <input className="campo" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} required />
        <input className="campo" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
        <input className="campo" type="number" placeholder="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
        <input className="campo" type="number" placeholder="Capacidade" value={capacidade} onChange={(e) => setCapacidade(Number(e.target.value))} />
        <select className="campo" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <input className="campo" placeholder="Placa" value={placa} onChange={(e) => setPlaca(e.target.value)} />
        <button type="submit" className="btn-primario sm:col-span-2">
          Salvar
        </button>
      </form>
    </div>
  )
}
