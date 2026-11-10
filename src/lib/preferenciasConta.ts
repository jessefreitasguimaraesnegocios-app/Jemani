import { normalizarIdioma, type IdiomaApp } from '@/i18n/tipos'

export type TemaAparencia = 'claro' | 'escuro' | 'sistema'

export type PreferenciasConta = {
  idioma: IdiomaApp
  tema: TemaAparencia
}

const PREFIXO = 'jemani-pref-conta-v1'

function chaveStorage(usuarioId?: string | null) {
  const id = usuarioId?.trim()
  return `${PREFIXO}:${id || 'anon'}`
}

function normalizarTema(valor?: string | null): TemaAparencia {
  if (valor === 'escuro' || valor === 'claro' || valor === 'sistema') return valor
  return 'escuro'
}

export function preferenciasPadrao(): PreferenciasConta {
  return { idioma: 'en', tema: 'escuro' }
}

/** Preferências de aparência/idioma só desta conta neste aparelho. */
export function lerPreferenciasConta(usuarioId?: string | null): PreferenciasConta {
  const padrao = preferenciasPadrao()
  if (typeof localStorage === 'undefined') return padrao
  try {
    const bruto = localStorage.getItem(chaveStorage(usuarioId))
    if (!bruto) return padrao
    const json = JSON.parse(bruto) as Partial<PreferenciasConta>
    return {
      idioma: normalizarIdioma(json.idioma),
      tema: normalizarTema(json.tema),
    }
  } catch {
    return padrao
  }
}

export function gravarPreferenciasConta(
  usuarioId: string | null | undefined,
  patch: Partial<PreferenciasConta>,
): PreferenciasConta {
  const atual = lerPreferenciasConta(usuarioId)
  const proximo: PreferenciasConta = {
    idioma: patch.idioma != null ? normalizarIdioma(patch.idioma) : atual.idioma,
    tema: patch.tema != null ? normalizarTema(patch.tema) : atual.tema,
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(chaveStorage(usuarioId), JSON.stringify(proximo))
    } catch {
      // Storage cheio ou bloqueado — segue em memória via evento.
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jemani-preferencias-conta', {
        detail: { usuarioId: usuarioId?.trim() || 'anon', preferencias: proximo },
      }),
    )
  }
  return proximo
}

export function definirIdiomaConta(usuarioId: string | null | undefined, idioma: IdiomaApp) {
  return gravarPreferenciasConta(usuarioId, { idioma })
}

export function definirTemaConta(usuarioId: string | null | undefined, tema: TemaAparencia) {
  return gravarPreferenciasConta(usuarioId, { tema })
}
