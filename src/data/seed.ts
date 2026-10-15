import type {
  AgendamentoVeiculo,
  Avaliacao,
  AtribuicaoViagem,
  AuditLog,
  CategoriaVeiculo,
  Comissao,
  ConfiguracaoPlataforma,
  Empresa,
  HistoricoDistribuicao,
  HistoricoStatus,
  Motorista,
  MensagemEmpresa,
  Notificacao,
  Pagamento,
  Perfil,
  RegraPreco,
  TurnoMotorista,
  Veiculo,
  Viagem,
} from '@/types'
import { amanhaIso, agoraIso } from '@/utils/format'

const agora = agoraIso()
const amanha = amanhaIso()

export const SENHA_DEMO = 'demo1234'

export const IDS = {
  admin: '11111111-1111-1111-1111-111111111111',
  cliente1: '22222222-2222-2222-2222-222222222201',
  cliente2: '22222222-2222-2222-2222-222222222202',
  cliente3: '22222222-2222-2222-2222-222222222203',
  empresaLa: '33333333-3333-3333-3333-333333333301',
  empresaPacific: '33333333-3333-3333-3333-333333333302',
  empresaWest: '33333333-3333-3333-3333-333333333303',
  empresaLax: '33333333-3333-3333-3333-333333333304',
  empresaBeverly: '33333333-3333-3333-3333-333333333305',
  empresaHollywood: '33333333-3333-3333-3333-333333333306',
  empresaPasadena: '33333333-3333-3333-3333-333333333307',
  empresaLongBeach: '33333333-3333-3333-3333-333333333308',
  userEmpresaLa: '44444444-4444-4444-4444-444444444401',
  userEmpresaPacific: '44444444-4444-4444-4444-444444444402',
  userEmpresaWest: '44444444-4444-4444-4444-444444444403',
  userEmpresaLax: '44444444-4444-4444-4444-444444444404',
  userEmpresaBeverly: '44444444-4444-4444-4444-444444444405',
  userEmpresaHollywood: '44444444-4444-4444-4444-444444444406',
  userEmpresaPasadena: '44444444-4444-4444-4444-444444444407',
  userEmpresaLongBeach: '44444444-4444-4444-4444-444444444408',
  motorista1: '55555555-5555-5555-5555-555555555501',
  motorista2: '55555555-5555-5555-5555-555555555502',
  motorista3: '55555555-5555-5555-5555-555555555503',
  motorista4: '55555555-5555-5555-5555-555555555504',
  motorista5: '55555555-5555-5555-5555-555555555505',
  motorista6: '55555555-5555-5555-5555-555555555506',
  motorista7: '55555555-5555-5555-5555-555555555507',
  motorista8: '55555555-5555-5555-5555-555555555508',
  motorista9: '55555555-5555-5555-5555-555555555509',
  motorista10: '55555555-5555-5555-5555-555555555510',
  userMotorista1: '66666666-6666-6666-6666-666666666601',
  catExecutive: '77777777-7777-7777-7777-777777777701',
  catBlack: '77777777-7777-7777-7777-777777777706',
  catSuv: '77777777-7777-7777-7777-777777777702',
  catLuxe: '77777777-7777-7777-7777-777777777705',
  catLimo: '77777777-7777-7777-7777-777777777704',
  catVan: '77777777-7777-7777-7777-777777777703',
  catShield: '77777777-7777-7777-7777-777777777707',
  catExpedition: '77777777-7777-7777-7777-777777777708',
  catCharter: '77777777-7777-7777-7777-777777777709',
  motorista11: '55555555-5555-5555-5555-555555555511',
  regraPreco: '88888888-8888-8888-8888-888888888801',
}

export const SLUG_SHIELD = 'jemani-shield'
export const ID_VEICULO_SHIELD = '99999999-9999-9999-9999-999999999916'

export function criarCategoriaShield(agora = agoraIso()): CategoriaVeiculo {
  return {
    id: IDS.catShield,
    nome: 'JEMANI SHIELD',
    slug: SLUG_SHIELD,
    descricao:
      'Cadillac Escalade preto com motorista de segurança de elite: defesa pessoal, combate e porte de arma.',
    capacidade_min: 1,
    capacidade_max: 3,
    adicional_preco: 280,
    ativo: true,
    ordem: 0,
    created_at: agora,
    updated_at: agora,
  }
}

