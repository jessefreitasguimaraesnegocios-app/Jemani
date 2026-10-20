import { supabase } from '@/lib/supabase'
import { otimizarFotoPerfil } from '@/utils/otimizarFoto'

export async function enviarAvatarCliente(usuarioId: string, arquivo: File): Promise<string> {
  const otimizada = await otimizarFotoPerfil(arquivo)

  if (supabase) {
    const caminho = `${usuarioId}/perfil.${otimizada.extensao}`
    const { error: erroUpload } = await supabase.storage
      .from('avatars')
      .upload(caminho, otimizada.blob, {
        upsert: true,
        contentType: otimizada.tipo,
        cacheControl: '3600',
      })
    if (!erroUpload) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
      const urlPublica = `${data.publicUrl}?v=${Date.now()}`
      const { error: erroPerfil } = await supabase
        .from('profiles')
        .update({ avatar_url: urlPublica, updated_at: new Date().toISOString() })
        .eq('id', usuarioId)
      if (!erroPerfil) return urlPublica
      throw new Error(erroPerfil.message)
    }
    if (erroUpload) throw new Error(erroUpload.message)
  }

  return otimizada.dataUrl
}

export async function removerAvatarCliente(usuarioId: string, avatarAtual?: string): Promise<void> {
  if (supabase) {
    const pasta = `${usuarioId}`
    const { data: arquivos } = await supabase.storage.from('avatars').list(pasta)
    if (arquivos?.length) {
      await supabase.storage
        .from('avatars')
        .remove(arquivos.map((item) => `${pasta}/${item.name}`))
    }
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', usuarioId)
    if (error) throw new Error(error.message)
    return
  }

  if (avatarAtual?.startsWith('data:')) return
}
