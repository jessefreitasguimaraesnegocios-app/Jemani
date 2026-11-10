import { describe, expect, it } from 'vitest'
import {
  categoriasComFrotaDisponivel,
  veiculoDestaqueDaCategoria,
  veiculosOfereceiveis,
  veiculosParaCarrosselReserva,
} from '@/services/frotaCliente'
import type { CategoriaVeiculo, Empresa, Veiculo } from '@/types'

const agora = '2026-10-21T12:00:00.000Z'

const empresaAtiva: Empresa = {
  id: 'emp-1',
  usuario_id: 'user-1',
  razao_social: 'LA',
  nome_comercial: 'LA',
  cnpj: '1',
  email: 'a@a.com',
  telefone: '1',
  cidade: 'LA',
  regioes_atendidas: ['LA'],
  status: 'ativa',
  habilitada_receber: true,
  categorias_ids: ['cat-1'],
  avaliacao_media: 5,
  comissao_percentual: 10,
  created_at: agora,
  updated_at: agora,
}

const empresaInativa: Empresa = {
  ...empresaAtiva,
  id: 'emp-2',
  status: 'inativa',
  habilitada_receber: false,
}

const categorias: CategoriaVeiculo[] = [
  {
    id: 'cat-1',
    nome: 'SUV',
    slug: 'jemani-suv',
    descricao: 'SUV',
    capacidade_min: 1,
    capacidade_max: 6,
    adicional_preco: 10,
    ativo: true,
    ordem: 1,
    created_at: agora,
    updated_at: agora,
  },
  {
    id: 'cat-2',
    nome: 'Van',
    slug: 'jemani-van',
    descricao: 'Van',
    capacidade_min: 1,
    capacidade_max: 12,
    adicional_preco: 20,
    ativo: true,
    ordem: 2,
    created_at: agora,
    updated_at: agora,
  },
]

const veiculos: Veiculo[] = [
  {
    id: 'v1',
    empresa_id: 'emp-1',
    marca: 'Cadillac',
    modelo: 'Escalade',
    ano: 2024,
    categoria_id: 'cat-1',
    capacidade: 6,
    ar_condicionado: true,
    bagageiro: true,
    fotos: ['/frota/escalade.jpg'],
    status: 'disponivel',
    created_at: agora,
    updated_at: agora,
  },
  {
    id: 'v2',
    empresa_id: 'emp-2',
    marca: 'Ford',
    modelo: 'Expedition',
    ano: 2024,
    categoria_id: 'cat-2',
    capacidade: 7,
    ar_condicionado: true,
    bagageiro: true,
    fotos: ['/frota/expedition.jpg'],
    status: 'disponivel',
    created_at: agora,
    updated_at: agora,
  },
]

describe('frotaCliente', () => {
  it('só oferece veículos de empresas ativas', () => {
    expect(veiculosOfereceiveis(veiculos, [empresaAtiva, empresaInativa])).toHaveLength(1)
  })

  it('mantém veículo se a empresa ainda não veio no sync', () => {
    expect(veiculosOfereceiveis(veiculos, [])).toHaveLength(2)
  })

  it('lista só categorias com frota disponível', () => {
    const lista = categoriasComFrotaDisponivel(
      categorias,
      veiculos,
      [empresaAtiva, empresaInativa],
    )
    expect(lista.map((c) => c.id)).toEqual(['cat-1'])
  })

  it('não esvazia o carrossel se IDs de categoria não baterem', () => {
    const frotaOrfa: Veiculo[] = [
      {
        ...veiculos[0],
        categoria_id: 'uuid-nuvem-desconhecido',
      },
    ]
    const lista = categoriasComFrotaDisponivel(categorias, frotaOrfa, [empresaAtiva])
    expect(lista.map((c) => c.id)).toEqual(['cat-1', 'cat-2'])
  })

  it('prioriza veículo com foto no destaque da categoria', () => {
    const destaque = veiculoDestaqueDaCategoria('cat-1', veiculos, [empresaAtiva])
    expect(destaque?.fotos[0]).toBe('/frota/escalade.jpg')
  })

  it('lista todos os carros das empresas no carrossel da reserva', () => {
    const extra: Veiculo = {
      ...veiculos[0],
      id: 'v3',
      marca: 'Kia',
      modelo: 'EV9',
      fotos: ['/frota/escalade.jpg'],
    }
    const lista = veiculosParaCarrosselReserva(
      [...veiculos, extra],
      [empresaAtiva, empresaInativa],
      categorias,
      2,
    )
    expect(lista.map((item) => item.id)).toEqual(['v1', 'v3'])
    expect(lista.every((item) => item.serve)).toBe(true)
  })
})
