import { usarTemaConta } from '@/hooks/usarPreferenciasConta'
import type { IdiomaApp } from '@/i18n/tipos'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { TemaAparencia } from '@/lib/preferenciasConta'
import './EmpresaConfiguracaoPage.css'

const IDIOMAS: Array<{ valor: IdiomaApp; rotulo: string }> = [
  { valor: 'pt-BR', rotulo: 'Português (Brasil)' },
  { valor: 'en', rotulo: 'English' },
  { valor: 'es', rotulo: 'Español' },
]

export function EmpresaConfiguracaoPage() {
  const { t, idioma, definirIdioma } = usarIdioma()
  const { tema, definirTema } = usarTemaConta()

  const temas: Array<{ valor: TemaAparencia; rotulo: string }> = [
    { valor: 'claro', rotulo: t('config.temaClaro') },
    { valor: 'escuro', rotulo: t('config.temaEscuro') },
    { valor: 'sistema', rotulo: t('config.temaSistema') },
  ]

  return (
    <div className="empresa-config animar-entrada">
      <h1 className="fonte-display empresa-config-titulo">{t('empresa.configuracao.titulo')}</h1>
      <p className="empresa-config-sub">{t('empresa.configuracao.sub')}</p>

      <section className="cartao empresa-config-cartao">
        <label className="rotulo" htmlFor="empresa-idioma">
          {t('config.idioma')}
        </label>
        <select
          id="empresa-idioma"
          className="campo"
          value={idioma}
          onChange={(evento) => definirIdioma(evento.target.value as IdiomaApp)}
        >
          {IDIOMAS.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>

        <label className="rotulo" htmlFor="empresa-tema">
          {t('config.aparencia')}
        </label>
        <select
          id="empresa-tema"
          className="campo"
          value={tema}
          onChange={(evento) => definirTema(evento.target.value as TemaAparencia)}
        >
          {temas.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>

        <p className="empresa-config-dica">{t('config.idiomaDica')}</p>
      </section>
    </div>
  )
}
