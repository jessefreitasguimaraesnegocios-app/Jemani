export type TipoUsuario = 'cliente' | 'empresa' | 'motorista' | 'admin'

/** Status operacional da viagem (fluxo completo Jemani) */
export type StatusViagem =
  | 'pending_payment'
  | 'paid'
  | 'aguardando_empresa'
  | 'oferta_enviada'
  | 'empresa_confirmada'
  | 'motorista_atribuido'
  | 'motorista_a_caminho'
  | 'motorista_chegou'
  | 'passageiro_embarcou'
  | 'viagem_em_andamento'
  | 'viagem_finalizada'
  | 'cancelada'
  | 'expired'
  /** legados mantidos para compatibilidade de seed antigo */
  | 'solicitada'

export type StatusPagamentoReserva =
  | 'pending_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'expired'

export type StatusEmpresa = 'pendente' | 'aprovada' | 'ativa' | 'inativa' | 'bloqueada'
export type StatusPagamento = 'pendente' | 'pago' | 'falhou' | 'reembolsado' | 'teste' | 'pending_payment'
export type StatusEntidade = 'disponivel' | 'ocupado' | 'inativo'

export interface EnderecoLocal {
  formatted: string
  latitude: number
  longitude: number
  place_id?: string
  source: 'google_places' | 'mapbox' | 'dev_fallback'
  /** Nome da rua / logradouro */
  rua?: string
  /** Número do imóvel (ex.: 842) */
  numero?: string
  /** Apto, suite, portaria... */
  complemento?: string
  cidade?: string
  estado?: string
  cep?: string
  /** true quando o número foi confirmado no geocode daquela rua */
  numero_confirmado?: boolean
}

