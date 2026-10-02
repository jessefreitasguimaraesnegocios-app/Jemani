import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { completarCatalogo, criarDadosIniciais, SLUG_SHIELD } from '@/data/seed'
import {
  calcularRepasseComissao,
  lerComissaoPadrao,
  obterComissaoDaEmpresa,
} from '@/services/comissaoService'
import {
  anexarViagemAoHistorico,
  ordenarEmpresasPorProximidade,
} from '@/services/distribuicaoService'
import { calcularDistanciaKm } from '@/services/mapasService'
import { transferirParaEmpresa } from '@/lib/stripeApi'
import {
  confirmarSessaoCheckoutStripe,
  criarIntencaoPagamento,
  permitirSimulacaoPagamentoDev,
  simularPagamentoDev,
} from '@/services/pagamentoService'
import { calcularPrecoViagem } from '@/services/precoService'
import {
  enderecoTemCoordenadas,
  validarAntecedenciaMinima,
} from '@/services/reservaValidacao'
import type {
  Avaliacao,
  AtribuicaoViagem,
  AuditLog,
  CategoriaVeiculo,
  Comissao,
  ConfiguracaoPlataforma,
  Empresa,
  EnderecoLocal,
  HistoricoDistribuicao,
  HistoricoStatus,
  Motorista,
  Notificacao,
  Pagamento,
  Perfil,
  RegraPreco,
  StatusViagem,
  TipoUsuario,
  Veiculo,
  Viagem,
} from '@/types'
import { enderecoProntoParaReserva } from '@/utils/endereco'
import { dispararFeedbackAlerta } from '@/utils/feedbackAlerta'
import { agoraIso, gerarCodigoViagem, gerarId } from '@/utils/format'
import { abrirGmailCompose, corpoOfertaCorrida } from '@/utils/gmailCompose'

export interface DadosReserva {
  origemEndereco: EnderecoLocal
  destinoEndereco: EnderecoLocal
  data_viagem: string
  horario: string
  passageiros: number
  categoria_id: string
  malas?: number
  numero_voo?: string
  nome_passageiro?: string
  observacoes?: string
  distancia_km?: number
}

interface EstadoDemo {
  sessaoId: string | null
  perfis: Perfil[]
  senhas: Record<string, string>
  empresas: Empresa[]
  categorias: CategoriaVeiculo[]
  veiculos: Veiculo[]
  motoristas: Motorista[]
  configuracoes: ConfiguracaoPlataforma[]
  regrasPreco: RegraPreco[]
  viagens: Viagem[]
  historicos: HistoricoStatus[]
  atribuicoes: AtribuicaoViagem[]
  pagamentos: Pagamento[]
  comissoes: Comissao[]
  notificacoes: Notificacao[]
  avaliacoes: Avaliacao[]
  distribuicoes: HistoricoDistribuicao[]
  auditLogs: AuditLog[]

  resetarDemo: () => void
  obterUsuario: () => Perfil | null
  entrar: (email: string, senha: string) => Perfil
  cadastrar: (dados: {
    nome: string
    email: string
    senha: string
    telefone?: string
    tipo?: TipoUsuario
  }) => Perfil
  sair: () => void

  calcularPreco: (
    categoriaId: string,
    horario: string,
    distanciaKm?: number,
  ) => ReturnType<typeof calcularPrecoViagem>
  criarViagem: (clienteId: string, dados: DadosReserva) => Viagem
  simularPagamentoEDistribuir: (viagemId: string, usuarioId: string) => Promise<Viagem>
  confirmarPagamentoStripe: (
    viagemId: string,
    usuarioId: string,
    sessionId: string,
  ) => Promise<Viagem>
  iniciarDistribuicaoAposPagamento: (viagemId: string) => Viagem
  enviarOfertaEmailEmpresa: (
    viagemId: string,
    empresaId: string,
    adminId?: string,
  ) => { viagem: Viagem; urlAberta: boolean }
  aceitarViagem: (viagemId: string, empresaId: string) => Viagem
  recusarViagem: (viagemId: string, empresaId: string) => void
  atribuirEquipe: (viagemId: string, motoristaId: string, veiculoId: string) => Viagem
  atualizarStatus: (viagemId: string, status: StatusViagem, usuarioId?: string) => Viagem
  solicitarFinalizacao: (viagemId: string) => { ok: boolean; mensagem: string }
  confirmarFinalizacao: (viagemId: string, usuarioId: string, confirmado: boolean) => Viagem
  cancelarViagem: (viagemId: string, usuarioId: string, motivo: string) => Viagem
  criarAvaliacao: (dados: Omit<Avaliacao, 'id' | 'created_at'>) => Avaliacao
  marcarNotificacaoLida: (id: string) => void
  registrarAudit: (acao: string, usuarioId?: string, entidadeTipo?: string, entidadeId?: string, metadados?: Record<string, unknown>) => void
  atualizarConfiguracao: (chave: string, valor: string) => void
  atualizarRegraPreco: (id: string, patch: Partial<RegraPreco>) => void
  salvarCategoria: (cat: Partial<CategoriaVeiculo> & { nome: string }) => CategoriaVeiculo
  salvarEmpresa: (patch: Partial<Empresa> & { id: string }) => Empresa
  aplicarComissaoTodasEmpresas: (percentual: number) => void
  criarEmpresa: (empresa: Empresa, senhaAcesso?: string) => Empresa
  salvarMotorista: (
    dados: Partial<Motorista> & {
      empresa_id: string
      nome: string
      telefone: string
      cnh: string
      email?: string
      senha?: string
    },
  ) => Motorista
  salvarVeiculo: (dados: Partial<Veiculo> & { empresa_id: string; marca: string; modelo: string; categoria_id: string }) => Veiculo
  obterEmpresaDoUsuario: (usuarioId: string) => Empresa | undefined
  obterMotoristaDoUsuario: (usuarioId: string) => Motorista | undefined
}

