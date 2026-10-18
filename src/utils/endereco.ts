import { descricaoEhPontoFixoDeAeroporto } from '@/services/aeroportos'
import type { EnderecoLocal } from '@/types'

const NUMERO_NO_INICIO = /^\s*\d+[\w-]*/

/** Detecta se o endereço é de aeroporto (embarque/desembarque aéreo). */
export function enderecoEhAeroporto(endereco?: EnderecoLocal | null): boolean {
  if (!endereco) return false
  if (endereco.codigo_aeroporto) return true
  if (endereco.place_id?.startsWith('aero:')) return true
  if (endereco.place_id === 'dev_lax') return true
  const texto = `${endereco.formatted} ${endereco.rua ?? ''}`
  return descricaoEhPontoFixoDeAeroporto(texto)
}

/** Extrai número se vier no início do formatted (padrão US: "842 N Brand Blvd..."). */
export function extrairNumeroDoTexto(texto: string): string | undefined {
  const m = texto.trim().match(NUMERO_NO_INICIO)
  return m?.[0]?.trim() || undefined
}

export function montarTextoEndereco(endereco: Pick<
  EnderecoLocal,
  'rua' | 'numero' | 'complemento' | 'cidade' | 'estado' | 'cep' | 'formatted'
>): string {
  const rua = endereco.rua?.trim()
  const numero = endereco.numero?.trim()
  const complemento = endereco.complemento?.trim()

  if (rua && numero) {
    const linha1 = `${numero} ${rua}`
    const extras = [complemento, endereco.cidade, endereco.estado, endereco.cep]
      .filter(Boolean)
      .join(', ')
    return extras ? `${linha1}, ${extras}` : linha1
  }

  if (rua && !numero) {
    const extras = [endereco.cidade, endereco.estado].filter(Boolean).join(', ')
    return extras ? `${rua}, ${extras}` : rua
  }

  return endereco.formatted
}

/** Endereço pronto para reserva: coords + número (exceto aeroporto). */
export function enderecoProntoParaReserva(endereco?: EnderecoLocal | null): {
  ok: boolean
  mensagem?: string
} {
  if (!endereco) return { ok: false, mensagem: 'Selecione um endereço na lista.' }
  if (enderecoEhAeroporto(endereco)) {
    if (
      !endereco.terminal_id ||
      !endereco.nivel_aeroporto ||
      !Number.isFinite(endereco.latitude) ||
      !Number.isFinite(endereco.longitude)
    ) {
      return {
        ok: false,
        mensagem:
          'Escolha o terminal e se o ponto é embarque (saídas) ou desembarque (chegadas).',
      }
    }
    return { ok: true }
  }
  if (
    typeof endereco.latitude !== 'number' ||
    typeof endereco.longitude !== 'number' ||
    !Number.isFinite(endereco.latitude) ||
    !Number.isFinite(endereco.longitude)
  ) {
    return { ok: false, mensagem: 'Endereço sem coordenadas. Escolha uma sugestão.' }
  }
  if (!endereco.numero?.trim()) {
    return {
      ok: false,
      mensagem: 'Informe o número do endereço (ex.: 842), como no Uber.',
    }
  }
  if (!endereco.rua?.trim() && !endereco.formatted?.trim()) {
    return { ok: false, mensagem: 'Informe a rua / logradouro.' }
  }
  if (!endereco.numero_confirmado) {
    return {
      ok: false,
      mensagem: 'Número não confirmado neste endereço. Aguarde a validação ou corrija o número.',
    }
  }
  return { ok: true }
}

export function aplicarNumeroNoEndereco(
  endereco: EnderecoLocal,
  numero: string,
  complemento?: string,
  confirmado = false,
): EnderecoLocal {
  const atualizado: EnderecoLocal = {
    ...endereco,
    numero: numero.trim() || undefined,
    complemento: complemento?.trim() || undefined,
    numero_confirmado: confirmado,
  }
  return {
    ...atualizado,
    formatted: montarTextoEndereco(atualizado),
  }
}

/** Normaliza número para comparação (842 === 842, remove espaços). */
export function normalizarNumeroEndereco(numero: string): string {
  return numero.trim().toUpperCase().replace(/\s+/g, '')
}

export function numerosEnderecoIguais(a?: string, b?: string): boolean {
  if (!a || !b) return false
  return normalizarNumeroEndereco(a) === normalizarNumeroEndereco(b)
}
