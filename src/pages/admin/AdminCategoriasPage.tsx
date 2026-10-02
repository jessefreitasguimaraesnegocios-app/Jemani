import { useMemo, useState, type FormEvent } from 'react'
import { SLUG_SHIELD } from '@/data/seed'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'

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
  const [adicional, setAdicional] = useState(0)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    salvarCategoria({ nome, adicional_preco: adicional })
    setNome('')
    setAdicional(0)
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('admin.categorias.titulo')}</h1>
      {categorias.map((c) => (
        <div key={c.id} className="cartao flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{c.nome}</p>
            <p className="text-sm text-[var(--color-slate)]">
              {c.descricao}
            </p>
            <p className="text-sm text-[var(--color-slate)]">
              {formatarMoeda(c.adicional_preco, locale)} · {c.capacidade_min}-{c.capacidade_max}
            </p>
          </div>
          <button
            type="button"
            className="btn-secundario !py-2"
            onClick={() => salvarCategoria({ ...c, ativo: !c.ativo })}
          >
            {c.ativo ? t('admin.categorias.desativar') : t('admin.categorias.ativar')}
          </button>
        </div>
      ))}
      <form className="cartao space-y-3" onSubmit={handleSubmit}>
        <h2 className="fonte-display text-2xl">{t('admin.categorias.nova')}</h2>
        <input
          className="campo"
          placeholder={t('comum.nome')}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <input
          className="campo"
          type="number"
          value={adicional}
          onChange={(e) => setAdicional(Number(e.target.value))}
        />
        <button type="submit" className="btn-primario">
          {t('admin.categorias.adicionar')}
        </button>
      </form>
    </div>
  )
}