function estadoInicial() {
  const dados = criarDadosIniciais()
  return {
    sessaoId: null as string | null,
    ...dados,
  }
}

function notificar(
  set: (fn: (s: EstadoDemo) => Partial<EstadoDemo>) => void,
  get: () => EstadoDemo,
  usuarioId: string,
  titulo: string,
  mensagem: string,
  tipo: string,
  referenciaId?: string,
) {
  const n: Notificacao = {
    id: gerarId(),
    usuario_id: usuarioId,
    titulo,
    mensagem,
    tipo,
    lida: false,
    referencia_id: referenciaId,
    created_at: agoraIso(),
  }
  set(() => ({ notificacoes: [n, ...get().notificacoes] }))
  dispararFeedbackAlerta(get().configuracoes)
}

function registrarHistorico(
  set: (fn: (s: EstadoDemo) => Partial<EstadoDemo>) => void,
  get: () => EstadoDemo,
  viagemId: string,
  anterior: StatusViagem | undefined,
  novo: StatusViagem,
  usuarioId?: string,
  observacao?: string,
) {
  const h: HistoricoStatus = {
    id: gerarId(),
    viagem_id: viagemId,
    status_anterior: anterior,
    status_novo: novo,
    usuario_id: usuarioId,
    observacao,
    created_at: agoraIso(),
  }
  set(() => ({ historicos: [h, ...get().historicos] }))
}

