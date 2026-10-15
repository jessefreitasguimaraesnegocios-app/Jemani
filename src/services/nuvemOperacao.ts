import type { RealtimeChannel } from '@supabase/supabase-js'
import { historicoPodeIrParaNuvem } from '@/services/filtroGravacaoNuvem'
import { supabase } from '@/lib/supabase'
import type {
  AgendamentoVeiculo,
  HistoricoStatus,
  MensagemEmpresa,
  TurnoMotorista,
} from '@/types'

type LinhaMensagem = {
  id: string
  empresa_id: string
  motorista_id: string
  autor: MensagemEmpresa['autor']
  texto: string
  created_at: string
}

type LinhaTurno = {
  id: string
  motorista_id: string
  empresa_id: string
  veiculo_id: string | null
  inicio: string
  fim: string | null
  online: boolean
  latitude: number | null
  longitude: number | null
}

type LinhaAgendamento = {
  id: string
  veiculo_id: string
  empresa_id: string
  motorista_id: string | null
  tipo: AgendamentoVeiculo['tipo']
  data: string
  horario: string
  observacao: string | null
  created_at: string
}

type LinhaHistorico = {
  id: string
  viagem_id: string
  status_anterior: HistoricoStatus['status_anterior']
  status_novo: HistoricoStatus['status_novo']
  usuario_id: string | null
  observacao: string | null
  created_at: string
}

function banco() {
  return supabase
}

function mensagemDaLinha(linha: LinhaMensagem): MensagemEmpresa {
  return {
    id: linha.id,
    empresa_id: linha.empresa_id,
    motorista_id: linha.motorista_id,
    autor: linha.autor,
    texto: linha.texto,
    created_at: linha.created_at,
  }
}

function turnoDaLinha(linha: LinhaTurno): TurnoMotorista {
  return {
    id: linha.id,
    motorista_id: linha.motorista_id,
    empresa_id: linha.empresa_id,
    veiculo_id: linha.veiculo_id ?? undefined,
    inicio: linha.inicio,
    fim: linha.fim ?? undefined,
    online: linha.online,
    latitude: linha.latitude ?? undefined,
    longitude: linha.longitude ?? undefined,
  }
}

function agendamentoDaLinha(linha: LinhaAgendamento): AgendamentoVeiculo {
  return {
    id: linha.id,
    veiculo_id: linha.veiculo_id,
    empresa_id: linha.empresa_id,
    motorista_id: linha.motorista_id ?? undefined,
    tipo: linha.tipo,
    data: String(linha.data).slice(0, 10),
    horario: String(linha.horario).slice(0, 5),
    observacao: linha.observacao ?? undefined,
    created_at: linha.created_at,
  }
}

function historicoDaLinha(linha: LinhaHistorico): HistoricoStatus {
  return {
    id: linha.id,
    viagem_id: linha.viagem_id,
    status_anterior: linha.status_anterior ?? undefined,
    status_novo: linha.status_novo,
    usuario_id: linha.usuario_id ?? undefined,
    observacao: linha.observacao ?? undefined,
    created_at: linha.created_at,
  }
}

function linhaMensagem(mensagem: MensagemEmpresa) {
  return {
    id: mensagem.id,
    empresa_id: mensagem.empresa_id,
    motorista_id: mensagem.motorista_id,
    autor: mensagem.autor,
    texto: mensagem.texto,
    created_at: mensagem.created_at,
  }
}

export async function gravarMensagensNuvem(lista: MensagemEmpresa[]) {
  const db = banco()
  if (!db || lista.length === 0) return
  const { error } = await db.from('mensagens_empresa').upsert(lista.map(linhaMensagem), { onConflict: 'id' })
  if (error) console.warn('Falha ao gravar mensagem na nuvem', error.message)
}

export async function gravarMensagemNuvem(mensagem: MensagemEmpresa) {
  await gravarMensagensNuvem([mensagem])
}

export async function listarMensagensNuvem() {
  const db = banco()
  if (!db) return []
  const { data, error } = await db.from('mensagens_empresa').select('*')
  if (error || !data) return []
  return (data as LinhaMensagem[]).map(mensagemDaLinha)
}

function linhaTurno(turno: TurnoMotorista) {
  return {
    id: turno.id,
    motorista_id: turno.motorista_id,
    empresa_id: turno.empresa_id,
    veiculo_id: turno.veiculo_id ?? null,
    inicio: turno.inicio,
    fim: turno.fim ?? null,
    online: turno.online,
    latitude: turno.latitude ?? null,
    longitude: turno.longitude ?? null,
  }
}

export async function gravarTurnosNuvem(lista: TurnoMotorista[]) {
  const db = banco()
  const validos = lista.filter((turno) => turno.id)
  if (!db || validos.length === 0) return
  const { error } = await db.from('turnos_motorista').upsert(validos.map(linhaTurno), { onConflict: 'id' })
  if (error) console.warn('Falha ao gravar turno na nuvem', error.message)
}