const FROTA_LUXO: Array<Omit<CategoriaVeiculo, 'created_at' | 'updated_at' | 'ativo'>> = [
  {
    id: IDS.catShield,
    nome: 'JEMANI SHIELD',
    slug: SLUG_SHIELD,
    descricao:
      'Cadillac Escalade preto com motorista de segurança de elite: defesa pessoal, combate e porte de arma.',
    capacidade_min: 1,
    capacidade_max: 3,
    adicional_preco: 280,
    ordem: 0,
  },
  {
    id: IDS.catExpedition,
    nome: 'Ford Expedition',
    slug: 'jemani-expedition',
    descricao: 'SUV full-size preto, espaço de sobra para família e bagagem.',
    capacidade_min: 1,
    capacidade_max: 7,
    adicional_preco: 70,
    ordem: 1,
  },
  {
    id: IDS.catLuxe,
    nome: 'Volvo XC90',
    slug: 'jemani-luxe',
    descricao: 'Volvo XC90 preto, conforto escandinavo para a cidade e o aeroporto.',
    capacidade_min: 1,
    capacidade_max: 6,
    adicional_preco: 140,
    ordem: 2,
  },
  {
    id: IDS.catExecutive,
    nome: 'Mercedes-Benz Classe S',
    slug: 'jemani-executive',
    descricao: 'Classe S preto, o sedã executivo da Jemani para corporativo e aeroporto.',
    capacidade_min: 1,
    capacidade_max: 3,
    adicional_preco: 0,
    ordem: 3,
  },
  {
    id: IDS.catBlack,
    nome: 'Lucid Air',
    slug: 'jemani-black',
    descricao: 'Lucid Air preto, silêncio e presença para traslados exclusivos.',
    capacidade_min: 1,
    capacidade_max: 3,
    adicional_preco: 95,
    ordem: 4,
  },
  {
    id: IDS.catSuv,
    nome: 'Cadillac Escalade',
    slug: 'jemani-suv',
    descricao: 'Escalade preto, o SUV de luxo para grupos e chegadas marcantes.',
    capacidade_min: 1,
    capacidade_max: 6,
    adicional_preco: 55,
    ordem: 5,
  },
  {
    id: IDS.catVan,
    nome: 'Mercedes-Benz Sprinter',
    slug: 'jemani-van',
    descricao: 'Sprinter executiva preta para grupos, eventos e aeroporto.',
    capacidade_min: 1,
    capacidade_max: 14,
    adicional_preco: 85,
    ordem: 6,
  },
  {
    id: IDS.catLimo,
    nome: 'Shuttle Bus',
    slug: 'jemani-limo',
    descricao: 'Shuttle preto para traslados de grupo, hotel e evento.',
    capacidade_min: 8,
    capacidade_max: 20,
    adicional_preco: 180,
    ordem: 7,
  },
  {
    id: IDS.catCharter,
    nome: 'Charter Bus',
    slug: 'jemani-charter',
    descricao: 'Ônibus charter preto para grupos grandes, convenções e aeroporto.',
    capacidade_min: 14,
    capacidade_max: 40,
    adicional_preco: 320,
    ordem: 8,
  },
]

export function sincronizarFrota(categorias: CategoriaVeiculo[], agora = agoraIso()): CategoriaVeiculo[] {
  const porSlug = new Map(categorias.map((c) => [c.slug, c]))
  const frota = FROTA_LUXO.map((def) => {
    const atual = porSlug.get(def.slug)
    return {
      ...(atual ?? {
        created_at: agora,
        ativo: true,
      }),
      ...def,
      ativo: true,
      updated_at: agora,
      created_at: atual?.created_at ?? agora,
    }
  })
  const slugs = new Set(FROTA_LUXO.map((c) => c.slug))
  return [...frota, ...categorias.filter((c) => !slugs.has(c.slug))]
}

