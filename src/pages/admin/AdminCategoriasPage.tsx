import { useMemo, useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { SLUG_SHIELD } from '@/data/seed'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './AdminCategoriasPage.css'

export function AdminCategoriasPage() {
  const { t, locale } = usarIdioma()
  const todasCategorias = useDemoStore((s) => s.categorias)
  const categorias = useMemo(
    () =>
      [...todasCategorias].sort((a, b) => {
        if (a.slug === SLUG_SHIELD) return -1
        if (b.slug === SLUG_SHIELD) return 1
        return a.ordem - b.ordem
      }),
    [todasCategorias],
  )
  const salvarCategoria = useDemoStore((s) => s.salvarCategoria)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [adicional, setAdicional] = useState(0)
  const [capacidadeMin, setCapacidadeMin] = useState(1)
  const [capacidadeMax, setCapacidadeMax] = useState(3)
  const [erro, setErro] = useState('')

  function limparFormulario() {
    setNome('')
    setDescricao('')
    setAdicional(0)
    setCapacidadeMin(1)
    setCapacidadeMax(3)
    setErro('')
  }

  function handleSubmit() {
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErro(t('admin.categorias.erroNome'))
      throw new Error(t('admin.categorias.erroNome'))
    }
    const min = Math.max(1, Number(capacidadeMin) || 1)
    const max = Math.max(1, Number(capacidadeMax) || min)
    if (max < min) {
      setErro(t('admin.categorias.erroAssentos'))
      throw new Error(t('admin.categorias.erroAssentos'))
    }
    salvarCategoria({
      nome: nomeLimpo,
      descricao: descricao.trim() || undefined,
      adicional_preco: Number(adicional) || 0,
      capacidade_min: min,
      capacidade_max: max,
    })
    limparFormulario()
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('admin.categorias.titulo')}</h1>
      {categorias.map((c) => (
        <div key={c.id} className="cartao flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{c.nome}</p>
            <p className="text-sm text-[var(--color-slate)]">{c.descricao}</p>
            <p className="text-sm text-[var(--color-slate)]">
              {formatarMoeda(c.adicional_preco, locale)} · {c.capacidade_min}-{c.capacidade_max}
            </p>
          </div>
          <BotaoSalvar
            className="btn-secundario !py-2"
            aoSalvar={() => {
              salvarCategoria({ ...c, ativo: !c.ativo })
            }}
            rotuloOk="OK"
          >
            {c.ativo ? t('admin.categorias.desativar') : t('admin.categorias.ativar')}
          </BotaoSalvar>
        </div>
      ))}
      <div className="cartao admin-categorias-form">
        <h2 className="fonte-display text-2xl">{t('admin.categorias.nova')}</h2>

        <label className="admin-categorias-campo">
          <span className="admin-categorias-rotulo">{t('admin.categorias.campoNome')}</span>
          <p className="admin-categorias-dica">{t('admin.categorias.dicaNome')}</p>
          <input
            className="campo"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (erro) setErro('')
            }}
            required
          />
        </label>

        <label className="admin-categorias-campo">
          <span className="admin-categorias-rotulo">{t('admin.categorias.campoDescricao')}</span>
          <p className="admin-categorias-dica">{t('admin.categorias.dicaDescricao')}</p>
          <input
            className="campo"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </label>

        <label className="admin-categorias-campo">
          <span className="admin-categorias-rotulo">{t('admin.categorias.campoValor')}</span>
          <p className="admin-categorias-dica">{t('admin.categorias.dicaValor')}</p>
          <input
            className="campo"
            type="number"
            min={0}
            step={0.01}
            value={adicional}
            onChange={(e) => setAdicional(Number(e.target.value))}
          />
        </label>

        <div className="admin-categorias-campo">
          <span className="admin-categorias-rotulo">{t('admin.categorias.campoAssentos')}</span>
          <p className="admin-categorias-dica">{t('admin.categorias.dicaAssentos')}</p>
          <div className="admin-categorias-assentos">
            <label className="admin-categorias-assento">
              <span>{t('admin.categorias.min')}</span>
              <input
                className="campo"
                type="number"
                min={1}
                value={capacidadeMin}
                onChange={(e) => {
                  setCapacidadeMin(Number(e.target.value))
                  if (erro) setErro('')
                }}
              />
            </label>
            <label className="admin-categorias-assento">
              <span>{t('admin.categorias.max')}</span>
              <input
                className="campo"
                type="number"
                min={1}
                value={capacidadeMax}
                onChange={(e) => {
                  setCapacidadeMax(Number(e.target.value))
                  if (erro) setErro('')
                }}
              />
            </label>
          </div>
        </div>

        {erro && <p className="admin-categorias-erro">{erro}</p>}

        <BotaoSalvar className="btn-primario" aoSalvar={handleSubmit}>
          {t('admin.categorias.adicionar')}
        </BotaoSalvar>
      </div>
    </div>
  )
}