export interface Perfil {
  id: string
  email: string
  nome: string
  telefone?: string
  tipo: TipoUsuario
  avatar_url?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Empresa {
  id: string
  usuario_id: string
  nome_comercial: string
  razao_social: string
  cnpj: string
  telefone: string
  email: string
  cidade: string
  endereco_base?: string
  latitude?: number
  longitude?: number
  regioes_atendidas: string[]
  categorias_ids: string[]
  status: StatusEmpresa
  habilitada_receber: boolean
  avaliacao_media: number
  /** Comissão da plataforma (%) para corridas desta empresa */
  comissao_percentual?: number
  /** Conta Stripe Connect (acct_...) para receber repasses */
  stripe_account_id?: string
  created_at: string
  updated_at: string
}

export interface CategoriaVeiculo {
  id: string
  nome: string
  slug: string
  descricao?: string
  capacidade_min: number
  capacidade_max: number
  adicional_preco: number
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface Veiculo {
  id: string
  empresa_id: string
  marca: string
  modelo: string
  ano: number
  categoria_id: string
  capacidade: number
  ar_condicionado: boolean
  bagageiro: boolean
  fotos: string[]
  placa?: string
  status: StatusEntidade
  created_at: string
  updated_at: string
}

export interface Motorista {
  id: string
  empresa_id: string
  usuario_id?: string
  nome: string
  foto_url?: string
  telefone: string
  cnh: string
  categoria_cnh: string
  experiencia_anos: number
  eh_categoria_shield?: boolean
  status: StatusEntidade
  disponivel: boolean
  avaliacao_media: number
  created_at: string
  updated_at: string
}

export interface ConfiguracaoPlataforma {
  id: string
  chave: string
  valor: string
  descricao?: string
  updated_at: string
}

export interface RegraPreco {
  id: string
  nome: string
  preco_base: number
  preco_por_km: number
  preco_minimo: number
  adicional_horario_noturno: number
  horario_noturno_inicio: string
  horario_noturno_fim: string
  distancia_padrao_km: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Viagem {
  id: string
  codigo: string
  cliente_id: string
  empresa_id?: string
  motorista_id?: string
  veiculo_id?: string
  categoria_id: string
  origem: string
  destino: string
  origem_endereco?: EnderecoLocal
  destino_endereco?: EnderecoLocal
  origem_lat?: number
  origem_lng?: number
  destino_lat?: number
  destino_lng?: number
  origem_place_id?: string
  destino_place_id?: string
  data_viagem: string
  horario: string
  passageiros: number
  malas?: number
  numero_voo?: string
  nome_passageiro?: string
  observacoes?: string
  distancia_km?: number
  preco_base: number
  taxas: number
  preco_total: number
  comissao_percentual: number
  valor_plataforma: number
  valor_empresa: number
  status: StatusViagem
  payment_status: StatusPagamentoReserva
  cancelado_por?: string
  motivo_cancelamento?: string
  cancelado_em?: string
  finalizado_por?: string
  finalizado_em?: string
  version: number
  created_at: string
  updated_at: string
}

export interface HistoricoStatus {
  id: string
  viagem_id: string
  status_anterior?: StatusViagem
  status_novo: StatusViagem
  usuario_id?: string
  observacao?: string
  created_at: string
}

export interface AtribuicaoViagem {
  id: string
  viagem_id: string
  empresa_id: string
  status: 'oferecida' | 'aceita' | 'recusada' | 'expirada'
  distancia_km?: number
  respondido_em?: string
  email_enviado_em?: string
  motivo?: string
  created_at: string
}

export interface HistoricoDistribuicao {
  id: string
  viagem_id: string
  empresa_id: string
  distancia_km: number
  resultado: 'oferecida' | 'aceita' | 'recusada' | 'indisponivel' | 'pulada' | 'selecionada'
  motivo?: string
  created_at: string
}

export interface AuditLog {
  id: string
  acao: string
  usuario_id?: string
  entidade_tipo?: string
  entidade_id?: string
  metadados?: Record<string, unknown>
  created_at: string
}

export interface Pagamento {
  id: string
  booking_id: string
  payment_id?: string
  stripe_checkout_session_id?: string
  stripe_transfer_id?: string
  amount: number
  platform_fee: number
  company_amount: number
  status: StatusPagamento
  payment_method: string
  provider: 'stripe' | 'asaas' | 'teste' | 'dev_simulado'
  created_at: string
  updated_at: string
}

export interface Comissao {
  id: string
  viagem_id: string
  empresa_id: string
  valor_viagem: number
  percentual: number
  valor_plataforma: number
  valor_empresa: number
  created_at: string
}

export interface Notificacao {
  id: string
  usuario_id: string
  titulo: string
  mensagem: string
  tipo: string
  lida: boolean
  referencia_id?: string
  created_at: string
}

export interface Avaliacao {
  id: string
  viagem_id: string
  cliente_id: string
  empresa_id: string
  motorista_id?: string
  nota_empresa: number
  nota_motorista: number
  nota_servico: number
  comentario?: string
  created_at: string
}

export interface CalculoPreco {
  preco_base: number
  adicional_categoria: number
  adicional_horario: number
  preco_distancia: number
  taxas: number
  subtotal: number
  comissao_percentual: number
  valor_plataforma: number
  valor_empresa: number
  total: number
  distancia_km: number
}

export const ROTULOS_STATUS: Record<StatusViagem, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  solicitada: 'Solicitada',
  aguardando_empresa: 'Aguardando empresa',
  oferta_enviada: 'Oferta enviada por e-mail',
  empresa_confirmada: 'Empresa confirmada',
  motorista_atribuido: 'Motorista atribuído',
  motorista_a_caminho: 'Motorista a caminho',
  motorista_chegou: 'Motorista chegou',
  passageiro_embarcou: 'Passageiro embarcou',
  viagem_em_andamento: 'Viagem em andamento',
  viagem_finalizada: 'Viagem finalizada',
  cancelada: 'Cancelada',
  expired: 'Expirada',
}

export const TRANSICOES_STATUS: Partial<Record<StatusViagem, StatusViagem[]>> = {
  pending_payment: ['paid', 'cancelada', 'expired'],
  paid: ['aguardando_empresa', 'cancelada'],
  solicitada: ['aguardando_empresa', 'cancelada'],
  aguardando_empresa: ['oferta_enviada', 'empresa_confirmada', 'cancelada'],
  oferta_enviada: ['empresa_confirmada', 'cancelada'],
  empresa_confirmada: ['motorista_atribuido', 'cancelada'],
  motorista_atribuido: ['motorista_a_caminho', 'cancelada'],
  motorista_a_caminho: ['motorista_chegou', 'cancelada'],
  motorista_chegou: ['passageiro_embarcou', 'cancelada'],
  passageiro_embarcou: ['viagem_em_andamento', 'cancelada'],
  viagem_em_andamento: ['viagem_finalizada', 'cancelada'],
}

/** Status em que a empresa já pode ver a corrida */
export const STATUS_VISIVEIS_EMPRESA: StatusViagem[] = [
  'aguardando_empresa',
  'oferta_enviada',
  'empresa_confirmada',
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
  'viagem_finalizada',
]
