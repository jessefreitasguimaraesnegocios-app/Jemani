import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore, type VisaoConvitePublico } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'
import './ConviteOfertaPage.css'

function formatarQuando(data: string, horario: string, locale: string) {
  if (!data) return '—'
  const dataFmt = formatarData(data, locale)
  return horario ? `${dataFmt} · ${horario.slice(0, 5)}` : dataFmt
}

export function ConviteOfertaPage() {
  const { token = '' } = useParams()
  const { t, locale } = usarIdioma()
  const consultar = useDemoStore((s) => s.consultarConvitePublico)
  const aceitar = useDemoStore((s) => s.aceitarConvitePublico)
  const [visao, setVisao] = useState<VisaoConvitePublico | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    setErro('')
    void consultar(token)
      .then((dados) => {
        if (!vivo) return
        setVisao(dados)
      })
      .catch((e) => {
        if (!vivo) return
        setVisao(null)
        setErro(e instanceof Error ? e.message : 'nao_encontrado')
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [token, consultar])

  async function confirmar() {
    if (!token || enviando) return
    setEnviando(true)
    setErro('')
    try {
      const dados = await aceitar(token)
      setVisao(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'indisponivel')
    } finally {
      setEnviando(false)
    }
  }

  const mensagemErro =
    erro === 'expirada'
      ? t('convite.erroExpirada')
      : erro === 'revogada' || erro === 'ja_aceita' || erro === 'indisponivel'
        ? t('convite.erroIndisponivel')
        : erro
          ? t('convite.erroNaoEncontrado')
          : ''

  return (
    <div className="convite-pagina">
      <header className="convite-topo">
        <p className="fonte-display convite-marca">Jemani</p>
        <p className="convite-topo-sub">{t('convite.subtituloPainel')}</p>
      </header>

      <main className="convite-conteudo">
        {carregando && <p className="convite-status">{t('convite.carregando')}</p>}

        {!carregando && mensagemErro && !visao && (
          <div className="convite-cartao">
            <p className="convite-alerta convite-alerta--erro">{mensagemErro}</p>
          </div>
        )}

        {!carregando && visao?.situacao === 'aceita' && (
          <div className="convite-cartao">
            <div className="convite-banner-ok">
              <strong>{t('convite.aceitaTitulo')}</strong>
              <span>{t('convite.aceitaSub')}</span>
            </div>
            <div className="convite-corrida-topo">
              <p className="convite-codigo">
                {t('convite.corrida')} #{visao.codigo}
              </p>
              <span className="convite-badge">{t('convite.badgeAceita')}</span>
            </div>
            {visao.empresa_nome && <p className="convite-empresa">{visao.empresa_nome}</p>}
            <dl className="convite-dados">
              <div>
                <dt>{t('convite.dataCorrida')}</dt>
                <dd>{formatarQuando(visao.data_viagem, visao.horario, locale)}</dd>
              </div>
              <div>
                <dt>{t('convite.rota')}</dt>
                <dd>
                  {visao.origem} → {visao.destino}
                </dd>
              </div>
              {visao.accepted_at && (
                <div>
                  <dt>{t('convite.aceitaEm')}</dt>
                  <dd>
                    {new Date(visao.accepted_at).toLocaleString(locale, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <p className="convite-rodape">{t('convite.registroAutomatico')}</p>
          </div>
        )}

        {!carregando && visao && visao.situacao === 'aberta' && (
          <div className="convite-cartao">
            <p className="convite-etapa">
              <span>2</span> {t('convite.revisarTitulo')}
            </p>
            <div className="convite-banner-info">{t('convite.propostaDisponivel')}</div>
            <h1 className="fonte-display convite-titulo">{t('convite.confiraAntes')}</h1>
            <p className="convite-sub">{t('convite.confiraSub')}</p>
            <dl className="convite-dados convite-dados--caixa">
              <div>
                <dt>{t('convite.dataHorario')}</dt>
                <dd>{formatarQuando(visao.data_viagem, visao.horario, locale)}</dd>
              </div>
              <div>
                <dt>{t('convite.origem')}</dt>
                <dd>{visao.origem}</dd>
              </div>
              <div>
                <dt>{t('convite.destino')}</dt>
                <dd>{visao.destino}</dd>
              </div>
              <div>
                <dt>{t('convite.valor')}</dt>
                <dd>
                  {typeof visao.valor_empresa === 'number'
                    ? formatarMoeda(visao.valor_empresa, locale)
                    : t('convite.valorCondicoes')}
                </dd>
              </div>
              {visao.expires_at && (
                <div>
                  <dt>{t('convite.prazo')}</dt>
                  <dd>
                    {new Date(visao.expires_at).toLocaleString(locale, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <p className="convite-compromisso">{t('convite.compromisso')}</p>
            {mensagemErro && <p className="convite-alerta convite-alerta--erro">{mensagemErro}</p>}
            <button
              type="button"
              className="convite-botao"
              disabled={enviando}
              onClick={() => void confirmar()}
            >
              {enviando ? t('convite.confirmando') : t('convite.confirmar')}
            </button>
            <p className="convite-rodape">{t('convite.avisoLink')}</p>
          </div>
        )}

        {!carregando &&
          visao &&
          visao.situacao !== 'aberta' &&
          visao.situacao !== 'aceita' && (
            <div className="convite-cartao">
              <p className="convite-alerta convite-alerta--erro">
                {visao.situacao === 'expirada'
                  ? t('convite.erroExpirada')
                  : t('convite.erroIndisponivel')}
              </p>
            </div>
          )}
      </main>
    </div>
  )
}