export async function gravarTurnoNuvem(turno: TurnoMotorista) {
  await gravarTurnosNuvem([turno])
}

export async function listarTurnosNuvem() {
  const db = banco()
  if (!db) return []
  const { data, error } = await db.from('turnos_motorista').select('*')
  if (error || !data) return []
  return (data as LinhaTurno[]).map(turnoDaLinha)
}

function linhaAgendamento(item: AgendamentoVeiculo) {
  return {
    id: item.id,
    veiculo_id: item.veiculo_id,
    empresa_id: item.empresa_id,
    motorista_id: item.motorista_id ?? null,
    tipo: item.tipo,
    data: item.data,
    horario: item.horario.length === 5 ? `${item.horario}:00` : item.horario,
    observacao: item.observacao ?? null,
    created_at: item.created_at,
  }
}

export async function gravarAgendamentosNuvem(lista: AgendamentoVeiculo[]) {
  const db = banco()
  if (!db || lista.length === 0) return
  const { error } = await db.from('agendamentos_veiculo').upsert(lista.map(linhaAgendamento), { onConflict: 'id' })
  if (error) console.warn('Falha ao gravar agendamento na nuvem', error.message)
}

export async function gravarAgendamentoNuvem(item: AgendamentoVeiculo) {
  await gravarAgendamentosNuvem([item])
}

export async function apagarAgendamentoNuvem(id: string) {
  const db = banco()
  if (!db) return
  const { error } = await db.from('agendamentos_veiculo').delete().eq('id', id)
  if (error) console.warn('Falha ao apagar agendamento na nuvem', error.message)
}

export async function listarAgendamentosNuvem() {
  const db = banco()
  if (!db) return []
  const { data, error } = await db.from('agendamentos_veiculo').select('*')
  if (error || !data) return []
  return (data as LinhaAgendamento[]).map(agendamentoDaLinha)
}

function linhaHistorico(item: HistoricoStatus) {
  return {
    id: item.id,
    viagem_id: item.viagem_id,
    status_anterior: item.status_anterior ?? null,
    status_novo: item.status_novo,
    usuario_id: item.usuario_id ?? null,
    observacao: item.observacao ?? null,
    created_at: item.created_at,
  }
}

export async function gravarHistoricosNuvem(lista: HistoricoStatus[]) {
  const db = banco()
  if (!db || lista.length === 0) return
  const sessao = await db.auth.getSession()
  const usuarioId = sessao.data.session?.user.id
  if (!usuarioId) return
  const idsViagem = [...new Set(lista.map((item) => item.viagem_id))]
  const { data, error: erroLeitura } = await db.from('trips').select('id').in('id', idsViagem)
  if (erroLeitura || !data) return
  const existentes = new Set(data.map((linha) => linha.id as string))
  const permitidos = lista.filter((item) => historicoPodeIrParaNuvem(item, usuarioId, existentes))
  if (permitidos.length === 0) return
  const { error } = await db
    .from('trip_status_history')
    .upsert(permitidos.map(linhaHistorico), { onConflict: 'id' })
  if (error) console.warn('Falha ao gravar histórico na nuvem', error.message)
}

export async function gravarHistoricoNuvem(item: HistoricoStatus) {
  await gravarHistoricosNuvem([item])
}

export async function listarHistoricosNuvem() {
  const db = banco()
  if (!db) return []
  const { data, error } = await db.from('trip_status_history').select('*')
  if (error || !data) return []
  return (data as LinhaHistorico[]).map(historicoDaLinha)
}

export function assinarOperacao(
  aoMensagem: (mensagem: MensagemEmpresa) => void,
  aoTurno: (turno: TurnoMotorista) => void,
  aoAgendamento: (item: AgendamentoVeiculo) => void,
  aoApagarAgendamento: (id: string) => void,
  aoHistorico: (item: HistoricoStatus) => void,
) {
  const db = banco()
  if (!db) return null
  const canal: RealtimeChannel = db
    .channel('operacao-jemani')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_empresa' }, (payload) => {
      const linha = payload.new as LinhaMensagem
      if (linha?.id) aoMensagem(mensagemDaLinha(linha))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_motorista' }, (payload) => {
      const linha = payload.new as LinhaTurno
      if (linha?.id) aoTurno(turnoDaLinha(linha))
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos_veiculo' }, (payload) => {
      const linha = payload.new as LinhaAgendamento
      if (linha?.id) aoAgendamento(agendamentoDaLinha(linha))
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agendamentos_veiculo' }, (payload) => {
      const linha = payload.new as LinhaAgendamento
      if (linha?.id) aoAgendamento(agendamentoDaLinha(linha))
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'agendamentos_veiculo' }, (payload) => {
      const linha = payload.old as { id?: string }
      if (linha?.id) aoApagarAgendamento(linha.id)
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_status_history' }, (payload) => {
      const linha = payload.new as LinhaHistorico
      if (linha?.id) aoHistorico(historicoDaLinha(linha))
    })
    .subscribe()
  return canal
}
