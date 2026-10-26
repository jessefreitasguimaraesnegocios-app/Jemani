import { useEffect, useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { CampoEndereco } from '@/components/CampoEndereco'
import type { CategoriaVeiculo, Empresa, EnderecoLocal } from '@/types'
import { enderecoProntoParaReserva } from '@/utils/endereco'
import './FormularioNovaEmpresa.css'

interface Props {
  empresa: Empresa
  categorias: CategoriaVeiculo[]
  onSalvar: (patch: Partial<Empresa> & { id: string }) => void
}

function enderecoDaEmpresa(empresa: Empresa): EnderecoLocal | null {
  if (!empresa.endereco_base) return null
  return {
    formatted: empresa.endereco_base,
    cidade: empresa.cidade,
    latitude: empresa.latitude ?? 0,
    longitude: empresa.longitude ?? 0,
    source: 'dev_fallback',
    numero_confirmado: true,
    numero: '1',
  }
}

export function FormularioEditarEmpresa({ empresa, categorias, onSalvar }: Props) {
  const [nomeComercial, setNomeComercial] = useState(empresa.nome_comercial)
  const [razaoSocial, setRazaoSocial] = useState(empresa.razao_social)
  const [ein, setEin] = useState(empresa.cnpj)
  const [telefone, setTelefone] = useState(empresa.telefone)
  const [cidade, setCidade] = useState(empresa.cidade)
  const [regioes, setRegioes] = useState(empresa.regioes_atendidas.join(', '))
  const [categoriasIds, setCategoriasIds] = useState(empresa.categorias_ids)
  const [endereco, setEndereco] = useState<EnderecoLocal | null>(() =>
    enderecoDaEmpresa(empresa),
  )
  const [erro, setErro] = useState('')

  useEffect(() => {
    setNomeComercial(empresa.nome_comercial)
    setRazaoSocial(empresa.razao_social)
    setEin(empresa.cnpj)
    setTelefone(empresa.telefone)
    setCidade(empresa.cidade)
    setRegioes(empresa.regioes_atendidas.join(', '))
    setCategoriasIds(empresa.categorias_ids)
    setEndereco(enderecoDaEmpresa(empresa))
    setErro('')
  }, [empresa])

  function alternarCategoria(id: string) {
    setCategoriasIds((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )
  }

  function enviar() {
    setErro('')
    if (!nomeComercial.trim() || !razaoSocial.trim() || !ein.trim() || !telefone.trim()) {
      setErro('Preencha os campos obrigatórios.')
      throw new Error('campos')
    }
    if (categoriasIds.length === 0) {
      setErro('Selecione ao menos uma categoria de veículo.')
      throw new Error('categoria')
    }
    const listaRegioes = regioes
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)

    let endereco_base = empresa.endereco_base
    let latitude = empresa.latitude
    let longitude = empresa.longitude
    if (endereco) {
      const mesmoSalvo =
        endereco.formatted === empresa.endereco_base &&
        endereco.source === 'dev_fallback'
      if (!mesmoSalvo) {
        const check = enderecoProntoParaReserva(endereco)
        if (!check.ok) {
          setErro(check.mensagem ?? 'Informe o endereço-base com número válido.')
          throw new Error('endereco')
        }
      }
      endereco_base = endereco.formatted
      latitude = endereco.latitude
      longitude = endereco.longitude
    }

    onSalvar({
      id: empresa.id,
      nome_comercial: nomeComercial.trim(),
      razao_social: razaoSocial.trim(),
      cnpj: ein.trim(),
      telefone: telefone.trim(),
      cidade: cidade.trim() || endereco?.cidade || empresa.cidade,
      regioes_atendidas: listaRegioes.length
        ? listaRegioes
        : ([cidade.trim() || endereco?.cidade || empresa.cidade].filter(Boolean) as string[]),
      categorias_ids: categoriasIds,
      endereco_base,
      latitude,
      longitude,
    })
  }

  return (
    <div className="formulario-nova-empresa">
      <h3 className="fonte-display text-xl">Editar dados da empresa</h3>
      <div className="formulario-nova-empresa-grade">
        <div>
          <label className="rotulo" htmlFor="edit-emp-nome">
            Nome comercial
          </label>
          <input
            id="edit-emp-nome"
            className="campo"
            value={nomeComercial}
            onChange={(e) => setNomeComercial(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="edit-emp-razao">
            Razão social
          </label>
          <input
            id="edit-emp-razao"
            className="campo"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="edit-emp-ein">
            EIN / CNPJ
          </label>
          <input
            id="edit-emp-ein"
            className="campo"
            value={ein}
            onChange={(e) => setEin(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="edit-emp-tel">
            Telefone
          </label>
          <input
            id="edit-emp-tel"
            className="campo"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="edit-emp-cidade">
            Cidade
          </label>
          <input
            id="edit-emp-cidade"
            className="campo"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="edit-emp-regioes">
            Regiões atendidas
          </label>
          <input
            id="edit-emp-regioes"
            className="campo"
            value={regioes}
            onChange={(e) => setRegioes(e.target.value)}
            placeholder="Ex.: Manhattan, JFK, Brooklyn"
          />
        </div>
      </div>

      <CampoEndereco
        rotulo="Endereço-base (rua e número)"
        valor={endereco}
        onChange={setEndereco}
        placeholder="Ex.: 350 5th Ave, New York"
      />

      <div>
        <p className="rotulo">Categorias atendidas</p>
        <div className="formulario-nova-empresa-cats">
          {categorias.map((c) => (
            <label key={c.id} className="formulario-nova-empresa-cat">
              <input
                type="checkbox"
                checked={categoriasIds.includes(c.id)}
                onChange={() => alternarCategoria(c.id)}
              />
              {c.nome}
            </label>
          ))}
        </div>
      </div>

      {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

      <div className="formulario-nova-empresa-acoes">
        <BotaoSalvar className="btn-primario" aoSalvar={enviar}>
          Salvar empresa
        </BotaoSalvar>
      </div>
    </div>
  )
}
