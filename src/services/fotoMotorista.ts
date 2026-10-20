import { supabase } from '@/lib/supabase'
import { gravarFotoMotoristaNuvem } from '@/services/nuvemPerfis'
import { otimizarFotoPerfil } from '@/utils/otimizarFoto'

/** Foto do motorista — enviada pela empresa (não pelo motorista). */
export async function enviarFotoMotorista(motoristaId: string, arquivo: File): Promise<string> {
  const otimizada = await otimizarFotoPerfil(arquivo)

  if (supabase) {
    const caminho = `motoristas/${motoristaId}/perfil.${otimizada.extensao}`
    const { error: erroUpload } = await supabase.storage
      .from('avatars')
      .upload(caminho, otimizada.blob, {
        upsert: true,
        contentType: otimizada.tipo,
        cacheControl: '3600',
      })
    if (erroUpload) throw new Error(erroUpload.message)
    const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
    const urlPublica = `${data.publicUrl}?v=${Date.now()}`
    const gravou = await gravarFotoMotoristaNuvem(motoristaId, urlPublica)
    if (!gravou) {
      throw new Error('Foto enviada, mas não foi possível gravar no perfil do motorista.')
    }
    return urlPublica
  }

  return otimizada.dataUrl
}

export async function removerFotoMotorista(motoristaId: string): Promise<void> {
  if (supabase) {
    const pasta = `motoristas/${motoristaId}`
    const { data: arquivos } = await supabase.storage.from('avatars').list(pasta)
    if (arquivos?.length) {
      await supabase.storage
        .from('avatars')
        .remove(arquivos.map((item) => `${pasta}/${item.name}`))
    }
    const gravou = await gravarFotoMotoristaNuvem(motoristaId, null)
    if (!gravou) throw new Error('Não foi possível remover a foto no Supabase.')
    return
  }
}
