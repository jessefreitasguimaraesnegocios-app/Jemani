import { useEffect, useMemo, useRef, useState } from 'react'
import { usarIdioma } from '@/i18n/usarIdioma'
import { listarHorariosDisponiveis } from '@/services/reservaValidacao'
import './SeletorDataHorario.css'

type Props = {
  data: string
  horario: string
  dataMinima: string
  agora: Date
  antecedenciaHoras: number
  aoMudarData: (data: string) => void
  aoMudarHorario: (horario: string) => void
  dicaHorario?: string
}

const DIAS_JANELA = 21

function somarDiasIso(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const base = Date.UTC(ano, mes - 1, dia)
  const proximo = new Date(base + dias * 24 * 60 * 60 * 1000)
  const y = proximo.getUTCFullYear()
  const m = String(proximo.getUTCMonth() + 1).padStart(2, '0')
  const d = String(proximo.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function periodoDoHorario(horario: string): 'manha' | 'tarde' | 'noite' {
  const hora = Number(horario.slice(0, 2))
  if (hora < 12) return 'manha'
  if (hora < 18) return 'tarde'
  return 'noite'
}

export function SeletorDataHorario({
  data,
  horario,
  dataMinima,
  agora,
  antecedenciaHoras,
  aoMudarData,
  aoMudarHorario,
  dicaHorario,
}: Props) {
  const { t, locale } = usarIdioma()
  const faixaRef = useRef<HTMLDivElement>(null)
  const [listaHorariosAberta, setListaHorariosAberta] = useState(true)

  useEffect(() => {
    setListaHorariosAberta(true)
  }, [data])

  const datas = useMemo(() => {
    const lista: string[] = []
    for (let i = 0; i < DIAS_JANELA; i++) {
      const iso = somarDiasIso(dataMinima, i)
      if (
        listarHorariosDisponiveis(iso, agora, undefined, 15, antecedenciaHoras).length > 0
      ) {
        lista.push(iso)
      }
    }
    return lista
  }, [dataMinima, agora, antecedenciaHoras])

  const horarios = useMemo(
    () => listarHorariosDisponiveis(data, agora, undefined, 15, antecedenciaHoras),
    [data, agora, antecedenciaHoras],
  )

  const grupos = useMemo(() => {
    const manha = horarios.filter((h) => periodoDoHorario(h) === 'manha')
    const tarde = horarios.filter((h) => periodoDoHorario(h) === 'tarde')
    const noite = horarios.filter((h) => periodoDoHorario(h) === 'noite')
    return [
      { id: 'manha' as const, rotulo: t('reserva.periodoManha'), itens: manha },
      { id: 'tarde' as const, rotulo: t('reserva.periodoTarde'), itens: tarde },
      { id: 'noite' as const, rotulo: t('reserva.periodoNoite'), itens: noite },
    ].filter((g) => g.itens.length > 0)
  }, [horarios, t])

  const gruposVisiveis = useMemo(() => {
    if (listaHorariosAberta || !horario || !horarios.includes(horario)) return grupos
    const periodo = periodoDoHorario(horario)
    const rotulo =
      periodo === 'manha'
        ? t('reserva.periodoManha')
        : periodo === 'tarde'
          ? t('reserva.periodoTarde')
          : t('reserva.periodoNoite')
    return [{ id: periodo, rotulo, itens: [horario] }]
  }, [grupos, listaHorariosAberta, horario, horarios, t])

  useEffect(() => {
    const faixa = faixaRef.current
    if (!faixa) return
    const ativo = faixa.querySelector<HTMLElement>('[data-ativo="true"]')
    if (!ativo) return
    ativo.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [data, datas])

  function escolherHorario(proximo: string) {
    if (proximo === horario && !listaHorariosAberta) {
      setListaHorariosAberta(true)
      return
    }
    aoMudarHorario(proximo)
    setListaHorariosAberta(false)
  }

  function rotuloDia(iso: string) {
    const [ano, mes, dia] = iso.split('-').map(Number)
    const dataLocal = new Date(ano, mes - 1, dia)
    return {
      semana: dataLocal.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
      numero: String(dia).padStart(2, '0'),
      mes: dataLocal.toLocaleDateString(locale, { month: 'short' }).replace('.', ''),
    }
  }

  return (
    <div className="seletor-agenda">
      <div className="seletor-agenda-bloco">
        <div className="seletor-agenda-cabeca">
          <p className="seletor-agenda-rotulo">{t('reserva.data')}</p>
          <p className="seletor-agenda-resumo">
            {new Date(`${data}T12:00:00`).toLocaleDateString(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <div
          ref={faixaRef}
          className="seletor-agenda-dias"
          role="listbox"
          aria-label={t('reserva.data')}
        >
          {datas.map((iso) => {
            const { semana, numero, mes } = rotuloDia(iso)
            const ativo = iso === data
            return (
              <button
                key={iso}
                type="button"
                role="option"
                aria-selected={ativo}
                data-ativo={ativo ? 'true' : undefined}
                className={`seletor-agenda-dia ${ativo ? 'seletor-agenda-dia--ativo' : ''}`}
                onClick={() => aoMudarData(iso)}
              >
                <span className="seletor-agenda-dia-semana">{semana}</span>
                <span className="seletor-agenda-dia-numero">{numero}</span>
                <span className="seletor-agenda-dia-mes">{mes}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="seletor-agenda-bloco">
        <div className="seletor-agenda-cabeca">
          <p className="seletor-agenda-rotulo">{t('reserva.horario')}</p>
          <p className="seletor-agenda-resumo">
            {horario || '—'}
            <span>
              · {t('reserva.antecedenciaCurta', { n: antecedenciaHoras })}
            </span>
          </p>
        </div>

        {horarios.length === 0 ? (
          <p className="seletor-agenda-vazio">{t('reserva.semHorarios')}</p>
        ) : (
          <div
            className={`seletor-agenda-periodos ${
              !listaHorariosAberta ? 'seletor-agenda-periodos--recolhido' : ''
            }`}
          >
            {gruposVisiveis.map((grupo) => (
              <div key={grupo.id} className="seletor-agenda-periodo">
                <p className="seletor-agenda-periodo-titulo">{grupo.rotulo}</p>
                <div
                  className={`seletor-agenda-horas ${
                    !listaHorariosAberta ? 'seletor-agenda-horas--recolhido' : ''
                  }`}
                  role="listbox"
                  aria-label={grupo.rotulo}
                >
                  {grupo.itens.map((h) => {
                    const ativo = h === horario
                    return (
                      <button
                        key={h}
                        type="button"
                        role="option"
                        aria-selected={ativo}
                        className={`seletor-agenda-hora ${ativo ? 'seletor-agenda-hora--ativo' : ''}`}
                        onClick={() => escolherHorario(h)}
                      >
                        {h}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {dicaHorario && <p className="seletor-agenda-dica">{dicaHorario}</p>}
      </div>
    </div>
  )
}
