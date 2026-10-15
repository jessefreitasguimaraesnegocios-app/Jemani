import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'
import {
  assinarNuvem,
  entrarNuvem,
  gravarOfertasNuvem,
  gravarViagemNuvem,
  listarOfertasNuvem,
  listarViagensNuvem,
} from '@/services/nuvemCorrida'
import {
  assinarOperacao,
  gravarAgendamentosNuvem,
  gravarHistoricosNuvem,
  gravarMensagensNuvem,
  gravarTurnosNuvem,
  listarAgendamentosNuvem,
  listarHistoricosNuvem,
  listarMensagensNuvem,
  listarTurnosNuvem,
} from '@/services/nuvemOperacao'
import { useDemoStore } from '@/store/demoStore'
import type { TurnoMotorista } from '@/types'
import { gerarId } from '@/utils/format'

export function SincronizarNuvem() {
  const { usuario } = useAuth()
  const aplicarViagemNuvem = useDemoStore((s) => s.aplicarViagemNuvem)
  const aplicarOfertaNuvem = useDemoStore((s) => s.aplicarOfertaNuvem)
  const aplicarMensagemNuvem = useDemoStore((s) => s.aplicarMensagemNuvem)
  const aplicarTurnoNuvem = useDemoStore((s) => s.aplicarTurnoNuvem)
  const aplicarAgendamentoNuvem = useDemoStore((s) => s.aplicarAgendamentoNuvem)
  const removerAgendamentoNuvem = useDemoStore((s) => s.removerAgendamentoNuvem)
  const aplicarHistoricoNuvem = useDemoStore((s) => s.aplicarHistoricoNuvem)

  useEffect(() => {
    if (!usuario) return
    let ativo = true
    let canalCorrida: RealtimeChannel | null = null
    let canalOperacao: RealtimeChannel | null = null

    void (async () => {
      const senha = useDemoStore.getState().senhas[usuario.email]
      const entrou = await entrarNuvem(usuario.email, senha ?? '')
      if (!entrou || !ativo) return
      useDemoStore.getState().retomarCorridasPagas()
      if (usuario.tipo === 'cliente') {
        const ids = useDemoStore
          .getState()
          .viagens.filter((v) => v.cliente_id === usuario.id)
          .map((v) => v.id)
        for (const idViagem of ids) {
          const viagem = useDemoStore.getState().viagens.find((v) => v.id === idViagem)
          if (viagem) await gravarViagemNuvem(viagem)
        }
        const ofertas = useDemoStore
          .getState()
          .atribuicoes.filter((a) => ids.includes(a.viagem_id))
        await gravarOfertasNuvem(ofertas)
      }
      const [viagens, ofertas, mensagens, turnos, agendamentos, historicos] = await Promise.all([
        listarViagensNuvem(),
        listarOfertasNuvem(),
        listarMensagensNuvem(),
        listarTurnosNuvem(),
        listarAgendamentosNuvem(),
        listarHistoricosNuvem(),
      ])
      if (!ativo) return
      for (const viagem of viagens) aplicarViagemNuvem(viagem, true)
      for (const oferta of ofertas) aplicarOfertaNuvem(oferta, true)
      for (const mensagem of mensagens) aplicarMensagemNuvem(mensagem)
      for (const turno of turnos) aplicarTurnoNuvem(turno)
      for (const item of agendamentos) aplicarAgendamentoNuvem(item, true)
      for (const item of historicos) aplicarHistoricoNuvem(item)

      canalCorrida = assinarNuvem(
        (viagem) => aplicarViagemNuvem(viagem, false),
        (oferta) => aplicarOfertaNuvem(oferta, false),
      )
      canalOperacao = assinarOperacao(
        aplicarMensagemNuvem,
        aplicarTurnoNuvem,
        (item) => aplicarAgendamentoNuvem(item, false),
        removerAgendamentoNuvem,
        aplicarHistoricoNuvem,
      )

      const depois = useDemoStore.getState()
      const motorista = depois.motoristas.find((m) => m.usuario_id === usuario.id)
      const empresa = depois.obterEmpresaDoUsuario(usuario.id)
      const daEmpresa = (empresaId: string) => {
        if (usuario.tipo === 'admin') return true
        if (empresa) return empresaId === empresa.id
        if (motorista) return empresaId === motorista.empresa_id
        return false
      }
      const idsMensagem = new Set(mensagens.map((item) => item.id))
      await gravarMensagensNuvem(
        depois.mensagensEmpresa.filter(
          (item) =>
            daEmpresa(item.empresa_id) &&
            !idsMensagem.has(item.id) &&
            (!motorista || item.motorista_id === motorista.id),
        ),
      )

      const turnosLocais: TurnoMotorista[] = depois.turnos.map((turno) =>
        turno.id ? turno : { ...turno, id: gerarId() },
      )
      if (turnosLocais.some((turno, indice) => turno.id !== depois.turnos[indice]?.id)) {
        useDemoStore.setState({ turnos: turnosLocais })
      }
      const idsTurno = new Set(turnos.map((item) => item.id))
      const chavesTurno = new Set(turnos.map((item) => `${item.motorista_id}|${item.inicio}`))
      await gravarTurnosNuvem(
        turnosLocais.filter(
          (item) =>
            daEmpresa(item.empresa_id) &&
            !idsTurno.has(item.id) &&
            !chavesTurno.has(`${item.motorista_id}|${item.inicio}`) &&
            (!motorista || item.motorista_id === motorista.id),
        ),
      )

      const idsAgendamento = new Set(agendamentos.map((item) => item.id))
      await gravarAgendamentosNuvem(
        (depois.agendamentosVeiculo ?? []).filter(
          (item) =>
            daEmpresa(item.empresa_id) &&
            !idsAgendamento.has(item.id) &&
            (!motorista || !item.motorista_id || item.motorista_id === motorista.id),
        ),
      )

      const idsViagem = new Set(viagens.map((item) => item.id))
      const idsHistorico = new Set(historicos.map((item) => item.id))
      await gravarHistoricosNuvem(
        depois.historicos.filter((item) => idsViagem.has(item.viagem_id) && !idsHistorico.has(item.id)),
      )
    })()

    return () => {
      ativo = false
      void canalCorrida?.unsubscribe()
      void canalOperacao?.unsubscribe()
    }
  }, [
    usuario?.id,
    usuario?.email,
    aplicarViagemNuvem,
    aplicarOfertaNuvem,
    aplicarMensagemNuvem,
    aplicarTurnoNuvem,
    aplicarAgendamentoNuvem,
    removerAgendamentoNuvem,
    aplicarHistoricoNuvem,
  ])

  return null
}