export const useDemoStore = create<EstadoDemo>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      resetarDemo: () => set({ ...estadoInicial() }),

      obterUsuario: () => {
        const { sessaoId, perfis } = get()
        return perfis.find((p) => p.id === sessaoId) ?? null
      },

      entrar: (email, senha) => {
        const state = get()
        const perfil = state.perfis.find((p) => p.email.toLowerCase() === email.toLowerCase())
        if (!perfil || state.senhas[perfil.email] !== senha) {
          throw new Error('E-mail ou senha inválidos')
        }
        if (!perfil.ativo) throw new Error('Usuário inativo')
        set({ sessaoId: perfil.id })
        return perfil
      },

      cadastrar: ({ nome, email, senha, telefone, tipo = 'cliente' }) => {
        const state = get()
        if (state.perfis.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('E-mail já cadastrado')
        }
        const agora = agoraIso()
        const perfil: Perfil = {
          id: gerarId(),
          email: email.toLowerCase(),
          nome,
          telefone,
          tipo,
          ativo: true,
          created_at: agora,
          updated_at: agora,
        }
        set({
          perfis: [...state.perfis, perfil],
          senhas: { ...state.senhas, [perfil.email]: senha },
          sessaoId: perfil.id,
        })
        return perfil
      },

      sair: () => set({ sessaoId: null }),

      calcularPreco: (categoriaId, horario, distanciaKm) => {
        const state = get()
        const categoria = state.categorias.find((c) => c.id === categoriaId)
        const regra = state.regrasPreco.find((r) => r.ativo)
        if (!categoria || !regra) throw new Error('Configuração de preço indisponível')
        return calcularPrecoViagem({
          categoria,
          horario,
          regra,
          configuracoes: state.configuracoes,
          distanciaKm,
        })
      },

      criarViagem: (clienteId, dados) => {
        const checkOrigem = enderecoProntoParaReserva(dados.origemEndereco)
        if (!checkOrigem.ok) {
          throw new Error(`Embarque: ${checkOrigem.mensagem}`)
        }
        const checkDestino = enderecoProntoParaReserva(dados.destinoEndereco)
        if (!checkDestino.ok) {
          throw new Error(`Destino: ${checkDestino.mensagem}`)
        }
        if (!enderecoTemCoordenadas(dados.origemEndereco)) {
          throw new Error('Selecione um endereço de origem válido com coordenadas.')
        }
        if (!enderecoTemCoordenadas(dados.destinoEndereco)) {
          throw new Error('Selecione um endereço de destino válido com coordenadas.')
        }

        const validacao = validarAntecedenciaMinima(dados.data_viagem, dados.horario)
        if (!validacao.valido) {
          throw new Error(validacao.mensagem ?? 'Horário inválido')
        }

        const state = get()
        const distancia =
          dados.distancia_km ??
          calcularDistanciaKm(
            dados.origemEndereco.latitude,
            dados.origemEndereco.longitude,
            dados.destinoEndereco.latitude,
            dados.destinoEndereco.longitude,
          )

        const preco = get().calcularPreco(dados.categoria_id, dados.horario, distancia)
        const agora = agoraIso()
        const viagem: Viagem = {
          id: gerarId(),
          codigo: gerarCodigoViagem(),
          cliente_id: clienteId,
          categoria_id: dados.categoria_id,
          origem: dados.origemEndereco.formatted,
          destino: dados.destinoEndereco.formatted,
          origem_endereco: dados.origemEndereco,
          destino_endereco: dados.destinoEndereco,
          origem_lat: dados.origemEndereco.latitude,
          origem_lng: dados.origemEndereco.longitude,
          destino_lat: dados.destinoEndereco.latitude,
          destino_lng: dados.destinoEndereco.longitude,
          origem_place_id: dados.origemEndereco.place_id,
          destino_place_id: dados.destinoEndereco.place_id,
          data_viagem: dados.data_viagem,
          horario: dados.horario,
          passageiros: dados.passageiros,
          malas: dados.malas,
          numero_voo: dados.numero_voo,
          nome_passageiro: dados.nome_passageiro,
          observacoes: dados.observacoes,
          distancia_km: preco.distancia_km,
          preco_base: preco.preco_base,
          taxas: preco.taxas,
          preco_total: preco.total,
          comissao_percentual: preco.comissao_percentual,
          valor_plataforma: preco.valor_plataforma,
          valor_empresa: preco.valor_empresa,
          status: 'pending_payment',
          payment_status: 'pending_payment',
          version: 1,
          created_at: agora,
          updated_at: agora,
        }

        const pagamento: Pagamento = {
          id: gerarId(),
          booking_id: viagem.id,
          payment_id: `pending_${viagem.id.slice(0, 8)}`,
          amount: viagem.preco_total,
          platform_fee: viagem.valor_plataforma,
          company_amount: viagem.valor_empresa,
          status: 'pending_payment',
          payment_method: 'pendente',
          provider: 'teste',
          created_at: agora,
          updated_at: agora,
        }

        set({
          viagens: [viagem, ...state.viagens],
          pagamentos: [pagamento, ...state.pagamentos],
        })

        registrarHistorico(set, get, viagem.id, undefined, 'pending_payment', clienteId)

        notificar(
          set,
          get,
          clienteId,
          'Reserva criada — aguardando pagamento',
          `Viagem ${viagem.codigo} criada. A confirmação definitiva ocorre após o pagamento.`,
          'pagamento',
          viagem.id,
        )

        void criarIntencaoPagamento({
          bookingId: viagem.id,
          amount: viagem.preco_total,
          platformFee: viagem.valor_plataforma,
          companyAmount: viagem.valor_empresa,
        })

        return viagem
      },

      simularPagamentoEDistribuir: async (viagemId, usuarioId) => {
        if (!permitirSimulacaoPagamentoDev()) {
          throw new Error('Simulação de pagamento permitida apenas em desenvolvimento.')
        }
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (viagem.payment_status === 'paid') throw new Error('Pagamento já registrado')
        if (viagem.status !== 'pending_payment') {
          throw new Error('Viagem não está aguardando pagamento')
        }

        const resultado = await simularPagamentoDev({
          bookingId: viagem.id,
          amount: viagem.preco_total,
          platformFee: viagem.valor_plataforma,
          companyAmount: viagem.valor_empresa,
        })

        const agora = agoraIso()
        set({
          pagamentos: state.pagamentos.map((p) =>
            p.booking_id === viagemId
              ? {
                  ...p,
                  payment_id: resultado.paymentId,
                  status: 'pago',
                  provider: 'dev_simulado',
                  payment_method: 'dev_simulado',
                  updated_at: agora,
                }
              : p,
          ),
          viagens: state.viagens.map((v) =>
            v.id === viagemId
              ? {
                  ...v,
                  status: 'paid',
                  payment_status: 'paid',
                  version: v.version + 1,
                  updated_at: agora,
                }
              : v,
          ),
          auditLogs: [
            {
              id: gerarId(),
              acao: 'pagamento_dev_simulado',
              usuario_id: usuarioId,
              entidade_tipo: 'viagem',
              entidade_id: viagemId,
              metadados: { payment_id: resultado.paymentId },
              created_at: agora,
            },
            ...state.auditLogs,
          ],
        })

        registrarHistorico(set, get, viagemId, 'pending_payment', 'paid', usuarioId, 'DEV simulado')
        return get().iniciarDistribuicaoAposPagamento(viagemId)
      },

      confirmarPagamentoStripe: async (viagemId, usuarioId, sessionId) => {
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (viagem.payment_status === 'paid') {
          return viagem
        }
        if (viagem.status !== 'pending_payment') {
          throw new Error('Viagem não está aguardando pagamento')
        }

        const resultado = await confirmarSessaoCheckoutStripe(sessionId, viagemId)
        const agora = agoraIso()
        set({
          pagamentos: state.pagamentos.map((p) =>
            p.booking_id === viagemId
              ? {
                  ...p,
                  payment_id: resultado.paymentId,
                  stripe_checkout_session_id: resultado.sessionId ?? sessionId,
                  status: 'pago',
                  provider: 'stripe',
                  payment_method: 'stripe_checkout',
                  updated_at: agora,
                }
              : p,
          ),
          viagens: state.viagens.map((v) =>
            v.id === viagemId
              ? {
                  ...v,
                  status: 'paid',
                  payment_status: 'paid',
                  version: v.version + 1,
                  updated_at: agora,
                }
              : v,
          ),
          auditLogs: [
            {
              id: gerarId(),
              acao: 'pagamento_stripe_checkout',
              usuario_id: usuarioId,
              entidade_tipo: 'viagem',
              entidade_id: viagemId,
              metadados: { payment_id: resultado.paymentId, session_id: sessionId },
              created_at: agora,
            },
            ...state.auditLogs,
          ],
        })

        registrarHistorico(
          set,
          get,
          viagemId,
          'pending_payment',
          'paid',
          usuarioId,
          'Stripe Checkout',
        )
        return get().iniciarDistribuicaoAposPagamento(viagemId)
      },

      iniciarDistribuicaoAposPagamento: (viagemId) => {
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (viagem.payment_status !== 'paid') {
          throw new Error('Distribuição só ocorre após pagamento aprovado')
        }
        if (
          typeof viagem.origem_lat !== 'number' ||
          typeof viagem.origem_lng !== 'number'
        ) {
          throw new Error('Embarque sem coordenadas — distribuição por proximidade impossível')
        }

        const { ordenadas, historico } = ordenarEmpresasPorProximidade(
          state.empresas,
          viagem.origem_lat,
          viagem.origem_lng,
          viagem.categoria_id,
        )
        const hist = anexarViagemAoHistorico(historico, viagemId)
        const agora = agoraIso()

        if (ordenadas.length === 0) {
          const atualizada: Viagem = {
            ...viagem,
            status: 'aguardando_empresa',
            version: viagem.version + 1,
            updated_at: agora,
          }
          set({
            viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
            distribuicoes: [...hist, ...state.distribuicoes],
          })
          registrarHistorico(set, get, viagemId, viagem.status, 'aguardando_empresa')
          notificar(
            set,
            get,
            viagem.cliente_id,
            'Nenhuma empresa disponível no momento',
            `Pagamento ok, mas não há parceiros elegíveis próximos para ${viagem.codigo}.`,
            'distribuicao',
            viagemId,
          )
          return atualizada
        }

        const atribuicoes: AtribuicaoViagem[] = ordenadas.map((o, idx) => ({
          id: gerarId(),
          viagem_id: viagemId,
          empresa_id: o.empresa.id,
          status: 'oferecida',
          distancia_km: o.distancia_km,
          created_at: agora,
          motivo: idx === 0 ? 'primeira_por_proximidade' : `ordem_${idx + 1}`,
        }))

        const oferecidas: HistoricoDistribuicao[] = ordenadas.map((o) => ({
          id: gerarId(),
          viagem_id: viagemId,
          empresa_id: o.empresa.id,
          distancia_km: o.distancia_km,
          resultado: 'oferecida',
          motivo: 'ordenada_por_proximidade',
          created_at: agora,
        }))

        const atualizada: Viagem = {
          ...viagem,
          status: 'aguardando_empresa',
          version: viagem.version + 1,
          updated_at: agora,
        }

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
          atribuicoes: [...atribuicoes, ...state.atribuicoes],
          distribuicoes: [...oferecidas, ...hist, ...state.distribuicoes],
        })

        registrarHistorico(set, get, viagemId, 'paid', 'aguardando_empresa')

        for (const o of ordenadas) {
          notificar(
            set,
            get,
            o.empresa.usuario_id,
            'Nova solicitação recebida',
            `Corrida ${viagem.codigo} (${o.distancia_km} km do embarque): ${viagem.origem} → ${viagem.destino}`,
            'nova_solicitacao',
            viagemId,
          )
        }

        notificar(
          set,
          get,
          viagem.cliente_id,
          'Pagamento confirmado',
          `Sua viagem ${viagem.codigo} foi enviada às empresas mais próximas.`,
          'status',
          viagemId,
        )

        return atualizada
      },

      enviarOfertaEmailEmpresa: (viagemId, empresaId, adminId) => {
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        const empresa = state.empresas.find((e) => e.id === empresaId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (!empresa) throw new Error('Empresa não encontrada')
        if (viagem.payment_status !== 'paid') {
          throw new Error('Só é possível ofertar corridas com pagamento aprovado')
        }
        if (!['aguardando_empresa', 'oferta_enviada', 'paid'].includes(viagem.status)) {
          throw new Error('Status da corrida não permite envio de oferta')
        }
        if (empresa.status !== 'ativa' || !empresa.habilitada_receber) {
          throw new Error('Empresa precisa estar ativa e habilitada a receber')
        }

        let atribuicao = state.atribuicoes.find(
          (a) => a.viagem_id === viagemId && a.empresa_id === empresaId,
        )
        let distancia =
          atribuicao?.distancia_km ??
          (typeof viagem.origem_lat === 'number' &&
          typeof viagem.origem_lng === 'number' &&
          typeof empresa.latitude === 'number' &&
          typeof empresa.longitude === 'number'
            ? calcularDistanciaKm(
                viagem.origem_lat,
                viagem.origem_lng,
                empresa.latitude,
                empresa.longitude,
              )
            : undefined)

        const agora = agoraIso()
        let atribuicoes = state.atribuicoes

        if (!atribuicao) {
          atribuicao = {
            id: gerarId(),
            viagem_id: viagemId,
            empresa_id: empresaId,
            status: 'oferecida',
            distancia_km: distancia,
            created_at: agora,
            motivo: 'oferta_manual_admin',
          }
          atribuicoes = [atribuicao, ...atribuicoes]
        }

        abrirGmailCompose({
          para: empresa.email,
          assunto: `Jemani — nova corrida ${viagem.codigo} (próxima da sua base)`,
          corpo: corpoOfertaCorrida({
            empresaNome: empresa.nome_comercial,
            codigo: viagem.codigo,
            origem: viagem.origem,
            destino: viagem.destino,
            data: viagem.data_viagem,
            horario: viagem.horario,
            distanciaKm: distancia,
            passageiros: viagem.passageiros,
            valorEmpresa: viagem.valor_empresa,
          }),
        })

        const statusAnterior = viagem.status
        const atualizada: Viagem = {
          ...viagem,
          status: 'oferta_enviada',
          version: viagem.version + 1,
          updated_at: agora,
        }

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
          atribuicoes: atribuicoes.map((a) =>
            a.viagem_id === viagemId && a.empresa_id === empresaId
              ? {
                  ...a,
                  status: 'oferecida',
                  distancia_km: distancia,
                  email_enviado_em: agora,
                  motivo: 'email_oferta_gmail',
                }
              : a,
          ),
          distribuicoes: [
            {
              id: gerarId(),
              viagem_id: viagemId,
              empresa_id: empresaId,
              distancia_km: distancia ?? -1,
              resultado: 'oferecida',
              motivo: 'email_oferta_gmail',
              created_at: agora,
            },
            ...state.distribuicoes,
          ],
          auditLogs: [
            {
              id: gerarId(),
              acao: 'gmail_compose_aberto',
              usuario_id: adminId,
              entidade_tipo: 'viagem',
              entidade_id: viagemId,
              metadados: {
                empresa_id: empresaId,
                email: empresa.email,
                distancia_km: distancia,
                status_novo: 'oferta_enviada',
              },
              created_at: agora,
            },
            ...state.auditLogs,
          ],
        })

        if (statusAnterior !== 'oferta_enviada') {
          registrarHistorico(
            set,
            get,
            viagemId,
            statusAnterior,
            'oferta_enviada',
            adminId,
            `Oferta enviada por e-mail a ${empresa.nome_comercial}`,
          )
        }

        notificar(
          set,
          get,
          empresa.usuario_id,
          'Nova oferta por e-mail',
          `Corrida ${viagem.codigo} (${distancia ?? '?'} km do embarque). Confira em Solicitações.`,
          'nova_solicitacao',
          viagemId,
        )

        return { viagem: atualizada, urlAberta: true }
      },

      aceitarViagem: (viagemId, empresaId) => {
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (viagem.payment_status !== 'paid') {
          throw new Error('Corrida sem pagamento aprovado')
        }
        if (!['aguardando_empresa', 'oferta_enviada'].includes(viagem.status)) {
          throw new Error('Esta solicitação não está mais disponível')
        }
        if (viagem.empresa_id) {
          throw new Error('Outra empresa já aceitou esta corrida')
        }

        const empresa = state.empresas.find((e) => e.id === empresaId)
        const percentual = obterComissaoDaEmpresa(
          empresa,
          lerComissaoPadrao(state.configuracoes),
        )
        const repasse = calcularRepasseComissao(viagem.preco_total, percentual)

        const agora = agoraIso()
        const atualizada: Viagem = {
          ...viagem,
          empresa_id: empresaId,
          comissao_percentual: repasse.comissao_percentual,
          valor_plataforma: repasse.valor_plataforma,
          valor_empresa: repasse.valor_empresa,
          status: 'empresa_confirmada',
          version: viagem.version + 1,
          updated_at: agora,
        }

        const dist =
          state.atribuicoes.find((a) => a.viagem_id === viagemId && a.empresa_id === empresaId)
            ?.distancia_km ?? 0

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
          pagamentos: state.pagamentos.map((p) =>
            p.booking_id === viagemId
              ? {
                  ...p,
                  platform_fee: repasse.valor_plataforma,
                  company_amount: repasse.valor_empresa,
                  updated_at: agora,
                }
              : p,
          ),
          atribuicoes: state.atribuicoes.map((a) => {
            if (a.viagem_id !== viagemId) return a
            if (a.empresa_id === empresaId) {
              return { ...a, status: 'aceita', respondido_em: agora }
            }
            if (a.status === 'oferecida') {
              return { ...a, status: 'expirada', respondido_em: agora }
            }
            return a
          }),
          distribuicoes: [
            {
              id: gerarId(),
              viagem_id: viagemId,
              empresa_id: empresaId,
              distancia_km: dist,
              resultado: 'aceita',
              created_at: agora,
            },
            ...state.distribuicoes,
          ],
        })

        registrarHistorico(
          set,
          get,
          viagemId,
          viagem.status,
          'empresa_confirmada',
          empresa?.usuario_id,
        )

        notificar(
          set,
          get,
          viagem.cliente_id,
          'Empresa confirmada',
          `A empresa aceitou sua viagem ${viagem.codigo}.`,
          'status',
          viagemId,
        )

        if (empresa?.stripe_account_id && import.meta.env.VITE_STRIPE_ENABLED === 'true') {
          void transferirParaEmpresa({
            stripe_account_id: empresa.stripe_account_id,
            amount: repasse.valor_empresa,
            viagem_id: viagemId,
            codigo: viagem.codigo,
          })
            .then((resultado) => {
              set((s) => ({
                pagamentos: s.pagamentos.map((p) =>
                  p.booking_id === viagemId
                    ? { ...p, stripe_transfer_id: resultado.transfer_id, updated_at: agoraIso() }
                    : p,
                ),
              }))
            })
            .catch(() => {
              /* repasse pode ser refeito depois; aceite da corrida não depende disso */
            })
        }

        return atualizada
      },

      recusarViagem: (viagemId, empresaId) => {
        const state = get()
        const agora = agoraIso()
        const dist =
          state.atribuicoes.find((a) => a.viagem_id === viagemId && a.empresa_id === empresaId)
            ?.distancia_km ?? 0
        set({
          atribuicoes: state.atribuicoes.map((a) =>
            a.viagem_id === viagemId && a.empresa_id === empresaId
              ? { ...a, status: 'recusada', respondido_em: agora, motivo: 'recusada_pela_empresa' }
              : a,
          ),
          distribuicoes: [
            {
              id: gerarId(),
              viagem_id: viagemId,
              empresa_id: empresaId,
              distancia_km: dist,
              resultado: 'recusada',
              motivo: 'recusada_pela_empresa',
              created_at: agora,
            },
            ...state.distribuicoes,
          ],
        })
      },

      atribuirEquipe: (viagemId, motoristaId, veiculoId) => {
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (!viagem.empresa_id) throw new Error('Viagem sem empresa')
        if (!['empresa_confirmada', 'motorista_atribuido'].includes(viagem.status)) {
          throw new Error('Status inválido para atribuição')
        }

        const motorista = state.motoristas.find((m) => m.id === motoristaId)
        const veiculo = state.veiculos.find((v) => v.id === veiculoId)
        if (!motorista || !veiculo) throw new Error('Motorista ou veículo inválido')
        if (motorista.empresa_id !== viagem.empresa_id || veiculo.empresa_id !== viagem.empresa_id) {
          throw new Error('Motorista/veículo de outra empresa')
        }
        const categoriaViagem = state.categorias.find((c) => c.id === viagem.categoria_id)
        if (categoriaViagem?.slug === SLUG_SHIELD && !motorista.eh_categoria_shield) {
          throw new Error('Corrida Shield exige motorista da categoria Shield.')
        }

        const agora = agoraIso()
        const atualizada: Viagem = {
          ...viagem,
          motorista_id: motoristaId,
          veiculo_id: veiculoId,
          status: 'motorista_atribuido',
          version: viagem.version + 1,
          updated_at: agora,
        }

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
          motoristas: state.motoristas.map((m) =>
            m.id === motoristaId ? { ...m, status: 'ocupado', disponivel: false } : m,
          ),
          veiculos: state.veiculos.map((v) =>
            v.id === veiculoId ? { ...v, status: 'ocupado' } : v,
          ),
        })

        registrarHistorico(
          set,
          get,
          viagemId,
          viagem.status,
          'motorista_atribuido',
          state.empresas.find((e) => e.id === viagem.empresa_id)?.usuario_id,
        )

        notificar(
          set,
          get,
          viagem.cliente_id,
          'Motorista atribuído',
          `${motorista.nome} irá conduzir sua viagem ${viagem.codigo}.`,
          'status',
          viagemId,
        )

        if (motorista.usuario_id) {
          notificar(
            set,
            get,
            motorista.usuario_id,
            'Nova viagem atribuída',
            `${viagem.codigo}: ${viagem.origem} → ${viagem.destino}`,
            'atribuicao',
            viagemId,
          )
        }

        return atualizada
      },

      atualizarStatus: (viagemId, status, usuarioId) => {
        if (status === 'viagem_finalizada') {
          throw new Error('Use a finalização com checagem dupla')
        }
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')

        const agora = agoraIso()
        const atualizada: Viagem = {
          ...viagem,
          status,
          version: viagem.version + 1,
          updated_at: agora,
        }

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
        })

        registrarHistorico(set, get, viagemId, viagem.status, status, usuarioId)

        const mensagens: Partial<Record<StatusViagem, string>> = {
          motorista_a_caminho: 'Motorista está a caminho',
          motorista_chegou: 'Motorista chegou',
          passageiro_embarcou: 'Passageiro embarcou',
          viagem_em_andamento: 'Viagem iniciada',
        }

        if (mensagens[status]) {
          notificar(
            set,
            get,
            viagem.cliente_id,
            mensagens[status]!,
            `Atualização da viagem ${viagem.codigo}.`,
            'status',
            viagemId,
          )
        }

        return atualizada
      },

      solicitarFinalizacao: (viagemId) => {
        const viagem = get().viagens.find((v) => v.id === viagemId)
        if (!viagem) return { ok: false, mensagem: 'Viagem não encontrada' }
        if (viagem.status === 'cancelada') return { ok: false, mensagem: 'Corrida cancelada' }
        if (viagem.status === 'viagem_finalizada') {
          return { ok: false, mensagem: 'Corrida já concluída' }
        }
        if (viagem.status !== 'viagem_em_andamento') {
          return { ok: false, mensagem: 'Só é possível finalizar corrida em andamento' }
        }
        return { ok: true, mensagem: 'Confirme novamente os dados para finalizar' }
      },

      confirmarFinalizacao: (viagemId, usuarioId, confirmado) => {
        if (!confirmado) {
          throw new Error('É necessária a segunda confirmação para finalizar')
        }
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (viagem.status === 'cancelada') throw new Error('Corrida cancelada')
        if (viagem.status === 'viagem_finalizada') throw new Error('Corrida já concluída')
        if (viagem.status !== 'viagem_em_andamento') {
          throw new Error('Só é possível finalizar corrida em andamento')
        }

        const agora = agoraIso()
        const atualizada: Viagem = {
          ...viagem,
          status: 'viagem_finalizada',
          finalizado_por: usuarioId,
          finalizado_em: agora,
          version: viagem.version + 1,
          updated_at: agora,
        }

        let comissoes = state.comissoes
        let motoristas = state.motoristas
        let veiculos = state.veiculos

        if (viagem.empresa_id) {
          comissoes = [
            {
              id: gerarId(),
              viagem_id: viagem.id,
              empresa_id: viagem.empresa_id,
              valor_viagem: viagem.preco_total,
              percentual: viagem.comissao_percentual,
              valor_plataforma: viagem.valor_plataforma,
              valor_empresa: viagem.valor_empresa,
              created_at: agora,
            },
            ...comissoes,
          ]
        }
        if (viagem.motorista_id) {
          motoristas = motoristas.map((m) =>
            m.id === viagem.motorista_id ? { ...m, status: 'disponivel', disponivel: true } : m,
          )
        }
        if (viagem.veiculo_id) {
          veiculos = veiculos.map((v) =>
            v.id === viagem.veiculo_id ? { ...v, status: 'disponivel' } : v,
          )
        }

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
          comissoes,
          motoristas,
          veiculos,
          auditLogs: [
            {
              id: gerarId(),
              acao: 'viagem_finalizada',
              usuario_id: usuarioId,
              entidade_tipo: 'viagem',
              entidade_id: viagemId,
              metadados: {
                empresa_id: viagem.empresa_id,
                motorista_id: viagem.motorista_id,
                confirmacao_dupla: true,
              },
              created_at: agora,
            },
            ...state.auditLogs,
          ],
        })

        registrarHistorico(
          set,
          get,
          viagemId,
          'viagem_em_andamento',
          'viagem_finalizada',
          usuarioId,
          'checagem_dupla',
        )

        notificar(
          set,
          get,
          viagem.cliente_id,
          'Viagem finalizada',
          `Atualização da viagem ${viagem.codigo}.`,
          'status',
          viagemId,
        )

        return atualizada
      },

      cancelarViagem: (viagemId, usuarioId, motivo) => {
        const state = get()
        const viagem = state.viagens.find((v) => v.id === viagemId)
        if (!viagem) throw new Error('Viagem não encontrada')
        if (viagem.status === 'viagem_finalizada' || viagem.status === 'cancelada') {
          throw new Error('Viagem não pode ser cancelada')
        }

        const agora = agoraIso()
        const atualizada: Viagem = {
          ...viagem,
          status: 'cancelada',
          cancelado_por: usuarioId,
          motivo_cancelamento: motivo,
          cancelado_em: agora,
          version: viagem.version + 1,
          updated_at: agora,
        }

        set({
          viagens: state.viagens.map((v) => (v.id === viagemId ? atualizada : v)),
          motoristas: state.motoristas.map((m) =>
            m.id === viagem.motorista_id ? { ...m, status: 'disponivel', disponivel: true } : m,
          ),
          veiculos: state.veiculos.map((v) =>
            v.id === viagem.veiculo_id ? { ...v, status: 'disponivel' } : v,
          ),
        })

        registrarHistorico(set, get, viagemId, viagem.status, 'cancelada', usuarioId, motivo)
        return atualizada
      },

      criarAvaliacao: (dados) => {
        const avaliacao: Avaliacao = {
          ...dados,
          id: gerarId(),
          created_at: agoraIso(),
        }
        set((s) => ({ avaliacoes: [avaliacao, ...s.avaliacoes] }))
        return avaliacao
      },

      marcarNotificacaoLida: (id) => {
        set((s) => ({
          notificacoes: s.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)),
        }))
      },

      registrarAudit: (acao, usuarioId, entidadeTipo, entidadeId, metadados) => {
        set((s) => ({
          auditLogs: [
            {
              id: gerarId(),
              acao,
              usuario_id: usuarioId,
              entidade_tipo: entidadeTipo,
              entidade_id: entidadeId,
              metadados,
              created_at: agoraIso(),
            },
            ...s.auditLogs,
          ],
        }))
      },

      atualizarConfiguracao: (chave, valor) => {
        set((s) => {
          const existe = s.configuracoes.some((c) => c.chave === chave)
          if (existe) {
            return {
              configuracoes: s.configuracoes.map((c) =>
                c.chave === chave ? { ...c, valor, updated_at: agoraIso() } : c,
              ),
            }
          }
          return {
            configuracoes: [
              ...s.configuracoes,
              {
                id: gerarId(),
                chave,
                valor,
                descricao: chave,
                updated_at: agoraIso(),
              },
            ],
          }
        })
      },

      atualizarRegraPreco: (id, patch) => {
        set((s) => ({
          regrasPreco: s.regrasPreco.map((r) =>
            r.id === id ? { ...r, ...patch, updated_at: agoraIso() } : r,
          ),
        }))
      },

      salvarCategoria: (cat) => {
        const agora = agoraIso()
        if (cat.id) {
          const atualizada = {
            ...(get().categorias.find((c) => c.id === cat.id) as CategoriaVeiculo),
            ...cat,
            updated_at: agora,
          }
          set((s) => ({
            categorias: s.categorias.map((c) => (c.id === cat.id ? atualizada : c)),
          }))
          return atualizada
        }
        const nova: CategoriaVeiculo = {
          id: gerarId(),
          nome: cat.nome,
          slug: cat.nome.toLowerCase().replace(/\s+/g, '-'),
          descricao: cat.descricao,
          capacidade_min: cat.capacidade_min ?? 1,
          capacidade_max: cat.capacidade_max ?? 4,
          adicional_preco: cat.adicional_preco ?? 0,
          ativo: cat.ativo ?? true,
          ordem: cat.ordem ?? get().categorias.length + 1,
          created_at: agora,
          updated_at: agora,
        }
        set((s) => ({ categorias: [...s.categorias, nova] }))
        return nova
      },

      salvarEmpresa: (patch) => {
        const atual = get().empresas.find((e) => e.id === patch.id)
        if (!atual) throw new Error('Empresa não encontrada')
        const atualizada = { ...atual, ...patch, updated_at: agoraIso() }
        set((s) => ({
          empresas: s.empresas.map((e) => (e.id === patch.id ? atualizada : e)),
        }))
        return atualizada
      },

      aplicarComissaoTodasEmpresas: (percentual) => {
        const pct = Math.min(100, Math.max(0, Number(percentual) || 0))
        const agora = agoraIso()
        set((s) => ({
          empresas: s.empresas.map((e) => ({
            ...e,
            comissao_percentual: pct,
            updated_at: agora,
          })),
        }))
      },

      criarEmpresa: (empresa, senhaAcesso) => {
        const state = get()
        if (state.empresas.some((e) => e.id === empresa.id || e.cnpj === empresa.cnpj)) {
          return empresa
        }
        const agora = agoraIso()
        const perfil: Perfil = {
          id: empresa.usuario_id,
          email: empresa.email,
          nome: `Gestor ${empresa.nome_comercial}`,
          telefone: empresa.telefone,
          tipo: 'empresa',
          ativo: true,
          created_at: agora,
          updated_at: agora,
        }
        const jaTemPerfil = state.perfis.some((p) => p.id === perfil.id || p.email === perfil.email)
        const comissaoPadrao =
          empresa.comissao_percentual ?? lerComissaoPadrao(state.configuracoes)
        const empresaNova = { ...empresa, comissao_percentual: comissaoPadrao }
        set({
          empresas: [empresaNova, ...state.empresas],
          perfis: jaTemPerfil ? state.perfis : [...state.perfis, perfil],
          senhas: senhaAcesso
            ? { ...state.senhas, [empresa.email]: senhaAcesso }
            : state.senhas,
        })
        return empresaNova
      },

      salvarMotorista: (dados) => {
        const agora = agoraIso()
        if (dados.id) {
          const atual = get().motoristas.find((m) => m.id === dados.id)!
          const patch = { ...dados }
          delete patch.email
          delete patch.senha
          const atualizada = { ...atual, ...patch, updated_at: agora }
          set((s) => ({
            motoristas: s.motoristas.map((m) => (m.id === dados.id ? atualizada : m)),
          }))
          return atualizada
        }

        const email = dados.email?.trim().toLowerCase()
        const senha = dados.senha?.trim()
        if (!email) throw new Error('Informe o e-mail de acesso do motorista')
        if (!senha || senha.length < 6) {
          throw new Error('A senha precisa ter pelo menos 6 caracteres')
        }

        const state = get()
        if (state.perfis.some((p) => p.email.toLowerCase() === email)) {
          throw new Error('E-mail já cadastrado')
        }

        const usuarioId = dados.usuario_id ?? gerarId()
        const perfil: Perfil = {
          id: usuarioId,
          email,
          nome: dados.nome,
          telefone: dados.telefone,
          tipo: 'motorista',
          ativo: true,
          created_at: agora,
          updated_at: agora,
        }
        const novo: Motorista = {
          id: gerarId(),
          empresa_id: dados.empresa_id,
          usuario_id: usuarioId,
          nome: dados.nome,
          telefone: dados.telefone,
          cnh: dados.cnh,
          categoria_cnh: dados.categoria_cnh ?? 'B',
          experiencia_anos: dados.experiencia_anos ?? 0,
          eh_categoria_shield: Boolean(dados.eh_categoria_shield),
          status: 'disponivel',
          disponivel: true,
          avaliacao_media: 5,
          foto_url: dados.foto_url,
          created_at: agora,
          updated_at: agora,
        }
        set((s) => ({
          motoristas: [...s.motoristas, novo],
          perfis: [...s.perfis, perfil],
          senhas: { ...s.senhas, [email]: senha },
        }))
        return novo
      },

      salvarVeiculo: (dados) => {
        const agora = agoraIso()
        if (dados.id) {
          const atual = get().veiculos.find((v) => v.id === dados.id)!
          const atualizada = { ...atual, ...dados, updated_at: agora }
          set((s) => ({
            veiculos: s.veiculos.map((v) => (v.id === dados.id ? atualizada : v)),
          }))
          return atualizada
        }
        const novo: Veiculo = {
          id: gerarId(),
          empresa_id: dados.empresa_id,
          marca: dados.marca,
          modelo: dados.modelo,
          ano: dados.ano ?? new Date().getFullYear(),
          categoria_id: dados.categoria_id,
          capacidade: dados.capacidade ?? 4,
          ar_condicionado: dados.ar_condicionado ?? true,
          bagageiro: dados.bagageiro ?? true,
          fotos: dados.fotos ?? [],
          placa: dados.placa,
          status: 'disponivel',
          created_at: agora,
          updated_at: agora,
        }
        set((s) => ({ veiculos: [...s.veiculos, novo] }))
        return novo
      },

      obterEmpresaDoUsuario: (usuarioId) =>
        get().empresas.find((e) => e.usuario_id === usuarioId),

      obterMotoristaDoUsuario: (usuarioId) =>
        get().motoristas.find((m) => m.usuario_id === usuarioId),
    }),
    {
      name: 'jemani-demo-v4',
      version: 10,
      migrate: (persistido) => completarCatalogo(persistido as ReturnType<typeof estadoInicial>),
      merge: (persistido, atual) =>
        completarCatalogo({
          ...atual,
          ...(persistido as object),
        }),
    },
  ),
)