export function criarVeiculoShield(agora = agoraIso()): Veiculo {
  return {
    id: ID_VEICULO_SHIELD,
    empresa_id: IDS.empresaLa,
    marca: 'Cadillac',
    modelo: 'Escalade',
    ano: 2024,
    categoria_id: IDS.catShield,
    capacidade: 3,
    ar_condicionado: true,
    bagageiro: true,
    fotos: [],
    placa: '7JEM016',
    status: 'disponivel',
    created_at: agora,
    updated_at: agora,
  }
}

export function criarMotoristaShield(agora = agoraIso()): Motorista {
  return {
    id: IDS.motorista11,
    empresa_id: IDS.empresaLa,
    nome: 'Victor Lang',
    telefone: '(323) 555-3011',
    cnh: 'D1334567',
    categoria_cnh: 'C',
    experiencia_anos: 16,
    eh_categoria_shield: true,
    status: 'disponivel',
    disponivel: true,
    avaliacao_media: 5,
    created_at: agora,
    updated_at: agora,
  }
}

export const CONFIGS_PREFERENCIAS: Array<{
  id: string
  chave: string
  valor: string
  descricao: string
}> = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    chave: 'idioma',
    valor: 'pt-BR',
    descricao: 'Idioma do painel',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    chave: 'som_notificacao',
    valor: 'true',
    descricao: 'Som de notificação',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7',
    chave: 'vibracao',
    valor: 'true',
    descricao: 'Vibração em alertas',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8',
    chave: 'notificacoes_push',
    valor: 'true',
    descricao: 'Notificações push',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9',
    chave: 'tema_aparencia',
    valor: 'claro',
    descricao: 'Aparência do painel',
  },
]

export function completarCatalogo<
  T extends {
    categorias: CategoriaVeiculo[]
    empresas: Empresa[]
    veiculos: Veiculo[]
    motoristas: Motorista[]
    configuracoes?: ConfiguracaoPlataforma[]
  },
>(estado: T): T {
  const agora = agoraIso()
  let categorias = sincronizarFrota(estado.categorias, agora)

  const empresas = estado.empresas.map((empresa) => {
    let comShield = empresa.categorias_ids
    for (const id of [IDS.catShield, IDS.catExpedition, IDS.catCharter]) {
      if (!comShield.includes(id)) comShield = [...comShield, id]
    }
    return {
      ...empresa,
      categorias_ids: comShield,
      comissao_percentual:
        empresa.comissao_percentual != null && !Number.isNaN(Number(empresa.comissao_percentual))
          ? Number(empresa.comissao_percentual)
          : 10,
    }
  })

  const veiculosBase = estado.veiculos.some((v) => v.id === ID_VEICULO_SHIELD)
    ? estado.veiculos
    : [...estado.veiculos, criarVeiculoShield(agora)]
  const veiculos = veiculosBase.map((veiculo) =>
    veiculo.id === ID_VEICULO_SHIELD
      ? { ...veiculo, marca: 'Cadillac', modelo: 'Escalade' }
      : veiculo,
  )

  const listaMotoristas = estado.motoristas.some((m) => m.id === IDS.motorista11)
    ? estado.motoristas
    : [...estado.motoristas, criarMotoristaShield(agora)]
  const motoristas = listaMotoristas.map((motorista) => ({
    ...motorista,
    eh_categoria_shield:
      motorista.id === IDS.motorista11 ? true : Boolean(motorista.eh_categoria_shield),
  }))

  let configuracoes = estado.configuracoes ?? []
  for (const pref of CONFIGS_PREFERENCIAS) {
    if (!configuracoes.some((c) => c.chave === pref.chave)) {
      configuracoes = [
        ...configuracoes,
        { ...pref, updated_at: agora },
      ]
    }
  }

  return { ...estado, categorias, empresas, veiculos, motoristas, configuracoes }
}

const REGIOES_LA = [
  'Los Angeles',
  'LAX',
  'Santa Monica',
  'Beverly Hills',
  'Pasadena',
  'Long Beach',
  'Burbank',
  'Malibu',
  'Century City',
  'Hollywood',
]

