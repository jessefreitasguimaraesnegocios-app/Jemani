import { useMemo, useState, type FormEvent } from 'react'
import { usarIdioma } from '@/i18n/usarIdioma'
import { veiculoDoMotorista } from '@/services/turnoEmpresa'
import { useDemoStore } from '@/store/demoStore'
import type { AgendamentoVeiculo, TipoServicoVeiculo } from '@/types'
import { formatarData } from '@/utils/format'
import './AgendamentoCarro.css'

function hojeLocal() {
  const fuso = import.meta.env.VITE_TIMEZONE || 'America/Los_Angeles'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function FormularioServico({
  titulo,
  chave,
  itens,
  motoristaId,
  aoAgendar,
  aoRemover,
}: {
  titulo: string
  chave: TipoServicoVeiculo
  itens: AgendamentoVeiculo[]
  motoristaId: string
  aoAgendar: (tipo: TipoServicoVeiculo, data: string, horario: string, observacao: string) => void
  aoRemover: (id: string) => void
}) {
  const { t, locale } = usarIdioma()
  const [data, setData] = useState(hojeLocal)
  const [horario, setHorario] = useState('09:00')
  const [observacao, setObservacao] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!data || !horario) return
    aoAgendar(chave, data, horario, observacao.trim())
    setObservacao('')
  }

  return (
    <section className="carro-servico">
      <h2>{titulo}</h2>
      {itens.length === 0 && <p className="carro-vazio">{t('empresa.veiculos.semAgendamento')}</p>}
      {itens.map((item) => (
        <div key={item.id} className="carro-agendamento">
          <div>
            <p>
              {formatarData(item.data, locale)} · {item.horario.slice(0, 5)}
            </p>
            {item.observacao && <p className="carro-nota">{item.observacao}</p>}
          </div>
          {item.motorista_id === motoristaId && (
            <button type="button" className="carro-remover" onClick={() => aoRemover(item.id)}>
              {t('empresa.veiculos.remover')}
            </button>
          )}
        </div>
      ))}
      <form className="carro-form" onSubmit={enviar}>
        <label className="carro-rotulo" htmlFor={`carro-dia-${chave}`}>
          {t('empresa.veiculos.dia')}
          <input
            id={`carro-dia-${chave}`}
            className="carro-campo"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </label>
        <label className="carro-rotulo" htmlFor={`carro-hora-${chave}`}>
          {t('empresa.veiculos.horario')}
          <input
            id={`carro-hora-${chave}`}
            className="carro-campo"
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            required
          />
        </label>
        <label className="carro-rotulo carro-rotulo-largo" htmlFor={`carro-nota-${chave}`}>
          {t('empresa.veiculos.observacao')}
          <input
            id={`carro-nota-${chave}`}
            className="carro-campo"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>
        <button type="submit" className="carro-agendar">
          {t('empresa.veiculos.agendar')}
        </button>
      </form>
    </section>
  )
}

export function AgendamentoCarro({
  motoristaId,
  empresaId,
}: {
  motoristaId: string
  empresaId: string
}) {
  const { t } = usarIdioma()
  const veiculos = useDemoStore((s) => s.veiculos)
  const viagens = useDemoStore((s) => s.viagens)
  const turnos = useDemoStore((s) => s.turnos)
  const agendamentos = useDemoStore((s) => s.agendamentosVeiculo)
  const agendarServicoVeiculo = useDemoStore((s) => s.agendarServicoVeiculo)
  const removerAgendamentoVeiculo = useDemoStore((s) => s.removerAgendamentoVeiculo)
  const daEmpresa = useMemo(
    () => veiculos.filter((veiculo) => veiculo.empresa_id === empresaId),
    [veiculos, empresaId],
  )
  const sugerido = veiculoDoMotorista(motoristaId, turnos, viagens, veiculos)
  const [escolhido, setEscolhido] = useState(sugerido?.id ?? daEmpresa[0]?.id ?? '')
  const veiculoId = daEmpresa.some((veiculo) => veiculo.id === escolhido)
    ? escolhido
    : (sugerido?.id ?? daEmpresa[0]?.id ?? '')
  const lista = useMemo(
    () =>
      (agendamentos ?? [])
        .filter((item) => item.veiculo_id === veiculoId && item.empresa_id === empresaId)
        .sort((a, b) => `${a.data}T${a.horario}`.localeCompare(`${b.data}T${b.horario}`)),
    [agendamentos, veiculoId, empresaId],
  )

  function agendar(tipo: TipoServicoVeiculo, data: string, horario: string, observacao: string) {
    if (!veiculoId) return
    agendarServicoVeiculo({
      veiculoId,
      empresaId,
      motoristaId,
      tipo,
      data,
      horario,
      observacao,
    })
  }

  if (daEmpresa.length === 0) {
    return <p className="carro-vazio">{t('motorista.semVeiculo')}</p>
  }

  return (
    <div className="carro-painel">
      <label className="carro-rotulo" htmlFor="carro-veiculo">
        {t('motorista.escolherVeiculo')}
        <select
          id="carro-veiculo"
          className="carro-campo"
          value={veiculoId}
          onChange={(e) => setEscolhido(e.target.value)}
        >
          {daEmpresa.map((veiculo) => (
            <option key={veiculo.id} value={veiculo.id}>
              {veiculo.marca} {veiculo.modelo}
              {veiculo.placa ? ` · ${veiculo.placa}` : ''}
            </option>
          ))}
        </select>
      </label>
      <FormularioServico
        titulo={t('empresa.veiculos.mecanica')}
        chave="mecanica"
        itens={lista.filter((item) => item.tipo === 'mecanica')}
        motoristaId={motoristaId}
        aoAgendar={agendar}
        aoRemover={removerAgendamentoVeiculo}
      />
      <FormularioServico
        titulo={t('empresa.veiculos.lavaJato')}
        chave="lava_jato"
        itens={lista.filter((item) => item.tipo === 'lava_jato')}
        motoristaId={motoristaId}
        aoAgendar={agendar}
        aoRemover={removerAgendamentoVeiculo}
      />
    </div>
  )
}
