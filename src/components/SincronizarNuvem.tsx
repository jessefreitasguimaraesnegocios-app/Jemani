import { useEffect, useRef } from 'react'
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
  INTERVALO_SEGURANCA_NUVEM_MS,
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
import {
  garantirFotosFrotaNoCatalogo,
  listarCatalogoFotosVeiculo,
} from '@/services/catalogoFotosVeiculo'
import {
  buscarClientesNuvem,
  buscarMotoristasNuvem,
  buscarPerfisNuvem,
  refrescarMeuPerfilNuvem,
} from '@/services/nuvemPerfis'
import { useDemoStore } from '@/store/demoStore'
import type { TurnoMotorista, Viagem } from '@/types'
import { gerarId } from '@/utils/format'

export function SincronizarNuvem() {
  const { usuario } = useAuth()
  const ativoRef = useRef(true)
  const puxandoRef = useRef(false)
  const ultimaViagemSyncRef = useRef<string | null>(null)

  useEffect(() => {
    if (!usuario) return
    const sessao = usuario
    ativoRef.current = true
    puxandoRef.current = false
    ultimaViagemSyncRef.current = null
    let relogio = 0
    let aoVoltar: (() => void) | null = null
    let canalCorrida: RealtimeChannel | null = null
    let canalOperacao: RealtimeChannel | null = null

    const store = () => useDemoStore.getState()

    async function puxarPerfisEFotos(viagensAgora: Viagem[]) {
      const meuPerfil = await refrescarMeuPerfilNuvem(sessao.id)
      if (!ativoRef.current) return
      if (meuPerfil) store().aplicarPerfisNuvem([meuPerfil])

      const idsCliente = [...new Set(viagensAgora.map((v) => v.cliente_id).filter(Boolean))]
      const idsMotorista = [
        ...new Set(viagensAgora.map((v) => v.motorista_id).filter(Boolean) as string[]),
      ]
      const empresa = store().obterEmpresaDoUsuario(sessao.id)

      if (sessao.tipo === 'admin') {
        const [clientes, motoristas, catalogo] = await Promise.all([
          buscarClientesNuvem(),
          buscarMotoristasNuvem(),
          garantirFotosFrotaNoCatalogo(),
        ])
        if (!ativoRef.current) return
        store().substituirClientesNuvem(clientes)
        store().aplicarMotoristasNuvem(motoristas)
        store().substituirCatalogoFotosVeiculo(catalogo)
        return
      }

      if (sessao.tipo === 'empresa') {
        const [motoristas, clientes, catalogo] = await Promise.all([
          buscarMotoristasNuvem(empresa ? { empresaId: empresa.id } : undefined),
          buscarPerfisNuvem(idsCliente),
          listarCatalogoFotosVeiculo(),
        ])
        if (!ativoRef.current) return
        store().aplicarMotoristasNuvem(motoristas)
        store().aplicarPerfisNuvem(clientes)
        store().substituirCatalogoFotosVeiculo(catalogo)
        return
      }

      if (sessao.tipo === 'motorista') {
        const meuMotorista = store().obterMotoristaDoUsuario(sessao.id)
        const [motoristas, clientes] = await Promise.all([
          buscarMotoristasNuvem({
            ids: [...new Set([...(meuMotorista ? [meuMotorista.id] : []), ...idsMotorista])],
          }),
          buscarPerfisNuvem(idsCliente),
        ])
        if (!ativoRef.current) return
        store().aplicarMotoristasNuvem(motoristas)
        store().aplicarPerfisNuvem(clientes)
        return
      }

      if (sessao.tipo === 'cliente' && idsMotorista.length > 0) {
        const motoristas = await buscarMotoristasNuvem({ ids: idsMotorista })
        if (!ativoRef.current) return
        store().aplicarMotoristasNuvem(motoristas)
      }
    }

    async function puxarCorridasAoVivo(opcoes: {
      comPerfis?: boolean
      completo?: boolean
    } = {}) {
      if (!ativoRef.current) return
      if (document.visibilityState !== 'visible') return
      if (puxandoRef.current) return
      puxandoRef.current = true
      try {
        const desde =
          !opcoes.completo && ultimaViagemSyncRef.current
            ? ultimaViagemSyncRef.current
            : undefined
        const [viagensAgora, ofertasAgora] = await Promise.all([
          listarViagensNuvem(desde ? { atualizadoDesde: desde } : undefined),
          // Ofertas: lista completa (tabela pequena via RLS); evita perder mudança de status.
          listarOfertasNuvem(),
        ])
        if (!ativoRef.current) return
        for (const viagem of viagensAgora) store().aplicarViagemNuvem(viagem, true)
        for (const oferta of ofertasAgora) store().aplicarOfertaNuvem(oferta, true)
        // Margem de 2s evita perder update entre o fetch e o marcador.
        ultimaViagemSyncRef.current = new Date(Date.now() - 2000).toISOString()
        if (opcoes.comPerfis) await puxarPerfisEFotos(viagensAgora)
      } finally {
        puxandoRef.current = false
      }
    }

    void (async () => {
      const senha = store().senhas[sessao.email]
      const entrou = await entrarNuvem(sessao.email, senha ?? '')
      if (!entrou || !ativoRef.current) return
      const [viagens, ofertas, mensagens, turnos, agendamentos, historicos] = await Promise.all([
        listarViagensNuvem(),
        listarOfertasNuvem(),
        listarMensagensNuvem(),
        listarTurnosNuvem(),
        listarAgendamentosNuvem(),
        listarHistoricosNuvem(),
      ])
      if (!ativoRef.current) return
      for (const viagem of viagens) store().aplicarViagemNuvem(viagem, true)
      for (const oferta of ofertas) store().aplicarOfertaNuvem(oferta, true)
      for (const mensagem of mensagens) store().aplicarMensagemNuvem(mensagem, true)
      for (const turno of turnos) store().aplicarTurnoNuvem(turno)
      for (const item of agendamentos) store().aplicarAgendamentoNuvem(item, true)
      for (const item of historicos) store().aplicarHistoricoNuvem(item)
      store().limparDuplicatasNuvem()
      store().retomarCorridasPagas()
      ultimaViagemSyncRef.current = new Date().toISOString()
      await puxarPerfisEFotos(viagens)
      if (sessao.tipo === 'cliente') {
        const locais = store().viagens.filter((v) => v.cliente_id === sessao.id)
        const porId = new Map(viagens.map((item) => [item.id, item]))
        const paraSubir = locais.flatMap((local) => {
          const atual = store().viagens.find((v) => v.id === local.id) ?? local
          const remota = porId.get(local.id)
          return !remota || nuvemEstaAtrasada(atual, remota) ? [atual] : []
        })
        if (paraSubir.length > 0) await gravarViagensNuvem(paraSubir)
        store().garantirOfertasAbertas()
        store().limparDuplicatasNuvem()
        const idsLocais = new Set(locais.map((item) => item.id))
        await gravarOfertasNuvem(
          store().atribuicoes.filter(
            (oferta) => idsLocais.has(oferta.viagem_id) && ofertaLocalPodeSubir(oferta, ofertas),
          ),
        )
      }

      if (!ativoRef.current) return
      canalCorrida = assinarNuvem(
        (viagem) => store().aplicarViagemNuvem(viagem, false),
        (oferta) => store().aplicarOfertaNuvem(oferta, false),
        sessao.id,
      )
      canalOperacao = assinarOperacao(
        (mensagem) => store().aplicarMensagemNuvem(mensagem, false),
        (turno) => store().aplicarTurnoNuvem(turno),
        (item) => store().aplicarAgendamentoNuvem(item, false),
        (id) => store().removerAgendamentoNuvem(id),
        (item) => {
          store().aplicarHistoricoNuvem(item)
          void buscarViagemNuvem(item.viagem_id).then((viagem) => {
            if (ativoRef.current && viagem) store().aplicarViagemNuvem(viagem, false)
          })
        },
      )

      aoVoltar = () => {
        if (document.visibilityState === 'visible') {
          void puxarCorridasAoVivo({ comPerfis: true, completo: true })
        }
      }
      document.addEventListener('visibilitychange', aoVoltar)
      relogio = window.setInterval(() => {
        void puxarCorridasAoVivo({ completo: false })
      }, INTERVALO_SEGURANCA_NUVEM_MS)

      const depois = store()
      const motorista = depois.motoristas.find((m) => m.usuario_id === sessao.id)
      const empresa = depois.obterEmpresaDoUsuario(sessao.id)
      const daEmpresa = (empresaId: string) => {
        if (sessao.tipo === 'admin') return true
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
      ativoRef.current = false
      puxandoRef.current = false
      window.clearInterval(relogio)
      if (aoVoltar) document.removeEventListener('visibilitychange', aoVoltar)
      void canalCorrida?.unsubscribe()
      void canalOperacao?.unsubscribe()
    }
  }, [usuario?.id, usuario?.email])

  return null
}