export function criarDadosIniciais(): {
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
  turnos: TurnoMotorista[]
  mensagensEmpresa: MensagemEmpresa[]
  agendamentosVeiculo: AgendamentoVeiculo[]
} {
  const categorias = sincronizarFrota([], agora)

  const perfis: Perfil[] = [
    {
      id: IDS.admin,
      email: 'admin@jemani.app',
      nome: 'Administrador Jemani',
      telefone: '(310) 555-0001',
      tipo: 'admin',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.cliente1,
      email: 'cliente@jemani.app',
      nome: 'Ana Paula Costa',
      telefone: '(310) 555-1001',
      tipo: 'cliente',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.cliente2,
      email: 'joao.silva@email.com',
      nome: 'John Silva',
      telefone: '(424) 555-1002',
      tipo: 'cliente',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.cliente3,
      email: 'maria.santos@email.com',
      nome: 'Maria Santos',
      telefone: '(213) 555-1003',
      tipo: 'cliente',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userEmpresaLa,
      email: 'empresa@lapremier.app',
      nome: 'Gestor LA Premier',
      telefone: '(310) 555-2001',
      tipo: 'empresa',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userEmpresaPacific,
      email: 'empresa@pacificexec.app',
      nome: 'Gestor Pacific Executive',
      telefone: '(310) 555-2002',
      tipo: 'empresa',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userEmpresaWest,
      email: 'empresa@westcoastmobility.app',
      nome: 'Gestor West Coast Mobility',
      telefone: '(818) 555-2003',
      tipo: 'empresa',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userEmpresaHollywood,
      email: 'empresa@hollywoodstar.app',
      nome: 'Gestor Hollywood Star Rides',
      telefone: '(323) 555-2006',
      tipo: 'empresa',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userEmpresaPasadena,
      email: 'empresa@pasadenagold.app',
      nome: 'Gestor Pasadena Gold Transport',
      telefone: '(626) 555-2007',
      tipo: 'empresa',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userEmpresaLongBeach,
      email: 'empresa@lbharbor.app',
      nome: 'Gestor Long Beach Harbor Cars',
      telefone: '(562) 555-2008',
      tipo: 'empresa',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.userMotorista1,
      email: 'motorista@jemani.app',
      nome: 'Carlos Mendes',
      telefone: '(323) 555-3001',
      tipo: 'motorista',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
  ]

  const senhas: Record<string, string> = {}
  for (const p of perfis) senhas[p.email] = SENHA_DEMO

  const categoriasIds = categorias.map((c) => c.id)

  const empresasBase = [
    {
      id: IDS.empresaLa,
      usuario_id: IDS.userEmpresaLa,
      nome_comercial: 'LA Premier Cars',
      razao_social: 'LA Premier Cars LLC',
      cnpj: '12-3456789',
      telefone: '(310) 555-4100',
      email: 'contato@lapremier.app',
      cidade: 'Los Angeles',
      endereco_base: 'Downtown Los Angeles, CA',
      latitude: 34.0407,
      longitude: -118.2468,
      regioes_atendidas: REGIOES_LA,
      categorias_ids: categoriasIds,
      status: 'ativa',
      habilitada_receber: true,
      avaliacao_media: 4.8,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.empresaPacific,
      usuario_id: IDS.userEmpresaPacific,
      nome_comercial: 'Pacific Executive',
      razao_social: 'Pacific Executive Transfer Inc',
      cnpj: '23-4567890',
      telefone: '(310) 555-4200',
      email: 'contato@pacificexec.app',
      cidade: 'Santa Monica',
      endereco_base: 'Santa Monica, CA',
      latitude: 34.0195,
      longitude: -118.4912,
      regioes_atendidas: ['Los Angeles', 'LAX', 'Santa Monica', 'Beverly Hills', 'Malibu'],
      categorias_ids: [IDS.catExecutive, IDS.catBlack, IDS.catSuv, IDS.catLuxe, IDS.catVan, IDS.catShield],
      status: 'ativa',
      habilitada_receber: true,
      avaliacao_media: 4.6,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.empresaWest,
      usuario_id: IDS.userEmpresaWest,
      nome_comercial: 'West Coast Mobility',
      razao_social: 'West Coast Mobility LLC',
      cnpj: '34-5678901',
      telefone: '(818) 555-4300',
      email: 'contato@westcoastmobility.app',
      cidade: 'Burbank',
      endereco_base: 'Burbank, CA',
      latitude: 34.1808,
      longitude: -118.309,
      regioes_atendidas: ['Los Angeles', 'LAX', 'Burbank', 'Pasadena', 'Hollywood', 'Long Beach'],
      categorias_ids: categoriasIds,
      status: 'ativa',
      habilitada_receber: true,
      avaliacao_media: 4.9,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.empresaHollywood,
      usuario_id: IDS.userEmpresaHollywood,
      nome_comercial: 'Hollywood Star Rides',
      razao_social: 'Hollywood Star Rides LLC',
      cnpj: '67-8901234',
      telefone: '(323) 555-4600',
      email: 'contato@hollywoodstar.app',
      cidade: 'Hollywood',
      endereco_base: 'Hollywood Walk of Fame, Los Angeles, CA',
      latitude: 34.1016,
      longitude: -118.3406,
      regioes_atendidas: ['Hollywood', 'Los Angeles', 'Burbank', 'West Hollywood', 'LAX'],
      categorias_ids: categoriasIds,
      status: 'ativa',
      habilitada_receber: true,
      avaliacao_media: 4.6,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.empresaPasadena,
      usuario_id: IDS.userEmpresaPasadena,
      nome_comercial: 'Pasadena Gold Transport',
      razao_social: 'Pasadena Gold Transport Inc',
      cnpj: '78-9012345',
      telefone: '(626) 555-4700',
      email: 'contato@pasadenagold.app',
      cidade: 'Pasadena',
      endereco_base: 'Pasadena, CA',
      latitude: 34.1478,
      longitude: -118.1445,
      regioes_atendidas: ['Pasadena', 'Los Angeles', 'Burbank', 'Glendale', 'LAX'],
      categorias_ids: categoriasIds,
      status: 'ativa',
      habilitada_receber: true,
      avaliacao_media: 4.8,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.empresaLongBeach,
      usuario_id: IDS.userEmpresaLongBeach,
      nome_comercial: 'Long Beach Harbor Cars',
      razao_social: 'Long Beach Harbor Cars LLC',
      cnpj: '89-0123456',
      telefone: '(562) 555-4800',
      email: 'contato@lbharbor.app',
      cidade: 'Long Beach',
      endereco_base: 'Long Beach, CA',
      latitude: 33.7701,
      longitude: -118.1937,
      regioes_atendidas: ['Long Beach', 'Los Angeles', 'LAX', 'Torrance', 'Carson'],
      categorias_ids: categoriasIds,
      status: 'ativa',
      habilitada_receber: true,
      avaliacao_media: 4.5,
      created_at: agora,
      updated_at: agora,
    },
  ]

  const percentuaisSeed = [10, 12, 10, 10, 11, 9]
  const empresas: Empresa[] = empresasBase.map((empresa, indice) => ({
    ...empresa,
    status: empresa.status as Empresa['status'],
    comissao_percentual: percentuaisSeed[indice] ?? 10,
  }))

  const veiculos: Veiculo[] = [
    {
      id: '99999999-9999-9999-9999-999999999901',
      empresa_id: IDS.empresaLa,
      marca: 'Mercedes-Benz',
      modelo: 'E-Class',
      ano: 2024,
      categoria_id: IDS.catExecutive,
      capacidade: 3,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '7JEM001',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999915',
      empresa_id: IDS.empresaLa,
      marca: 'Mercedes-Benz',
      modelo: 'S-Class',
      ano: 2024,
      categoria_id: IDS.catBlack,
      capacidade: 3,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '7JEM015',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999902',
      empresa_id: IDS.empresaLa,
      marca: 'Cadillac',
      modelo: 'Escalade',
      ano: 2024,
      categoria_id: IDS.catSuv,
      capacidade: 6,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '7JEM002',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999903',
      empresa_id: IDS.empresaLa,
      marca: 'Mercedes-Benz',
      modelo: 'Sprinter Executive',
      ano: 2023,
      categoria_id: IDS.catVan,
      capacidade: 12,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '7JEM003',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999904',
      empresa_id: IDS.empresaPacific,
      marca: 'Lincoln',
      modelo: 'Stretch Limousine',
      ano: 2023,
      categoria_id: IDS.catLimo,
      capacidade: 10,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '8PAC004',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999905',
      empresa_id: IDS.empresaWest,
      marca: 'Rolls-Royce',
      modelo: 'Ghost',
      ano: 2024,
      categoria_id: IDS.catLuxe,
      capacidade: 3,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '9WCM005',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999906',
      empresa_id: IDS.empresaWest,
      marca: 'Mercedes-Benz',
      modelo: 'S-Class',
      ano: 2024,
      categoria_id: IDS.catBlack,
      capacidade: 3,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '9WCM006',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999907',
      empresa_id: IDS.empresaWest,
      marca: 'Chevrolet',
      modelo: 'Suburban Premier',
      ano: 2023,
      categoria_id: IDS.catVan,
      capacidade: 7,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '9WCM007',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999912',
      empresa_id: IDS.empresaHollywood,
      marca: 'Audi',
      modelo: 'A8 L',
      ano: 2024,
      categoria_id: IDS.catExecutive,
      capacidade: 3,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '3HSR012',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999913',
      empresa_id: IDS.empresaPasadena,
      marca: 'Genesis',
      modelo: 'G90',
      ano: 2024,
      categoria_id: IDS.catExecutive,
      capacidade: 3,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '4PGT013',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: '99999999-9999-9999-9999-999999999914',
      empresa_id: IDS.empresaLongBeach,
      marca: 'Lexus',
      modelo: 'LX 600',
      ano: 2024,
      categoria_id: IDS.catSuv,
      capacidade: 6,
      ar_condicionado: true,
      bagageiro: true,
      fotos: [],
      placa: '5LBH014',
      status: 'disponivel',
      created_at: agora,
      updated_at: agora,
    },
    criarVeiculoShield(agora),
  ]

  const motoristas: Motorista[] = [
    {
      id: IDS.motorista1,
      empresa_id: IDS.empresaLa,
      usuario_id: IDS.userMotorista1,
      nome: 'Carlos Mendes',
      telefone: '(323) 555-3001',
      cnh: 'D1234567',
      categoria_cnh: 'C',
      experiencia_anos: 12,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.9,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista2,
      empresa_id: IDS.empresaLa,
      nome: 'Robert Alvarez',
      telefone: '(323) 555-3002',
      cnh: 'D2234567',
      categoria_cnh: 'C',
      experiencia_anos: 8,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.7,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista3,
      empresa_id: IDS.empresaPacific,
      nome: 'James Park',
      telefone: '(310) 555-3003',
      cnh: 'D3234567',
      categoria_cnh: 'C',
      experiencia_anos: 15,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.8,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista4,
      empresa_id: IDS.empresaWest,
      nome: 'David Nguyen',
      telefone: '(818) 555-3004',
      cnh: 'D4234567',
      categoria_cnh: 'C',
      experiencia_anos: 10,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.9,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista5,
      empresa_id: IDS.empresaWest,
      nome: 'Michael Torres',
      telefone: '(818) 555-3005',
      cnh: 'D5234567',
      categoria_cnh: 'C',
      experiencia_anos: 6,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.5,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista8,
      empresa_id: IDS.empresaHollywood,
      nome: 'Diego Morales',
      telefone: '(323) 555-3008',
      cnh: 'D8234567',
      categoria_cnh: 'C',
      experiencia_anos: 7,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.6,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista9,
      empresa_id: IDS.empresaPasadena,
      nome: 'Emily Chen',
      telefone: '(626) 555-3009',
      cnh: 'D9234567',
      categoria_cnh: 'C',
      experiencia_anos: 8,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.7,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: IDS.motorista10,
      empresa_id: IDS.empresaLongBeach,
      nome: 'Marcus Johnson',
      telefone: '(562) 555-3010',
      cnh: 'D0334567',
      categoria_cnh: 'C',
      experiencia_anos: 10,
      status: 'disponivel',
      disponivel: true,
      avaliacao_media: 4.5,
      created_at: agora,
      updated_at: agora,
    },
    criarMotoristaShield(agora),
  ]

  const configuracoes: ConfiguracaoPlataforma[] = [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      chave: 'comissao_percentual',
      valor: '10',
      descricao: 'Comissão da plataforma (%)',
      updated_at: agora,
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
      chave: 'nome_plataforma',
      valor: 'Jemani',
      descricao: 'Nome da plataforma',
      updated_at: agora,
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
      chave: 'taxa_servico',
      valor: '0',
      descricao: 'Taxa de serviço adicional (USD)',
      updated_at: agora,
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
      chave: 'regiao_atuacao',
      valor: 'Los Angeles e região metropolitana',
      descricao: 'Região de atuação',
      updated_at: agora,
    },
    ...CONFIGS_PREFERENCIAS.map((pref) => ({ ...pref, updated_at: agora })),
  ]

  const regrasPreco: RegraPreco[] = [
    {
      id: IDS.regraPreco,
      nome: 'Regra padrão Los Angeles',
      preco_base: 65,
      preco_por_km: 3.5,
      preco_minimo: 95,
      adicional_horario_noturno: 25,
      horario_noturno_inicio: '22:00',
      horario_noturno_fim: '06:00',
      distancia_padrao_km: 20,
      ativo: true,
      created_at: agora,
      updated_at: agora,
    },
  ]

  const viagensBase: Array<
    Partial<Viagem> &
      Pick<
        Viagem,
        'codigo' | 'cliente_id' | 'categoria_id' | 'origem' | 'destino' | 'status' | 'preco_total'
      >
  > = []

  const viagens: Viagem[] = viagensBase.map((v, i) => {
    const total = v.preco_total
    const comissao = 10
    const valorPlataforma = Math.round(((total * comissao) / 100) * 100) / 100
    const pago = v.status !== 'cancelada'
    return {
      id: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb${String(i + 1).padStart(2, '0')}`,
      codigo: v.codigo,
      cliente_id: v.cliente_id,
      empresa_id: v.empresa_id,
      motorista_id: v.motorista_id,
      veiculo_id: v.veiculo_id,
      categoria_id: v.categoria_id,
      origem: v.origem,
      destino: v.destino,
      origem_lat: 33.9416,
      origem_lng: -118.4085,
      destino_lat: 34.0407,
      destino_lng: -118.2468,
      data_viagem: v.data_viagem ?? amanha,
      horario: v.horario ?? '10:00',
      passageiros: v.passageiros ?? 1,
      preco_base: total - valorPlataforma,
      taxas: 0,
      preco_total: total,
      comissao_percentual: comissao,
      valor_plataforma: valorPlataforma,
      valor_empresa: total - valorPlataforma,
      status: v.status,
      payment_status: pago ? 'paid' : 'expired',
      cancelado_por: v.cancelado_por,
      motivo_cancelamento: v.motivo_cancelamento,
      version: 1,
      created_at: agora,
      updated_at: agora,
    }
  })

  const comissoes: Comissao[] = viagens
    .filter((v) => v.empresa_id && v.status === 'viagem_finalizada')
    .map((v) => ({
      id: gerarUuidLocal(v.id),
      viagem_id: v.id,
      empresa_id: v.empresa_id!,
      valor_viagem: v.preco_total,
      percentual: v.comissao_percentual,
      valor_plataforma: v.valor_plataforma,
      valor_empresa: v.valor_empresa,
      created_at: agora,
    }))

  return {
    perfis,
    senhas,
    empresas,
    categorias,
    veiculos,
    motoristas,
    configuracoes,
    regrasPreco,
    viagens,
    historicos: [],
    atribuicoes: [],
    pagamentos: [],
    comissoes,
    notificacoes: [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccc01',
        usuario_id: IDS.cliente1,
        titulo: 'Bem-vindo à Jemani',
        mensagem: 'Sua conta está pronta. Reserve sua primeira viagem em Los Angeles.',
        tipo: 'sistema',
        lida: false,
        created_at: agora,
      },
    ],
    avaliacoes: [],
    distribuicoes: [],
    auditLogs: [],
    turnos: [],
    mensagensEmpresa: [],
    agendamentosVeiculo: [],
  }
}

function gerarUuidLocal(base: string): string {
  return base.replace(/b/g, 'c')
}
