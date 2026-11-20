import { useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { CampoEndereco } from '@/components/CampoEndereco'
import { criarEmpresaNoSupabase } from '@/services/empresaAdminService'
import type { CategoriaVeiculo, Empresa, EnderecoLocal } from '@/types'
import {
  documentoFiscalValido,
  emailCadastroValido,
  formatarTelefoneEua,
  sugerirEmails,
} from '@/utils/cadastroEmpresa'
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
  const [documento, setDocumento] = useState('')
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
  const [validarCampos, setValidarCampos] = useState(false)
  const telefoneFormatado = formatarTelefoneEua(telefone)
  const camposInvalidos = {
    'emp-nome': !nomeComercial.trim(),
    'emp-razao': !razaoSocial.trim(),
    'emp-documento': !documentoFiscalValido(documento),
    'emp-tel': !telefoneFormatado,
    'emp-email': !emailCadastroValido(email),
    'emp-senha': senha.length < 8,
  }

  function campoInvalido(id: keyof typeof camposInvalidos) {
    return validarCampos && camposInvalidos[id]
  }
  const sugestoesEmail = sugerirEmails(email)

  function alternarCategoria(id: string) {
    setCategoriasIds((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )
  }

  async function enviar() {
    setErro('')
    setValidarCampos(true)
    const primeiroCampoInvalido = Object.entries(camposInvalidos).find(([, invalido]) => invalido)
    if (primeiroCampoInvalido || !telefoneFormatado) {
      if (primeiroCampoInvalido) document.getElementById(primeiroCampoInvalido[0])?.focus()
      setErro('Confira os campos indicados para criar a empresa.')
      throw new Error('cadastro inválido')
    }
    const check = enderecoProntoParaReserva(endereco)
    if (!check.ok || !endereco) {
      setErro(check.mensagem ?? 'Informe o endereço-base com número válido.')
      throw new Error('endereco')
    }
    if (categoriasIds.length === 0) {
      setErro('Selecione ao menos uma categoria de veículo.')
      throw new Error('categoria')
    }
    try {
      const listaRegioes = regioes
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
      const empresa = await criarEmpresaNoSupabase({
        nome_comercial: nomeComercial.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: documento.trim().toUpperCase(),
        telefone: telefoneFormatado,
        email: email.trim(),
        senha,
        cidade: cidade.trim() || endereco.cidade || '',
        endereco_base: endereco.formatted,
        latitude: endereco.latitude,
        longitude: endereco.longitude,
        regioes_atendidas: listaRegioes.length
          ? listaRegioes
          : ([cidade.trim() || endereco.cidade].filter(Boolean) as string[]),
        categorias_ids: categoriasIds,
        nome_gestor: `Gestor ${nomeComercial.trim()}`,
      })
      onCriada(empresa, senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao criar empresa')
      throw err
    }
  }

  return (
    <div className="cartao formulario-nova-empresa">
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
            aria-invalid={campoInvalido('emp-nome')}
            aria-describedby={campoInvalido('emp-nome') ? 'emp-nome-erro' : undefined}
            required
          />
          {campoInvalido('emp-nome') && (
            <p id="emp-nome-erro" className="mt-1 text-sm text-[var(--color-danger)]">
              Informe o nome comercial.
            </p>
          )}
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
            aria-invalid={campoInvalido('emp-razao')}
            aria-describedby={campoInvalido('emp-razao') ? 'emp-razao-erro' : undefined}
            required
          />
          {campoInvalido('emp-razao') && (
            <p id="emp-razao-erro" className="mt-1 text-sm text-[var(--color-danger)]">
              Informe a razão social.
            </p>
          )}
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-documento">
            Documento fiscal (EIN, CNPJ ou CPF)
          </label>
          <input
            id="emp-documento"
            className="campo"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="Ex.: 12-3456789"
            spellCheck={false}
            aria-invalid={campoInvalido('emp-documento')}
            aria-describedby={campoInvalido('emp-documento') ? 'emp-documento-erro' : undefined}
            required
          />
          {campoInvalido('emp-documento') && (
            <p id="emp-documento-erro" className="mt-1 text-sm text-[var(--color-danger)]">
              Informe um EIN de 9 dígitos, um CNPJ ou um CPF válido.
            </p>
          )}
        </div>
        <div>
          <label className="rotulo" htmlFor="emp-tel">
            Telefone dos EUA
          </label>
          <input
            id="emp-tel"
            className="campo"
            type="tel"
            value={telefone}
            autoComplete="tel"
            placeholder="+1 (213) 555-0123"
            aria-invalid={campoInvalido('emp-tel')}
            aria-describedby={campoInvalido('emp-tel') ? 'emp-tel-erro' : undefined}
            onBlur={() => {
              if (telefoneFormatado) setTelefone(telefoneFormatado)
            }}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />
          {campoInvalido('emp-tel') && (
            <p id="emp-tel-erro" className="mt-1 text-sm text-[var(--color-danger)]">
              Informe um telefone dos EUA com código de área e 10 dígitos.
            </p>
          )}
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
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={campoInvalido('emp-email')}
            aria-describedby={campoInvalido('emp-email') ? 'emp-email-erro' : undefined}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {campoInvalido('emp-email') && (
            <p id="emp-email-erro" className="mt-1 text-sm text-[var(--color-danger)]">
              Informe um e-mail válido, como nome@empresa.com.
            </p>
          )}
          {sugestoesEmail.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Sugestões de e-mail">
              {sugestoesEmail.map((sugestao) => (
                <li key={sugestao}>
                  <button
                    type="button"
                    className="btn-secundario max-w-full break-all text-sm"
                    onClick={() => {
                      setEmail(sugestao)
                      document.getElementById('emp-email')?.focus()
                    }}
                  >
                    {sugestao}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
            minLength={8}
            autoComplete="new-password"
            aria-invalid={campoInvalido('emp-senha')}
            aria-describedby={campoInvalido('emp-senha') ? 'emp-senha-erro' : undefined}
            required
          />
          {campoInvalido('emp-senha') && (
            <p id="emp-senha-erro" className="mt-1 text-sm text-[var(--color-danger)]">
              Use pelo menos 8 caracteres.
            </p>
          )}
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
            placeholder="Ex.: New York, Miami, São Paulo"
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

      {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}

      <div className="formulario-nova-empresa-acoes">
        <button type="button" className="btn-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <BotaoSalvar className="btn-ouro" aoSalvar={enviar} rotuloOk="Criada">
          Criar
        </BotaoSalvar>
      </div>
    </div>
  )
}
