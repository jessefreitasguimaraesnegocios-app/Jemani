import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'
import { ofertaLocalPodeSubir } from '@/services/filtroGravacaoNuvem'
import { nuvemEstaAtrasada } from '@/services/fundirViagemNuvem'
import {
  assinarNuvem,
  buscarViagemNuvem,
  entrarNuvem,
  gravarOfertasNuvem,
  gravarViagensNuvem,
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
    let relogio = 0
    let aoVoltar: (() => void) | null = null
    let canalCorrida: RealtimeChannel | null = null
    let canalOperacao: RealtimeChannel | null = null

    async function puxarCorridasAoVivo() {
      const [viagensAgora, ofertasAgora] = await Promise.all([
        listarViagensNuvem(),
        listarOfertasNuvem(),
      ])
      if (!ativo) return
      for (const viagem of viagensAgora) aplicarViagemNuvem(viagem, false)
      for (const oferta of ofertasAgora) aplicarOfertaNuvem(oferta, true)
    }

    void (async () => {
      const senha = useDemoStore.getState().senhas[usuario.email]
      const entrou = await entrarNuvem(usuario.email, senha ?? '')
      if (!entrou || !ativo) return
      useDemoStore.getState().retomarCorridasPagas()
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
      if (usuario.tipo === 'cliente') {
        const locais = useDemoStore.getState().viagens.filter((v) => v.cliente_id === usuario.id)
        const porId = new Map(viagens.map((item) => [item.id, item]))
        const paraSubir = locais.flatMap((local) => {
          const atual = useDemoStore.getState().viagens.find((v) => v.id === local.id) ?? local
          const remota = porId.get(local.id)
          return !remota || nuvemEstaAtrasada(atual, remota) ? [atual] : []
        })
        if (paraSubir.length > 0) await gravarViagensNuvem(paraSubir)
        const idsLocais = new Set(locais.map((item) => item.id))
        await gravarOfertasNuvem(
          useDemoStore
            .getState()
            .atribuicoes.filter(
              (oferta) => idsLocais.has(oferta.viagem_id) && ofertaLocalPodeSubir(oferta, ofertas),
            ),
        )
      }
      for (const mensagem of mensagens) aplicarMensagemNuvem(mensagem, true)
      for (const turno of turnos) aplicarTurnoNuvem(turno)
      for (const item of agendamentos) aplicarAgendamentoNuvem(item, true)
      for (const item of historicos) aplicarHistoricoNuvem(item)

      canalCorrida = assinarNuvem(
        (viagem) => aplicarViagemNuvem(viagem, false),
        (oferta) => aplicarOfertaNuvem(oferta, false),
      )
      canalOperacao = assinarOperacao(
        (mensagem) => aplicarMensagemNuvem(mensagem, false),
        aplicarTurnoNuvem,
        (item) => aplicarAgendamentoNuvem(item, false),
        removerAgendamentoNuvem,
        (item) => {
          aplicarHistoricoNuvem(item)
          void buscarViagemNuvem(item.viagem_id).then((viagem) => {
            if (ativo && viagem) aplicarViagemNuvem(viagem, false)
          })
        },
      )
      if (!ativo) return
      aoVoltar = () => {
        if (document.visibilityState === 'visible') void puxarCorridasAoVivo()
      }
      document.addEventListener('visibilitychange', aoVoltar)
      relogio = window.setInterval(() => {
        if (document.visibilityState === 'visible') void puxarCorridasAoVivo()
      }, 4000)

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
      window.clearInterval(relogio)
      if (aoVoltar) document.removeEventListener('visibilitychange', aoVoltar)
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
