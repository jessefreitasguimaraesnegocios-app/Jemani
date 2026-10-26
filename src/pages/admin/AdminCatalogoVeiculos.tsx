import { useMemo, useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { usarIdioma } from '@/i18n/usarIdioma'
import {
  cadastrarFotoCatalogoVeiculo,
  removerFotoCatalogoVeiculo,
} from '@/services/catalogoFotosVeiculo'
import { useDemoStore } from '@/store/demoStore'
import './AdminCatalogoVeiculos.css'

function textoBusca(valor?: string | number | null) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function AdminCatalogoVeiculos() {
  const { t } = usarIdioma()
  const fotos = useDemoStore((s) => s.fotosCatalogoVeiculo)
  const adicionar = useDemoStore((s) => s.adicionarFotoCatalogoVeiculo)
  const removerLocal = useDemoStore((s) => s.removerFotoCatalogoVeiculoLocal)

  const [busca, setBusca] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [nome, setNome] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const filtradas = useMemo(() => {
    const termo = textoBusca(busca).trim()
    if (!termo) return fotos
    return fotos.filter((foto) => {
      const bloco = [foto.nome, foto.marca, foto.modelo, foto.ano].map(textoBusca).join(' ')
      return bloco.includes(termo)
    })
  }, [fotos, busca])

  async function enviar() {
    if (!arquivo) throw new Error('arquivo')
    setErro('')
    setMsg('')
    try {
      const foto = await cadastrarFotoCatalogoVeiculo({
        marca,
        modelo,
        ano,
        nome,
        arquivo,
      })
      adicionar(foto)
      setMarca('')
      setModelo('')
      setNome('')
      setAno(new Date().getFullYear())
      setArquivo(null)
      setMsg(t('admin.catalogo.salvo'))
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('admin.catalogo.erroSalvar'))
      throw err
    }
  }

  async function remover(id: string) {
    const foto = fotos.find((item) => item.id === id)
    if (!foto) return
    setErro('')
    try {
      await removerFotoCatalogoVeiculo(foto)
      removerLocal(id)
      setMsg(t('admin.catalogo.removido'))
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('admin.catalogo.erroRemover'))
    }
  }

  return (
    <div className="admin-catalogo space-y-5">
      <div>
        <h2 className="fonte-display text-2xl">{t('admin.catalogo.titulo')}</h2>
        <p className="admin-catalogo-sub">{t('admin.catalogo.sub')}</p>
      </div>

      <div className="cartao admin-catalogo-form">
        <h3 className="fonte-display text-xl">{t('admin.catalogo.cadastrar')}</h3>
        <div className="admin-catalogo-grade">
          <div>
            <label className="rotulo" htmlFor="cat-marca">
              {t('empresa.veiculos.marca')}
            </label>
            <input
              id="cat-marca"
              className="campo"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="cat-modelo">
              {t('empresa.veiculos.modelo')}
            </label>
            <input
              id="cat-modelo"
              className="campo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="cat-ano">
              {t('empresa.veiculos.ano')}
            </label>
            <input
              id="cat-ano"
              className="campo"
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="cat-nome">
              {t('admin.catalogo.nome')}
            </label>
            <input
              id="cat-nome"
              className="campo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={t('admin.catalogo.nomeHint')}
            />
          </div>
          <div className="admin-catalogo-campo-foto">
            <label className="rotulo" htmlFor="cat-arquivo">
              {t('admin.catalogo.foto')}
            </label>
            <input
              id="cat-arquivo"
              className="campo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              required
            />
          </div>
        </div>
        <BotaoSalvar className="btn-primario" aoSalvar={enviar} disabled={!arquivo}>
          {t('admin.catalogo.salvar')}
        </BotaoSalvar>
      </div>

      {(erro || msg) && (
        <p className={erro ? 'admin-catalogo-erro' : 'admin-catalogo-ok'}>{erro || msg}</p>
      )}

      <label className="admin-catalogo-busca">
        <span className="rotulo">{t('comum.buscar')}</span>
        <input
          className="campo"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('admin.catalogo.busca')}
          autoComplete="off"
        />
      </label>

      {filtradas.length === 0 ? (
        <p className="admin-catalogo-vazio">{t('admin.catalogo.vazio')}</p>
      ) : (
        <div className="admin-catalogo-grade-fotos">
          {filtradas.map((foto) => (
            <article key={foto.id} className="cartao admin-catalogo-card">
              <img src={foto.url} alt={foto.nome} className="admin-catalogo-img" />
              <div className="admin-catalogo-card-info">
                <p className="font-medium">{foto.nome}</p>
                <p>
                  {foto.marca} {foto.modelo} · {foto.ano}
                </p>
                <button
                  type="button"
                  className="btn-perigo !py-2"
                  onClick={() => void remover(foto.id)}
                >
                  {t('admin.catalogo.remover')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
