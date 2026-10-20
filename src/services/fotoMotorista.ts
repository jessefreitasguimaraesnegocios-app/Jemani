import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { otimizarFotoPerfil } from '@/utils/otimizarFoto'

/** Foto do motorista — enviada pela empresa (não pelo motorista). */
export async function enviarFotoMotorista(motoristaId: string, arquivo: File): Promise<string> {
  const otimizada = await otimizarFotoPerfil(arquivo)

  if (supabaseConfigurado && supabase) {
    const caminho = `motoristas/${motoristaId}/perfil.${otimizada.extensao}`
    const { error: erroUpload } = await supabase.storage
      .from('avatars')
      .upload(caminho, otimizada.blob, {
        upsert: true,
        contentType: otimizada.tipo,
        cacheControl: '3600',
      })
    if (!erroUpload) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
      return `${data.publicUrl}?v=${Date.now()}`
    }
  }

  return otimizada.dataUrl
}
