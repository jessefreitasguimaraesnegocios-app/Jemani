import { useState, type FormEvent } from 'react'
import { CampoEndereco } from '@/components/CampoEndereco'
import { criarEmpresaNoSupabase } from '@/services/empresaAdminService'
import type { CategoriaVeiculo, Empresa, EnderecoLocal } from '@/types'
import { enderecoProntoParaReserva } from '@/utils/endereco'
import './FormularioNovaEmpresa.css'

interface Props {
  categorias: CategoriaVeiculo[]
  onCriada: (empresa: Empresa, senha: string) => void
  onCancelar: () => void
}

export function FormularioNovaEmpresa({ categorias, onCriada, onCancelar }: Props) {
  const [nomeComercial, setNomeComercial] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [ein, setEin] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [regioes, setRegioes] = useState('')
  const [endereco, setEndereco] = useState<EnderecoLocal | null>(null)
  const [categoriasIds, setCategoriasIds] = useState<string[]>(
    categorias.filter((c) => c.ativo).map((c) => c.id),
  )
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  function alternarCategoria(id: string) {
    setCategoriasIds((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const check = enderecoProntoParaReserva(endereco)
    if (!check.ok || !endereco) {
      setErro(check.mensagem ?? 'Informe o endereço-base com número válido.')
      return
    }
    if (categoriasIds.length === 0) {
      setErro('Selecione ao menos uma categoria de veículo.')
      return
    }
    setEnviando(true)
    try {
      const listaRegioes = regioes
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
      const empresa = await criarEmpresaNoSupabase({
        nome_comercial: nomeComercial.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: ein.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        senha,
        cidade: cidade.trim() || endereco.cidade || 'Los Angeles',
        endereco_base: endereco.formatted,
        latitude: endereco.latitude,
        longitude: endereco.longitude,
        regioes_atendidas: listaRegioes.length ? listaRegioes : [cidade.trim() || endereco.cidade || 'Los Angeles'],
        categorias_ids: categoriasIds,
        nome_gestor: `Gestor ${nomeComercial.trim()}`,
      })
      onCriada(empresa, senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao criar empresa')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="cartao formulario-nova-empresa" onSubmit={enviar}>
      <h2 className="fonte-display text-2xl">Nova empresa parceira</h2>
      <p className="formulario-nova-empresa-dica">
        O cadastro é gravado no Supabase. A empresa entra ativa e habilitada a receber corridas.
      </p>

      <div className="formulario-nova-empresa-grade">
        <div>
          <label className="rotulo" htmlFor="emp-nome">
            Nome comercial
          </label>
          <input
            id="emp-nome"
            className="campo"
            value={nomeComercial}
            onChange={(e) => setNomeComercial(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-razao">
            Razão social
          </label>
          <input
            id="emp-razao"
            className="campo"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-ein">
            EIN / CNPJ
          </label>
          <input
            id="emp-ein"
            className="campo"
            value={ein}
            onChange={(e) => setEin(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-tel">
            Telefone
          </label>
          <input
            id="emp-tel"
            className="campo"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-email">
            E-mail de acesso
          </label>
          <input
            id="emp-email"
            className="campo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-senha">
            Senha de acesso
          </label>
          <input
            id="emp-senha"
            className="campo"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-cidade">
            Cidade
          </label>
          <input
            id="emp-cidade"
            className="campo"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Los Angeles"
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-regioes">
            Regiões atendidas
          </label>
          <input
            id="emp-regioes"
            className="campo"
            value={regioes}
            onChange={(e) => setRegioes(e.target.value)}
            placeholder="Los Angeles, LAX, Beverly Hills"
          />
        </div>
      </div>

      <CampoEndereco
        rotulo="Endereço-base (rua e número)"
        valor={endereco}
        onChange={setEndereco}
        placeholder="Ex.: 200 N Spring St, Los Angeles"
      />

      <div>
        <p className="rotulo">Categorias atendidas</p>
        <div className="formulario-nova-empresa-cats">
          {categorias
            .filter((c) => c.ativo)
            .map((c) => (
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
        <button type="button" className="btn-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="btn-ouro" disabled={enviando}>
          {enviando ? 'Salvando no Supabase...' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
